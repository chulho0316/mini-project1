require('dotenv').config();
// .env 파일에서 설정 불러오기
const express = require('express'); // HTTP 서버 프레임워크
const cors = require('cors');       // CORS 설정
const path = require('path');       // 파일 경로 처리

const app = express();
const port = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // public 폴더 정적 파일 제공

// 회원 관련 라우터 연결
const userRouter = require('./User/user');
app.use('/user', userRouter);

// 전역 에러 핸들러 (기대하지 않은 에러 처리)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: '서버 오류', error: err.message });
});

// 서버 시작 (직접 실행할 때만)
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

module.exports = app;
