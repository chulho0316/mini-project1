const authenticateToken = require('../middlewares/auth');
// 만든 인증 미들웨어를 불러옴. 로그인한 유저만 접근 가능하게 하는 역할
const jwt = require('jsonwebtoken');
// JWT(JSON Web Token)를 생성하고 검증하는 데 쓰임
const express = require('express');
// Express 라이브러리를 불러옴. 이걸로 웹 API 경로를 쉽게 만들 수 있음
const router = express.Router();
// 라우터 객체 생성, 이건 하나의 미니 서버. 이 안에서 여러 API를 만들 수 있음
// 마지막엔 module.exports = router;로 내보내서 server.js에 연결함

const db = require('../db');
// SQLite 데이터베이스 연결 파일을 가져와서 사용할 준비

const Joi = require('joi');
// 사용자가 입력한 값이 형식에 맞는지 검사하는 도구 (유효성 검사)

const bcrypt = require('bcrypt');
// bcrypt는 비밀번호를 안전하게 암호화하는 도구. DB가 털려도 실제 비번은 알 수 없음

router.post('/register', async (req, res) => {
  // /user/register로 POST 요청이 들어오면 실행됨
  // async(비동기 처리를 할 거야 라는 선언)는 내부에서 await를 쓸 수 있게 해줌
  // 비동기 처리: 어떤 작업이 오래 걸릴 때, 기다리지 않고 다음 작업을 먼저 실행하는 방식
  const { username, password } = req.body;
  // req.body는 클라이언트가 보낸 JSON 데이터. 그 안에서 username, password를 꺼냄

  const schema = Joi.object({
    username: Joi.string().min(3).required(),
    password: Joi.string().min(4).required()
  });
  // Joi를 이용해 "어떤 형식의 데이터를 받아야 하는지" 정해둠
  // 아이디는 문자열, 최소 3자. 비밀번호는 문자열, 최소 4자

  const { error } = schema.validate({ username, password });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  // validate는 우리가 정한 규칙(schema)에 맞는지 확인하는 함수
  // 조건에 어긋나면 400 에러 응답

  const hashedPassword = await bcrypt.hash(password, 10);
  // 입력받은 비밀번호를 암호화된 문자열로 바꿈. 10은 암호화 강도 (숫자가 높을수록 보안↑, 처리속도↓)

  const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
  // SQLite에 보낼 쿼리(SQL 문장)를 준비
  // ? 자리에 실제 데이터를 바인딩해서 넣음 → SQL Injection 방지
  // SQL Injection: 사용자가 입력한 값에 SQL 명령어를 넣어서 DB를 조작, 정보빼내는 공격

  db.run(query, [username, hashedPassword], function (err) {
    // 이 줄이 실제로 DB에 데이터를 저장하는 실행 부분, 에러가 있으면 err에 담기고, 없으면 성공

    if (err) {
      if (err.message.includes('UNIQUE')) {
        // 아이디가 이미 DB에 있는 경우 SQLite에서 UNIQUE 제약 조건 위반 에러가 발생.
        // 이걸 감지해서 409 Conflict 에러로 클라이언트에 알려줌
        return res.status(409).json({ message: '이미 존재하는 아이디입니다.' });
      }
      return res.status(500).json({ message: 'DB 저장 실패', error: err.message });
    }

    res.status(201).json({ message: '회원가입 성공!', userId: this.lastID });
    // 사용자 정보를 DB에 성공적으로 저장했을 때
    // 201 Created 응답 + 방금 저장한 유저의 id 값 반환
    // this.lastID는 SQLite가 자동으로 부여한 마지막으로 저장된 행의 ID를 의미
  });
});

router.get('/list', (req, res) => {
  //get 방식으로 /user.list 경로에 요청이 오면 실행되는 라우터
  //router.get()은 데이터 조회용 요청을 받을 때 사용함.
  //req:클라이언트의 요청(리퀘스트), res: 서버의 응답(리스폰)
  const query = 'SELECT id, username FROM users';
  //SQL 문장을 만듦, users 테이블에서 id, username만 꺼내겠다.
  //비밀번호는 절대 꺼내면 안됨(보안상 매우 위험)

  db.all(query, [], (err, rows) => {
    //SQLite의 함수: 여러 행(데이터 여러개)을 조회할 때 사용.
    //첫 번째 인자:query 문자열, 두 번째 인자: [](이건 ?에 들어갈 값이 있을 때 쓰는 자리인데, 지금은 없어서 빈 배열)
    //세 번째 인자:콜백 함수 err:오류가 생기면 여기 들어옴. rows:유저 정보들이 배열로 담김
    if (err) {
      return res.status(500).json({ message: 'DB 조회 실패', error: err.message });
    }
    //DB 조회에 실패했을 경우 (에러 발생 시), 클라이언트에게 500번 서버 오류 메시지로 응답

    res.json({ users: rows });
    //DB에서 가져온 rows형태를 res.json()으로 응답을 json 형식으로 보내줌
  });
  // server.js에서 /user 경로로 사용되고 있기 때문에 get/user/list라는 전체 경로로 동작
});
// 로그인 기능 (POST /user/login)
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    // req.body는 클라이언트가 보낸 JSON 데이터에서 username과 password를 꺼냄
  
    const schema = Joi.object({
      username: Joi.string().required(),
      password: Joi.string().required()
    });
    // Joi를 이용해 형식을 검사함. 두 항목 모두 필수이며 문자열이어야 함
  
    const { error } = schema.validate({ username, password });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    // 입력값이 유효하지 않으면(빈 값 등) 400번 에러와 함께 메시지를 보냄
  
    const query = 'SELECT * FROM users WHERE username = ?';
    // 사용자의 아이디(username)가 DB에 있는지 확인하는 쿼리문
  
    db.get(query, [username], async (err, user) => {
      // db.get(): SELECT 결과에서 한 줄(한 명)만 가져오는 SQLite 함수
      // 첫 번째 인자: SQL 쿼리
      // 두 번째 인자: ? 자리에 들어갈 실제 값
      // 세 번째 인자: 콜백 함수 (err: 에러 발생시, user: 조회된 사용자 데이터)
  
      if (err) {
        return res.status(500).json({ message: 'DB 조회 실패', error: err.message });
      }
      // 데이터베이스 조회 중 에러가 발생하면 500번 서버 에러 응답
  
      if (!user) {
        return res.status(404).json({ message: '존재하지 않는 사용자입니다.' });
      }
      // 조회 결과가 없으면 = 해당 아이디가 없다는 뜻 → 404 Not Found 응답
  
      const match = await bcrypt.compare(password, user.password);
      // 사용자가 입력한 비밀번호와 DB에 저장된 암호화된 비밀번호를 비교
      // bcrypt.compare(): 평문과 해시를 비교해 true/false 반환
  
      if (!match) {
        return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
      }
      // 비밀번호가 일치하지 않으면 401 Unauthorized 응답
      // JWT 토큰 생성
      const token = jwt.sign(
        { id: user.id, username: user.username }, // payload (토큰 안에 담을 정보)
        process.env.JWT_SECRET,                  // 비밀키 (.env에서 불러온 값)
        { expiresIn: '1h' }                      // 유효 기간 (1시간)
      );
      res.status(200).json({ message: '로그인 성공', userId: user.id,token });
      // 아이디도 존재하고, 비밀번호도 일치 → 로그인 성공 응답
      // 로그인 성공 시 사용자 ID도 함께 전달
    });
  });
  // 로그인한 유저 정보 조회 (GET /user/me)
router.get('/me', authenticateToken, (req, res) => {
    // 이 라우터는 인증 미들웨어 authenticateToken을 거친 후 실행됨
    // req.user에는 jwt.verify()로 검증된 사용자 정보가 들어 있음
  
    const userId = req.user.id;
    // 로그인한 사용자의 id를 JWT 토큰에서 꺼냄 (우리가 토큰 생성할 때 담았던 값)
  
    const query = 'SELECT id, username FROM users WHERE id = ?';
    // 해당 사용자의 id를 이용해 username과 함께 조회하는 쿼리
  
    db.get(query, [userId], (err, user) => {
      // SQLite의 db.get(): 하나의 결과 행만 조회할 때 사용
      if (err) {
        return res.status(500).json({ message: 'DB 조회 실패', error: err.message });
      }
  
      if (!user) {
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
      }
  
      res.json({ user });
      // 최종적으로 사용자 정보 응답
    });
  }); 
  // 회원 비밀번호 수정 기능 (PATCH /user/:id)
router.patch('/:id', authenticateToken, async (req, res) => {
    const userIdFromToken = req.user.id;
    // 로그인된 사용자 ID는 JWT 토큰에서 추출됨
  
    const userIdFromParam = parseInt(req.params.id);
    // URL 파라미터에서 수정 대상 ID 추출
  
    if (userIdFromToken !== userIdFromParam) {
      // 로그인한 유저가 자기 자신의 정보만 수정 가능
      return res.status(403).json({ message: '본인의 정보만 수정할 수 있습니다.' });
    }
  
    const { password } = req.body;
    // 새 비밀번호는 요청 본문(body)에서 받아옴
  
    const schema = Joi.object({
      password: Joi.string().min(4).required()
    });
    // 비밀번호는 최소 4자 이상의 문자열이어야 함
  
    const { error } = schema.validate({ password });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
  
    const hashedPassword = await bcrypt.hash(password, 10);
    // 새 비밀번호도 암호화해서 저장해야 함
  
    const query = 'UPDATE users SET password = ? WHERE id = ?';
    // 실제 SQL 업데이트 쿼리
  
    db.run(query, [hashedPassword, userIdFromParam], function (err) {
      if (err) {
        return res.status(500).json({ message: 'DB 업데이트 실패', error: err.message });
      }
  
      res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
      // 성공 응답
    });
  });  
  // 회원 탈퇴 기능 (DELETE /user/:id)
router.delete('/:id', authenticateToken, (req, res) => {
    const userIdFromToken = req.user.id;
    // 로그인된 사용자 ID는 JWT 토큰에서 추출됨
  
    const userIdFromParam = parseInt(req.params.id);
    // URL 파라미터에서 삭제 대상 ID 추출
  
    if (userIdFromToken !== userIdFromParam) {
      // 본인만 자신의 계정을 삭제할 수 있음
      return res.status(403).json({ message: '본인의 계정만 삭제할 수 있습니다.' });
    }
  
    const query = 'DELETE FROM users WHERE id = ?';
    // 실제 삭제 쿼리문
  
    db.run(query, [userIdFromParam], function (err) {
      if (err) {
        return res.status(500).json({ message: 'DB 삭제 실패', error: err.message });
      }
  
      if (this.changes === 0) {
        // 삭제된 행이 없을 경우 (이미 삭제됐거나 존재하지 않음)
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
      }
  
      res.json({ message: '회원 탈퇴가 완료되었습니다.' });
      // 성공 응답
    });
  });
  
module.exports = router;
// 이 라우터를 server.js에서 사용할 수 있게 내보내줌