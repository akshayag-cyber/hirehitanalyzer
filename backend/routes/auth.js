const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { getDB } = require('../database');
const { issueToken } = require('../middleware/auth');

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const isGoogleConfigured = !!(
  process.env.GOOGLE_CLIENT_ID &&
  !process.env.GOOGLE_CLIENT_ID.includes('your_google')
);

// ── Passport Google Strategy (only if credentials exist) ────────────────────

if (isGoogleConfigured) {
  passport.use(new GoogleStrategy(
    {
      clientID:           process.env.GOOGLE_CLIENT_ID,
      clientSecret:       process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:        process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
      passReqToCallback:  true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const db = getDB();
        const email     = profile.emails?.[0]?.value;
        const name      = profile.displayName;
        const avatar    = profile.photos?.[0]?.value;
        const googleId  = profile.id;

        if (!email) return done(new Error('No email from Google profile'));

        let user = await db.prepare('SELECT * FROM hr_users WHERE google_id = $1 OR email = $2').get(googleId, email);

        if (user) {
          // Update profile fields only — preserve approval_status and role
          await db.prepare('UPDATE hr_users SET google_id = $1, name = $2, avatar_url = $3 WHERE id = $4')
            .run(googleId, name, avatar, user.id);
          user = await db.prepare('SELECT * FROM hr_users WHERE id = $1').get(user.id);
        } else {
          // New user — start as pending, no role yet
          const requestedRole = req.session?.requestedRole || null;
          const result = await db.prepare(
            `INSERT INTO hr_users (google_id, email, name, avatar_url, role, approval_status, requested_role)
             VALUES ($1, $2, $3, $4, NULL, 'pending', $5) RETURNING id`
          ).run(googleId, email, name, avatar, requestedRole);
          user = await db.prepare('SELECT * FROM hr_users WHERE id = $1').get(result.lastInsertRowid);
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ));

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await getDB().prepare('SELECT * FROM hr_users WHERE id = $1').get(id);
      done(null, user || false);
    } catch (err) { done(err); }
  });
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Initiate Google OAuth — store requested role in session
router.get('/google', (req, res, next) => {
  if (!isGoogleConfigured) {
    return res.status(503).json({
      error: 'Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env',
    });
  }
  if (req.query.role) req.session.requestedRole = req.query.role;
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// Google OAuth callback
router.get('/google/callback',
  (req, res, next) => {
    if (!isGoogleConfigured) return res.redirect(`${FRONTEND_URL}/hr/login?error=oauth_not_configured`);
    next();
  },
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/auth/callback?status=failed` }),
  (req, res) => {
    const user = req.user;

    // Email domain validation — only @zentiti.com and @synersys.com allowed
    const allowedDomains = ['@zentiti.com', '@synersys.com'];
    const userEmail = user.email || '';
    console.log('Auth callback - user.email:', userEmail, 'user object keys:', Object.keys(user));
    if (!userEmail) {
      console.error('Email not found in user profile');
      return res.redirect(`${FRONTEND_URL}/auth/callback?status=failed`);
    }
    const hasAllowedDomain = allowedDomains.some(domain => userEmail.toLowerCase().endsWith(domain));
    if (!hasAllowedDomain) {
      console.log('Domain validation failed for:', userEmail);
      return res.redirect(`${FRONTEND_URL}/auth/callback?status=unauthorized&email=${encodeURIComponent(userEmail)}&reason=invalid_domain`);
    }

    // Soft-deleted user
    if (user.deleted_at) {
      return res.redirect(`${FRONTEND_URL}/auth/callback?status=rejected`);
    }

    // Inactive user
    if (user.is_active === false) {
      return res.redirect(`${FRONTEND_URL}/auth/callback?status=rejected`);
    }

    // Pending approval
    if (!user.approval_status || user.approval_status === 'pending') {
      return res.redirect(`${FRONTEND_URL}/auth/callback?status=pending&email=${encodeURIComponent(user.email)}`);
    }

    // Rejected
    if (user.approval_status === 'rejected') {
      return res.redirect(`${FRONTEND_URL}/auth/callback?status=rejected`);
    }

    // Approved but no role assigned yet
    if (user.approval_status === 'approved' && !user.role) {
      return res.redirect(`${FRONTEND_URL}/auth/callback?status=pending_role&email=${encodeURIComponent(user.email)}`);
    }

    // Check that the role selected at login matches the assigned role
    const requestedRole = req.session?.requestedRole;
    if (requestedRole && user.role !== requestedRole) {
      return res.redirect(
        `${FRONTEND_URL}/auth/callback?status=wrong_role&assigned=${user.role}`
      );
    }

    // Fully approved — issue JWT
    const token = issueToken(user);
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&role=${user.role}&name=${encodeURIComponent(user.name)}`);
  },
);

// ── Dev login (no Google OAuth needed — for local testing) ───────────────────
router.post('/dev-login', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Dev login is disabled in production' });
  }
  const { role, number } = req.body;
  if (!['hr', 'interviewer', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'role must be "hr", "interviewer", or "admin"' });
  }
  const db = getDB();
  let email;
  if (role === 'hr') {
    email = 'hr@dev.local';
  } else if (role === 'admin') {
    email = 'admin@dev.local';
  } else {
    const num = Math.min(Math.max(parseInt(number) || 1, 1), 5);
    email = `interviewer${num}@dev.local`;
  }
  const user = await db.prepare('SELECT * FROM hr_users WHERE email = $1').get(email);
  if (!user) return res.status(500).json({ error: 'Dev user not seeded — restart server' });
  if (user.deleted_at) return res.status(403).json({ error: 'Account has been removed' });
  if (user.is_active === false) return res.status(403).json({ error: 'Account has been deactivated' });

  const token = issueToken(user);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// Check Google OAuth status
router.get('/status', (req, res) => {
  res.json({ googleConfigured: isGoogleConfigured });
});

// Poll approval status by email — used by pending screen
router.get('/my-status', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'email required' });
  try {
    const db = getDB();
    const user = await db.prepare(
      'SELECT approval_status, role, name FROM hr_users WHERE email = $1'
    ).get(email);
    if (!user) return res.json({ approval_status: 'pending', role: null });
    res.json({ approval_status: user.approval_status, role: user.role, name: user.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
