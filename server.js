const express = require('express');
const axios = require('axios');
const app = express();
const path = require('path');

const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// ★★★ 사용자님이 주신 전체 쿠폰 리스트 19개 ★★★
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

// [추가된 기능] 회원번호 가리기 함수 (로그용)
const maskUid = (uid) => {
    if (!uid) return "Unknown";
    if (uid.length <= 4) return "****";
    return uid.substring(0, 4) + "****";
};

app.post('/api/redeem', async (req, res) => {
    const { uid } = req.body;
    
    if (!uid) { return res.status(400).json({ error: "UID를 입력해주세요." }); }

    // ★★★ 로그에는 가려진 번호(maskedUid)만 찍힙니다 ★★★
    const maskedUid = maskUid(uid);
    console.log(`[시작] 회원번호(${maskedUid}) 작업 시작. 총 ${COUPON_LIST.length}개`);

    let results = [];
    
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
            // 실제 요청에는 진짜 uid를 사용합니다
            const response = await axios.get(netmarbleUrl, {
                params: {
                    gameCode: 'tskgb', 
                    couponCode: couponCode,
                    pid: uid, // 여기는 진짜 UID가 들어가야 보상이 들어옴
                    langCd: 'KO_KR'
                },
                headers: headers,
                timeout: 5000 
            });

            const data = response.data;
            
            if (data.resultCode === 'SUCCESS' || data.resultCode === 'S001') {
                isSuccess = true;
                message = "지급 성공!";
            } else {
                isSuccess = false;
                message = data.resultMessage || data.message || data.errorMessage || "지급 실패 (사유 불명)";
            }

            console.log(`[결과] ${couponCode} : ${message}`);

        } catch (error) {
            console.error(`[에러] ${couponCode} 통신 오류: ${error.message}`);
            message = "서버 통신 오류";
        }
        
        results.push({ 
            coupon: couponCode, 
            success: isSuccess, 
            message: message
        });
        
        await sleep(200);
    }

    console.log(`[종료] 회원번호(${maskedUid}) 작업 완료.`);
    res.json({ total: COUPON_LIST.length, results: results });
});

app.listen(port, () => {
    console.log(`Render 서버 실행 중: 포트 ${port}`);
});