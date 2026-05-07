const request = require('supertest');
const app     = require('../server');

// ── Scenario 5: Admin Portal Routes ──────────────────────────────────────────

let adminToken, hrToken, interviewerToken;

beforeAll(async () => {
  const [admin, hr, iv] = await Promise.all([
    request(app).post('/api/auth/dev-login').send({ role: 'admin' }),
    request(app).post('/api/auth/dev-login').send({ role: 'hr' }),
    request(app).post('/api/auth/dev-login').send({ role: 'interviewer', number: 1 }),
  ]);
  adminToken       = admin.body.token;
  hrToken          = hr.body.token;
  interviewerToken = iv.body.token;
});

describe('GET /api/admin/stats', () => {

  test('No token → 401', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.statusCode).toBe(401);
  });

  test('HR token → 403 (wrong role)', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('Interviewer token → 403 (wrong role)', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${interviewerToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('Admin token → 200 with candidate and user counts', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(typeof res.body.total_candidates).toBe('number');
    expect(typeof res.body.total_users).toBe('number');
  });

});

describe('GET /api/admin/users', () => {

  test('No token → 401', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.statusCode).toBe(401);
  });

  test('HR token → 403', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('Admin token → 200 with users array', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThan(0);
  });

  test('Deleted users filter returns array', async () => {
    const res = await request(app)
      .get('/api/admin/users?deleted=true')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
  });

});

describe('GET /api/admin/applications', () => {

  test('Admin token → 200 with applications array', async () => {
    const res = await request(app)
      .get('/api/admin/applications')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.applications)).toBe(true);
  });

  test('Deleted applications filter works', async () => {
    const res = await request(app)
      .get('/api/admin/applications?deleted=true')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.applications)).toBe(true);
  });

});

describe('GET /api/admin/audit-logs', () => {

  test('No token → 401', async () => {
    const res = await request(app).get('/api/admin/audit-logs');
    expect(res.statusCode).toBe(401);
  });

  test('Admin token → 200 with logs array', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.logs)).toBe(true);
  });

});

describe('POST /api/admin/users (create user)', () => {

  test('Create new user with valid data → 200 with user object', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name:  'Test Interviewer',
        email: `test_${Date.now()}@teststaff.local`,
        role:  'interviewer',
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe('interviewer');
  });

  test('Create user with missing email → 400', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'No Email', role: 'hr' });
    expect(res.statusCode).toBe(400);
  });

  test('Create user with invalid role → 400', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bad Role', email: `bad_${Date.now()}@test.local`, role: 'superuser' });
    expect(res.statusCode).toBe(400);
  });

});
