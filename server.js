require('dotenv').config();
//dotenv 설정 추가
const express = require('express'); //express는 node.js로 서버 만들때 가장 많이
//쓰는 **프레임워크(기반도구)** , HTTP 요청/응답을 쉽게 처리해줌
const cors = require('cors'); // CORS(Cross-Origin Resource Sharing)
// : 다른 포트, 도메인에서 이 서버에 요청을 보낼 수 있도록 허용해주는 기능.
//프론트엔드가 localhost:5173 이고, 백엔드가 localhost:3000일때 포트가 다르기 때문에
//cors 설정이 없으면 막힘

const app = express(); //app은 우리가 만드는 웹 서버 자체 이 app을 통해 모든 요청/응답, 경로 설정 등을 처리
const port = 3000; //우리 서버가 실행될 포트 번호,웹 브라우저에서 주소창에 http://localhost:3000이라고 접속 가능

app.use(cors()); //app이 객체, cors를 미들웨어로 등록. 미들웨어:요청(req)과 응답(res)사이에서
//동작하는 함수 이경우는: 클라이언트에서 들어오는 요청을 CORS 허용함.
app.use(express.json()); //이것 역시도 미들웨어. 의미는 들어오는 json 요청 바디를
//자동으로 js 객체로 바꿔줌

const userRouter = require('./User/user'); // 회원가입/로그인 기능을 따로 라우터로
//만들기 위해 불러온 부분, user.js 라우터 파일에서 경로별 기능을 만듦
app.use('/user', userRouter); // 유저라우터가 담당하는 모든 라우트 경로 앞에 /user를
//붙이겠다. POST/user/register 또는 GET / user /list 같은 API경로

const path = require('path'); //  경로 처리용 모듈 추가
app.use(express.static(path.join(__dirname, 'public'))); //  public 폴더 내 정적 파일 제공

if (require.main === module) {
  app.listen(port, () => {
    console.log(`server running on http://localhost:${port}`);
  });
}

module.exports = app; // 테스트에서 사용할 수 있도록 내보냄
