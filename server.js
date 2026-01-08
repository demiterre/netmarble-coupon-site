const express = require('express');
const axios = require('axios');
const app = express();

const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

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

app.post('/api/redeem', async (req, res) => {
    const { uid } = req.body;
    
    if (!uid) {
        return res.status(400).json({ error: "UID가 없습니다." });
    }

    console.log(`[시작] 익명의 유저가 쿠폰 입력을 시도합니다.`);

    let results = [];
    
    // 헤더 설정 (브라우저인 척 속이기)
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://coupon.netmarble.com/tskgb',
        'Origin': 'https://coupon.netmarble.com',
        'Accept': 'application/json, text/plain, */*'
    };

    for (const code of COUPON_LIST) {
        try {
            // ★★★ [수정됨] pi -> api 로 변경 ★★★
            const netmarbleUrl = 'https://coupon.netmarble.com/api/coupon/reward';
            
            const response = await axios.get(netmarbleUrl, {
                params: {
                    gameCode: 'tskgb',
                    couponCode: code,
                    pid: uid,
                    langCd: 'KO_KR'
                },
                headers: headers,
                timeout: 5000 
            });

            const resultData = response.data;
            const isSuccess = resultData.resultCode === 'SUCCESS';
            
            let msg = resultData.rewardMsg || resultData.resultMsg;
            if (!msg) msg = isSuccess ? "지급 완료" : "결과 알 수 없음";

            results.push({
                coupon: code,
                success: isSuccess,
                message: msg
            });

        } catch (error) {
            // 진짜 차단인지, 단순 에러인지 구분하기 위해 에러 내용도 로그에 출력
            console.log(`에러 발생 (${code}): ${error.message}`);
            
            let failMsg = "서버 통신 오류";
            if (error.response && error.response.status === 403) {
                failMsg = "서버 접근 차단됨 (IP 차단)";
            } else if (error.response && error.response.status === 404) {
                failMsg = "주소 오류 (404)";
            }

            results.push({
                coupon: code,
                success: false,
                message: failMsg
            });
        }

        // 0.15초 대기
        await new Promise(r => setTimeout(r, 150));
    }

    console.log(`[완료] 작업 종료`);
    res.json({ total: COUPON_LIST.length, results: results });
});

app.listen(port, () => {
    console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
});