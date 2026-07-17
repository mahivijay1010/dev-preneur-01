const jwt = require('jsonwebtoken');

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    provider: user.provider,
    role: user.role,
    consentAcceptedAt: user.consentAcceptedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

module.exports = { publicUser, requireAuth, signToken };
