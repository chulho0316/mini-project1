const db = require('./db'); // db.js 파일을 불러옴. SQLite 연결 객체

// 회원가입
function createUser(username, hashedPassword, callback) {
  // 사용자 정보를 users 테이블에 추가함
  // ? 자리에 username과 암호화된 비밀번호가 들어감
  const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
  db.run(query, [username, hashedPassword], callback);
}

// 사용자 목록 조회
function getAllUsers(callback) {
  // 모든 사용자 목록을 조회. 보안상 password는 제외함
  const query = 'SELECT id, username FROM users';
  db.all(query, [], callback); // 여러 행을 가져올 땐 db.all 사용
}

// 사용자 조회 (username 기준)
function findUserByUsername(username, callback) {
  // username이 일치하는 사용자 1명을 조회
  const query = 'SELECT * FROM users WHERE username = ?';
  db.get(query, [username], callback); // 1명만 조회할 땐 db.get 사용
}

// 사용자 조회 (id 기준)
function findUserById(id, callback) {
  // ID를 기준으로 사용자 정보를 조회함 (비밀번호는 제외)
  const query = 'SELECT id, username FROM users WHERE id = ?';
  db.get(query, [id], callback);
}

// 비밀번호 수정
function updatePassword(id, hashedPassword, callback) {
  // 특정 ID 사용자의 비밀번호를 수정함
  const query = 'UPDATE users SET password = ? WHERE id = ?';
  db.run(query, [hashedPassword, id], callback);
}

// 사용자 삭제
function deleteUser(id, callback) {
  // 특정 ID 사용자를 삭제함
  const query = 'DELETE FROM users WHERE id = ?';
  db.run(query, [id], callback);
}

// 각 함수들을 모듈로 내보냄
module.exports = {
  createUser,
  getAllUsers,
  findUserByUsername,
  findUserById,
  updatePassword,
  deleteUser
};