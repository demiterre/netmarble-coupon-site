const express = require('express');
const axios = require('axios');
const app = express();

const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ★★★ 1. 여기에 쿠폰 번호를 미리 넣어두세요 (사용자는 입력 안 해도 됨) ★★★
const SERVER_COUPON_LIST = [
    "BRANZEBRANSEL", 
    "HALFGOODHALFEVIL", 
    "LETSGO7K", 
    "GRACEOFCHAOS",
    "100MILLIONHEARTS", 
    "7S7E7V7E7N7", 
    "POOKIFIVEKINDS", 
    "GOLDENKINGPEPE",
    // ... 나머지 쿠폰들 계속 추가
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// [핵심 기능] 넷마블 사이트에 접속해서 '방문자 쿠키'를 받아오는 함수
async function getGuestCookie() {
    try {
        // 1. 메인 페이지에 접속만 시도 (GET)
        const response = await axios.get('https://coupon.netmarble.com/skiagb', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        // 2. 응답 헤더에서 'set-cookie'를 찾아냄
        const rawCookies = response.headers['set-cookie'];
        if (!rawCookies) return "";

        // 3. 쿠키들을 하나로 합침
        return rawCookies.map(c => c.split(';')[0]).join('; ');
    } catch (e) {
        console.error("쿠키 발급 실패:", e.message);
        return "";
    }
}

app.post('/api/redeem', async (req, res) => {
    const { uid } = req.body; // 이제 uid만 받습니다!
    
    if (!uid) { return res.status(400).json({ error: "회원번호가 없습니다." }); }

    console.log(`[작업 시작] 회원번호: ${uid}`);
    
    // ★ 1단계: 방문자 쿠키 자동 발급 (이게 그 사이트의 비결!)
    const guestCookie = await getGuestCookie();
    console.log(`[인증] 방문자 티켓 발급 완료: ${guestCookie ? "성공" : "실패(그래도 시도함)"}`);

    let results = [];
    
    // 헤더 설정 (발급받은 쿠키 장착)
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://coupon.netmarble.com/skiagb',
        'Origin': 'https://coupon.netmarble.com',
        'Cookie': guestCookie, // 👈 자동 발급된 쿠키 사용
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    };

    const netmarbleUrl = 'https://coupon.netmarble.com/api/coupon/reward';

    // ★ 2단계: 서버에 저장된 쿠폰 리스트로 반복 실행
    for (const couponCode of SERVER_COUPON_LIST) {
        let isSuccess = false;
        let message = "";

        try {
            // POST 데이터 (세나 키우기 코드: skiagb)
            const params = new URLSearchParams();
            params.append('gameCode', 'skiagb');
            params.append('couponCode', couponCode);
            params.append('pid', uid);
            params.append('langCd', 'KO_KR');

            const response = await axios.post(netmarbleUrl, params, {
                headers: headers,
                timeout: 5000
            });

            const data = response.data;

            // 성공/실패 판단
            if (data.resultCode === 'SUCCESS' || data.resultCode === 'S001') {
                isSuccess = true;
                message = "✅ 지급 성공";
            } else if (data.errorCode === 24004 || String(data.errorCode) === '24004') {
                isSuccess = true;
                message = "⚠️ 이미 사용한 쿠폰";
            } else {
                message = `❌ ${data.resultMessage || data.message || "실패"}`;
            }

        } catch (error) {
            if (error.response && error.response.data) {
                const errData = error.response.data;
                 if (errData.errorCode === 24004 || String(errData.errorCode) === '24004') {
                    isSuccess = true;
                    message = "⚠️ 이미 사용한 쿠폰";
                } else {
                    message = `❌ 에러: ${errData.resultMessage || errData.message}`;
                }
            } else {
                message = `❌ 통신 오류`;
            }
        }
        
        console.log(`${couponCode}: ${message}`);
        results.push({ coupon: couponCode, success: isSuccess, message: message });
        
        await sleep(200); // 0.2초 대기
    }

    res.json({ results: results });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});