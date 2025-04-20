// middlewares/auth.js
require('dotenv').config();
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

// JWT 생성용
function signToken(payload, opts = {}) {
  return jwt.sign(payload, JWT_SECRET, opts);
}

// JWT 검증용 (verify-email, reset-password 등에서 사용)
function verifyToken(token) {
  const payload = jwt.verify(token, JWT_SECRET);
  // id 필드를 숫자로 변환
  payload.id = Number(payload.id);
  return payload;
}

// Express 미들웨어: Authorization 헤더 검사
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: '토큰이 없습니다. 인증 필요' });

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
  }
}

module.exports = { signToken, verifyToken, authenticateToken };
