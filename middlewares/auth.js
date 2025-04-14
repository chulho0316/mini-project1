const jwt = require('jsonwebtoken');
// JWT 토큰을 생성하거나 해독(검증)하기 위한 jsonwebtoken 모듈 불러오기

// 인증 미들웨어 함수 정의
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // 클라이언트가 보낸 요청 헤더 중 'authorization' 항목을 가져옴
  // 형식은 일반적으로 "Bearer <토큰값>"

  const token = authHeader && authHeader.split(' ')[1];
  // "Bearer abcd.efgh.ijkl" → ' ' 기준으로 자른 뒤 두 번째 요소(token)만 추출
  // authHeader가 없을 수도 있으니 앞에 &&로 체크

  if (!token) {
    // 토큰이 없으면 401 Unauthorized 에러 응답
    return res.status(401).json({ message: '토큰이 없습니다. 인증 필요' });
  }

  // JWT 토큰 유효성 검사 시작
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      // 토큰이 잘못되었거나 만료되었을 경우 403 Forbidden 응답
      return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    }

    req.user = user;
    // 토큰이 유효하면, 토큰에 담긴 사용자 정보를 req.user에 저장해 다음 라우터에서 사용 가능하게 함

    next(); 
    // 미들웨어 통과 → 다음 단계(실제 라우터 핸들러)로 넘어감
  });
}

module.exports = authenticateToken;
// 이 인증 미들웨어를 외부에서도 사용할 수 있도록 내보내기