const request = require('supertest');
const app     = require('../server');

// ── Scenario 2: Authentication ────────────────────────────────────────────────

describe('POST /api/auth/dev-login', () => {

  test('HR login returns token and user with role hr', async () => {
    const res = await request(app)
      .post('/api/auth/dev-login')
      .send({ role: 'hr' });
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('hr');
    expect(res.body.user.email).toBe('hr@dev.local');
  });

  test('Admin login returns token and user with role admin', async () => {
    const res = await request(app)
      .post('/api/auth/dev-login')
      .send({ role: 'admin' });
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user.email).toBe('admin@dev.local');
  });

  test('Interviewer 1 login returns token with role interviewer', async () => {
    const res = await request(app)
      .post('/api/auth/dev-login')
      .send({ role: 'interviewer', number: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('interviewer');
    expect(res.body.user.email).toBe('interviewer1@dev.local');
  });

  test('Interviewer 3 login returns correct email', async () => {
    const res = await request(app)
      .post('/api/auth/dev-login')
      .send({ role: 'interviewer', number: 3 });
    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe('interviewer3@dev.local');
  });

  test('Invalid role returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/dev-login')
      .send({ role: 'superadmin' });
    expect(res.statusCode).toBe(400);
  });

  test('Missing role returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/dev-login')
      .send({});
    expect(res.statusCode).toBe(400);
  });

});

describe('GET /api/auth/status', () => {
  test('returns googleConfigured boolean', async () => {
    const res = await request(app).get('/api/auth/status');
    expect(res.statusCode).toBe(200);
    expect(typeof res.body.googleConfigured).toBe('boolean');
  });
});
