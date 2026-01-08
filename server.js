const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public')); // public 폴더의 html 파일을 보여줌
app.use(express.json());

// ▼▼▼ 여기에 쿠폰 코드를 계속 추가하세요 (콤마로 구분) ▼▼▼
const COUPON_LIST = [
    "WELCOMESK",    // 예시 1
    "GIFT2024",     // 예시 2
    "SEVENKNIGHTS", // 예시 3
    // 계속 추가 가능...
];
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// API: 클라이언트로부터 UID를 받아 쿠폰 일괄 입력 시작
app.post('/api/redeem', async (req, res) => {
    const { uid } = req.body;
    
    if (!uid) {
        return res.status(400).json({ error: "UID가 없습니다." });
    }

    console.log(`[시작] 사용자 ${uid}에 대해 쿠폰 ${COUPON_LIST.length}개 입력 시도`);

    // 실시간 처리는 복잡하므로, 여기서는 서버가 다 처리하고 결과를 한 번에 주는 방식 사용
    // (쿠폰이 100개면 약 50초 소요될 수 있음 -> 타임아웃 방지 필요하지만 일단 심플하게 구현)
    
    let results = [];
    
    // 비동기 루프 (순차 처리)
    for (const [index, code] of COUPON_LIST.entries()) {
        try {
            // 넷마블 서버로 요청 (GET 방식)
            const netmarbleUrl = 'https://coupon.netmarble.com/pi/coupon/reward';
            const response = await axios.get(netmarbleUrl, {
                params: {
                    gameCode: 'tskgb', // 세븐나이츠 리버스 코드
                    couponCode: code,
                    pid: uid,
                    langCd: 'KO_KR'
                },
                // 타임아웃 설정 (5초)
                timeout: 5000 
            });

            const resultData = response.data;
            const isSuccess = resultData.resultCode === 'SUCCESS';
            
            // 결과 기록
            results.push({
                coupon: code,
                success: isSuccess,
                message: resultData.rewardMsg || resultData.resultMsg || "결과 알 수 없음"
            });

            console.log(`[${index+1}/${COUPON_LIST.length}] ${code} -> ${isSuccess ? '성공' : '실패'}`);

        } catch (error) {
            console.error(`[에러] ${code}: ${error.message}`);
            results.push({
                coupon: code,
                success: false,
                message: "서버 통신 오류"
            });
        }

        // ★ 중요: 넷마블 서버 차단 방지를 위한 딜레이 (0.5초)
        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`[완료] 사용자 ${uid} 작업 종료`);
    res.json({ total: COUPON_LIST.length, results: results });
});

app.listen(port, () => {
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
