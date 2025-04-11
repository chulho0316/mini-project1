const sqlite3 = require('sqlite3').verbose(); //sqlite3 모듈을 불러옴 .verbose()는 오류나 로그를 자세히 보여주는 모드임.
const path = require('path'); //path는 파일경로 다룰때 유용한 node.js기본 모듈임.(윈도우/리눅스 상관없이 경로를 알아서 맞춰줌.)

const dbPath = path.join(__dirname, 'users.db'); //__dirname은 지금 이 파일(db.js)이 있는 폴더 경로
// 거기에 users.db 파일 이름 붙여서 전체 경로 생성. db파일경로 설정하는거임(없으면 자동 생성됨)

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('DB 연결 실패:', err.message);
    } else {
        console.log('SQLite DB 연결 성공');
    }
}); //dbpath에 있는 파일을 연결. 파일이 없으면 자동으로 생성하고, 테이블 생성. sql이라는 언어 사용 테이블 생성 지시
db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
      )
      `); // 유저 테이블 생성하는거
      // INTEGER(id) : 자동 증가되는 번호(PK)
      // TEXT(username) : 사용자이름, 중복안됨(UNIQUE)
      // TEXT(password) : 암호화된 비밀번호 저장 예정
      // IF NOT EXISTS : 이미 있으면 만들기ㄴㄴ(중복 생성 방지)
module.exports = db;
//이 db 연결을 다른파일에서도 쓸수 있게 내보냄
//요약하자면 SQLite는 파일 기반 데이터 베이스고
//테이블은 그냥 엑셀처럼 생긴 데이터 저장 구조
//모듈 exports는 다른 js파일에 공유하기 위한 코드임