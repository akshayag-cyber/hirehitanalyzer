const jwt = require('jsonwebtoken');
const { getDB } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'talentbridge_jwt_secret';

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify the account is still active and not deleted on every request
    const db = getDB();
    const user = await db.prepare(
      'SELECT id, is_active, deleted_at FROM hr_users WHERE id = $1'
    ).get(decoded.id);

    if (!user || user.deleted_at) {
      return res.status(401).json({ error: 'Account has been removed' });
    }
    if (user.is_active === false) {
      return res.status(401).json({ error: 'Account has been deactivated' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
    }
    next();
  };
}

function issueToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar_url },
    JWT_SECRET,
    { expiresIn: '10h' },
  );
}

module.exports = { requireAuth, requireRole, issueToken };
