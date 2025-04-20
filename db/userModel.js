// 기존 SQLite 기반 UserModel (콜백 방식) 주석 처리
// const db = require('./db'); // SQLite 연결 객체
//
// function createUser(username, email, hashedPassword, callback) {
//   const query = `
//     INSERT INTO users (username, email, password, is_verified)
//     VALUES (?, ?, ?, 0)
//   `;
//   db.run(query, [username, email, hashedPassword], callback);
// }
//
// function getAllUsers(callback) {
//   const query = 'SELECT id, username, email, is_verified FROM users';
//   db.all(query, [], callback);
// }
//
// function findUserByUsername(username, callback) {
//   const query = 'SELECT * FROM users WHERE username = ?';
//   db.get(query, [username], callback);
// }
//
// function findUserById(id, callback) {
//   const query = 'SELECT id, username, email, password, is_verified FROM users WHERE id = ?';
//   db.get(query, [id], callback);
// }
//
// function findUserByUsernameAndEmail(username, email, callback) {
//   const query = 'SELECT * FROM users WHERE username = ? AND email = ?';
//   db.get(query, [username, email], callback);
// }
//
// function findUserByEmail(email, callback) {
//   const query = 'SELECT username FROM users WHERE email = ?';
//   db.get(query, [email], callback);
// }
//
// function verifyEmail(userId, callback) {
//   const query = 'UPDATE users SET is_verified = 1 WHERE id = ?';
//   db.run(query, [userId], callback);
// }
//
// function updatePassword(id, newPassword, callback) {
//   const query = 'UPDATE users SET password = ? WHERE id = ?';
//   db.run(query, [newPassword, id], callback);
// }
//
// function deleteUser(id, callback) {
//   const query = 'DELETE FROM users WHERE id = ?';
//   db.run(query, [id], callback);
// }

// PostgreSQL 기반 UserModel (async/await, Pool 사용)
const db = require('./db');

// 새로운 사용자 생성, 생성된 id 반환
async function createUser(username, email, password) {
  const { rows } = await db.query(
    `INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id`,
    [username, email, password]
  );
  return rows[0].id;
}

// 모든 사용자 정보 조회
async function getAllUsers() {
  const { rows } = await db.query(
    `SELECT id, username, email, is_verified FROM users ORDER BY id`
  );
  return rows;
}

// 사용자 조회 (username 기준)
async function findUserByUsername(username) {
  const { rows } = await db.query(
    `SELECT * FROM users WHERE username = $1`,
    [username]
  );
  return rows[0];
}

// 사용자 조회 (id 기준)
async function findUserById(id) {
  const { rows } = await db.query(
    `SELECT id, username, email, password, is_verified FROM users WHERE id = $1`,
    [id]
  );
  return rows[0];
}

// 사용자 조회 (username + email 기준)
async function findUserByUsernameAndEmail(username, email) {
  const { rows } = await db.query(
    `SELECT * FROM users WHERE username = $1 AND email = $2`,
    [username, email]
  );
  return rows[0];
}

// 사용자 조회 (email 기준)
async function findUserByEmail(email) {
  const { rows } = await db.query(
    `SELECT username FROM users WHERE email = $1`,
    [email]
  );
  return rows[0];
}

// 이메일 인증 처리 (is_verified 설정)
async function verifyEmail(userId) {
  await db.query(
    `UPDATE users SET is_verified = TRUE WHERE id = $1`,
    [userId]
  );
}

// 비밀번호 업데이트
async function updatePassword(id, newPassword) {
  await db.query(
    `UPDATE users SET password = $1 WHERE id = $2`,
    [newPassword, id]
  );
}

// 사용자 삭제
async function deleteUser(id) {
  const result = await db.query(
    `DELETE FROM users WHERE id = $1`,
    [id]
  );
  return result.rowCount;
}

module.exports = {
  createUser,
  getAllUsers,
  findUserByUsername,
  findUserById,
  findUserByUsernameAndEmail,
  findUserByEmail,
  verifyEmail,
  updatePassword,
  deleteUser
};
