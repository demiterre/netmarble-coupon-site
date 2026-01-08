const express = require('express');
const axios = require('axios');
const app = express();

const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// ★ 쿠폰 리스트
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

// UID 가리기 함수
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
    
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://coupon.netmarble.com/tskgb',
        'Origin': 'https://coupon.netmarble.com'
    };

    const netmarbleUrl = 'https://coupon.netmarble.com/api/coupon/reward';

    for (const couponCode of COUPON_LIST) {
        let isSuccess = false;
        let message = "";

        try {
            // ★ GET 방식으로 복귀 (가장 안정적)
            const response = await axios.get(netmarbleUrl, {
                params: {
                    gameCode: 'tskgb', 
                    couponCode: couponCode,
                    pid: uid,
                    langCd: 'KO_KR',
                    _t: Date.now() // 캐시 방지용 시간 추가
                },
                headers: headers,
                timeout: 5000 
            });

            const data = response.data;
            
            // ★★★ 핵심 수정: 성공 판독 로직 개선 ★★★
            // 넷마블 응답에 'SUCCESS'라는 단어가 들어있거나, errorCode가 0이면 성공으로 간주
            const resultMsg = data.resultMessage || data.message || data.errorMessage || "";
            
            if (resultMsg === 'SUCCESS' || data.errorCode === 0 || data.resultCode === 'SUCCESS') {
                isSuccess = true;
                message = "지급 성공! (우편함을 확인하세요)";
            } else {
                isSuccess = false;
                message = resultMsg; // 실패 사유 (예: 교환 횟수 초과)
                
                // 이미 받은 쿠폰(24004)은 사실상 성공이나 다름없으므로 메시지 다듬기
                if (data.errorCode === 24004) {
                    message = "이미 사용한 쿠폰입니다.";
                }
            }

            console.log(`[결과] ${couponCode} : ${message}`);

        } catch (error) {
            let errorMsg = "서버 통신 오류";
            
            // 넷마블이 400 에러를 줘도 응답 내용이 있으면 읽기
            if (error.response && error.response.data) {
                const errData = error.response.data;
                errorMsg = errData.errorMessage || errData.message || "에러 발생";
                
                // 이미 받은 쿠폰 코드 처리
                if (errData.errorCode === 24004) {
                    isSuccess = false; // 엄밀히는 실패지만,
                    errorMsg = "이미 사용한 쿠폰입니다.";
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
        
        // 너무 빠르면 안되니까 0.3초 딜레이
        await sleep(300);
    }

    console.log(`[종료] 회원번호(${maskedUid}) 작업 완료.`);
    res.json({ total: COUPON_LIST.length, results: results });
});

app.listen(port, () => {
    console.log(`Render 서버 실행 중: 포트 ${port}`);
});