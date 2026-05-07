const request = require('supertest');
const app     = require('../server');

// ── Scenario 4: HR Portal Routes ─────────────────────────────────────────────

let hrToken, adminToken, interviewerToken;

beforeAll(async () => {
  const [hr, admin, iv] = await Promise.all([
    request(app).post('/api/auth/dev-login').send({ role: 'hr' }),
    request(app).post('/api/auth/dev-login').send({ role: 'admin' }),
    request(app).post('/api/auth/dev-login').send({ role: 'interviewer', number: 1 }),
  ]);
  hrToken          = hr.body.token;
  adminToken       = admin.body.token;
  interviewerToken = iv.body.token;
});

describe('GET /api/hr/applications', () => {

  test('No token → 401', async () => {
    const res = await request(app).get('/api/hr/applications');
    expect(res.statusCode).toBe(401);
  });

  test('Interviewer token → 403 (wrong role)', async () => {
    const res = await request(app)
      .get('/api/hr/applications')
      .set('Authorization', `Bearer ${interviewerToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('Admin token → 403 (wrong role)', async () => {
    const res = await request(app)
      .get('/api/hr/applications')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('HR token → 200 with applications array', async () => {
    const res = await request(app)
      .get('/api/hr/applications')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.applications)).toBe(true);
  });

  test('Search filter returns results', async () => {
    const res = await request(app)
      .get('/api/hr/applications?search=a')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.applications)).toBe(true);
  });

  test('Status filter (shortlisted) returns results', async () => {
    const res = await request(app)
      .get('/api/hr/applications?status=shortlisted')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(res.statusCode).toBe(200);
  });

});

describe('GET /api/hr/analytics', () => {

  test('No token → 401', async () => {
    const res = await request(app).get('/api/hr/analytics');
    expect(res.statusCode).toBe(401);
  });

  test('HR token → 200 with stats and monthly_trend', async () => {
    const res = await request(app)
      .get('/api/hr/analytics')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.stats).toBeDefined();
    expect(Array.isArray(res.body.monthly_trend)).toBe(true);
  });

  test('Year filter 2025 returns data', async () => {
    const res = await request(app)
      .get('/api/hr/analytics?year=2025')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.stats).toBeDefined();
  });

});

describe('GET /api/hr/match-history', () => {

  test('No token → 401', async () => {
    const res = await request(app).get('/api/hr/match-history');
    expect(res.statusCode).toBe(401);
  });

  test('HR token → 200 with history array', async () => {
    const res = await request(app)
      .get('/api/hr/match-history')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.history)).toBe(true);
  });

});
