const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// GET /api/units - Admin gets all units, Unit role gets own unit
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    if (req.user.role === 'ADMIN') {
      const units = await db.all(`
        SELECT u.*, 
          (SELECT COUNT(*) FROM institutions WHERE unit_id = u.id) as institution_count,
          (SELECT email FROM users WHERE unit_id = u.id AND role = 'UNIT' LIMIT 1) as unit_email,
          (SELECT login_id FROM users WHERE unit_id = u.id AND role = 'UNIT' LIMIT 1) as login_id
        FROM units u
        ORDER BY u.created_at DESC
      `);
      return res.json(units);
    } else if (req.user.role === 'UNIT') {
      const unit = await db.get(`
        SELECT u.*, 
          (SELECT COUNT(*) FROM institutions WHERE unit_id = u.id) as institution_count,
          (SELECT email FROM users WHERE unit_id = u.id AND role = 'UNIT' LIMIT 1) as unit_email,
          (SELECT login_id FROM users WHERE unit_id = u.id AND role = 'UNIT' LIMIT 1) as login_id
        FROM units u WHERE id = ?
      `, [req.user.unit_id]);
      return res.json(unit ? [unit] : []);
    } else {
      return res.status(403).json({ error: 'Access denied.' });
    }
  } catch (error) {
    console.error('Fetch units error:', error);
    res.status(500).json({ error: 'Failed to retrieve units.' });
  }
});

// POST /api/units - Admin onboards a new NCC Unit + Commanding Officer Login
router.post('/', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { unit_name, unit_code, location, ncc_group, unit_email, login_id, password } = req.body;

    if (!unit_name || !unit_code || !unit_email || !login_id || !password) {
      return res.status(400).json({ error: 'Unit name, unit code, unit email, login ID, and password are required.' });
    }

    const db = await getDB();

    // Check if code or email already exists
    const existingCode = await db.get('SELECT id FROM units WHERE unit_code = ?', [unit_code]);
    if (existingCode) {
      return res.status(400).json({ error: 'Unit code already exists.' });
    }

    const existingEmail = await db.get('SELECT id FROM users WHERE email = ?', [unit_email]);
    if (existingEmail) {
      return res.status(400).json({ error: 'Unit email already registered.' });
    }

    const existingLoginId = await db.get('SELECT id FROM users WHERE login_id = ?', [login_id]);
    if (existingLoginId) {
      return res.status(400).json({ error: 'Login ID already registered.' });
    }

    // Insert Unit
    const unitRes = await db.run(
      'INSERT INTO units (unit_name, unit_code, location, ncc_group) VALUES (?, ?, ?, ?)',
      [unit_name, unit_code, location || '', ncc_group || 'Group B']
    );
    const unitId = unitRes.lastID;

    // Create Officer User
    const passwordHash = await bcrypt.hash(password, 10);
    const userRes = await db.run(
      'INSERT INTO users (name, email, login_id, password_hash, role, unit_id) VALUES (?, ?, ?, ?, ?, ?)',
      [unit_name + ' HQ', unit_email, login_id, passwordHash, 'UNIT', unitId]
    );

    // Audit Log
    await db.run(
      'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
      ['UNIT', unitId, 'ONBOARDED', req.user.id, `Onboarded unit ${unit_name} (${unit_code}) with email ${unit_email}`]
    );

    res.status(201).json({
      message: 'NCC Unit onboarded successfully.',
      unit: { id: unitId, unit_name, unit_code, location, ncc_group: ncc_group || 'Group B' },
      user: { id: userRes.lastID, name: unit_name + ' HQ', email: unit_email, login_id, role: 'UNIT' }
    });

  } catch (error) {
    console.error('Create unit error:', error);
    res.status(500).json({ error: 'Failed to create unit.' });
  }
});

// PUT /api/units/:id - Admin updates unit details, or Unit updates their own details
router.put('/:id', authenticateToken, authorizeRoles('ADMIN', 'UNIT'), async (req, res) => {
  if (req.user.role === 'UNIT' && req.user.unit_id != req.params.id) {
    return res.status(403).json({ error: 'Access denied. You can only edit your own unit.' });
  }
  try {
    const { unit_name, unit_code, location, ncc_group, unit_email, login_id, password } = req.body;
    const db = await getDB();
    
    // Check if unit_code already exists for another unit
    if (unit_code) {
      const existingCode = await db.get('SELECT id FROM units WHERE unit_code = ?', [unit_code]);
      if (existingCode && existingCode.id != req.params.id) {
        return res.status(400).json({ error: 'Unit code already exists for another unit.' });
      }
    }
    
    // Check if email already exists for another user
    if (unit_email) {
      const existingEmail = await db.get('SELECT id, unit_id FROM users WHERE email = ?', [unit_email]);
      if (existingEmail && existingEmail.unit_id != req.params.id) {
        return res.status(400).json({ error: 'Unit email already registered to another user.' });
      }
    }

    if (login_id) {
      const existingLoginId = await db.get('SELECT id, unit_id FROM users WHERE login_id = ?', [login_id]);
      if (existingLoginId && existingLoginId.unit_id != req.params.id) {
        return res.status(400).json({ error: 'Login ID already registered to another user.' });
      }
    }

    await db.run(
      'UPDATE units SET unit_name = ?, unit_code = ?, location = ?, ncc_group = ? WHERE id = ?',
      [unit_name, unit_code, location, ncc_group, req.params.id]
    );

    // Update User
    if (unit_email || login_id) {
      const existingUnitUser = await db.get('SELECT id FROM users WHERE unit_id = ? AND role = "UNIT"', [req.params.id]);
      if (existingUnitUser) {
        if (password) {
          const passwordHash = await bcrypt.hash(password, 10);
          await db.run(
            'UPDATE users SET name = ?, email = ?, login_id = ?, password_hash = ? WHERE id = ?',
            [unit_name + ' HQ', unit_email, login_id, passwordHash, existingUnitUser.id]
          );
        } else {
          await db.run(
            'UPDATE users SET name = ?, email = ?, login_id = ? WHERE id = ?',
            [unit_name + ' HQ', unit_email, login_id, existingUnitUser.id]
          );
        }
      } else if (unit_email && login_id) {
        const passwordHash = await bcrypt.hash(password || 'Unit@123', 10);
        await db.run(
          'INSERT INTO users (name, email, login_id, password_hash, role, unit_id) VALUES (?, ?, ?, ?, ?, ?)',
          [unit_name + ' HQ', unit_email, login_id, passwordHash, 'UNIT', req.params.id]
        );
      }
    }

    await db.run(
      'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
      ['UNIT', req.params.id, 'UPDATED', req.user.id, `Updated unit ${unit_name}`]
    );

    res.json({ message: 'Unit updated successfully.' });
  } catch (error) {
    console.error('Update unit error:', error);
    res.status(500).json({ error: 'Failed to update unit.' });
  }
});

// DELETE /api/units/:id - Admin deletes an NCC Unit
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  const db = await getDB();
  const unitId = req.params.id;

  try {
    const unit = await db.get('SELECT * FROM units WHERE id = ?', [unitId]);
    if (!unit) {
      return res.status(404).json({ error: 'NCC Unit not found.' });
    }

    const instCountRow = await db.get('SELECT COUNT(*) as count FROM institutions WHERE unit_id = ?', [unitId]);
    const instCount = instCountRow ? instCountRow.count : 0;

    const demandCountRow = await db.get('SELECT COUNT(*) as count FROM demands WHERE unit_id = ?', [unitId]);
    const demandCount = demandCountRow ? demandCountRow.count : 0;

    const { force } = req.query;
    if ((instCount > 0 || demandCount > 0) && force !== 'true') {
      return res.status(400).json({
        error: `Cannot delete '${unit.unit_name}' because it currently manages ${instCount} institution(s) and ${demandCount} demand(s).`,
        hasDependencies: true,
        institutionCount: instCount,
        demandCount: demandCount
      });
    }

    // Disable foreign keys temporarily for clean cascading removal
    await db.run('PRAGMA foreign_keys = OFF');

    try {
      // 1. Get all institutions under this unit
      const unitInsts = await db.all('SELECT id FROM institutions WHERE unit_id = ?', [unitId]);
      const instIds = unitInsts.map(i => i.id);

      // 2. Find all demands under this unit or its institutions
      let demandIds = [];
      if (instIds.length > 0) {
        const placeholders = instIds.map(() => '?').join(',');
        const dRows = await db.all(
          `SELECT id FROM demands WHERE unit_id = ? OR institution_id IN (${placeholders})`,
          [unitId, ...instIds]
        );
        demandIds = dRows.map(r => r.id);
      } else {
        const dRows = await db.all('SELECT id FROM demands WHERE unit_id = ?', [unitId]);
        demandIds = dRows.map(r => r.id);
      }

      // 3. Clean demand items and activity
      if (demandIds.length > 0) {
        const dPlaceholders = demandIds.map(() => '?').join(',');
        await db.run(`DELETE FROM demand_activity WHERE demand_id IN (${dPlaceholders})`, demandIds);
        await db.run(`DELETE FROM demand_items WHERE demand_id IN (${dPlaceholders})`, demandIds);
        await db.run(`DELETE FROM demands WHERE id IN (${dPlaceholders})`, demandIds);
      }

      // 4. Clean bills, institution users, notifications, institutions
      if (instIds.length > 0) {
        const instPlaceholders = instIds.map(() => '?').join(',');
        await db.run(`DELETE FROM refreshment_bills WHERE institution_id IN (${instPlaceholders})`, instIds);

        const instUsers = await db.all(`SELECT id FROM users WHERE institution_id IN (${instPlaceholders})`, instIds);
        if (instUsers.length > 0) {
          const uPlaceholders = instUsers.map(() => '?').join(',');
          await db.run(`DELETE FROM notifications WHERE user_id IN (${uPlaceholders})`, instUsers.map(u => u.id));
          await db.run(`DELETE FROM users WHERE id IN (${uPlaceholders})`, instUsers.map(u => u.id));
        }
        await db.run(`DELETE FROM institutions WHERE id IN (${instPlaceholders})`, instIds);
      }

      // 5. Clean unit users and their notifications
      const unitUsers = await db.all('SELECT id FROM users WHERE unit_id = ?', [unitId]);
      if (unitUsers.length > 0) {
        const uPlaceholders = unitUsers.map(() => '?').join(',');
        await db.run(`DELETE FROM notifications WHERE user_id IN (${uPlaceholders})`, unitUsers.map(u => u.id));
        await db.run(`DELETE FROM users WHERE id IN (${uPlaceholders})`, unitUsers.map(u => u.id));
      }

      // 6. Delete the unit itself
      await db.run('DELETE FROM units WHERE id = ?', [unitId]);

    } finally {
      // Re-enable foreign keys
      await db.run('PRAGMA foreign_keys = ON');
    }

    // Audit Log
    try {
      await db.run(
        'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
        ['UNIT', unitId, 'DELETED', req.user.id, `Deleted unit ${unit.unit_name} (${unit.unit_code})`]
      );
    } catch (auditErr) {
      // Ignore audit error if table foreign keys differ
    }

    res.json({ message: `NCC Unit '${unit.unit_name}' deleted successfully.` });
  } catch (error) {
    console.error('Delete unit error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete unit.' });
  }
});

module.exports = router;
