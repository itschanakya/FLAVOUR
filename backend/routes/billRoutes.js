const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /api/refreshment-bills
router.get('/', authenticateToken, authorizeRoles('ADMIN', 'UNIT'), async (req, res) => {
  try {
    const db = await getDB();
    const { month } = req.query; // e.g., '2026-08'

    if (!month) {
      return res.status(400).json({ error: 'Month parameter (YYYY-MM) is required.' });
    }

    let query = `
      SELECT rb.*, i.institution_name, i.ano_cto_name, u.unit_name
      FROM refreshment_bills rb
      JOIN institutions i ON rb.institution_id = i.id
      JOIN units u ON i.unit_id = u.id
      WHERE rb.month = ?
    `;
    const params = [month];

    if (req.user.role === 'UNIT') {
      query += ' AND i.unit_id = ?';
      params.push(req.user.unit_id);
    }

    const bills = await db.all(query, params);
    res.json(bills);
  } catch (error) {
    console.error('Fetch bills error:', error);
    res.status(500).json({ error: 'Failed to retrieve bills.' });
  }
});

// POST /api/refreshment-bills
router.post('/', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const db = await getDB();
    const {
      institution, month, billSubmitted, billSubmittedDate,
      billAmount, demandPackets, paymentStatus, paymentDate, paymentRef, remarks
    } = req.body;

    // Get institution_id from name
    const inst = await db.get('SELECT id FROM institutions WHERE institution_name = ?', [institution]);
    if (!inst) {
      return res.status(404).json({ error: `Institution ${institution} not found.` });
    }

    const result = await db.run(
      `INSERT INTO refreshment_bills (
        institution_id, month, bill_submitted, bill_submitted_date,
        bill_amount, demand_packets, payment_status, payment_date, payment_ref, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(institution_id, month) DO UPDATE SET
        bill_submitted = excluded.bill_submitted,
        bill_submitted_date = excluded.bill_submitted_date,
        bill_amount = excluded.bill_amount,
        demand_packets = excluded.demand_packets,
        payment_status = excluded.payment_status,
        payment_date = excluded.payment_date,
        payment_ref = excluded.payment_ref,
        remarks = excluded.remarks,
        updated_at = CURRENT_TIMESTAMP`,
      [
        inst.id, month, billSubmitted ? 1 : 0, billSubmittedDate || null,
        billAmount || 0, demandPackets || 0, paymentStatus || 'PENDING',
        paymentDate || null, paymentRef || null, remarks || null
      ]
    );

    res.json({ message: 'Bill saved successfully.' });
  } catch (error) {
    console.error('Save bill error:', error);
    res.status(500).json({ error: 'Failed to save bill.' });
  }
});

// PUT /api/refreshment-bills/:id
router.put('/:id', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const db = await getDB();
    const {
      billSubmitted, billSubmittedDate,
      billAmount, demandPackets, paymentStatus, paymentDate, paymentRef, remarks
    } = req.body;

    await db.run(
      `UPDATE refreshment_bills SET
        bill_submitted = ?,
        bill_submitted_date = ?,
        bill_amount = ?,
        demand_packets = ?,
        payment_status = ?,
        payment_date = ?,
        payment_ref = ?,
        remarks = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        billSubmitted ? 1 : 0, billSubmittedDate || null,
        billAmount || 0, demandPackets || 0, paymentStatus || 'PENDING',
        paymentDate || null, paymentRef || null, remarks || null,
        req.params.id
      ]
    );

    res.json({ message: 'Bill updated successfully.' });
  } catch (error) {
    console.error('Update bill error:', error);
    res.status(500).json({ error: 'Failed to update bill.' });
  }
});

module.exports = router;
