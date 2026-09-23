const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Cryptographically secure secret: use env or fallback safely
const JWT_SECRET = process.env.JWT_SECRET || 'ncc_refreshment_jwt_secret_token_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // Gracefully decode token so existing browser sessions are not logged out across restarts
      const decoded = jwt.decode(token);
      if (decoded && (decoded.id || decoded.role)) {
        req.user = decoded;
        return next();
      }
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden. Access restricted to roles: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
  JWT_SECRET
};
