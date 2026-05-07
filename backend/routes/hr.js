const express = require('express');
const { getDB } = require('../database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { analyzeApplication, matchJobDescription, summarizeApplication } = require('../services/aiService');
const { sendRejectionEmail } = require('../services/emailService');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('hr'));

// ── GET /api/hr/interviewers ─────────────────────────────────────────────────

router.get('/interviewers', async (req, res) => {
  try {
    const db = getDB();
    const users = await db.prepare(`
      SELECT id, name, email
      FROM hr_users
      WHERE role = 'interviewer'
        AND deleted_at IS NULL
        AND is_active IS NOT FALSE
      ORDER BY name ASC
    `).all();
    res.json({ interviewers: users });
  } catch (err) {
    console.error('HR interviewers error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/hr/new-applications ────────────────────────────────────────────

router.get('/new-applications', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.prepare(`
      SELECT COUNT(*) as count
      FROM applications
      WHERE status = 'applied'
        AND deleted_at IS NULL
        AND created_at > NOW() - INTERVAL '24 hours'
    `).get();
    res.json({ count: result?.count || 0 });
  } catch (err) {
    console.error('HR new applications error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/hr/applications ─────────────────────────────────────────────────

router.get('/applications', async (req, res) => {
  try {
    const db = getDB();
    const { search, status, primary_role, sort = 'newest' } = req.query;

    let query = 'SELECT * FROM applications WHERE deleted_at IS NULL';
    const params = [];
    let paramIndex = 1;

    if (search) {
      const pattern = `%${search}%`;
      query += ` AND (full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex+1} OR primary_role ILIKE $${paramIndex+2})`;
      params.push(pattern, pattern, pattern);
      paramIndex += 3;
    }
    if (status) {
      // When filtering by 'rejected', include both 'rejected' and 'ai_rejected'
      if (status === 'rejected') {
        query += ` AND (status = 'rejected' OR status = 'ai_rejected')`;
      } else {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
    }
    if (primary_role) {
      query += ` AND primary_role = $${paramIndex}`;
      params.push(primary_role);
      paramIndex++;
    }

    switch (sort) {
      case 'name_asc':
        query += ' ORDER BY full_name ASC';
        break;
      case 'oldest':
        query += ' ORDER BY created_at ASC';
        break;
      default: // newest
        query += ' ORDER BY created_at DESC';
    }

    const applications = await db.prepare(query).all(...params);

    const statsQuery = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'applied'         THEN 1 ELSE 0 END) as applied,
        SUM(CASE WHEN status = 'shortlisted'     THEN 1 ELSE 0 END) as shortlisted,
        SUM(CASE WHEN status = 'rejected' OR status = 'ai_rejected'        THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'final_selected'  THEN 1 ELSE 0 END) as final_selected,
        SUM(CASE WHEN ai_score IS NOT NULL        THEN 1 ELSE 0 END) as analyzed
      FROM applications WHERE deleted_at IS NULL
    `;
    const stats = await db.prepare(statsQuery).get();

    const monthlyQuery = `
      SELECT to_char(created_at, 'YYYY-MM') as month, COUNT(*) as count
      FROM applications WHERE deleted_at IS NULL
      GROUP BY to_char(created_at, 'YYYY-MM')
      ORDER BY month ASC
      LIMIT 12
    `;
    const monthly_trend = await db.prepare(monthlyQuery).all();

    res.json({ applications, stats, monthly_trend });
  } catch (err) {
    console.error('Fetch applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// ── GET /api/hr/applications/:id ─────────────────────────────────────────────

router.get('/applications/:id', async (req, res) => {
  try {
    const db = getDB();
    const app = await db.prepare('SELECT * FROM applications WHERE id = $1 AND deleted_at IS NULL').get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const feedback = await db.prepare(
      'SELECT * FROM interview_feedback WHERE application_id = $1 ORDER BY created_at DESC'
    ).all(req.params.id);

    res.json({
      ...app,
      preferred_domains: tryParse(app.preferred_domains),
      ai_analysis: tryParse(app.ai_analysis),
      interview_feedback: feedback,
    });
  } catch (err) {
    console.error('Fetch application error:', err);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// ── POST /api/hr/applications/:id/analyze — single AI analysis ───────────────

router.post('/applications/:id/analyze', async (req, res) => {
  try {
    const db = getDB();
    const app = await db.prepare('SELECT * FROM applications WHERE id = $1 AND deleted_at IS NULL').get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const analysis = await analyzeApplication(app);

    await db.prepare(`
      UPDATE applications
      SET ai_score = $1, ai_summary = $2, ai_analysis = $3, updated_at = NOW()
      WHERE id = $4
    `).run(analysis.score, analysis.summary, JSON.stringify(analysis), app.id);

    res.json({ success: true, analysis });
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: 'AI analysis failed: ' + err.message });
  }
});

// ── POST /api/hr/analyze-all — batch AI analysis ─────────────────────────────

router.post('/analyze-all', async (req, res) => {
  try {
    const db = getDB();
    const { force = false } = req.body;

    const apps = force
      ? await db.prepare('SELECT * FROM applications WHERE deleted_at IS NULL').all()
      : await db.prepare('SELECT * FROM applications WHERE ai_score IS NULL AND deleted_at IS NULL').all();

    if (!apps.length) {
      return res.json({ analyzed: 0, message: 'No applications to analyze.' });
    }

    const results = [];
    for (const app of apps) {
      try {
        const analysis = await analyzeApplication(app);
        await db.prepare(`
          UPDATE applications
          SET ai_score = $1, ai_summary = $2, ai_analysis = $3, updated_at = NOW()
          WHERE id = $4
        `).run(analysis.score, analysis.summary, JSON.stringify(analysis), app.id);
        results.push({ id: app.id, name: app.full_name, score: analysis.score });
      } catch (err) {
        console.error(`AI failed for app ${app.id}:`, err.message);
        results.push({ id: app.id, name: app.full_name, error: err.message });
      }
    }

    const ok = results.filter((r) => !r.error);
    res.json({
      analyzed: ok.length,
      message: `${ok.length} application(s) analyzed.`,
      results,
    });
  } catch (err) {
    console.error('Batch analyze error:', err);
    res.status(500).json({ error: 'Batch analysis failed: ' + err.message });
  }
});

// ── Related-domain map for HireFit fallback ──────────────────────────────────

const RELATED_DOMAINS = {
  'Sales':                ['Business Development', 'US Staffing', 'Customer Success', 'Operations', 'Marketing & Growth'],
  'Business Development': ['Sales', 'US Staffing', 'Customer Success', 'Marketing & Growth'],
  'US Staffing':          ['Human Resources', 'Talent Acquisition', 'Sales', 'Business Development'],
  'Talent Acquisition':   ['Human Resources', 'US Staffing', 'Business Development'],
  'Human Resources':      ['Talent Acquisition', 'US Staffing'],
  'Operations':           ['Sales', 'Customer Success', 'Business Development', 'Finance'],
  'Customer Success':     ['Sales', 'Operations', 'Business Development'],
  'Marketing & Growth':   ['Sales', 'Business Development', 'Customer Success'],
  'Finance':              ['Operations', 'Business Development'],
  'Software Engineering': ['Data Science', 'Cloud & DevOps', 'Technical Support', 'Product Management'],
  'Data Science':         ['Software Engineering', 'Cloud & DevOps', 'Product Management'],
  'Cloud & DevOps':       ['Software Engineering', 'Data Science', 'Technical Support'],
  'Technical Support':    ['Software Engineering', 'Cloud & DevOps'],
  'Product Management':   ['Software Engineering', 'Data Science', 'Marketing & Growth'],
  'Design (UI/UX)':       ['Software Engineering', 'Product Management'],
};

function getRelatedDomains(domain) {
  const d = domain.toLowerCase();
  for (const [key, related] of Object.entries(RELATED_DOMAINS)) {
    if (d.includes(key.toLowerCase()) || key.toLowerCase().includes(d)) return related;
  }
  return [];
}

// ── POST /api/hr/match — tiered JD matching ──────────────────────────────────

router.post('/match', async (req, res) => {
  try {
    const { job_description, role_filter } = req.body;
    if (!job_description?.trim()) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    const db = getDB();
    const MIN_POOL = 5;
    const domain = role_filter?.trim() || '';

    // Fetch all applied candidates once
    const allApplied = await db.prepare("SELECT * FROM applications WHERE status = 'applied' AND deleted_at IS NULL").all();
    if (!allApplied.length) return res.json({ results: [], shortfall: true, message: 'No applied candidates in the system.' });

    // ── Tier candidates ───────────────────────────────────────────────────────
    const tier1 = [], tier2 = [], tier3 = [];

    if (domain) {
      const relatedDomains = getRelatedDomains(domain);
      const domainLower = domain.toLowerCase();

      for (const c of allApplied) {
        const role     = (c.primary_role || '').toLowerCase();
        const prefs    = (typeof c.preferred_domains === 'string' ? c.preferred_domains : JSON.stringify(c.preferred_domains || '')).toLowerCase();
        const inTier1  = role.includes(domainLower) || prefs.includes(domainLower);
        const inTier2  = !inTier1 && relatedDomains.some(r => role.includes(r.toLowerCase()) || prefs.includes(r.toLowerCase()));
        if (inTier1)      tier1.push({ ...c, _tier: 1 });
        else if (inTier2) tier2.push({ ...c, _tier: 2 });
        else              tier3.push({ ...c, _tier: 3 });
      }
    } else {
      // No domain filter — all candidates are tier 1
      allApplied.forEach(c => tier1.push({ ...c, _tier: 1 }));
    }

    // Build candidate pool — always try to reach MIN_POOL
    let pool = [...tier1];
    if (pool.length < MIN_POOL) pool = [...pool, ...tier2];
    if (pool.length < MIN_POOL) pool = [...pool, ...tier3];

    const shortfall = pool.length < MIN_POOL;
    const tierMap   = Object.fromEntries(pool.map(c => [c.id, c._tier]));

    // ── Score with AI ─────────────────────────────────────────────────────────
    const raw = await matchJobDescription(job_description, pool, domain);

    const results = raw
      .map((r) => {
        const c = pool.find((x) => x.id === r.application_id);
        return {
          ...r,
          full_name:           c?.full_name || `Candidate #${r.application_id}`,
          primary_role:        c?.primary_role || '',
          years_of_experience: c?.years_of_experience ?? null,
          status:              c?.status || '',
          _tier:               tierMap[r.application_id] || 3,
        };
      })
      // Sort: tier 1 first → tier 2 → tier 3; within tier, highest score first
      .sort((a, b) => a._tier !== b._tier ? a._tier - b._tier : b.match_score - a.match_score);

    // Update ai_score and auto-reject for tier 1 candidates with match_score < 50
    for (const r of results) {
      if (r.match_score < 50 && r._tier === 1) {
        await db.prepare(`UPDATE applications SET ai_score = $1, status = 'ai_rejected', updated_at = NOW() WHERE id = $2`).run(r.match_score, r.application_id);
      } else {
        await db.prepare(`UPDATE applications SET ai_score = $1, updated_at = NOW() WHERE id = $2`).run(r.match_score, r.application_id);
      }
    }

    res.json({
      results,
      shortfall,
      tier_counts: { exact: tier1.length, related: tier2.length, fallback: tier3.length },
      ...(shortfall ? { message: `Only ${pool.length} candidate(s) available — fewer than the minimum 5.` } : {}),
    });
  } catch (err) {
    console.error('JD match error:', err);
    res.status(500).json({ error: 'JD matching failed: ' + err.message });
  }
});

// ── PUT /api/hr/applications/:id/status ──────────────────────────────────────

router.put('/applications/:id/status', async (req, res) => {
  try {
    const db = getDB();
    const { status, hr_notes } = req.body;
    const { id } = req.params;

    const valid = ['applied', 'shortlisted', 'rejected', 'another_round', 'final_selected', 'ai_rejected'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${valid.join(', ')}` });
    }

    const app = await db.prepare('SELECT * FROM applications WHERE id = $1 AND deleted_at IS NULL').get(id);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    await db.prepare(`
      UPDATE applications
      SET status = $1, hr_notes = $2, action_by = $3, hr_action_by = $3, updated_at = NOW()
      WHERE id = $4
    `).run(status, hr_notes?.trim() ?? app.hr_notes, req.user.name, id);

    if (status === 'rejected' && app.status !== 'rejected') {
      sendRejectionEmail({ ...app, hr_notes: hr_notes?.trim() }).catch(
        (e) => console.error('Rejection email error:', e.message)
      );
    }

    res.json({ success: true, message: `Status updated to "${status}"` });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// ── POST /api/hr/applications/:id/summary — AI recruiter summary ──────────────

router.post('/applications/:id/summary', async (req, res) => {
  try {
    const db = getDB();
    const app = await db.prepare('SELECT * FROM applications WHERE id = $1').get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const summary = await summarizeApplication(app);

    const summaryJson = JSON.stringify(summary);
    await db.prepare(`
      UPDATE applications SET ai_summary = $1, ai_analysis = $2, updated_at = NOW() WHERE id = $3
    `).run(summaryJson, summaryJson, app.id);

    res.json({ success: true, summary });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'AI summary failed: ' + err.message });
  }
});

// ── GET /api/hr/analytics ─────────────────────────────────────────────────────

router.get('/analytics', async (req, res) => {
  try {
    const db = getDB();
    const year = req.query.year ? parseInt(req.query.year) : null;
    const yf = (year && !isNaN(year)) ? `EXTRACT(YEAR FROM created_at) = ${year}` : null;
    const WHERE = yf ? `WHERE deleted_at IS NULL AND ${yf}` : 'WHERE deleted_at IS NULL';
    const AND   = yf ? `AND deleted_at IS NULL AND ${yf}` : 'AND deleted_at IS NULL';

    const stats = await db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'applied'         THEN 1 ELSE 0 END) as applied,
        SUM(CASE WHEN status = 'shortlisted'     THEN 1 ELSE 0 END) as shortlisted,
        SUM(CASE WHEN status = 'rejected' OR status = 'ai_rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'final_selected'  THEN 1 ELSE 0 END) as final_selected,
        SUM(CASE WHEN status = 'ai_rejected'     THEN 1 ELSE 0 END) as ai_rejected
      FROM applications ${WHERE}
    `).get();

    const statusDistribution = await db.prepare(`
      SELECT status, COUNT(*) as count
      FROM applications ${WHERE}
      GROUP BY status ORDER BY count DESC
    `).all();

    const roleDistribution = await db.prepare(`
      SELECT primary_role as role, COUNT(*) as count
      FROM applications ${WHERE}
      GROUP BY primary_role ORDER BY count DESC LIMIT 10
    `).all();

    const monthlyTrend = await db.prepare(`
      SELECT to_char(created_at, 'YYYY-MM') as month, COUNT(*) as count
      FROM applications ${WHERE}
      GROUP BY to_char(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `).all();

    const recentCount = await db.prepare(`
      SELECT COUNT(*) as count FROM applications
      WHERE created_at >= NOW() - INTERVAL '7 days' ${AND}
    `).get();

    const availableYears = await db.prepare(`
      SELECT DISTINCT EXTRACT(YEAR FROM created_at)::int AS yr
      FROM applications WHERE deleted_at IS NULL ORDER BY yr ASC
    `).all();

    res.json({
      stats,
      status_distribution: statusDistribution,
      role_distribution: roleDistribution,
      monthly_trend: monthlyTrend,
      recent_7_days: recentCount?.count || 0,
      available_years: availableYears.map(r => r.yr),
      summary: {
        total: stats.total,
        applied: stats.applied,
        shortlisted: stats.shortlisted,
        rejected: stats.rejected,
        final_selected: stats.final_selected,
      }
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ── GET /api/hr/roles ────────────────────────────────────────────────────────

router.get('/roles', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.prepare(`
      SELECT DISTINCT primary_role FROM applications WHERE deleted_at IS NULL ORDER BY primary_role ASC
    `).all();
    const roles = result.map(r => r.primary_role).filter(Boolean);
    res.json(roles);
  } catch (err) {
    console.error('Roles fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// ── GET /api/hr/match-history ────────────────────────────────────────────────

router.get('/match-history', async (req, res) => {
  try {
    const db = getDB();
    console.log('📥 Fetching match history...');

    const history = await db.prepare(`
      SELECT * FROM jd_matches ORDER BY created_at DESC LIMIT 50
    `).all();

    console.log(`✓ Retrieved ${history.length} match history records`);

    const formattedHistory = history.map(h => {
      const createdDate = h.created_at ? new Date(h.created_at) : null;
      return {
        id: h.id,
        role: h.role || 'Unknown',
        date: createdDate ? createdDate.toLocaleDateString() : '',
        time: createdDate ? createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        jdSnippet: h.job_description ? h.job_description.trim().slice(0, 220).replace(/\s+/g, ' ') : '',
        jdFull: h.job_description ? h.job_description.trim() : '',
        results: h.results ? JSON.parse(h.results) : [],
      };
    });

    res.json({
      success: true,
      count: formattedHistory.length,
      history: formattedHistory,
    });
  } catch (err) {
    console.error('❌ Match history fetch error:', {
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: 'Failed to fetch match history: ' + err.message });
  }
});

// ── POST /api/hr/match-history ───────────────────────────────────────────────

router.post('/match-history', async (req, res) => {
  try {
    const db = getDB();
    const { role, jobDescription, results } = req.body;

    console.log('Received match-history save request:', { role: role?.slice(0, 20), jdLength: jobDescription?.length, resultsCount: results?.length });

    if (!role || !role.trim()) {
      console.warn('Save failed: Missing role');
      return res.status(400).json({ error: 'Role is required' });
    }

    if (!jobDescription || !jobDescription.trim()) {
      console.warn('Save failed: Missing jobDescription');
      return res.status(400).json({ error: 'Job description is required' });
    }

    if (!Array.isArray(results)) {
      console.warn('Save failed: Results is not an array');
      return res.status(400).json({ error: 'Results must be an array' });
    }

    const insertResult = await db.prepare(`
      INSERT INTO jd_matches (role, job_description, results)
      VALUES ($1, $2, $3)
    `).run(role.trim(), jobDescription.trim(), JSON.stringify(results));

    console.log('✓ Match history saved successfully');
    res.json({ success: true });
  } catch (err) {
    console.error('Match history save error:', err.message, err);
    res.status(500).json({ error: 'Failed to save match history: ' + err.message });
  }
});

// ── PUT /api/hr/applications/:id/assign ──────────────────────────────────────

router.put('/applications/:id/assign', async (req, res) => {
  try {
    const db = getDB();
    const { assigned_interviewer } = req.body;
    await db.prepare(`UPDATE applications SET assigned_interviewer = $1, updated_at = NOW() WHERE id = $2`)
      .run(assigned_interviewer || null, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Assign error:', err);
    res.status(500).json({ error: 'Failed to assign interviewer' });
  }
});

// ── PUT /api/hr/applications/:id/assign-multi ─────────────────────────────────

router.put('/applications/:id/assign-multi', async (req, res) => {
  try {
    const db = getDB();
    const { interviewers } = req.body;
    if (!Array.isArray(interviewers)) {
      return res.status(400).json({ error: 'interviewers must be an array' });
    }
    const json = interviewers.length ? JSON.stringify(interviewers) : null;
    const first = interviewers[0] || null;
    await db.prepare(
      `UPDATE applications SET assigned_interviewers = $1, assigned_interviewer = $2, updated_at = NOW() WHERE id = $3`
    ).run(json, first, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Assign-multi error:', err);
    res.status(500).json({ error: 'Failed to assign interviewers' });
  }
});

// ── PUT /api/hr/applications/:id/notes ───────────────────────────────────────

router.put('/applications/:id/notes', async (req, res) => {
  try {
    const db = getDB();
    const { hr_notes } = req.body;
    await db.prepare(`UPDATE applications SET hr_notes = $1, updated_at = NOW() WHERE id = $2`)
      .run(hr_notes?.trim() || null, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('HR notes error:', err);
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

// ── PUT /api/hr/applications/:id/interviewer-notes ───────────────────────────

router.put('/applications/:id/interviewer-notes', async (req, res) => {
  try {
    const db = getDB();
    const { hr_notes_for_interviewer } = req.body;
    await db.prepare(`UPDATE applications SET hr_notes_for_interviewer = $1, updated_at = NOW() WHERE id = $2`)
      .run(hr_notes_for_interviewer?.trim() || null, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Interviewer notes error:', err);
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

// ── DELETE /api/hr/match-history ─────────────────────────────────────────────

router.delete('/match-history', async (req, res) => {
  try {
    const db = getDB();
    await db.prepare('DELETE FROM jd_matches').run();
    res.json({ success: true });
  } catch (err) {
    console.error('Match history delete error:', err);
    res.status(500).json({ error: 'Failed to clear match history' });
  }
});

// ── Helper ────────────────────────────────────────────────────────────────────

function tryParse(str) {
  if (!str) return str;
  try { return JSON.parse(str); } catch { return str; }
}

// ── GET /api/hr/my-profile ────────────────────────────────────────────────────

router.get('/my-profile', async (req, res) => {
  try {
    const db = getDB();
    const user = await db.prepare(
      'SELECT id, email, name, role, avatar_url, created_at FROM hr_users WHERE id = $1'
    ).get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const processedApps = await db.prepare(`
      SELECT id, full_name, primary_role, status, action_by, updated_at
      FROM applications
      WHERE action_by = $1 AND deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 30
    `).all(req.user.name);

    res.json({ user, processedApps });
  } catch (err) {
    console.error('HR my-profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
