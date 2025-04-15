const request = require('supertest');
const app = require('../server'); // 서버 내보내기 필수!

describe('회원 기능 테스트', () => {
  let token;
  let userId;

  const testUser = {
    username: 'testuser',
    password: 'testpass123'
  };

  it('1. 회원가입 성공', async () => {
    const res = await request(app).post('/user').send(testUser);
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('회원가입 성공!');
    userId = res.body.userId;
  });

  it('2. 로그인 성공', async () => {
    const res = await request(app).post('/user/login').send(testUser);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('로그인 성공');
    token = res.body.token;
  });

  it('3. 로그인된 사용자 정보 조회', async () => {
    const res = await request(app)
      .get('/user/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.user.username).toBe(testUser.username);
  });

  it('4. 비밀번호 수정', async () => {
    const res = await request(app)
      .patch(`/user/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'newpass123' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('비밀번호가 성공적으로 변경되었습니다.');
  });

  it('5. 회원 탈퇴', async () => {
    const res = await request(app)
      .delete(`/user/${userId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('회원 탈퇴가 완료되었습니다.');
  });
});
