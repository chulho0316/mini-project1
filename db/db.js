// 기존 SQLite 연결 코드 (주석 처리)
// const sqlite3 = require('sqlite3').verbose();
// const path    = require('path');
// const dbPath  = path.join(__dirname, 'users.db');
// const db      = new sqlite3.Database(dbPath, (err) => {
//   if (err) console.error('DB 연결 실패:', err.message);
//   else console.log('SQLite DB 연결 성공');
//});
//
// db.run(`
//   CREATE TABLE IF NOT EXISTS users (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     username TEXT UNIQUE,
//     email TEXT,
//     password TEXT,
//     is_verified INTEGER DEFAULT 0,
//     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
//   )
//`);
// module.exports = db;

// PostgreSQL Pool 연결 모듈
const { Pool } = require('pg');
require('dotenv').config();

console.log('🧪 DB_PASSWORD:', process.env.DB_PASSWORD, '타입:', typeof process.env.DB_PASSWORD);

// .env에 정의된 변수 로드
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
 //password: process.env.DB_PASSWORD,
 password:"mypassword"
});

pool.on('connect', () => {
  console.log('PostgreSQL connected');
});

// 앱 시작 시 users 테이블이 없으면 생성
(async () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      is_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(createTableSQL);
    console.log('users table is ready');
  } catch (err) {
    console.error('Failed to ensure users table:', err);
  }
})();

module.exports = pool;
