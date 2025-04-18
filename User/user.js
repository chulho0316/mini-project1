require('dotenv').config();

const express = require('express');
const router = express.Router();
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const UserModel = require('../db/userModel');
const authenticateToken = require('../middlewares/auth');

// 사용자 목록 조회
router.get('/', (req, res) => {
  UserModel.getAllUsers((err, rows) => {
    if (err) return res.status(500).json({ message: 'DB 조회 실패', error: err.message });
    res.json({ users: rows });
  });
});

// 로그인
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const schema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  });

  const { error } = schema.validate({ username, password });
  if (error) return res.status(400).json({ message: error.details[0].message });

  UserModel.findUserByUsername(username, async (err, user) => {
    if (err) return res.status(500).json({ message: 'DB 조회 실패', error: err.message });
    if (!user) return res.status(404).json({ message: '존재하지 않는 사용자입니다.' });
    if (!user.is_verified) return res.status(403).json({ message: '이메일 인증이 완료되지 않았습니다.' });
    if (password !== user.password) return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ message: '로그인 성공', userId: user.id, token });
  });
});

// 내 정보 조회
router.get('/me', authenticateToken, (req, res) => {
  UserModel.findUserById(req.user.id, (err, user) => {
    if (err) return res.status(500).json({ message: 'DB 조회 실패', error: err.message });
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    res.json({ user });
  });
});

// 비밀번호 수정
router.patch('/:id', authenticateToken, async (req, res) => {
  const userId = parseInt(req.params.id);
  if (req.user.id !== userId) return res.status(403).json({ message: '본인의 정보만 수정할 수 있습니다.' });

  const schema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(64).required()
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { currentPassword, newPassword } = req.body;

  UserModel.findUserById(userId, (err, user) => {
    if (err) return res.status(500).json({ message: 'DB 조회 실패', error: err.message });
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
  
    const dbPassword = user.password.toString(); // 💥 핵심!
    if (dbPassword !== currentPassword) {
      return res.status(401).json({ message: '기존 비밀번호가 일치하지 않습니다.' });
    }
  
    UserModel.updatePassword(userId, newPassword, (err) => {
      if (err) return res.status(500).json({ message: '비밀번호 변경 실패', error: err.message });
      res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
    });
  });  
});

// 회원 탈퇴
router.delete('/:id', authenticateToken, (req, res) => {
  const userId = parseInt(req.params.id);
  if (req.user.id !== userId) return res.status(403).json({ message: '본인의 계정만 삭제할 수 있습니다.' });

  UserModel.deleteUser(userId, function (err) {
    if (err) return res.status(500).json({ message: 'DB 삭제 실패', error: err.message });
    if (this.changes === 0) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    res.json({ message: '회원 탈퇴가 완료되었습니다.' });
  });
});

// 아이디 찾기
router.post('/find-id', async (req, res) => {
  const schema = Joi.object({ email: Joi.string().email().required() });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  UserModel.findUserByEmail(req.body.email, (err, user) => {
    if (err) return res.status(500).json({ message: 'DB 조회 실패', error: err.message });
    if (!user) return res.status(404).json({ message: '가입된 이메일이 없습니다.' });
    res.json({ username: user.username });
  });
});

// 비밀번호 찾기 → 이메일로 링크 전송
router.post('/forgot-password', async (req, res) => {
  const { username, email } = req.body;
  const schema = Joi.object({ username: Joi.string().required(), email: Joi.string().email().required() });
  const { error } = schema.validate({ username, email });
  if (error) return res.status(400).json({ message: error.details[0].message });

  UserModel.findUserByUsernameAndEmail(username, email, async (err, user) => {
    if (err) return res.status(500).json({ message: 'DB 조회 실패', error: err.message });
    if (!user) return res.status(404).json({ message: '일치하는 사용자가 없습니다.' });

    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const resetUrl = `http://localhost:3000/reset-password.html?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '[Mini Project] 비밀번호 재설정 안내',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p style="font-size: 16px;">안녕하세요, <strong>${username}</strong>님 </p>
          <p style="font-size: 15px;">비밀번호 재설정을 원하신다면 아래 버튼을 눌러주세요.</p>
          <div style="margin: 24px 0;">
            <a href="${resetUrl}" style="padding:12px 24px; background:#3b82f6; color:#fff; border-radius:8px; text-decoration:none; font-weight:bold;">비밀번호 재설정</a>
          </div>
          <p style="font-size: 14px; color: #666;">이 링크는 <strong>15분 동안만</strong> 유효합니다. 이후에는 다시 요청해 주세요.</p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      res.json({ message: '비밀번호 재설정 링크가 이메일로 전송되었습니다.' });
    } catch (mailErr) {
      res.status(500).json({ message: '이메일 전송 실패', error: mailErr.message });
    }
  });
});

// 비밀번호 재설정 (reset-password.html 연동)
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: '토큰 또는 비밀번호가 누락되었습니다.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: '유효하지 않거나 만료된 토큰입니다.' });
    }

    const username = decoded.username;
    if (!username) return res.status(400).json({ message: '토큰에 유효한 사용자 정보가 없습니다.' });

    UserModel.findUserByUsername(username, async (err, user) => {
      if (err) return res.status(500).json({ message: 'DB 조회 실패', error: err.message });
      if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });

      await UserModel.updatePassword(user.id, newPassword, (err) => {
        if (err) return res.status(500).json({ message: '비밀번호 변경 실패', error: err.message });
        return res.status(200).json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
      });
    });
  } catch (error) {
    console.error('비밀번호 재설정 오류:', error);
    return res.status(500).json({ message: '서버 오류로 인해 비밀번호를 변경할 수 없습니다.' });
  }
});

// 회원가입 (이메일 인증)
router.post('/register', async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  const schema = Joi.object({
    username: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(64).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': '비밀번호와 비밀번호 확인이 일치하지 않습니다.'
    })
  });

  const { error } = schema.validate({ username, email, password, confirmPassword });
  if (error) return res.status(400).json({ message: error.details[0].message });

  UserModel.findUserByUsername(username, async (err, user) => {
    if (user) return res.status(409).json({ message: '이미 존재하는 아이디입니다.' });

    UserModel.createUser(username, email, password, function (err) {
      if (err) return res.status(500).json({ message: 'DB 저장 실패', error: err.message });

      const userId = this.lastID;
      const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '10m' });
      const verifyUrl = `http://localhost:3000/user/verify-email?token=${token}`;

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: '[회원가입 인증] 이메일 확인',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <p style="font-size: 16px;">안녕하세요, <strong>${username}</strong>님 </p>
            <p style="font-size: 15px;">회원가입을 완료하려면 아래 버튼을 눌러 이메일 인증을 진행해주세요.</p>
            <div style="margin: 24px 0;">
              <a href="${verifyUrl}" style="padding:12px 24px; background:#3b82f6; color:#fff; border-radius:8px; text-decoration:none; font-weight:bold;">이메일 인증하기</a>
            </div>
            <p style="font-size: 14px; color: #666;">이 링크는 <strong>10분 동안만</strong> 유효합니다. 이후에는 다시 인증 요청을 해주세요.</p>
          </div>
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
    UserModel.verifyEmail(decoded.id, (err) => {
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

module.exports = router;