# 회원 기능 API 매뉴얼

## ✅ 1. 환경 설정

```bash
npm install

서버실행
node server.js
테스트실행
npx jest
1. 회원가입 성공
2. 로그인 성공
3. 내 정보 조회 (JWT 인증 필요)
4. 비밀번호 수정 (JWT 인증 필요)
5. 회원 탈퇴 (JWT 인증 필요)

JWT 인증 방식
로그인 성공 시 액세스 토큰이 발급됨
이후 API 요청 시, 헤더에 Authorization: Bearer <토큰> 형식으로 포함해야 함
[POST] /users/register
{
  "email": "test@example.com",
  "password": "1234",
  "name": "홍길동"
}
[POST] /users/login
{
  "email": "test@example.com",
  "password": "1234"
}
[GET] /users/me
Authorization: Bearer <토큰>
[PATCH] /users/password
{
  "currentPassword": "1234",
  "newPassword": "5678"
}
[DELETE] /users/delete
Authorization: Bearer <토큰>
DB: SQLite (/db/user.db)

모델 분리: userModel.js

인증 미들웨어: authenticateToken.js

테스트 파일: __tests__/user.test.js

