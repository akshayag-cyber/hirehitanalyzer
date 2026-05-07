const request = require('supertest');
const app     = require('../server');

// Unique email per test run to avoid duplicate-email conflicts
const uid  = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;
const mail = () => `test_${uid()}@testcandidate.local`;

// Minimal fake PDF buffer (CV is required by backend)
const FAKE_CV = Buffer.from('%PDF-1.4 fake cv content for testing');

function buildRequest(overrides = {}) {
  const fields = {
    full_name:              'Test Candidate',
    email:                  mail(),
    phone:                  '9876543210',
    years_of_experience:    '2',
    preferred_domain:       'Sales',
    education:              "Bachelor's Degree",
    salary_flexible:        'true',
    night_shift_preference: 'Yes',
    ...overrides,
  };
  let req = request(app).post('/api/applications');
  // Attach fields
  for (const [key, val] of Object.entries(fields)) {
    req = req.field(key, val);
  }
  // Attach CV unless explicitly skipped
  if (overrides._skipCV !== true) {
    req = req.attach('cv', FAKE_CV, { filename: 'cv.pdf', contentType: 'application/pdf' });
  }
  return req;
}

// ── Scenario 3: Application Submission ───────────────────────────────────────

describe('POST /api/applications', () => {

  test('Valid submission returns 201', async () => {
    const res = await buildRequest();
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.id).toBeDefined();
  });

  test('Duplicate email returns 409', async () => {
    const email = mail();
    await buildRequest({ email });
    const res = await buildRequest({ email });
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/already submitted|duplicate|exists/i);
  });

  test('Missing CV returns 400', async () => {
    const res = await buildRequest({ _skipCV: true });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/cv|resume/i);
  });

  test('Missing full_name returns 400', async () => {
    const res = await buildRequest({ full_name: '' });
    expect(res.statusCode).toBe(400);
  });

  test('Missing email returns 400', async () => {
    const res = await buildRequest({ email: '' });
    expect(res.statusCode).toBe(400);
  });

  test('Missing phone returns 400', async () => {
    const res = await buildRequest({ phone: '' });
    expect(res.statusCode).toBe(400);
  });

  test('Invalid email format returns 400', async () => {
    const res = await buildRequest({ email: 'not-an-email' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid email/i);
  });

  test('Invalid phone format returns 400', async () => {
    const res = await buildRequest({ phone: 'ABCDEF' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid phone/i);
  });

});
