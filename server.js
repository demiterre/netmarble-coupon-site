const express = require('express');
const axios = require('axios');
const app = express();

const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());
// 폼 데이터 처리를 위한 설정
app.use(express.urlencoded({ extended: true }));

const COUPON_LIST = [
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

const maskUid = (uid) => {
    if (!uid) return "Unknown";
    if (uid.length <= 4) return "****";
    return uid.substring(0, 4) + "****";
};

app.post('/api/redeem', async (req, res) => {
    const { uid } = req.body;
    
    if (!uid) { return res.status(400).json({ error: "UID를 입력해주세요." }); }

    const maskedUid = maskUid(uid);
    console.log(`[시작] 회원번호(${maskedUid}) 작업 시작. 총 ${COUPON_LIST.length}개`);

    let results = [];
    
    // ★★★ 중요: POST 요청용 헤더 설정 ★★★
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://coupon.netmarble.com/tskgb',
        'Origin': 'https://coupon.netmarble.com',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' 
    };

    const netmarbleUrl = 'https://coupon.netmarble.com/api/coupon/reward';

    for (const couponCode of COUPON_LIST) {
        let isSuccess = false;
        let message = "";

        try {
            // ★★★ 핵심 수정: 데이터를 URL 파라미터가 아니라 Body에 담습니다 (URLSearchParams 사용) ★★★
            const params = new URLSearchParams();
            params.append('gameCode', 'tskgb');
            params.append('couponCode', couponCode);
            params.append('pid', uid);
            params.append('langCd', 'KO_KR');

            // GET -> POST 로 변경
            const response = await axios.post(netmarbleUrl, params, {
                headers: headers,
                timeout: 5000 
            });

            const data = response.data;
            
            // 디버깅을 위해 응답 내용 전체를 로그에 찍어봅니다 (문제 발생 시 확인용)
            // 성공시 로그가 너무 길어질 수 있으니 실패했거나 특이할 때만 찍는 게 좋지만, 
            // 지금은 확인을 위해 간단히 찍겠습니다.
            // console.log(`[디버그] 응답데이터:`, JSON.stringify(data));

            // 성공 조건 체크 (resultCode가 없으면 message가 SUCCESS인지 확인)
            if (data.resultCode === 'SUCCESS' || data.resultCode === 'S001' || data.resultMessage === 'SUCCESS') {
                isSuccess = true;
                message = "지급 성공!";
            } else {
                isSuccess = false;
                message = data.resultMessage || data.message || data.errorMessage || "지급 실패";
            }
            
            // 로그 출력
            console.log(`[결과] ${couponCode} : ${message}`);

        } catch (error) {
            // 에러 상황 처리
            let errorMsg = "서버 통신 오류";
            if (error.response && error.response.data) {
                // 넷마블이 400 에러와 함께 메시지를 보낸 경우 (이미 사용함 등)
                const errData = error.response.data;
                errorMsg = errData.resultMessage || errData.message || errData.errorMessage || "에러 발생";
                // 24004 코드는 '이미 사용함'이므로 사실상 성공이나 마찬가지
                if (errData.errorCode === 24004 || String(errData.errorCode) === '24004') {
                    errorMsg = "이미 사용한 쿠폰";
                }
            }
            console.log(`[응답] ${couponCode} : ${errorMsg}`);
            
            // 결과 배열에는 에러 메시지 담기
            message = errorMsg;
        }
        
        results.push({ 
            coupon: couponCode, 
            success: isSuccess, 
            message: message
        });
        
        // POST는 서버 부하가 더 크므로 0.5초 대기
        await sleep(500);
    }

    console.log(`[종료] 회원번호(${maskedUid}) 작업 완료.`);
    res.json({ total: COUPON_LIST.length, results: results });
});

app.listen(port, () => {
    console.log(`Render 서버 실행 중: 포트 ${port}`);
});