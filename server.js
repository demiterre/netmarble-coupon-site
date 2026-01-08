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
    // ... (쿠폰 리스트는 그대로 두셔도 됩니다)
];

app.post('/api/redeem', async (req, res) => {
    const { uid } = req.body;
    
    if (!uid) { return res.status(400).json({ error: "UID가 없습니다." }); }

    console.log(`[시작] 넷마블 서버 응답 확인을 시작합니다.`);

    let results = [];
    
    // 헤더 (브라우저 위장)
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://coupon.netmarble.com/tskgb',
        'Origin': 'https://coupon.netmarble.com',
        'Accept': 'application/json, text/plain, */*'
    };

    // ★★★ 디버깅을 위해 '첫 번째 쿠폰'만 먼저 시도해봅니다 ★★★
    // 19개를 다 찍으면 로그가 너무 복잡해지니까요.
    const testCoupon = COUPON_LIST[0]; 

    try {
        const netmarbleUrl = 'https://coupon.netmarble.com/api/coupon/reward';
        
        console.log(`[요청] ${testCoupon} 쿠폰을 보냅니다...`);

        const response = await axios.get(netmarbleUrl, {
            params: {
                gameCode: 'tskgb',
                couponCode: testCoupon,
                pid: uid,
                langCd: 'KO_KR'
            },
            headers: headers,
            timeout: 5000 
        });

        // ★★★ 여기가 핵심입니다! 넷마블이 보낸 데이터를 그대로 로그에 찍습니다 ★★★
        console.log("==========================================");
        console.log("[넷마블 응답 데이터]:", JSON.stringify(response.data));
        console.log("==========================================");

        results.push({ coupon: testCoupon, success: false, message: "로그 확인용 테스트 완료" });

    } catch (error) {
        console.log("==========================================");
        console.log("[에러 발생]:", error.message);
        if(error.response) {
            console.log("[에러 응답 데이터]:", error.response.data); // 에러일 때도 데이터 확인
        }
        console.log("==========================================");
        
        results.push({ coupon: testCoupon, success: false, message: "에러 발생" });
    }

    console.log(`[종료] 로그를 확인해주세요.`);
    res.json({ total: 1, results: results });
});

app.listen(port, () => {
    console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
});