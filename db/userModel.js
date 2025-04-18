const db = require('./db'); // db.js 파일을 불러옴. SQLite 연결 객체

// 회원가입
function createUser(username, email, hashedPassword, callback) {
  const query = `
    INSERT INTO users (username, email, password, is_verified)
    VALUES (?, ?, ?, 0)
  `;
  db.run(query, [username, email, hashedPassword], callback);
}

// 사용자 목록 조회
function getAllUsers(callback) {
  const query = 'SELECT id, username, email, is_verified FROM users';
  db.all(query, [], callback);
}

// 사용자 조회 (username 기준)
function findUserByUsername(username, callback) {
  const query = 'SELECT * FROM users WHERE username = ?';
  db.get(query, [username], callback);
}

// 사용자 조회 (id 기준) - password 포함
function findUserById(id, callback) {
  const query = 'SELECT id, username, email, password, is_verified FROM users WHERE id = ?';
  db.get(query, [id], callback);
}

// 사용자 조회 (username + email 기준, 비밀번호 찾기용)
function findUserByUsernameAndEmail(username, email, callback) {
  const query = 'SELECT * FROM users WHERE username = ? AND email = ?';
  db.get(query, [username, email], callback);
}

// 사용자 조회 (email 기준 - 아이디 찾기용)
function findUserByEmail(email, callback) {
  const query = 'SELECT username FROM users WHERE email = ?';
  db.get(query, [email], callback);
}

// 이메일 인증 처리 (is_verified = 1로 변경)
function verifyEmail(userId, callback) {
  const query = 'UPDATE users SET is_verified = 1 WHERE id = ?';
  db.run(query, [userId], callback);
}

// 비밀번호 수정
function updatePassword(id, newPassword, callback) {
  const query = 'UPDATE users SET password = ? WHERE id = ?';
  db.run(query, [newPassword, id], callback);
}

// 사용자 삭제
function deleteUser(id, callback) {
  const query = 'DELETE FROM users WHERE id = ?';
  db.run(query, [id], callback);
}

// 내보내기
module.exports = {
  createUser,
  getAllUsers,
  findUserByUsername,
  findUserById, // ← 수정됨!
  findUserByUsernameAndEmail,
  findUserByEmail,
  verifyEmail,
  updatePassword,
  deleteUser
};
