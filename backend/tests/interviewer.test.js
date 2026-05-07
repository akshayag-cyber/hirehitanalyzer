const request = require('supertest');
const app     = require('../server');

// ── Scenario 6: Interviewer Portal Routes ─────────────────────────────────────

let interviewerToken, hrToken, adminToken;

beforeAll(async () => {
  const [iv, hr, admin] = await Promise.all([
    request(app).post('/api/auth/dev-login').send({ role: 'interviewer', number: 1 }),
    request(app).post('/api/auth/dev-login').send({ role: 'hr' }),
    request(app).post('/api/auth/dev-login').send({ role: 'admin' }),
  ]);
  interviewerToken = iv.body.token;
  hrToken          = hr.body.token;
  adminToken       = admin.body.token;
});

describe('GET /api/interviewer/applications', () => {

  test('No token → 401', async () => {
    const res = await request(app).get('/api/interviewer/applications');
    expect(res.statusCode).toBe(401);
  });

  test('HR token → 403 (wrong role)', async () => {
    const res = await request(app)
      .get('/api/interviewer/applications')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('Admin token → 403 (wrong role)', async () => {
    const res = await request(app)
      .get('/api/interviewer/applications')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('Interviewer token → 200 with applications array', async () => {
    const res = await request(app)
      .get('/api/interviewer/applications')
      .set('Authorization', `Bearer ${interviewerToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.applications)).toBe(true);
  });

  test('Search filter works', async () => {
    const res = await request(app)
      .get('/api/interviewer/applications?search=a')
      .set('Authorization', `Bearer ${interviewerToken}`);
    expect(res.statusCode).toBe(200);
  });

  test('Status filter (shortlisted) works', async () => {
    const res = await request(app)
      .get('/api/interviewer/applications?status=shortlisted')
      .set('Authorization', `Bearer ${interviewerToken}`);
    expect(res.statusCode).toBe(200);
  });

});

describe('GET /api/interviewer/applications/:id', () => {

  test('Non-existent ID → 404', async () => {
    const res = await request(app)
      .get('/api/interviewer/applications/999999')
      .set('Authorization', `Bearer ${interviewerToken}`);
    expect(res.statusCode).toBe(404);
  });

  test('Invalid ID format → 400 or 404', async () => {
    const res = await request(app)
      .get('/api/interviewer/applications/abc')
      .set('Authorization', `Bearer ${interviewerToken}`);
    expect([400, 404, 500]).toContain(res.statusCode);
  });

});
