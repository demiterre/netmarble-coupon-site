const express = require('express');
const axios = require('axios');
const app = express();

const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ★★★ 여기에 입력할 쿠폰 번호를 미리 넣어두세요 ★★★
const SERVER_COUPON_LIST = [
    "BRANZEBRANSEL", 
    "HALFGOODHALFEVIL", 
    "LETSGO7K", 
    "GRACEOFCHAOS",
    "100MILLIONHEARTS", 
    "7S7E7V7E7N7", 
    "POOKIFIVEKINDS", 
    "GOLDENKINGPEPE",
    "77EVENT77",
    "HAPPYNEWYEAR2026",
    "KEYKEYKEY",
    "SENAHAJASENA",
    "SENA77MEMORY",
    "SENASTARCRYSTAL",
    "CHAOSESSENCE",
    "OBLIVION",
    "TARGETWISH",
    "DELLONSVSKRIS",
    "DANCINGPOOKI"
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// [핵심] 넷마블 사이트 방문자 쿠키 자동 발급 함수
async function getGuestCookie() {
    try {
        const response = await axios.get('https://coupon.netmarble.com/tskgb', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const rawCookies = response.headers['set-cookie'];
        if (!rawCookies) return "";
        return rawCookies.map(c => c.split(';')[0]).join('; ');
    } catch (e) {
        console.error("쿠키 발급 실패:", e.message);
        return "";
    }
}

app.post('/api/redeem', async (req, res) => {
    const { uid } = req.body;
    
    if (!uid) { return res.status(400).json({ error: "회원번호를 입력해주세요." }); }

    console.log(`[작업 시작] 회원번호: ${uid}`);
    
    // 1. 방문자 쿠키 발급
    const guestCookie = await getGuestCookie();
    
    let results = [];
    
    // 헤더 설정 (발급받은 쿠키 장착)
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://coupon.netmarble.com/tskgb',
        'Origin': 'https://coupon.netmarble.com',
        'Cookie': guestCookie, 
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    };

    const netmarbleUrl = 'https://coupon.netmarble.com/api/coupon/reward';

    // 2. 쿠폰 입력 반복
    for (const couponCode of SERVER_COUPON_LIST) {
        let isSuccess = false;
        let message = "";

        try {
            // tskgb(리버스) 기준으로 POST 전송
            const params = new URLSearchParams();
            params.append('gameCode', 'tskgb'); 
            params.append('couponCode', couponCode);
            params.append('pid', uid);
            params.append('langCd', 'KO_KR');

            const response = await axios.post(netmarbleUrl, params, {
                headers: headers,
                timeout: 5000
            });

            const data = response.data;

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
                    message = `❌ 에러: ${errData.resultMessage || errData.message || "알 수 없음"}`;
                }
            } else {
                message = `❌ 통신 오류 (IP 차단 가능성)`;
            }
        }
        
        results.push({ coupon: couponCode, success: isSuccess, message: message });
        await sleep(200); 
    }

    res.json({ results: results });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});