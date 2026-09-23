const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { broadcastToUser } = require('../sse');

// POST /api/bill-collection - Admin creates a bill collection event
router.post('/', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { event_date, event_time, message, target_pin_codes } = req.body;
    
    if (!event_date || !event_time) {
      return res.status(400).json({ error: 'Date and time are required.' });
    }

    const db = await getDB();
    const eventRes = await db.run(
      'INSERT INTO bill_collection_events (admin_id, event_date, event_time, message, target_pin_codes) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, event_date, event_time, message || '', target_pin_codes || 'ALL']
    );

    // Get affected institutions to send notifications
    let instQuery = 'SELECT id, unit_id FROM institutions';
    let instParams = [];
    if (target_pin_codes && target_pin_codes !== 'ALL') {
      const pins = target_pin_codes.split(',').map(p => p.trim());
      const placeholders = pins.map(() => '?').join(',');
      instQuery += ` WHERE pin_code IN (${placeholders})`;
      instParams = pins;
    }
    
    const affectedInsts = await db.all(instQuery, instParams);

    // Notify users linked to these institutions
    if (affectedInsts.length > 0) {
      const instIds = affectedInsts.map(i => i.id);
      const placeholders = instIds.map(() => '?').join(',');
      const usersToNotify = await db.all(
        `SELECT id FROM users WHERE institution_id IN (${placeholders})`,
        instIds
      );

      for (const u of usersToNotify) {
        await db.run(
          'INSERT INTO notifications (user_id, title, message, link_url) VALUES (?, ?, ?, ?)',
          [u.id, 'Bill Collection Scheduled', `A bill collection is scheduled on ${event_date} at ${event_time}. ${message || ''}`, '/bill-submission']
        );
        broadcastToUser(u.id, 'NEW_NOTIFICATION', { count: 1 });
      }
    }

    res.json({ message: 'Event scheduled and notifications sent.', id: eventRes.lastID });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create bill collection event.' });
  }
});

// GET /api/bill-collection - List all events (Admin gets all, others get applicable)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    
    // Return all events ordered by date.
    const events = await db.all(
      `SELECT e.*, u.name as admin_name 
       FROM bill_collection_events e
       LEFT JOIN users u ON e.admin_id = u.id
       ORDER BY e.created_at DESC`
    );

    res.json(events);
  } catch (error) {
    console.error('Fetch events error:', error);
    res.status(500).json({ error: 'Failed to retrieve events.' });
  }
});

// GET /api/bill-collection/my-schedule - Institution gets applicable events
router.get('/my-schedule', authenticateToken, authorizeRoles('INSTITUTION'), async (req, res) => {
  try {
    const db = await getDB();
    const inst = await db.get('SELECT pin_code FROM institutions WHERE id = ?', [req.user.institution_id]);
    const pin = inst ? inst.pin_code : null;

    const query = `
      SELECT e.*, u.name as admin_name 
      FROM bill_collection_events e
      LEFT JOIN users u ON e.admin_id = u.id
      WHERE e.target_pin_codes = 'ALL' 
         OR (e.target_pin_codes LIKE '%' || ? || '%')
      ORDER BY e.created_at DESC
    `;
    const events = await db.all(query, [pin]);
    res.json(events);
  } catch (error) {
    console.error('Fetch my-schedule error:', error);
    res.status(500).json({ error: 'Failed to retrieve events.' });
  }
});

// PUT /api/bill-collection/:id/delay - Admin posts delay
router.put('/:id/delay', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { message } = req.body;
    const eventId = req.params.id;
    const db = await getDB();

    const event = await db.get('SELECT * FROM bill_collection_events WHERE id = ?', [eventId]);
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    await db.run(
      'UPDATE bill_collection_events SET status = ?, message = ? WHERE id = ?',
      ['DELAYED', message || 'Running late', eventId]
    );

    // Notify affected institutions
    let instQuery = 'SELECT id FROM institutions';
    let instParams = [];
    if (event.target_pin_codes && event.target_pin_codes !== 'ALL') {
      const pins = event.target_pin_codes.split(',').map(p => p.trim());
      const placeholders = pins.map(() => '?').join(',');
      instQuery += ` WHERE pin_code IN (${placeholders})`;
      instParams = pins;
    }
    
    const affectedInsts = await db.all(instQuery, instParams);

    if (affectedInsts.length > 0) {
      const instIds = affectedInsts.map(i => i.id);
      const placeholders = instIds.map(() => '?').join(',');
      const usersToNotify = await db.all(
        `SELECT id FROM users WHERE institution_id IN (${placeholders})`,
        instIds
      );

      for (const u of usersToNotify) {
        await db.run(
          'INSERT INTO notifications (user_id, title, message, link_url) VALUES (?, ?, ?, ?)',
          [u.id, 'Bill Collection Update', `Delay notice: ${message || 'Vendor is running late.'}`, '/bill-submission']
        );
        broadcastToUser(u.id, 'NEW_NOTIFICATION', { count: 1 });
      }
    }

    res.json({ message: 'Delay reported.' });
  } catch (error) {
    console.error('Delay event error:', error);
    res.status(500).json({ error: 'Failed to update event.' });
  }
});

module.exports = router;
