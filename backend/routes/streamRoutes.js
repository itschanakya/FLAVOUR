const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { addClient } = require('../sse');
const { getDB } = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

// GET /api/stream
router.get('/', async (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(401).send('Token required');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    decoded = jwt.decode(token);
    if (!decoded || !decoded.id) {
      return res.status(401).send('Invalid token');
    }
  }

  try {
    const db = await getDB();
    let user = await db.get('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (!user && (decoded.role === 'DELIVERY' || decoded.partner_id)) {
      const partner = await db.get('SELECT * FROM delivery_partners WHERE id = ?', [decoded.partner_id || decoded.id]);
      if (partner) {
        user = {
          id: partner.id,
          role: 'DELIVERY',
          name: partner.name
        };
      }
    }
    if (!user && decoded.id && decoded.role) {
      user = {
        id: decoded.id,
        role: decoded.role,
        name: decoded.name || 'User'
      };
    }
    
    if (!user) {
      return res.status(401).send('Invalid user');
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    // Immediately send connection acknowledgment comment
    res.write(': connected\n\n');

    // Add client
    const cleanup = addClient(user.id, user.role, res);

    // Keep connection alive with heartbeat
    const interval = setInterval(() => {
      try {
        if (!res.destroyed && !res.writableEnded) {
          res.write(':\n\n'); // SSE comment to keep alive
        }
      } catch (e) {
        // Ignored
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(interval);
      cleanup();
    });

  } catch (err) {
    return res.status(401).send('Invalid token');
  }
});

module.exports = router;
