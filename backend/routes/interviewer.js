const express = require('express');
const { getDB } = require('../database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { summarizeApplication } = require('../services/aiService');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('interviewer'));

// ── GET /api/interviewer/applications ────────────────────────────────────────

router.get('/applications', async (req, res) => {
  try {
    const db = getDB();
    const { search, status, sort } = req.query;
    const userEmail = req.user.email;
    const legacyKey = userEmail.split('@')[0]; // backward compat for old stored keys
    const emailJson  = JSON.stringify([userEmail]);
    const legacyJson = JSON.stringify([legacyKey]);

    let query = `
      SELECT
        a.*,
        (SELECT decision FROM interview_feedback
         WHERE application_id = a.id ORDER BY created_at DESC LIMIT 1) as feedback_decision,
        (SELECT overall_score FROM interview_feedback
         WHERE application_id = a.id ORDER BY created_at DESC LIMIT 1) as latest_score
      FROM applications a
      WHERE a.status IN ('shortlisted', 'another_round', 'rejected', 'final_selected')
      AND a.deleted_at IS NULL
      AND (
        (a.assigned_interviewers IS NOT NULL AND (
          a.assigned_interviewers::jsonb @> $1::jsonb
          OR a.assigned_interviewers::jsonb @> $3::jsonb
        ))
        OR (a.assigned_interviewers IS NULL AND (
          a.assigned_interviewer = $2
          OR a.assigned_interviewer = $4
        ))
      )
    `;
    const params = [emailJson, userEmail, legacyJson, legacyKey];
    let paramIndex = 5;

    if (search) {
      const pattern = `%${search}%`;
      query += ` AND (a.full_name ILIKE $${paramIndex} OR a.email ILIKE $${paramIndex+1} OR a.primary_role ILIKE $${paramIndex+2})`;
      params.push(pattern, pattern, pattern);
      paramIndex += 3;
    }

    if (status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(status);
    }

    const orderBy = sort === 'oldest' ? 'a.created_at ASC'
                  : sort === 'alpha'  ? 'a.full_name ASC'
                  : 'a.updated_at DESC';
    query += ` ORDER BY ${orderBy}`;

    const applications = await db.prepare(query).all(...params);

    // Stats — scoped to this interviewer
    const statsRows = await db.prepare(`
      SELECT a.status,
        (SELECT decision FROM interview_feedback
         WHERE application_id = a.id ORDER BY created_at DESC LIMIT 1) as feedback_decision
      FROM applications a
      WHERE a.status IN ('shortlisted', 'another_round', 'rejected', 'final_selected')
      AND a.deleted_at IS NULL
      AND (
        (a.assigned_interviewers IS NOT NULL AND (
          a.assigned_interviewers::jsonb @> $1::jsonb
          OR a.assigned_interviewers::jsonb @> $3::jsonb
        ))
        OR (a.assigned_interviewers IS NULL AND (
          a.assigned_interviewer = $2
          OR a.assigned_interviewer = $4
        ))
      )
    `).all(emailJson, userEmail, legacyJson, legacyKey);

    const stats = {
      total:            statsRows.length,
      shortlisted:      statsRows.filter((r) => r.status === 'shortlisted').length,
      under_evaluation: statsRows.filter((r) => r.status === 'another_round').length,
      rejected:         statsRows.filter((r) => r.status === 'rejected').length,
      selected:         statsRows.filter((r) => r.status === 'final_selected').length,
    };

    res.json({ applications, stats });
  } catch (err) {
    console.error('Interviewer fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// ── GET /api/interviewer/applications/:id ────────────────────────────────────

router.get('/applications/:id', async (req, res) => {
  try {
    const db = getDB();
    const app = await db.prepare(
      "SELECT * FROM applications WHERE id = $1 AND deleted_at IS NULL AND status != 'applied'"
    ).get(req.params.id);

    if (!app) {
      return res.status(404).json({ error: 'Candidate not found or not yet shortlisted' });
    }

    const feedbacks = await db.prepare(
      'SELECT * FROM interview_feedback WHERE application_id = $1 ORDER BY created_at DESC'
    ).all(req.params.id);

    res.json({
      ...app,
      preferred_domains: tryParse(app.preferred_domains),
      ai_analysis: tryParse(app.ai_analysis),
      interview_feedback: feedbacks,
    });
  } catch (err) {
    console.error('Interviewer get candidate error:', err);
    res.status(500).json({ error: 'Failed to fetch candidate' });
  }
});

// ── POST /api/interviewer/applications/:id/summary ───────────────────────────

router.post('/applications/:id/summary', async (req, res) => {
  try {
    const db = getDB();
    const app = await db.prepare('SELECT * FROM applications WHERE id = $1 AND deleted_at IS NULL').get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const summary = await summarizeApplication(app);
    const summaryJson = JSON.stringify(summary);

    await db.prepare(`
      UPDATE applications SET ai_summary = $1, ai_analysis = $2, updated_at = NOW() WHERE id = $3
    `).run(summaryJson, summaryJson, app.id);

    res.json({ success: true, summary });
  } catch (err) {
    console.error('Interviewer summary error:', err);
    res.status(500).json({ error: 'AI summary failed: ' + err.message });
  }
});

// ── POST /api/interviewer/applications/:id/feedback ──────────────────────────

router.post('/applications/:id/feedback', async (req, res) => {
  try {
    const db = getDB();
    const {
      attitude_score, confidence_score, knowledge_score, cultural_fit_score,
      feedback_notes, decision, round = 1,
    } = req.body;
    const { id } = req.params;

    const app = await db.prepare('SELECT id, status FROM applications WHERE id = $1 AND deleted_at IS NULL').get(id);
    if (!app) return res.status(404).json({ error: 'Candidate not found' });

    if (!['shortlisted', 'another_round'].includes(app.status)) {
      return res.status(400).json({ error: 'Candidate must be in shortlisted or another_round status' });
    }

    if (!['proceed', 'reject', 'another_round'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be: proceed, reject, or another_round' });
    }

    const scores = [
      Number(attitude_score), Number(confidence_score),
      Number(knowledge_score), Number(cultural_fit_score),
    ];
    if (scores.some((s) => isNaN(s) || s < 1 || s > 5)) {
      return res.status(400).json({ error: 'All scores must be integers between 1 and 5' });
    }

    const overall = parseFloat((scores.reduce((a, b) => a + b, 0) / 4).toFixed(2));

    await db.prepare(`
      INSERT INTO interview_feedback
        (application_id, round, attitude_score, confidence_score, knowledge_score,
         cultural_fit_score, overall_score, feedback_notes, decision, submitted_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `).run(id, round, ...scores, overall, feedback_notes?.trim() || null, decision, req.user.name);

    const statusMap = { proceed: 'final_selected', another_round: 'another_round', reject: 'rejected' };
    await db.prepare('UPDATE applications SET status = $1, action_by = $2, updated_at = NOW() WHERE id = $3')
      .run(statusMap[decision], req.user.name, id);

    res.json({ success: true, overall_score: overall });
  } catch (err) {
    console.error('Feedback save error:', err);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// ── Helper ────────────────────────────────────────────────────────────────────

function tryParse(str) {
  if (!str) return str;
  try { return JSON.parse(str); } catch { return str; }
}

// ── GET /api/interviewer/my-profile ──────────────────────────────────────────

router.get('/my-profile', async (req, res) => {
  try {
    const db = getDB();
    const user = await db.prepare(
      'SELECT id, email, name, role, avatar_url, created_at FROM hr_users WHERE id = $1'
    ).get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const profileEmail  = req.user.email;
    const profileLegacy = profileEmail.split('@')[0];
    const profileEmailJson  = JSON.stringify([profileEmail]);
    const profileLegacyJson = JSON.stringify([profileLegacy]);
    const assignedApps = await db.prepare(`
      SELECT id, full_name, primary_role, status, action_by, updated_at
      FROM applications
      WHERE deleted_at IS NULL
        AND (
          (assigned_interviewers IS NOT NULL AND (
            assigned_interviewers::jsonb @> $1::jsonb
            OR assigned_interviewers::jsonb @> $3::jsonb
          ))
          OR (assigned_interviewers IS NULL AND (
            assigned_interviewer = $2
            OR assigned_interviewer = $4
          ))
        )
      ORDER BY updated_at DESC
      LIMIT 30
    `).all(profileEmailJson, profileEmail, profileLegacyJson, profileLegacy);

    res.json({ user, assignedApps });
  } catch (err) {
    console.error('Interviewer my-profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
