const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

let _pool = null;

// ── PostgreSQL compatibility wrapper (mimics better-sqlite3 sync API) ─────────

class StmtWrapper {
  constructor(sql, pool) {
    this._sql = sql;
    this._pool = pool;
    // Convert ? placeholders to $1, $2, etc.
    this._pgSql = this._convertPlaceholders(sql);
  }

  _convertPlaceholders(sql) {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
  }

  _p(args) {
    if (args.length === 1 && Array.isArray(args[0])) return args[0];
    return args.map((v) => (v === undefined ? null : v));
  }

  async run(...args) {
    const params = this._p(args);
    const result = await this._pool.query(this._pgSql, params);
    return { lastInsertRowid: result.rows[0]?.id || null };
  }

  async get(...args) {
    const params = this._p(args);
    const result = await this._pool.query(this._pgSql, params);
    return result.rows[0] || undefined;
  }

  async all(...args) {
    const params = this._p(args);
    const result = await this._pool.query(this._pgSql, params);
    return result.rows;
  }
}

class DBWrapper {
  constructor(pool) { this._pool = pool; }
  pragma() {}
  async exec(sql) { await this._pool.query(sql); }
  prepare(sql) { return new StmtWrapper(sql, this._pool); }
}

// ── Schema ────────────────────────────────────────────────────────────────────

async function initDB() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'talentbridge',
  });

  // Test connection
  try {
    await pool.query('SELECT NOW()');
    console.log('✓ Connected to PostgreSQL');
  } catch (err) {
    console.error('✗ PostgreSQL connection failed:', err.message);
    throw err;
  }

  _pool = new DBWrapper(pool);

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      primary_role TEXT NOT NULL,
      preferred_domains TEXT,
      education TEXT,
      cover_letter TEXT,
      cover_letter_path TEXT,
      cover_letter_filename TEXT,
      cv_path TEXT,
      cv_filename TEXT,
      cv_url TEXT,
      cover_letter_url TEXT,
      salary_min INTEGER,
      salary_max INTEGER,
      salary_flexible INTEGER DEFAULT 0,
      years_of_experience INTEGER,
      night_shift_preference TEXT,
      status TEXT DEFAULT 'applied',
      hr_notes TEXT,
      ai_score REAL,
      ai_summary TEXT,
      ai_analysis TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hr_users (
      id SERIAL PRIMARY KEY,
      google_id TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      role TEXT DEFAULT 'hr',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS interview_feedback (
      id SERIAL PRIMARY KEY,
      application_id INTEGER NOT NULL,
      round INTEGER DEFAULT 1,
      attitude_score INTEGER,
      confidence_score INTEGER,
      knowledge_score INTEGER,
      cultural_fit_score INTEGER,
      overall_score REAL,
      feedback_notes TEXT,
      decision TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (application_id) REFERENCES applications(id)
    );

    CREATE TABLE IF NOT EXISTS jd_matches (
      id SERIAL PRIMARY KEY,
      role TEXT NOT NULL,
      job_description TEXT NOT NULL,
      results TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
    CREATE INDEX IF NOT EXISTS idx_interview_feedback_app_id ON interview_feedback(application_id);
    CREATE INDEX IF NOT EXISTS idx_jd_matches_role ON jd_matches(role);
    CREATE INDEX IF NOT EXISTS idx_jd_matches_created_at ON jd_matches(created_at DESC);
  `);

  console.log('✓ Database schema initialized');

  // ── Migration 1: Add role column to jd_matches if it doesn't exist ────────────
  try {
    const checkColumn = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'jd_matches' AND column_name = 'role'
    `);

    if (checkColumn.rows.length === 0) {
      await pool.query(`ALTER TABLE jd_matches ADD COLUMN role TEXT`);
      console.log('✓ Migration 1: Added role column to jd_matches');
    }
  } catch (err) {
    console.error('Migration error (role column):', err.message);
  }

  // ── Migration 2: Add updated_at column to jd_matches if it doesn't exist ────
  try {
    const checkColumn = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'jd_matches' AND column_name = 'updated_at'
    `);

    if (checkColumn.rows.length === 0) {
      await pool.query(`ALTER TABLE jd_matches ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()`);
      console.log('✓ Migration 2: Added updated_at column to jd_matches');
    }
  } catch (err) {
    console.error('Migration error (updated_at column):', err.message);
  }

  // ── Migration 3: Create indexes for better performance ────────────────────────
  try {
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_jd_matches_role ON jd_matches(role)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_jd_matches_created_at ON jd_matches(created_at DESC)`);
    console.log('✓ Migration 3: Added indexes to jd_matches');
  } catch (err) {
    console.error('Migration error (indexes):', err.message);
  }

  // ── Migration 4: Add assigned_interviewer column ──────────────────────────
  try {
    const check4 = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'applications' AND column_name = 'assigned_interviewer'
    `);
    if (check4.rows.length === 0) {
      await pool.query(`ALTER TABLE applications ADD COLUMN assigned_interviewer TEXT`);
      await pool.query(`
        UPDATE applications SET assigned_interviewer = 'interviewer1'
        WHERE status IN ('shortlisted','another_round','final_selected','rejected')
      `);
      console.log('✓ Migration 4: Added assigned_interviewer, existing processed apps → interviewer1');
    }
  } catch (err) {
    console.error('Migration error (assigned_interviewer):', err.message);
  }

  // ── Migration 5: Add hr_notes_for_interviewer column ─────────────────────
  try {
    const check5 = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'applications' AND column_name = 'hr_notes_for_interviewer'
    `);
    if (check5.rows.length === 0) {
      await pool.query(`ALTER TABLE applications ADD COLUMN hr_notes_for_interviewer TEXT`);
      console.log('✓ Migration 5: Added hr_notes_for_interviewer column');
    }
  } catch (err) {
    console.error('Migration error (hr_notes_for_interviewer):', err.message);
  }

  // ── Migration 7: Add assigned_interviewers (JSON array) column ───────────
  try {
    const check7 = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'applications' AND column_name = 'assigned_interviewers'
    `);
    if (check7.rows.length === 0) {
      await pool.query(`ALTER TABLE applications ADD COLUMN assigned_interviewers TEXT`);
      await pool.query(`
        UPDATE applications
        SET assigned_interviewers = '["' || assigned_interviewer || '"]'
        WHERE assigned_interviewer IS NOT NULL AND assigned_interviewer != ''
      `);
      console.log('✓ Migration 7: Added assigned_interviewers column');
    }
  } catch (err) {
    console.error('Migration error (assigned_interviewers):', err.message);
  }

  // ── Migration 8: Add night_shift_preference column ───────────────────────
  try {
    const check8 = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'applications' AND column_name = 'night_shift_preference'
    `);
    if (check8.rows.length === 0) {
      await pool.query(`ALTER TABLE applications ADD COLUMN night_shift_preference TEXT`);
      console.log('✓ Migration 8: Added night_shift_preference column');
    }
  } catch (err) {
    console.error('Migration error (night_shift_preference):', err.message);
  }

  // ── Migration 6: Seed 5 interviewer dev accounts ──────────────────────────
  try {
    for (let i = 1; i <= 5; i++) {
      const email = `interviewer${i}@dev.local`;
      const ex = await pool.query('SELECT id FROM hr_users WHERE email = $1', [email]);
      if (ex.rows.length === 0) {
        await pool.query(
          'INSERT INTO hr_users (google_id, email, name, role) VALUES ($1, $2, $3, $4)',
          [`dev_iv_new_00${i}`, email, `Interviewer ${i}`, 'interviewer']
        );
      }
    }
    console.log('✓ Migration 6: Seeded interviewer1–5 dev accounts');
  } catch (err) {
    console.error('Migration error (interviewer seed):', err.message);
  }

  // Seed dev users
  try {
    const result = await pool.query('SELECT id FROM hr_users WHERE email = $1', ['hr@dev.local']);
    if (result.rows.length === 0) {
      await pool.query(
        'INSERT INTO hr_users (google_id, email, name, role) VALUES ($1, $2, $3, $4)',
        ['dev_hr_001', 'hr@dev.local', 'HR Manager (Dev)', 'hr']
      );
      console.log('✓ Dev users seeded → hr@dev.local (hr)');
    }
  } catch (err) {
    console.error('Error seeding dev users:', err.message);
  }

  // ── Migration 9: Add is_active and last_login to hr_users ────────────────
  try {
    const check9a = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'hr_users' AND column_name = 'is_active'
    `);
    if (check9a.rows.length === 0) {
      await pool.query(`ALTER TABLE hr_users ADD COLUMN is_active BOOLEAN DEFAULT TRUE`);
      console.log('✓ Migration 9a: Added is_active column to hr_users');
    }
    const check9b = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'hr_users' AND column_name = 'last_login'
    `);
    if (check9b.rows.length === 0) {
      await pool.query(`ALTER TABLE hr_users ADD COLUMN last_login TIMESTAMP`);
      console.log('✓ Migration 9b: Added last_login column to hr_users');
    }
  } catch (err) {
    console.error('Migration error (9 hr_users columns):', err.message);
  }

  // ── Migration 10: Add deleted_at to applications ──────────────────────────
  try {
    const check10 = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'applications' AND column_name = 'deleted_at'
    `);
    if (check10.rows.length === 0) {
      await pool.query(`ALTER TABLE applications ADD COLUMN deleted_at TIMESTAMP`);
      console.log('✓ Migration 10: Added deleted_at column to applications');
    }
  } catch (err) {
    console.error('Migration error (10 deleted_at):', err.message);
  }

  // ── Migration 11: Create audit_logs table ─────────────────────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        actor_email TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id INTEGER,
        target_name TEXT,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Migration 11: audit_logs table ready');
  } catch (err) {
    console.error('Migration error (11 audit_logs):', err.message);
  }

  // ── Migration 12: Seed admin dev user ─────────────────────────────────────
  try {
    const check12 = await pool.query('SELECT id FROM hr_users WHERE email = $1', ['admin@dev.local']);
    if (check12.rows.length === 0) {
      await pool.query(
        'INSERT INTO hr_users (google_id, email, name, role) VALUES ($1, $2, $3, $4)',
        ['dev_admin_001', 'admin@dev.local', 'Admin (Dev)', 'admin']
      );
      console.log('✓ Migration 12: Seeded admin@dev.local (admin)');
    }
  } catch (err) {
    console.error('Migration error (12 admin seed):', err.message);
  }

  // ── Migration 13: Add deleted_at to hr_users ──────────────────────────────
  try {
    const check13 = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'hr_users' AND column_name = 'deleted_at'
    `);
    if (check13.rows.length === 0) {
      await pool.query(`ALTER TABLE hr_users ADD COLUMN deleted_at TIMESTAMP`);
      console.log('✓ Migration 13: Added deleted_at column to hr_users');
    }
  } catch (err) {
    console.error('Migration error (13 hr_users deleted_at):', err.message);
  }

  // ── Migration 15: Add action_by to applications ───────────────────────────
  try {
    const check15 = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'applications' AND column_name = 'action_by'
    `);
    if (check15.rows.length === 0) {
      await pool.query(`ALTER TABLE applications ADD COLUMN action_by TEXT`);
      console.log('✓ Migration 15: Added action_by column to applications');
    }
  } catch (err) {
    console.error('Migration error (15 action_by):', err.message);
  }

  // ── Migration 16: Add submitted_by to interview_feedback ──────────────────
  try {
    const check16 = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'interview_feedback' AND column_name = 'submitted_by'
    `);
    if (check16.rows.length === 0) {
      await pool.query(`ALTER TABLE interview_feedback ADD COLUMN submitted_by TEXT`);
      console.log('✓ Migration 16: Added submitted_by column to interview_feedback');
    }
  } catch (err) {
    console.error('Migration error (16 submitted_by):', err.message);
  }

  // ── Migration 17: Add hr_action_by to applications ───────────────────────
  try {
    const check17 = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'applications' AND column_name = 'hr_action_by'
    `);
    if (check17.rows.length === 0) {
      await pool.query(`ALTER TABLE applications ADD COLUMN hr_action_by TEXT`);
      // Back-fill from action_by for rows not yet touched by an interviewer
      await pool.query(`UPDATE applications SET hr_action_by = action_by WHERE action_by IS NOT NULL`);
      console.log('✓ Migration 17: Added hr_action_by column to applications');
    }
  } catch (err) {
    console.error('Migration error (17 hr_action_by):', err.message);
  }

  // ── Migration 18: Add cv_drive_id to applications ────────────────────────
  //    Stores the Google Drive file id alongside the shareable cv_path link
  //    so a file can later be re-fetched, replaced, or revoked by id.
  try {
    const check18 = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'applications' AND column_name = 'cv_drive_id'
    `);
    if (check18.rows.length === 0) {
      await pool.query(`ALTER TABLE applications ADD COLUMN cv_drive_id TEXT`);
      console.log('✓ Migration 18: Added cv_drive_id column to applications');
    }
  } catch (err) {
    console.error('Migration error (18 cv_drive_id):', err.message);
  }

  // ── Migration 14: Add approval_status + requested_role to hr_users ─────────
  try {
    const check14a = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'hr_users' AND column_name = 'approval_status'
    `);
    if (check14a.rows.length === 0) {
      await pool.query(`ALTER TABLE hr_users ADD COLUMN approval_status TEXT DEFAULT 'approved'`);
      console.log('✓ Migration 14a: Added approval_status column to hr_users (existing users → approved)');
    }
    const check14b = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'hr_users' AND column_name = 'requested_role'
    `);
    if (check14b.rows.length === 0) {
      await pool.query(`ALTER TABLE hr_users ADD COLUMN requested_role TEXT`);
      console.log('✓ Migration 14b: Added requested_role column to hr_users');
    }
  } catch (err) {
    console.error('Migration error (14 approval_status):', err.message);
  }

  return _pool;
}

function getDB() {
  if (!_pool) throw new Error('DB not initialized — call initDB() first.');
  return _pool;
}

module.exports = { initDB, getDB };
