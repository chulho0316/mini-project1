// /User/user.js
require('dotenv').config();
const express = require('express');
const router  = express.Router();
const Joi     = require('joi');

const db          = require('../db/db');
const { signToken, verifyToken, authenticateToken } = require('../middlewares/auth');
const transporter = require('../mailer');

// ───────────────────────────────────────────
// 1) 전체 사용자 조회 (관리용)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, username, email, is_verified, created_at FROM users ORDER BY id`
    );
    res.json({ users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB 조회 실패', error: err.message });
  }
});

// ───────────────────────────────────────────
// 2) 회원가입 (이메일 인증)
router.post('/register', async (req, res) => {
  const schema = Joi.object({
    username: Joi.string().min(3).required(),
    email:    Joi.string().email().required(),
    password: Joi.string().min(64).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password'))
                         .required()
                         .messages({ 'any.only': '비밀번호가 일치하지 않습니다.' })
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { username, email, password } = req.body;
  try {
    // 1) 사용자 생성
    const insert = `
      INSERT INTO users(username, email, password)
      VALUES($1, $2, $3)
      RETURNING id
    `;
    const { rows } = await db.query(insert, [username, email, password]);
    const userId = rows[0].id;

    // 2) 인증 토큰 & 링크 생성
    const token = signToken({ id: userId }, { expiresIn: '10m' });
    const verifyUrl = `http://localhost:${process.env.PORT||3000}/user/verify-email?token=${token}`;

    // 3) 메일 발송
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to:   email,
      subject: '[회원가입] 이메일 인증',
      html: `
        <p>안녕하세요, <strong>${username}</strong>님!</p>
        <p>아래 버튼을 눌러 이메일 인증을 완료해주세요 (10분 유효):</p>
        <a href="${verifyUrl}" style="display:inline-block;padding:8px 16px; background:#3b82f6;color:white;border-radius:4px;text-decoration:none;">
          이메일 인증하기
        </a>`
    });

    res.status(201).json({ message: '가입 성공! 이메일을 확인해주세요.' });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') // unique_violation
      return res.status(409).json({ message: '이미 사용 중인 아이디 또는 이메일입니다.' });
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// ───────────────────────────────────────────
// 3) 이메일 인증 처리
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  try {
    // 토큰 검증
    const { id: userId } = verifyToken(token);
    // 사용자 인증 플래그 업데이트
    await db.query(
      `UPDATE users SET is_verified = TRUE WHERE id = $1`,
      [userId]
    );
    // 인증 성공 시 로그인 페이지로 리다이렉트 + 상태 파라미터
    return res.redirect('/login.html?status=verified');
  } catch (err) {
    console.error('이메일 인증 오류:', err);
    // 인증 실패(만료·위조) 시 로그인 페이지로 리다이렉트 + 상태 파라미터
    return res.redirect('/login.html?status=invalid');
  }
});

// ───────────────────────────────────────────
// 4) 로그인
router.post('/login', async (req, res) => {
  const schema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { username, password } = req.body;
  try {
    const { rows } = await db.query(
      `SELECT id, password, is_verified FROM users WHERE username = $1`,
      [username]
    );
    if (!rows.length) return res.status(404).json({ message: '사용자가 존재하지 않습니다.' });

    const user = rows[0];
    if (!user.is_verified)
      return res.status(403).json({ message: '이메일 인증이 필요합니다.' });
    if (user.password !== password)
      return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });

    const token = signToken({ id: user.id, username }, { expiresIn: '1h' });
    res.json({ message: '로그인 성공', token, userId: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// ───────────────────────────────────────────
// 5) 내 정보 조회 (토큰 검증 미들웨어 사용 가능)
router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: '로그인 필요' });
  const token = auth.replace(/^Bearer\s+/, '');

  try {
    const { id: userId } = verifyToken(token);
    const { rows } = await db.query(
      `SELECT id, username, email, is_verified, created_at FROM users WHERE id = $1`,
      [userId]
    );
    if (!rows.length) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
});

// ───────────────────────────────────────────
// 6) 비밀번호 변경
router.patch('/:id', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: '로그인 필요' });
  const token = auth.replace(/^Bearer\s+/, '');
  let payload;
  try { payload = verifyToken(token); }
  catch { return res.status(401).json({ message: '유효하지 않은 토큰입니다.' }); }
  if (payload.id !== userId)
    return res.status(403).json({ message: '본인의 정보만 수정할 수 있습니다.' });

  const schema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword:     Joi.string().min(64).required()
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { currentPassword, newPassword } = req.body;
  try {
    const { rows } = await db.query(`SELECT password FROM users WHERE id = $1`, [userId]);
    if (!rows.length) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    if (rows[0].password !== currentPassword)
      return res.status(401).json({ message: '현재 비밀번호가 일치하지 않습니다.' });

    await db.query(`UPDATE users SET password = $1 WHERE id = $2`, [newPassword, userId]);
    res.json({ message: '비밀번호가 변경되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '비밀번호 변경 실패', error: err.message });
  }
});

// ───────────────────────────────────────────
// 7) 회원 탈퇴
router.delete('/:id', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: '로그인 필요' });
  const token = auth.replace(/^Bearer\s+/, '');
  let payload;
  try { payload = verifyToken(token); }
  catch { return res.status(401).json({ message: '유효하지 않은 토큰입니다.' }); }
  if (payload.id !== userId)
    return res.status(403).json({ message: '본인의 계정만 삭제할 수 있습니다.' });

  try {
    const result = await db.query(`DELETE FROM users WHERE id = $1`, [userId]);
    if (result.rowCount === 0)
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    res.json({ message: '회원 탈퇴가 완료되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB 삭제 실패', error: err.message });
  }
});

// ───────────────────────────────────────────
// 8) 아이디 찾기
router.post('/find-id', async (req, res) => {
  const schema = Joi.object({ email: Joi.string().email().required() });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const { rows } = await db.query(`SELECT username FROM users WHERE email = $1`, [req.body.email]);
    if (!rows.length)
      return res.status(404).json({ message: '가입된 이메일이 없습니다.' });
    res.json({ username: rows[0].username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB 조회 실패', error: err.message });
  }
});

// ───────────────────────────────────────────
// 9) 비밀번호 찾기 (이메일 링크 발송)
router.post('/forgot-password', async (req, res) => {
  const schema = Joi.object({
    username: Joi.string().required(),
    email:    Joi.string().email().required()
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { username, email } = req.body;
  try {
    const { rows } = await db.query(`SELECT id FROM users WHERE username = $1 AND email = $2`, [username, email]);
    if (!rows.length) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });

    const token = signToken({ id: rows[0].id }, { expiresIn: '15m' });
    const resetUrl = `http://localhost:${process.env.PORT||3000}/reset-password.html?token=${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to:   email,
      subject: '[비밀번호 재설정] 링크 발송',
      html: `
        <p>${username}님, 비밀번호 재설정을 위해 아래 버튼을 클릭하세요 (15분 유효):</p>
        <a href="${resetUrl}" style="padding:8px 16px; background:#3b82f6;color:white;border-radius:4px;text-decoration:none;">
          비밀번호 재설정
        </a>`
    });

    res.json({ message: '재설정 링크가 발송되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '이메일 전송 실패', error: err.message });
  }
});

// ───────────────────────────────────────────
// 10) 비밀번호 재설정 처리
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ message: '토큰 또는 새 비밀번호가 필요합니다.' });

  try {
    const { id: userId } = verifyToken(token);
    await db.query(`UPDATE users SET password = $1 WHERE id = $2`, [newPassword, userId]);
    res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: '유효하지 않거나 만료된 토큰입니다.' });
  }
});

module.exports = router;
