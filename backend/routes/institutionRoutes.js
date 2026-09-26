const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// GET /api/institutions - Scoped by role
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    let query = `
      SELECT i.*, u.unit_name, u.unit_code, u.ncc_group,
        usr.email as ano_email,
        usr.login_id as login_id
      FROM institutions i
      JOIN units u ON i.unit_id = u.id
      LEFT JOIN users usr ON usr.institution_id = i.id
    `;
    let params = [];

    if (req.user.role === 'UNIT') {
      query += ' WHERE i.unit_id = ?';
      params.push(req.user.unit_id);
    } else if (req.user.role === 'INSTITUTION') {
      query += ' WHERE i.id = ?';
      params.push(req.user.institution_id);
    }
    query += ' ORDER BY i.created_at DESC';

    const institutions = await db.all(query, params);
    res.json(institutions);
  } catch (error) {
    console.error('Fetch institutions error:', error);
    res.status(500).json({ error: 'Failed to retrieve institutions.' });
  }
});
// POST /api/institutions/bulk - Batch import or update institutions via Excel
router.post('/bulk', authenticateToken, authorizeRoles('UNIT', 'ADMIN'), async (req, res) => {
  try {
    const { institutions } = req.body;
    if (!Array.isArray(institutions) || institutions.length === 0) {
      return res.status(400).json({ error: 'No institution data provided in upload.' });
    }

    const unit_id = req.user.role === 'UNIT' ? req.user.unit_id : (req.body.unit_id || req.user.unit_id);
    if (!unit_id) {
      return res.status(400).json({ error: 'User is not assigned to a valid NCC Unit.' });
    }

    const db = await getDB();
    const defaultPasswordHash = await bcrypt.hash('Inst@123', 10);

    let added = 0;
    let updated = 0;
    const errors = [];

    for (let i = 0; i < institutions.length; i++) {
      const row = institutions[i];
      const instName = (row.institution_name || row['INSTITUTION NAME'] || row.name || '').toString().trim();
      if (!instName) continue;

      const pinCode = (row.pin_code || row['PIN CODE'] || row.pin || '').toString().replace(/\D/g, '').slice(0, 6);
      const anoName = (row.ano_cto_name || row['ANO / CTO INCHARGE'] || row.ano_name || row['ANO NAME'] || 'ANO Incharge').toString().trim();
      const anoContact = (row.ano_cto_contact || row['ANO CONTACT'] || row.contact || row.phone || '').toString().trim();
      let email = (row.ano_cto_email || row['ANO EMAIL'] || row.email || '').toString().trim().toLowerCase();
      let loginId = (row.login_id || row['LOGIN ID'] || row.login || '').toString().trim();
      const s1 = parseInt(row.strength_1st_year ?? row['1ST YR STRENGTH'] ?? row.year_1 ?? 0, 10) || 0;
      const s2 = parseInt(row.strength_2nd_year ?? row['2ND YR STRENGTH'] ?? row.year_2 ?? 0, 10) || 0;
      const s3 = parseInt(row.strength_3rd_year ?? row['3RD YR STRENGTH'] ?? row.year_3 ?? 0, 10) || 0;
      const address = (row.complete_address || row['COMPLETE ADDRESS'] || row.address || '').toString().trim();
      const googleLoc = (row.google_location || row['GOOGLE LOCATION'] || row.location || '').toString().trim();
      const password = (row.password || row['PASSWORD'] || 'Inst@123').toString().trim();

      const cleanSlug = instName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'inst';
      if (!loginId) {
        loginId = cleanSlug;
      }

      try {
        // Check if institution already exists under this unit (case-insensitive name match)
        const existingInst = await db.get(
          'SELECT id FROM institutions WHERE unit_id = ? AND LOWER(institution_name) = LOWER(?)',
          [unit_id, instName]
        );

        if (existingInst) {
          // UPDATE institution strength and contact details
          await db.run(
            `UPDATE institutions 
             SET ano_cto_name = COALESCE(?, ano_cto_name),
                 ano_cto_contact = COALESCE(?, ano_cto_contact),
                 pin_code = CASE WHEN ? <> '' THEN ? ELSE pin_code END,
                 strength_1st_year = ?,
                 strength_2nd_year = ?,
                 strength_3rd_year = ?,
                 complete_address = CASE WHEN ? <> '' THEN ? ELSE complete_address END,
                 google_location = CASE WHEN ? <> '' THEN ? ELSE google_location END
             WHERE id = ?`,
            [anoName, anoContact, pinCode, pinCode, s1, s2, s3, address, address, googleLoc, googleLoc, existingInst.id]
          );

          // Update linked user if present
          const existingUser = await db.get('SELECT id FROM users WHERE institution_id = ?', [existingInst.id]);
          if (existingUser) {
            await db.run(
              'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), login_id = COALESCE(?, login_id) WHERE id = ?',
              [anoName, email, loginId, existingUser.id]
            );
          }
          updated++;
        } else {
          // INSERT new institution
          const instRes = await db.run(
            `INSERT INTO institutions (unit_id, institution_name, ano_cto_name, ano_cto_contact, pin_code, strength_1st_year, strength_2nd_year, strength_3rd_year, google_location, complete_address)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [unit_id, instName, anoName, anoContact, pinCode, s1, s2, s3, googleLoc, address]
          );
          const newInstId = instRes.lastID;

          // Allow same email address across multiple institutions; ensure unique login_id only
          let finalEmail = email;
          let finalLogin = loginId;
          let counter = 1;
          while (await db.get('SELECT id FROM users WHERE login_id = ?', [finalLogin])) {
            finalLogin = `${cleanSlug}_${counter}`;
            counter++;
          }

          const passwordHash = password === 'Inst@123' ? defaultPasswordHash : await bcrypt.hash(password, 10);
          await db.run(
            `INSERT INTO users (name, email, login_id, password_hash, role, unit_id, institution_id)
             VALUES (?, ?, ?, ?, 'INSTITUTION', ?, ?)`,
            [anoName, finalEmail, finalLogin, passwordHash, unit_id, newInstId]
          );
          added++;
        }
      } catch (rowErr) {
        console.error(`Error processing row ${i + 1} (${instName}):`, rowErr);
        errors.push({ row: i + 1, institution: instName, error: rowErr.message });
      }
    }

    await db.run(
      'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
      ['INSTITUTION', 0, 'BULK_UPLOAD', req.user.id, `Excel bulk import: Added ${added}, Updated ${updated}, Errors: ${errors.length}`]
    );

    res.json({
      message: `Successfully processed institutions: ${added} added, ${updated} updated.`,
      added,
      updated,
      total: institutions.length,
      errors
    });
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ error: 'Failed to process bulk upload: ' + err.message });
  }
});

// POST /api/institutions - NCC Unit adds institution under it + creates ANO/CTO login + sets strength
router.post('/', authenticateToken, authorizeRoles('UNIT'), async (req, res) => {
  try {
    const {
      institution_name,
      ano_cto_name,
      ano_cto_contact,
      ano_cto_email,
      login_id,
      password,
      pin_code,
      strength_1st_year,
      strength_2nd_year,
      strength_3rd_year,
      google_location,
      complete_address
    } = req.body;

    if (!institution_name || !ano_cto_name || !ano_cto_email || !login_id || !password) {
      return res.status(400).json({ error: 'Institution name, ANO/CTO name, email, login ID, and password are required.' });
    }

    const unit_id = req.user.unit_id;
    if (!unit_id) {
      return res.status(400).json({ error: 'User is not assigned to a valid NCC Unit.' });
    }

    const db = await getDB();

    // Ensure login_id is unique across accounts (emails may be shared across multiple IDs)
    const existingLogin = await db.get('SELECT id FROM users WHERE login_id = ?', [login_id]);
    if (existingLogin) {
      return res.status(400).json({ error: 'Login ID already registered.' });
    }

    // Insert Institution
    const s1 = parseInt(strength_1st_year) || 0;
    const s2 = parseInt(strength_2nd_year) || 0;
    const s3 = parseInt(strength_3rd_year) || 0;

    const instRes = await db.run(
      `INSERT INTO institutions (unit_id, institution_name, ano_cto_name, ano_cto_contact, pin_code, strength_1st_year, strength_2nd_year, strength_3rd_year, google_location, complete_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [unit_id, institution_name, ano_cto_name, ano_cto_contact || '', pin_code || '', s1, s2, s3, google_location || '', complete_address || '']
    );
    const instId = instRes.lastID;

    // Create ANO/CTO Login
    const passwordHash = await bcrypt.hash(password, 10);
    const userRes = await db.run(
      `INSERT INTO users (name, email, login_id, password_hash, role, unit_id, institution_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ano_cto_name, ano_cto_email, login_id, passwordHash, 'INSTITUTION', unit_id, instId]
    );

    // Audit Log
    await db.run(
      'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
      ['INSTITUTION', instId, 'ONBOARDED', req.user.id, `Onboarded institution ${institution_name} with cadet strength (1st Yr: ${s1}, 2nd Yr: ${s2}, 3rd Yr: ${s3})`]
    );

    res.status(201).json({
      message: 'Institution & ANO/CTO login created successfully.',
      institution: {
        id: instId,
        institution_name,
        ano_cto_name,
        ano_cto_contact,
        strength_1st_year: s1,
        strength_2nd_year: s2,
        strength_3rd_year: s3,
        google_location,
        complete_address
      },
      user: { id: userRes.lastID, email: ano_cto_email, login_id, role: 'INSTITUTION' }
    });

  } catch (error) {
    console.error('Create institution error:', error);
    res.status(500).json({ error: 'Failed to create institution.' });
  }
});

// PUT /api/institutions/:id - Unit or Institution updates institution details and strength
router.put('/:id', authenticateToken, authorizeRoles('UNIT', 'INSTITUTION', 'ADMIN'), async (req, res) => {
  try {
    const { institution_name, ano_cto_name, ano_cto_contact, pin_code, strength_1st_year, strength_2nd_year, strength_3rd_year, ano_cto_email, login_id, password, google_location, complete_address } = req.body;
    const db = await getDB();

    // Verify ownership
    let inst;
    if (req.user.role === 'UNIT') {
      inst = await db.get('SELECT * FROM institutions WHERE id = ? AND unit_id = ?', [req.params.id, req.user.unit_id]);
      if (!inst) {
        return res.status(404).json({ error: 'Institution not found under your unit.' });
      }
    } else if (req.user.role === 'INSTITUTION') {
      if (req.user.institution_id != req.params.id) {
        return res.status(403).json({ error: 'Unauthorized: You can only update your own institution.' });
      }
      inst = await db.get('SELECT * FROM institutions WHERE id = ?', [req.params.id]);
      if (!inst) {
        return res.status(404).json({ error: 'Institution not found.' });
      }
    } else if (req.user.role === 'ADMIN') {
      inst = await db.get('SELECT * FROM institutions WHERE id = ?', [req.params.id]);
      if (!inst) {
        return res.status(404).json({ error: 'Institution not found.' });
      }
    }

    const s1 = strength_1st_year !== undefined ? parseInt(strength_1st_year) : inst.strength_1st_year;
    const s2 = strength_2nd_year !== undefined ? parseInt(strength_2nd_year) : inst.strength_2nd_year;
    const s3 = strength_3rd_year !== undefined ? parseInt(strength_3rd_year) : inst.strength_3rd_year;

    await db.run(
      `UPDATE institutions 
       SET institution_name = ?, ano_cto_name = ?, ano_cto_contact = ?, pin_code = ?, strength_1st_year = ?, strength_2nd_year = ?, strength_3rd_year = ?, google_location = ?, complete_address = ?
       WHERE id = ?`,
      [
        institution_name || inst.institution_name,
        ano_cto_name || inst.ano_cto_name,
        ano_cto_contact ?? inst.ano_cto_contact,
        pin_code ?? inst.pin_code,
        s1,
        s2,
        s3,
        google_location ?? inst.google_location,
        complete_address ?? inst.complete_address,
        req.params.id
      ]
    );

    // Update User credentials if provided
    const instId = parseInt(req.params.id);
    if (ano_cto_email || login_id || password) {

      if (login_id) {
        const existingLoginId = await db.get('SELECT id, institution_id FROM users WHERE login_id = ?', [login_id]);
        if (existingLoginId && existingLoginId.institution_id !== instId) {
          return res.status(400).json({ error: 'Login ID already registered to another user.' });
        }
      }

      const existingInstUser = await db.get('SELECT id FROM users WHERE institution_id = ? AND role = "INSTITUTION"', [instId]);
      if (existingInstUser) {
        if (password && password.trim().length > 0) {
          const passwordHash = await bcrypt.hash(password, 10);
          await db.run(
            'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), login_id = COALESCE(?, login_id), password_hash = ? WHERE id = ?',
            [ano_cto_name, ano_cto_email, login_id, passwordHash, existingInstUser.id]
          );
        } else {
          await db.run(
            'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), login_id = COALESCE(?, login_id) WHERE id = ?',
            [ano_cto_name, ano_cto_email, login_id, existingInstUser.id]
          );
        }
      } else if (ano_cto_email && login_id) {
        const passwordHash = await bcrypt.hash(password || 'Ano@123', 10);
        await db.run(
          'INSERT INTO users (name, email, login_id, password_hash, role, unit_id, institution_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [ano_cto_name, ano_cto_email, login_id, passwordHash, 'INSTITUTION', inst.unit_id, req.params.id]
        );
      }
    }

    await db.run(
      'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
      ['INSTITUTION', req.params.id, 'UPDATED_PROFILE_AND_STRENGTH', req.user.id, `Updated data and strength to (1st Yr: ${s1}, 2nd Yr: ${s2}, 3rd Yr: ${s3})`]
    );

    res.json({ message: 'Institution data and cadet quota updated successfully.' });
  } catch (error) {
    console.error('Update institution error:', error);
    res.status(500).json({ error: 'Failed to update institution.' });
  }
});

// PUT /api/institutions/:id/schedule - Institution or Unit/Admin updates their schedule
router.put('/:id/schedule', authenticateToken, authorizeRoles('INSTITUTION', 'UNIT', 'ADMIN'), async (req, res) => {
  try {
    const { first_demand_day, first_demand_time, second_demand_day, second_demand_time } = req.body;
    
    const db = await getDB();

    // Check ownership for INSTITUTION
    if (req.user.role === 'INSTITUTION' && req.user.institution_id != req.params.id) {
      return res.status(403).json({ error: 'Unauthorized to update this institution.' });
    }

    // Check ownership for UNIT
    if (req.user.role === 'UNIT') {
      const inst = await db.get('SELECT id FROM institutions WHERE id = ? AND unit_id = ?', [req.params.id, req.user.unit_id]);
      if (!inst) {
        return res.status(403).json({ error: 'Institution not under your unit jurisdiction.' });
      }
    }
    
    await db.run(
      `UPDATE institutions 
       SET first_demand_day = ?, first_demand_time = ?, second_demand_day = ?, second_demand_time = ?
       WHERE id = ?`,
      [first_demand_day, first_demand_time, second_demand_day, second_demand_time, req.params.id]
    );
    
    res.json({ message: 'Schedule updated successfully.' });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ error: error.message || 'Failed to update schedule.' });
  }
});

// DELETE /api/institutions/:id - Unit or Admin deletes an institution
router.delete('/:id', authenticateToken, authorizeRoles('UNIT', 'ADMIN'), async (req, res) => {
  const db = await getDB();
  const instId = parseInt(req.params.id);

  try {
    let inst;
    if (req.user.role === 'UNIT') {
      inst = await db.get('SELECT * FROM institutions WHERE id = ? AND unit_id = ?', [instId, req.user.unit_id]);
      if (!inst) {
        return res.status(404).json({ error: 'Institution not found under your unit.' });
      }
    } else {
      inst = await db.get('SELECT * FROM institutions WHERE id = ?', [instId]);
      if (!inst) {
        return res.status(404).json({ error: 'Institution not found.' });
      }
    }

    const demandCountRow = await db.get('SELECT COUNT(*) as count FROM demands WHERE institution_id = ?', [instId]);
    const demandCount = demandCountRow ? demandCountRow.count : 0;

    const { force } = req.query;
    if (demandCount > 0 && force !== 'true') {
      return res.status(400).json({
        error: `Cannot delete '${inst.institution_name}' because it has ${demandCount} existing demand record(s).`,
        hasDemands: true,
        demandCount
      });
    }

    // 1. Delete associated demands and sub-records if force
    if (demandCount > 0) {
      const demands = await db.all('SELECT id FROM demands WHERE institution_id = ?', [instId]);
      const demandIds = demands.map(d => d.id);
      if (demandIds.length > 0) {
        const placeholders = demandIds.map(() => '?').join(',');
        await db.run(`DELETE FROM demand_items WHERE demand_id IN (${placeholders})`, demandIds);
        await db.run(`DELETE FROM demand_activity WHERE demand_id IN (${placeholders})`, demandIds);
        await db.run(`DELETE FROM demands WHERE id IN (${placeholders})`, demandIds);
      }
    }

    // 2. Delete linked users
    await db.run('DELETE FROM users WHERE institution_id = ?', [instId]);

    // 3. Delete institution
    await db.run('DELETE FROM institutions WHERE id = ?', [instId]);

    // 4. Audit log
    await db.run(
      'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
      ['INSTITUTION', instId, 'DELETED', req.user.id, `Deleted institution ${inst.institution_name}`]
    );

    res.json({ message: `Institution '${inst.institution_name}' deleted successfully.` });
  } catch (error) {
    console.error('Delete institution error:', error);
    res.status(500).json({ error: 'Failed to delete institution: ' + error.message });
  }
});

module.exports = router;

