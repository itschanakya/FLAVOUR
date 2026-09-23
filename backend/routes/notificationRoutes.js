const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/notifications - Get all notifications for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    const notifications = await db.all(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY is_read ASC, created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(notifications);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

// PUT /api/notifications/:id/read - Mark single notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    await db.run(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Read notification error:', error);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    await db.run(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
      [req.user.id]
    );
    res.json({ message: 'All marked as read' });
  } catch (error) {
    console.error('Read all notifications error:', error);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

// DELETE /api/notifications/clear-all - Delete all notifications
router.delete('/clear-all', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    await db.run(
      `DELETE FROM notifications WHERE user_id = ?`,
      [req.user.id]
    );
    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    console.error('Clear all notifications error:', error);
    res.status(500).json({ error: 'Failed to clear notifications.' });
  }
});

module.exports = router;
