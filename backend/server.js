require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const session  = require('express-session');
const passport = require('passport');
const { initDB } = require('./database');

const applicationsRouter = require('./routes/applications');
const authRouter         = require('./routes/auth');
const hrRouter           = require('./routes/hr');
const interviewerRouter  = require('./routes/interviewer');
const adminRouter        = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────────────────────

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
  ],
  credentials: true,
}));

// ── Body parsers ──────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static uploads ────────────────────────────────────────────────────────────

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Session (required for Passport OAuth) ────────────────────────────────────

app.use(session({
  secret: process.env.SESSION_SECRET || 'talentbridge_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
}));

app.use(passport.initialize());
app.use(passport.session());

// ── Routes ────────────────────────────────────────────────────────────────────

app.use('/api/applications', applicationsRouter);
app.use('/api/auth',         authRouter);
app.use('/api/hr',           hrRouter);
app.use('/api/interviewer',  interviewerRouter);
app.use('/api/admin',        adminRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error handler ─────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Export for tests ──────────────────────────────────────────────────────────

module.exports = app;

// ── Start ─────────────────────────────────────────────────────────────────────

if (require.main === module) {
  initDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`\nTalentBridge Backend  →  http://localhost:${PORT}`);
        console.log(`Health check          →  http://localhost:${PORT}/api/health\n`);
      });
    })
    .catch((err) => {
      console.error('DB init failed:', err);
      process.exit(1);
    });
}
