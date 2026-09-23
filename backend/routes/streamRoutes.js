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

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = await getDB();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [decoded.id]);
    
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
