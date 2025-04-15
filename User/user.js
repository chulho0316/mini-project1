const UserModel = require('../db/userModel');

const authenticateToken = require('../middlewares/auth');
// 만든 인증 미들웨어를 불러옴. 로그인한 유저만 접근 가능하게 하는 역할
const jwt = require('jsonwebtoken');
// JWT(JSON Web Token)를 생성하고 검증하는 데 쓰임
const express = require('express');
// Express 라이브러리를 불러옴. 이걸로 웹 API 경로를 쉽게 만들 수 있음
const router = express.Router();
// 라우터 객체 생성, 이건 하나의 미니 서버. 이 안에서 여러 API를 만들 수 있음
// 마지막엔 module.exports = router;로 내보내서 server.js에 연결함

const Joi = require('joi');
// 사용자가 입력한 값이 형식에 맞는지 검사하는 도구 (유효성 검사)

const bcrypt = require('bcrypt');
// bcrypt는 비밀번호를 안전하게 암호화하는 도구. DB가 털려도 실제 비번은 알 수 없음

// 회원가입 (POST /user)
router.post('/', async (req, res) => {
  const { username, password } = req.body;

  const schema = Joi.object({
    username: Joi.string().min(3).required(),
    password: Joi.string().min(4).required()
  });

  const { error } = schema.validate({ username, password });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  UserModel.createUser(username, hashedPassword, function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ message: '이미 존재하는 아이디입니다.' });
      }
      return res.status(500).json({ message: '서버 내부 오류(DB 저장 실패)', error: err.message });
    }

    res.status(201).json({ message: '회원가입 성공!', userId: this.lastID });
  });
});

// 사용자 목록 조회 (GET /user)
router.get('/', (req, res) => {
  UserModel.getAllUsers((err, rows) => {
    if (err) {
      return res.status(500).json({ message: '서버 내부 오류(DB 조회 실패)', error: err.message });
    }
    res.json({ users: rows });
  });
});

// 로그인 (POST /user/login)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const schema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  });

  const { error } = schema.validate({ username, password });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  UserModel.findUserByUsername(username, async (err, user) => {
    if (err) {
      return res.status(500).json({ message: '서버 내부 오류(DB 조회 실패)', error: err.message });
    }
    if (!user) {
      return res.status(404).json({ message: '존재하지 않는 사용자입니다.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.status(200).json({ message: '로그인 성공', userId: user.id, token });
  });
});

// 로그인한 유저 정보 조회 (GET /user/me)
router.get('/me', authenticateToken, (req, res) => {
  const userId = req.user.id;

  UserModel.findUserById(userId, (err, user) => {
    if (err) {
      return res.status(500).json({ message: '서버 내부 오류(DB 조회 실패)', error: err.message });
    }
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json({ user });
  });
});

// 비밀번호 수정 (PATCH /user/:id)
router.patch('/:id', authenticateToken, async (req, res) => {
  const userIdFromToken = req.user.id;
  const userIdFromParam = parseInt(req.params.id);

  if (userIdFromToken !== userIdFromParam) {
    return res.status(403).json({ message: '본인의 정보만 수정할 수 있습니다.' });
  }

  const { password } = req.body;

  const schema = Joi.object({
    password: Joi.string().min(4).required()
  });

  const { error } = schema.validate({ password });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  UserModel.updatePassword(userIdFromParam, hashedPassword, function (err) {
    if (err) {
      return res.status(500).json({ message: '서버 내부 오류(DB 업데이트 실패)', error: err.message });
    }

    res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  });
});

// 회원 탈퇴 (DELETE /user/:id)
router.delete('/:id', authenticateToken, (req, res) => {
  const userIdFromToken = req.user.id;
  const userIdFromParam = parseInt(req.params.id);

  if (userIdFromToken !== userIdFromParam) {
    return res.status(403).json({ message: '본인의 계정만 삭제할 수 있습니다.' });
  }

  UserModel.deleteUser(userIdFromParam, function (err) {
    if (err) {
      return res.status(500).json({ message: '서버 내부 오류(DB 삭제 실패)', error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json({ message: '회원 탈퇴가 완료되었습니다.' });
  });
});

module.exports = router;
// 이 라우터를 server.js에서 사용할 수 있게 내보내줌