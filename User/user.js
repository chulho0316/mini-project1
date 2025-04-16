const nodemailer = require('nodemailer');
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
  const { username, email, password } = req.body;

  const schema = Joi.object({
    username: Joi.string().min(3).required(), // 아이디는 3자 이상
    email: Joi.string().email().required(),   // 이메일 형식 확인
    password: Joi.string().min(4).required()  // 비밀번호는 4자 이상
  });

  const { error } = schema.validate({ username, email, password });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const hashedPassword = await bcrypt.hash(password, 10); // 비밀번호 암호화

  UserModel.createUser(username, email, hashedPassword, function (err) {
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
    res.json({ users: rows }); // username, email만 보여줌 (password 제외)
  });
});

// 로그인 (POST /user/login)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;


  const schema = Joi.object({
    username: Joi.string().required(),  // 아이디는 필수
    password: Joi.string().required()  // 비밀번호도 필수
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
    if (!user.is_verified) {

      return res.status(403).json({ message: '이메일 인증이 완료되지 않았습니다.' });
    }  // 이메일 인증 안 된 사용자 차단
    const match = await bcrypt.compare(password, user.password); // 비밀번호 비교
    if (!match) {
      return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
    }

    // JWT 토큰 발급
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.status(200).json({ message: '로그인 성공', userId: user.id, token });
  });
});

// 로그인된 사용자 정보 조회 (GET /user/me)
router.get('/me', authenticateToken, (req, res) => {
  const userId = req.user.id;

  UserModel.findUserById(userId, (err, user) => {
    if (err) {
      return res.status(500).json({ message: '서버 내부 오류(DB 조회 실패)', error: err.message });
    }
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json({ user }); // password는 제외됨
  });
});

// 비밀번호 수정 (PATCH /user/:id)
router.patch('/:id', authenticateToken, async (req, res) => {
  const userIdFromToken = req.user.id;
  const userIdFromParam = parseInt(req.params.id);

  // 자신의 계정만 수정 가능
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
// 비밀번호 찾기 (POST /user/forgot-password)
router.post('/forgot-password', async (req, res) => {
  const { username, email } = req.body;

  const schema = Joi.object({
    username: Joi.string().required(),
    email: Joi.string().email().required()
  });

  const { error } = schema.validate({ username, email });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  // 사용자 확인
  UserModel.findUserByUsernameAndEmail(username, email, async (err, user) => {
    if (err) return res.status(500).json({ message: 'DB 조회 실패', error: err.message });
    if (!user) return res.status(404).json({ message: '일치하는 사용자가 없습니다.' });

    // 임시 비밀번호 생성
    const tempPassword = Math.random().toString(36).slice(2, 10);
    const hashedTemp = await bcrypt.hash(tempPassword, 10);

    // DB에 임시 비밀번호 저장
    UserModel.updatePassword(user.id, hashedTemp, async (err) => {
      if (err) return res.status(500).json({ message: '비밀번호 업데이트 실패', error: err.message });

      // 이메일 발송
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: '[Mini Project] 임시 비밀번호 안내',
        text: `안녕하세요, ${username}님!\n\n임시 비밀번호: ${tempPassword}\n\n로그인 후 반드시 비밀번호를 변경해주세요.`
      };

      try {
        await transporter.sendMail(mailOptions);
        res.json({ message: '임시 비밀번호가 이메일로 전송되었습니다.' });
      } catch (mailErr) {
        res.status(500).json({ message: '이메일 전송 실패', error: mailErr.message });
      }
    });
  });
});
// 회원가입 (이메일 인증 방식)
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  console.log("\n\n username, email, password : ", username, email, password)
  const schema = Joi.object({
    username: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(4).required()
  });

  const { error } = schema.validate({ username, email, password });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  UserModel.findUserByUsername(username, async (err, user) => {
    if (user) return res.status(409).json({ message: '이미 존재하는 아이디입니다.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // DB 저장
    UserModel.createUser(username, email, hashedPassword, function (err) {
      if (err) return res.status(500).json({ message: 'DB 저장 실패', error: err.message });

      const userId = this.lastID;

      // 이메일 인증 토큰 생성
      const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '10m' });
      const verifyUrl = `http://localhost:3000/user/verify-email?token=${token}`;

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: '[회원가입 인증] 이메일 확인',
        html: `
          <p>${username}님, 회원가입을 완료하려면 아래 버튼을 눌러주세요:</p>
          <a href="${verifyUrl}" style="padding:10px 20px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;">이메일 인증하기</a>
          <p style="margin-top:12px;">이 링크는 10분 동안만 유효합니다.</p>
        `
      };

      transporter.sendMail(mailOptions, (err) => {
        if (err) return res.status(500).json({ message: '메일 전송 실패', error: err.message });

        res.status(200).json({ message: '인증 메일이 발송되었습니다. 이메일을 확인해주세요.' });
      });
    });
  });
});
// 이메일 인증 확인
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    UserModel.verifyEmail(userId, (err) => {
      if (err) return res.status(500).send('인증 처리 중 오류 발생');

      res.send(`
        <html>
          <head><meta charset="UTF-8"><title>이메일 인증 완료</title></head>
          <body style="text-align:center; font-family:sans-serif; padding:50px;">
            <h2> 이메일 인증이 완료되었습니다!</h2>
            <p><a href="/login.html">로그인 하러 가기</a></p>
          </body>
        </html>
      `);
    });
  } catch (err) {
    res.status(400).send('인증 토큰이 유효하지 않거나 만료되었습니다.');
  }
});
module.exports = router; // 이 라우터를 server.js에서 사용할 수 있게 내보내줌