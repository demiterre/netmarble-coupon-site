const express = require('express');
const axios = require('axios');
const app = express();

const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());
// 폼 데이터 처리를 위한 미들웨어 추가
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
    console.log(`[시작] 회원번호(${maskedUid}) 지급 시도 시작. (POST 방식)`);

    let results = [];
    
    // 넷마블 서버 주소
    const netmarbleUrl = 'https://coupon.netmarble.com/api/coupon/reward';

    for (const couponCode of COUPON_LIST) {
        let isSuccess = false;
        let message = "";

        try {
            // ★★★ 핵심 수정: 데이터를 JSON이 아닌 'Form Data' 형식으로 변환 ★★★
            // 이렇게 해야 서버가 "웹사이트에서 버튼 눌렀구나"라고 인식하고 아이템을 줍니다.
            const params = new URLSearchParams();
            params.append('gameCode', 'tskgb');
            params.append('couponCode', couponCode);
            params.append('pid', uid);
            params.append('langCd', 'KO_KR');

            // 헤더도 폼 데이터용으로 명시
            const config = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://coupon.netmarble.com/tskgb',
                    'Origin': 'https://coupon.netmarble.com',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                timeout: 5000
            };

            // POST 요청 전송
            const response = await axios.post(netmarbleUrl, params, config);
            const data = response.data;

            // 로그에 찍어서 확인 (성공 시 데이터 형태 확인용)
            // console.log(`[디버그] ${couponCode} 응답:`, JSON.stringify(data));

            // 결과 판단 로직
            if (data.resultCode === 'SUCCESS' || data.resultCode === 'S001') {
                isSuccess = true;
                message = "지급 성공!";
            } else {
                isSuccess = false;
                message = data.resultMessage || data.message || data.errorMessage || "지급 실패";
                
                // 이미 받은 경우 (24004)
                if (data.errorCode === 24004 || String(data.errorCode) === '24004') {
                     message = "이미 사용한 쿠폰입니다.";
                     // 이미 쓴 건 사실상 성공 처리하고 싶다면 아래 주석 해제
                     // isSuccess = true; 
                }
            }

            console.log(`[결과] ${couponCode} : ${message}`);

        } catch (error) {
            let errorMsg = "서버 통신 오류";
            if (error.response && error.response.data) {
                const errData = error.response.data;
                // 에러 응답인데 내용이 '이미 사용함'인 경우 캐치
                if (errData.errorCode === 24004 || String(errData.errorCode) === '24004') {
                    errorMsg = "이미 사용한 쿠폰입니다.";
                } else {
                    errorMsg = errData.resultMessage || errData.message || "알 수 없는 에러";
                }
            }
            console.log(`[응답] ${couponCode} : ${errorMsg}`);
            message = errorMsg;
        }
        
        results.push({ 
            coupon: couponCode, 
            success: isSuccess, 
            message: message
        });
        
        // POST는 처리 시간이 걸리므로 0.5초 대기
        await sleep(500);
    }

    console.log(`[종료] 회원번호(${maskedUid}) 작업 완료.`);
    res.json({ total: COUPON_LIST.length, results: results });
});

app.listen(port, () => {
    console.log(`Render 서버 실행 중: 포트 ${port}`);
});