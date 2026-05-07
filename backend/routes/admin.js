const express = require('express');
const { getDB } = require('../database');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

async function logAudit(db, req, action, targetType, targetId, targetName, details) {
  await db.prepare(
    `INSERT INTO audit_logs (actor_email, actor_name, action, target_type, target_id, target_name, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(req.user.email, req.user.name, action, targetType || null, targetId || null, targetName || null, details || null);
}

router.get('/stats', async (req, res) => {
  try {
    const db = getDB();
    const appStats = await db.prepare(`
      SELECT
        COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total_candidates,
        COUNT(*) FILTER (WHERE status = 'shortlisted' AND deleted_at IS NULL) AS shortlisted,
        COUNT(*) FILTER (WHERE status = 'rejected' AND deleted_at IS NULL) AS rejected,
        COUNT(*) FILTER (WHERE status = 'final_selected' AND deleted_at IS NULL) AS final_selected,
        COUNT(*) FILTER (WHERE status = 'another_round' AND deleted_at IS NULL) AS another_round,
        COUNT(*) FILTER (WHERE status = 'applied' AND deleted_at IS NULL) AS applied,
        COUNT(*) FILTER (WHERE ai_score IS NOT NULL AND deleted_at IS NULL) AS ai_analyzed
      FROM applications
    `).get();
    const userStats = await db.prepare(`
      SELECT
        COUNT(*) AS total_users,
        COUNT(*) FILTER (WHERE role = 'hr') AS hr_count,
        COUNT(*) FILTER (WHERE role = 'interviewer') AS interviewer_count
      FROM hr_users
    `).get();
    res.json({
      total_candidates: Number(appStats.total_candidates) || 0,
      shortlisted: Number(appStats.shortlisted) || 0,
      rejected: Number(appStats.rejected) || 0,
      final_selected: Number(appStats.final_selected) || 0,
      another_round: Number(appStats.another_round) || 0,
      applied: Number(appStats.applied) || 0,
      ai_analyzed: Number(appStats.ai_analyzed) || 0,
      total_users: Number(userStats.total_users) || 0,
      hr_count: Number(userStats.hr_count) || 0,
      interviewer_count: Number(userStats.interviewer_count) || 0,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const db = getDB();
    const showDeleted = req.query.deleted === 'true';
    const condition = showDeleted ? 'WHERE deleted_at IS NOT NULL' : 'WHERE deleted_at IS NULL';
    const users = await db.prepare(`SELECT * FROM hr_users ${condition} ORDER BY created_at DESC`).all();
    res.json({ users });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const db = getDB();
    const { email, name, role } = req.body;
    if (!email || !name || !role) return res.status(400).json({ error: 'email, name, role are required' });
    if (!['hr', 'interviewer', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const existing = await db.prepare('SELECT id FROM hr_users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already exists' });
    const result = await db.prepare(
      `INSERT INTO hr_users (email, name, role, approval_status, is_active) VALUES (?, ?, ?, 'approved', true) RETURNING id`
    ).run(email, name, role);
    const user = await db.prepare('SELECT * FROM hr_users WHERE id = ?').get(result.lastInsertRowid);
    await logAudit(db, req, 'user_created', 'user', user.id, user.name, `Role: ${role}`);
    res.json({ user });
  } catch (err) {
    console.error('Admin create user error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { name, role, is_active } = req.body;
    const roleValue = role === '' ? null : role; // empty string → clear the role
    if (roleValue && !['hr', 'interviewer', 'admin'].includes(roleValue)) return res.status(400).json({ error: 'Invalid role' });
    const user = await db.prepare('SELECT * FROM hr_users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const newName     = name      !== undefined ? name      : user.name;
    const newRole     = role      !== undefined ? roleValue : user.role;
    const newIsActive = is_active !== undefined ? is_active : user.is_active;
    await db.prepare(
      `UPDATE hr_users SET name = $1, role = $2, is_active = $3 WHERE id = $4`
    ).run(newName, newRole, newIsActive, id);
    const updated = await db.prepare('SELECT * FROM hr_users WHERE id = ?').get(id);
    await logAudit(db, req, 'user_updated', 'user', Number(id), updated.name, `Role: ${updated.role}`);
    res.json({ user: updated });
  } catch (err) {
    console.error('Admin update user error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const user = await db.prepare('SELECT * FROM hr_users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.email === req.user.email) return res.status(400).json({ error: 'Cannot delete your own account' });
    await db.prepare('UPDATE hr_users SET deleted_at = NOW() WHERE id = ?').run(id);
    await logAudit(db, req, 'user_deleted', 'user', Number(id), user.name, `Email: ${user.email}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/:id/restore', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const user = await db.prepare('SELECT * FROM hr_users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await db.prepare('UPDATE hr_users SET deleted_at = NULL WHERE id = ?').run(id);
    await logAudit(db, req, 'user_restored', 'user', Number(id), user.name, `Email: ${user.email}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin restore user error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/bulk-delete', async (req, res) => {
  try {
    const db = getDB();
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array is required' });
    const numIds = ids.map(Number).filter(Number.isFinite).filter((id) => id !== req.user.id);
    if (numIds.length === 0) return res.status(400).json({ error: 'No valid ids' });
    const placeholders = numIds.map((_, i) => `$${i + 1}`).join(',');
    await db.prepare(`UPDATE hr_users SET deleted_at = NOW() WHERE id IN (${placeholders})`).run(...numIds);
    await logAudit(db, req, 'bulk_user_deleted', 'user', null, `${numIds.length} users`, `IDs: ${numIds.join(', ')}`);
    res.json({ success: true, count: numIds.length });
  } catch (err) {
    console.error('Admin bulk delete users error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/bulk-restore', async (req, res) => {
  try {
    const db = getDB();
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array is required' });
    const numIds = ids.map(Number).filter(Number.isFinite);
    const placeholders = numIds.map((_, i) => `$${i + 1}`).join(',');
    await db.prepare(`UPDATE hr_users SET deleted_at = NULL WHERE id IN (${placeholders})`).run(...numIds);
    await logAudit(db, req, 'bulk_user_restored', 'user', null, `${numIds.length} users`, `IDs: ${numIds.join(', ')}`);
    res.json({ success: true, count: numIds.length });
  } catch (err) {
    console.error('Admin bulk restore users error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/bulk-purge', async (req, res) => {
  try {
    const db = getDB();
    const { ids } = req.body;
    let rows;
    if (Array.isArray(ids) && ids.length > 0) {
      const numIds = ids.map(Number).filter(Number.isFinite);
      const placeholders = numIds.map((_, i) => `$${i + 1}`).join(',');
      rows = await db.prepare(`SELECT id FROM hr_users WHERE id IN (${placeholders}) AND deleted_at IS NOT NULL`).all(...numIds);
    } else {
      rows = await db.prepare(`SELECT id FROM hr_users WHERE deleted_at IS NOT NULL`).all();
    }
    if (rows.length === 0) return res.json({ success: true, count: 0 });
    const targetIds = rows.map((r) => r.id);
    const placeholders = targetIds.map((_, i) => `$${i + 1}`).join(',');
    await db.prepare(`DELETE FROM hr_users WHERE id IN (${placeholders})`).run(...targetIds);
    await logAudit(db, req, 'users_purged', 'user', null, `${targetIds.length} users`, `Permanently deleted IDs: ${targetIds.join(', ')}`);
    res.json({ success: true, count: targetIds.length });
  } catch (err) {
    console.error('Admin purge users error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/:id/toggle-active', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const user = await db.prepare('SELECT * FROM hr_users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const newActive = !user.is_active;
    await db.prepare('UPDATE hr_users SET is_active = ? WHERE id = ?').run(newActive, id);
    const action = newActive ? 'user_activated' : 'user_deactivated';
    await logAudit(db, req, action, 'user', Number(id), user.name, null);
    const updated = await db.prepare('SELECT * FROM hr_users WHERE id = ?').get(id);
    res.json({ user: updated });
  } catch (err) {
    console.error('Admin toggle active error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/applications', async (req, res) => {
  try {
    const db = getDB();
    const { search, status, deleted, sort } = req.query;
    const showDeleted = deleted === 'true';
    const conditions = [showDeleted ? 'a.deleted_at IS NOT NULL' : 'a.deleted_at IS NULL'];
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      conditions.push(`(a.full_name ILIKE $${params.length - 1} OR a.email ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const orderBy = sort === 'oldest' ? 'a.created_at ASC'
                  : sort === 'alpha'  ? 'a.full_name ASC'
                  : 'a.created_at DESC';
    const sql = `
      SELECT a.*,
        f.overall_score, f.decision AS interview_decision,
        f.attitude_score, f.confidence_score, f.knowledge_score,
        f.cultural_fit_score, f.feedback_notes, f.submitted_by AS interviewer_submitted_by
      FROM applications a
      LEFT JOIN LATERAL (
        SELECT overall_score, decision, attitude_score, confidence_score, knowledge_score,
               cultural_fit_score, feedback_notes, submitted_by
        FROM interview_feedback
        WHERE application_id = a.id
        ORDER BY created_at DESC LIMIT 1
      ) f ON true
      ${where}
      ORDER BY ${orderBy}
    `;
    const applications = await db.prepare(sql).all(...params);
    res.json({ applications });
  } catch (err) {
    console.error('Admin applications error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/applications/:id', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const app = await db.prepare('SELECT id, full_name, email FROM applications WHERE id = ?').get(id);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    await db.prepare('UPDATE applications SET deleted_at = NOW() WHERE id = ?').run(id);
    await logAudit(db, req, 'application_deleted', 'application', Number(id), app.full_name, `Email: ${app.email}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin soft delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/applications/:id/restore', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const app = await db.prepare('SELECT id, full_name, email FROM applications WHERE id = ?').get(id);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    await db.prepare('UPDATE applications SET deleted_at = NULL WHERE id = ?').run(id);
    await logAudit(db, req, 'application_restored', 'application', Number(id), app.full_name, `Email: ${app.email}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin restore error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/applications/bulk-delete', async (req, res) => {
  try {
    const db = getDB();
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array is required' });
    const numIds = ids.map(Number).filter(Number.isFinite);
    const placeholders = numIds.map((_, i) => `$${i + 1}`).join(',');
    await db.prepare(`UPDATE applications SET deleted_at = NOW() WHERE id IN (${placeholders})`).run(...numIds);
    await logAudit(db, req, 'bulk_application_deleted', 'application', null, `${numIds.length} applications`, `IDs: ${numIds.join(', ')}`);
    res.json({ success: true, count: numIds.length });
  } catch (err) {
    console.error('Admin bulk delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/applications/bulk-restore', async (req, res) => {
  try {
    const db = getDB();
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array is required' });
    const numIds = ids.map(Number).filter(Number.isFinite);
    const placeholders = numIds.map((_, i) => `$${i + 1}`).join(',');
    await db.prepare(`UPDATE applications SET deleted_at = NULL WHERE id IN (${placeholders})`).run(...numIds);
    await logAudit(db, req, 'bulk_application_restored', 'application', null, `${numIds.length} applications`, `IDs: ${numIds.join(', ')}`);
    res.json({ success: true, count: numIds.length });
  } catch (err) {
    console.error('Admin bulk restore error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/applications/bulk-purge', async (req, res) => {
  try {
    const db = getDB();
    const { ids } = req.body;
    let rows;
    if (Array.isArray(ids) && ids.length > 0) {
      const numIds = ids.map(Number).filter(Number.isFinite);
      const placeholders = numIds.map((_, i) => `$${i + 1}`).join(',');
      rows = await db.prepare(`SELECT id FROM applications WHERE id IN (${placeholders}) AND deleted_at IS NOT NULL`).all(...numIds);
    } else {
      rows = await db.prepare(`SELECT id FROM applications WHERE deleted_at IS NOT NULL`).all();
    }
    if (rows.length === 0) return res.json({ success: true, count: 0 });
    const targetIds = rows.map((r) => r.id);
    const placeholders = targetIds.map((_, i) => `$${i + 1}`).join(',');
    await db.prepare(`DELETE FROM interview_feedback WHERE application_id IN (${placeholders})`).run(...targetIds);
    await db.prepare(`DELETE FROM applications WHERE id IN (${placeholders})`).run(...targetIds);
    await logAudit(db, req, 'trash_purged', 'application', null, `${targetIds.length} applications`, `Permanently deleted IDs: ${targetIds.join(', ')}`);
    res.json({ success: true, count: targetIds.length });
  } catch (err) {
    console.error('Admin purge error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/applications/:id/override-score', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { ai_score } = req.body;
    if (ai_score === undefined || ai_score === null) return res.status(400).json({ error: 'ai_score is required' });
    const score = parseFloat(ai_score);
    if (isNaN(score)) return res.status(400).json({ error: 'ai_score must be a number' });
    const app = await db.prepare('SELECT id, full_name FROM applications WHERE id = ?').get(id);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    await db.prepare('UPDATE applications SET ai_score = ? WHERE id = ?').run(score, id);
    await logAudit(db, req, 'ai_score_overridden', 'application', Number(id), app.full_name, `New score: ${score}`);
    res.json({ success: true, ai_score: score });
  } catch (err) {
    console.error('Admin override score error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Login Requests ────────────────────────────────────────────────────────────

router.get('/login-requests', async (req, res) => {
  try {
    const db = getDB();
    const requests = await db.prepare(`
      SELECT id, email, name, avatar_url, requested_role, approval_status, created_at
      FROM hr_users
      WHERE approval_status IN ('pending', 'rejected')
      ORDER BY created_at DESC
    `).all();
    res.json({ requests });
  } catch (err) {
    console.error('Login requests error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/login-requests/:id/approve', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { role, name } = req.body; // optional — assign role + confirm name in one step
    if (role && !['hr', 'interviewer', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const user = await db.prepare('SELECT * FROM hr_users WHERE id = $1').get(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const newName = name || user.name;
    const newRole = role || user.role;
    await db.prepare(
      `UPDATE hr_users SET approval_status = 'approved', name = $1, role = $2 WHERE id = $3`
    ).run(newName, newRole, id);
    await logAudit(db, req, 'login_request_approved', 'user', Number(id), newName, `Role: ${newRole}, Email: ${user.email}`);
    const updated = await db.prepare('SELECT * FROM hr_users WHERE id = $1').get(id);
    res.json({ user: updated });
  } catch (err) {
    console.error('Approve login request error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/login-requests/:id/reject', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const user = await db.prepare('SELECT * FROM hr_users WHERE id = $1').get(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await db.prepare(`UPDATE hr_users SET approval_status = 'rejected' WHERE id = $1`).run(id);
    await logAudit(db, req, 'login_request_rejected', 'user', Number(id), user.name, `Email: ${user.email}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Reject login request error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/audit-logs', async (req, res) => {
  try {
    const db = getDB();
    const { action, search } = req.query;
    const conditions = [];
    const params = [];
    if (action) {
      params.push(action);
      conditions.push(`action = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      conditions.push(`(actor_email ILIKE $${params.length - 1} OR target_name ILIKE $${params.length})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const logs = await db.prepare(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT 200`
    ).all(...params);
    res.json({ logs });
  } catch (err) {
    console.error('Admin audit logs error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
