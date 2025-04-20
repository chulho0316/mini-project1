// mailer.js
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',  // 또는 사용하실 SMTP 서비스
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// (선택) 연결 테스트
transporter.verify()
  .then(() => console.log('Mailer ready'))
  .catch(err => console.error('Mailer error:', err));

module.exports = transporter;
