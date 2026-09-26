const express = require('express');
const path = require('path');
const router = express.Router();
const { getDB } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { broadcastToUser, broadcastToRole, broadcastToAll } = require('../sse');

// Helper to generate unique demand number (e.g., DEM-2026-023)
async function generateDemandNumber(db) {
  const year = new Date().getFullYear();
  const prefix = `DEM-${year}-`;
  const rows = await db.all(
    "SELECT demand_number FROM demands WHERE demand_number LIKE ?",
    [`${prefix}%`]
  );
  let maxSeq = 0;
  for (const r of rows) {
    if (r.demand_number) {
      const parts = r.demand_number.split('-');
      if (parts.length >= 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  }

  let nextSeq = maxSeq + 1;
  while (true) {
    const candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`;
    const exists = await db.get("SELECT id FROM demands WHERE demand_number = ?", [candidate]);
    if (!exists) {
      return candidate;
    }
    nextSeq++;
  }
}

const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/receipts/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// GET /api/demands - List demands with role-based scoping and filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    const { status, unit_id, institution_id, search } = req.query;

    let baseQuery = `
      SELECT d.*, 
        COALESCE(i.institution_name, CONCAT(u.unit_name, ' (Direct Unit Demand)')) as institution_name,
        COALESCE(i.ano_cto_name, CONCAT(usr.name, ' (Unit HQ)')) as ano_cto_name,
        COALESCE(i.complete_address, CASE WHEN d.delivery_venue IS NOT NULL AND d.delivery_venue NOT GLOB '[0-9]*' AND LENGTH(d.delivery_venue) > 3 THEN d.delivery_venue ELSE NULL END, u.location, u.unit_name, 'Unit Battalion HQ') as complete_address,
        COALESCE(i.google_location, '') as google_location,
        u.unit_name, u.unit_code, u.ncc_group,
        CASE WHEN d.demand_type = 'UNIT_DIRECT' THEN COALESCE(u.unit_code, u.unit_name) ELSE COALESCE(i.institution_name, u.unit_name) END as beneficiary_name,
        usr.name as raised_by_name,
        rev.name as reviewed_by_name,
        (SELECT SUM(di.quantity * di.unit_price_snapshot) FROM demand_items di WHERE di.demand_id = d.id) as total_amount,
        (SELECT SUM(di.quantity) FROM demand_items di WHERE di.demand_id = d.id) as total_quantity,
        (SELECT AVG(di.unit_price_snapshot) FROM demand_items di WHERE di.demand_id = d.id) as avg_unit_price,
        (SELECT GROUP_CONCAT(ri.item_name, ', ') FROM demand_items di JOIN refreshment_items ri ON di.item_id = ri.id WHERE di.demand_id = d.id) as item_name
      FROM demands d
      LEFT JOIN institutions i ON d.institution_id = i.id
      JOIN units u ON d.unit_id = u.id
      JOIN users usr ON d.raised_by = usr.id
      LEFT JOIN users rev ON d.reviewed_by = rev.id
      WHERE d.is_deleted = 0
    `;

    const params = [];

    // Role-based scoping rules
    if (req.user.role === 'INSTITUTION') {
      baseQuery += ' AND d.institution_id = ?';
      params.push(req.user.institution_id);
    } else if (req.user.role === 'UNIT') {
      baseQuery += ' AND d.unit_id = ?';
      params.push(req.user.unit_id);
    } else if (req.user.role === 'ADMIN') {
      // Admin sees all active/completed demands after unit approval
      baseQuery += ` AND d.status IN ('APPROVED', 'ACCEPTED', 'PREPARING', 'READY_FOR_DISPATCH', 'DELIVERED', 'REJECTED', 'FULFILLED')`;
    }

    // Additional query filters
    if (status) {
      baseQuery += ' AND d.status = ?';
      params.push(status);
    }

    if (unit_id && req.user.role === 'ADMIN') {
      baseQuery += ' AND d.unit_id = ?';
      params.push(unit_id);
    }

    if (institution_id && (req.user.role === 'ADMIN' || req.user.role === 'UNIT')) {
      baseQuery += ' AND d.institution_id = ?';
      params.push(institution_id);
    }

    if (search) {
      baseQuery += ' AND (d.demand_number LIKE ? OR i.institution_name LIKE ? OR u.unit_name LIKE ? OR d.purpose LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    baseQuery += ' ORDER BY d.created_at DESC';

    const demands = await db.all(baseQuery, params);

    // Fetch items for each demand and coerce quantities to numbers
    for (const d of demands) {
      d.total_quantity = Number(d.total_quantity) || 0;
      d.total_amount = Number(d.total_amount) || 0;
      d.avg_unit_price = Number(d.avg_unit_price) || 0;
      const items = await db.all(
        `SELECT di.*, ri.item_name, ri.unit_of_measure 
         FROM demand_items di
         JOIN refreshment_items ri ON di.item_id = ri.id
         WHERE di.demand_id = ?`,
        [d.id]
      );
      d.items = items;
    }

    res.json(demands);
  } catch (error) {
    console.error('Fetch demands error:', error);
    res.status(500).json({ error: 'Failed to retrieve demands.' });
  }
});

// GET /api/demands/:id - Get detailed demand with items
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    const demand = await db.get(
      `SELECT d.*, 
              COALESCE(i.institution_name, CONCAT(u.unit_name, ' (Direct Unit Demand)')) as institution_name,
              COALESCE(i.ano_cto_name, CONCAT(usr.name, ' (Unit HQ)')) as ano_cto_name,
              i.strength_1st_year, i.strength_2nd_year, i.strength_3rd_year,
              COALESCE(i.complete_address, d.delivery_venue, u.location, 'Unit Battalion HQ') as complete_address,
              COALESCE(i.google_location, '') as google_location,
              u.unit_name, u.unit_code, u.ncc_group, usr.name as raised_by_name, rev.name as reviewed_by_name
       FROM demands d
       LEFT JOIN institutions i ON d.institution_id = i.id
       JOIN units u ON d.unit_id = u.id
       JOIN users usr ON d.raised_by = usr.id
       LEFT JOIN users rev ON d.reviewed_by = rev.id
       WHERE d.id = ? AND d.is_deleted = 0`,
      [req.params.id]
    );

    if (!demand) {
      return res.status(404).json({ error: 'Demand not found.' });
    }

    // Role security check
    if (req.user.role === 'INSTITUTION' && demand.institution_id !== req.user.institution_id) {
      return res.status(403).json({ error: 'Access denied to this demand.' });
    }
    if (req.user.role === 'UNIT' && demand.unit_id !== req.user.unit_id) {
      return res.status(403).json({ error: 'Access denied to this demand.' });
    }
    if (req.user.role === 'ADMIN' && !['APPROVED', 'ACCEPTED', 'PREPARING', 'READY_FOR_DISPATCH', 'DELIVERED', 'FULFILLED'].includes(demand.status)) {
      return res.status(403).json({ error: 'Admin can only view approved, accepted, preparing, dispatched, or fulfilled demands.' });
    }

    const items = await db.all(
      `SELECT di.*, ri.item_name, ri.unit_of_measure 
       FROM demand_items di
       JOIN refreshment_items ri ON di.item_id = ri.id
       WHERE di.demand_id = ?`,
      [demand.id]
    );
    demand.items = items;

    res.json(demand);
  } catch (error) {
    console.error('Fetch demand detail error:', error);
    res.status(500).json({ error: 'Failed to retrieve demand details.' });
  }
});

// POST /api/demands - Institution ANO/CTO or Unit HQ creates/places demand with live vacancy validation
router.post('/', authenticateToken, authorizeRoles('INSTITUTION', 'UNIT', 'ADMIN'), async (req, res) => {
  try {
    const { 
      demand_date, 
      demand_time, 
      purpose, 
      items, 
      demand_type = 'INSTITUTION', 
      packet_type = 'REGULAR', 
      custom_unit_rate, 
      total_packets,
      delivery_venue,
      institution_id: requestedInstId 
    } = req.body;

    const db = await getDB();
    const isUnitOrAdmin = req.user.role === 'UNIT' || req.user.role === 'ADMIN';
    let unitId = req.user.unit_id;
    if (!unitId) {
      const defaultUnit = await db.get('SELECT id FROM units ORDER BY id ASC LIMIT 1');
      unitId = defaultUnit ? defaultUnit.id : 1;
    }

    // =========================================================================
    // CASE A: DIRECT UNIT DEMAND (Battalion HQ Demand with custom rate & packets)
    // =========================================================================
    if (isUnitOrAdmin && demand_type === 'UNIT_DIRECT') {
      if (!demand_date || !purpose) {
        return res.status(400).json({ error: 'Demand date and purpose/occasion are required.' });
      }

      const packetCount = parseInt(total_packets, 10);
      if (isNaN(packetCount) || packetCount <= 0) {
        return res.status(400).json({ error: 'Total packets must be a positive integer.' });
      }

      let rate = parseFloat(custom_unit_rate);
      if (packet_type === 'CUSTOMIZED') {
        if (isNaN(rate) || rate <= 0) {
          return res.status(400).json({ error: 'Please specify a valid custom rate per packet in ₹.' });
        }
      } else {
        // Regular packet rate
        const activeTmpl = await db.get('SELECT target_budget FROM packet_templates WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
        rate = !isNaN(rate) && rate > 0 ? rate : (activeTmpl?.target_budget || 75.0);
      }

      // Fetch packet item ID
      let packetItem = await db.get("SELECT id FROM refreshment_items WHERE item_name = 'Standard Refreshment Packet'");
      if (!packetItem) {
        packetItem = await db.get("SELECT id FROM refreshment_items LIMIT 1");
      }
      const itemId = packetItem ? packetItem.id : 1;

      // Generate Demand Number
      const timeVal = demand_time || '08:00';
      let demandNumber = '';
      let demandRes = null;
      let attempts = 0;
      while (attempts < 5) {
        try {
          demandNumber = await generateDemandNumber(db);
          demandRes = await db.run(
            `INSERT INTO demands (
              demand_number, institution_id, unit_id, raised_by, demand_date, demand_time, 
              purpose, status, demand_type, packet_type, custom_unit_rate, delivery_venue,
              reviewed_by, reviewed_at, review_remarks
            ) VALUES (?, NULL, ?, ?, ?, ?, ?, 'APPROVED', 'UNIT_DIRECT', ?, ?, ?, ?, CURRENT_TIMESTAMP, 'Direct Unit Requirement Approved by Unit HQ')`,
            [demandNumber, unitId, req.user.id, demand_date, timeVal, purpose, packet_type, rate, delivery_venue || 'Battalion HQ', req.user.id]
          );
          break;
        } catch (err) {
          if (err.message && err.message.includes('UNIQUE constraint failed') && attempts < 4) {
            attempts++;
            continue;
          }
          throw err;
        }
      }

      const demandId = demandRes.lastID;

      // Insert Demand Item
      await db.run(
        `INSERT INTO demand_items (demand_id, item_id, year_group, quantity, unit_price_snapshot)
         VALUES (?, ?, '1st Year', ?, ?)`,
        [demandId, itemId, packetCount, rate]
      );

      // Audit Log
      await db.run(
        'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
        ['DEMAND', demandId, 'CREATED', req.user.id, `Unit Direct Demand ${demandNumber} placed: ${packetCount} pkts @ ₹${rate}`]
      );

      // Notify HQ Admin
      const adminUsers = await db.all('SELECT id FROM users WHERE role = "ADMIN"');
      const demandEventData = {
        id: demandId,
        demand_number: demandNumber,
        status: 'APPROVED',
        unit_id: unitId,
        demand_type: 'UNIT_DIRECT',
        timestamp: Date.now()
      };

      for (const a of adminUsers) {
        await db.run(
          'INSERT INTO notifications (user_id, title, message, link_url) VALUES (?, ?, ?, ?)',
          [a.id, 'New Unit Direct Demand', `Unit direct demand ${demandNumber} (${packetCount} pkts @ ₹${rate}) placed.`, '/approved-demands']
        );
        broadcastToUser(a.id, 'NEW_NOTIFICATION', { count: 1, timestamp: Date.now() });
      }
      broadcastToRole('ADMIN', 'DEMAND_UPDATED', demandEventData);
      broadcastToRole('UNIT', 'DEMAND_UPDATED', demandEventData);
      broadcastToAll('DEMAND_UPDATED', demandEventData);

      return res.status(201).json({
        message: 'Unit refreshment demand initiated and approved successfully.',
        demand_id: demandId,
        demand_number: demandNumber,
        status: 'APPROVED'
      });
    }

    // =========================================================================
    // CASE B: INSTITUTION DEMAND (Raised by ANO or by Unit on institution's behalf)
    // =========================================================================
    if (!demand_date || !purpose || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Demand date, purpose, and at least one item are required.' });
    }

    const isUnitUser = isUnitOrAdmin;
    const instId = isUnitUser ? parseInt(requestedInstId, 10) : req.user.institution_id;
    if (!instId) {
      return res.status(400).json({ error: 'Please select an institution to raise demand on their behalf.' });
    }

    // 1. Fetch Institution sanctioned cadet strengths
    const inst = await db.get('SELECT * FROM institutions WHERE id = ?', [instId]);
    if (!inst) {
      return res.status(404).json({ error: 'Institution not found.' });
    }
    if (req.user.role === 'UNIT' && inst.unit_id !== unitId) {
      return res.status(403).json({ error: 'Selected institution does not belong to your Unit.' });
    }

    // 2. Validate Year Group quantities against Sanctioned Strength (Server-Side Enforcement)
    const totalByYear = {
      '1st Year': 0,
      '2nd Year': 0,
      '3rd Year': 0
    };

    for (const item of items) {
      if (!['1st Year', '2nd Year', '3rd Year'].includes(item.year_group)) {
        return res.status(400).json({ error: `Invalid year group: ${item.year_group}` });
      }
      const qty = parseInt(item.quantity) || 0;
      if (qty <= 0) {
        return res.status(400).json({ error: 'Item quantity must be greater than zero.' });
      }

      // Check item validity, snapshot unit price, and verify not expired
      const catalogItem = await db.get('SELECT item_name, unit_price, is_active, expiry_date FROM refreshment_items WHERE id = ?', [item.item_id]);
      if (!catalogItem || catalogItem.is_active !== 1) {
        return res.status(400).json({ error: `Item ID ${item.item_id} is inactive or does not exist.` });
      }
      const todayStr = new Date().toISOString().split('T')[0];
      if (catalogItem.expiry_date && catalogItem.expiry_date <= todayStr) {
        return res.status(400).json({
          error: `Item '${catalogItem.item_name}' is EXPIRED (Expiry: ${catalogItem.expiry_date}). Expired items cannot be added to cadet demands.`
        });
      }
      let itemPrice = catalogItem.unit_price;
      if (catalogItem.item_name === 'Standard Refreshment Packet') {
        const activeTmpl = await db.get('SELECT * FROM packet_templates WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
        if (activeTmpl) {
          itemPrice = catalogItem.unit_price || activeTmpl.target_budget || 75.00;
        }
      }
      item.unit_price_snapshot = itemPrice;

      totalByYear[item.year_group] += qty;
    }

    // Check vacancy bounds
    if (totalByYear['1st Year'] > inst.strength_1st_year) {
      return res.status(400).json({
        error: `Demand quantity for 1st Year (${totalByYear['1st Year']}) exceeds sanctioned strength (${inst.strength_1st_year}).`
      });
    }
    if (totalByYear['2nd Year'] > inst.strength_2nd_year) {
      return res.status(400).json({
        error: `Demand quantity for 2nd Year (${totalByYear['2nd Year']}) exceeds sanctioned strength (${inst.strength_2nd_year}).`
      });
    }
    if (totalByYear['3rd Year'] > inst.strength_3rd_year) {
      return res.status(400).json({
        error: `Demand quantity for 3rd Year (${totalByYear['3rd Year']}) exceeds sanctioned strength (${inst.strength_3rd_year}).`
      });
    }

    // 2.5. Check Annual Quota (Max 35 classes per cadet per year)
    const demandYear = new Date(demand_date).getFullYear();
    const yearStart = `${demandYear}-01-01`;
    const yearEnd = `${demandYear}-12-31`;

    const yearlyDemands = await db.get(
      `SELECT SUM(di.quantity) as total_quantity
       FROM demands d
       JOIN demand_items di ON d.id = di.demand_id
       WHERE d.institution_id = ? AND d.is_deleted = 0 AND d.status NOT IN ('REJECTED', 'CANCELLED')
         AND d.demand_date >= ? AND d.demand_date <= ?`,
      [instId, yearStart, yearEnd]
    );

    const existingYearlyQuantity = Number(yearlyDemands?.total_quantity || 0);
    const newQuantity = Number(totalByYear['1st Year'] || 0) + Number(totalByYear['2nd Year'] || 0) + Number(totalByYear['3rd Year'] || 0);

    const totalSanctionedStrength = Number(inst.strength_1st_year || 0) + Number(inst.strength_2nd_year || 0) + Number(inst.strength_3rd_year || 0);
    const maxYearlyPackets = totalSanctionedStrength * 35;

    if (existingYearlyQuantity + newQuantity > maxYearlyPackets) {
      return res.status(400).json({
        error: `Annual quota exceeded. Max allowed packets for the year: ${maxYearlyPackets}. Demanded so far: ${existingYearlyQuantity}. Current demand: ${newQuantity}.`
      });
    }

    // 3. Generate Demand Number & Insert Demand with collision-proof retry
    const timeVal = demand_time || '08:00';
    let demandNumber = '';
    let demandRes = null;
    let attempts = 0;
    const initialStatus = isUnitUser ? 'APPROVED' : 'PENDING';
    const reviewRemarks = isUnitUser ? 'Directly Raised & Approved on Institution Behalf by Unit HQ' : null;
    const reviewedBy = isUnitUser ? req.user.id : null;
    const reviewedAt = isUnitUser ? new Date().toISOString() : null;

    while (attempts < 5) {
      try {
        demandNumber = await generateDemandNumber(db);
        demandRes = await db.run(
          `INSERT INTO demands (
            demand_number, institution_id, unit_id, raised_by, demand_date, demand_time, 
            purpose, status, demand_type, delivery_venue, reviewed_by, reviewed_at, review_remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'INSTITUTION', ?, ?, ?, ?)`,
          [demandNumber, instId, unitId, req.user.id, demand_date, timeVal, purpose, initialStatus, delivery_venue || inst.complete_address, reviewedBy, reviewedAt, reviewRemarks]
        );
        break;
      } catch (err) {
        if (err.message && err.message.includes('UNIQUE constraint failed') && attempts < 4) {
          attempts++;
          continue;
        }
        throw err;
      }
    }

    const demandId = demandRes.lastID;

    // 4. Insert Demand Items (Enforce global rate)
    const activeTmpl = await db.get('SELECT target_budget FROM packet_templates WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    const fixedRate = activeTmpl?.target_budget || 75.0;

    for (const item of items) {
      await db.run(
        `INSERT INTO demand_items (demand_id, item_id, year_group, quantity, unit_price_snapshot)
         VALUES (?, ?, ?, ?, ?)`,
        [demandId, item.item_id, item.year_group, item.quantity, fixedRate]
      );
    }

    // 5. Audit Log
    await db.run(
      'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
      ['DEMAND', demandId, 'CREATED', req.user.id, `Initiated demand ${demandNumber} for ${inst.institution_name}: ${purpose}`]
    );

    // 6. Notify Unit / Admin Users & Broadcast SSE
    const demandEventData = {
      id: demandId,
      demand_number: demandNumber,
      status: initialStatus,
      unit_id: unitId,
      institution_id: instId,
      timestamp: Date.now()
    };

    if (!isUnitUser) {
      const unitUsers = await db.all('SELECT id FROM users WHERE unit_id = ? AND role = "UNIT"', [unitId]);
      for (const u of unitUsers) {
        await db.run(
          'INSERT INTO notifications (user_id, title, message, link_url) VALUES (?, ?, ?, ?)',
          [u.id, 'New Demand Received', `New demand ${demandNumber} submitted by ${inst.institution_name}.`, '/review-demands']
        );
        broadcastToUser(u.id, 'NEW_NOTIFICATION', { count: 1, timestamp: Date.now() });
        broadcastToUser(u.id, 'DEMAND_UPDATED', demandEventData);
      }
    } else {
      // If Unit approved it, notify Admin
      const adminUsers = await db.all('SELECT id FROM users WHERE role = "ADMIN"');
      for (const a of adminUsers) {
        await db.run(
          'INSERT INTO notifications (user_id, title, message, link_url) VALUES (?, ?, ?, ?)',
          [a.id, 'Approved Demand on Behalf', `Demand ${demandNumber} raised on behalf of ${inst.institution_name} by Unit.`, '/approved-demands']
        );
        broadcastToUser(a.id, 'NEW_NOTIFICATION', { count: 1, timestamp: Date.now() });
      }
    }

    broadcastToRole('UNIT', 'DEMAND_UPDATED', demandEventData);
    broadcastToRole('ADMIN', 'DEMAND_UPDATED', demandEventData);
    broadcastToRole('INSTITUTION', 'DEMAND_UPDATED', demandEventData);
    broadcastToAll('DEMAND_UPDATED', demandEventData);

    res.status(201).json({
      message: isUnitUser ? 'Demand raised on behalf of institution and approved successfully.' : 'Demand initiated successfully and sent to NCC Unit for review.',
      demand_id: demandId,
      demand_number: demandNumber,
      status: initialStatus
    });

  } catch (error) {
    console.error('Create demand error:', error);
    res.status(500).json({ error: error.message || 'Failed to create demand.' });
  }
});

// POST /api/demands/:id/review - NCC Unit or Admin APPROVES or REJECTS demand
router.post('/:id/review', authenticateToken, authorizeRoles('UNIT', 'ADMIN'), async (req, res) => {
  try {
    const { action, remarks } = req.body; // action: 'APPROVE' or 'REJECT'
    const demandId = req.params.id;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT.' });
    }

    if (action === 'REJECT' && (!remarks || !remarks.trim())) {
      return res.status(400).json({ error: 'Remarks are mandatory when rejecting a demand.' });
    }

    const db = await getDB();
    const demand = req.user.role === 'ADMIN'
      ? await db.get('SELECT * FROM demands WHERE id = ? AND is_deleted = 0', [demandId])
      : await db.get('SELECT * FROM demands WHERE id = ? AND unit_id = ? AND is_deleted = 0', [demandId, req.user.unit_id]);

    if (!demand) {
      return res.status(404).json({ error: 'Demand not found under your unit jurisdiction.' });
    }

    if (demand.status !== 'PENDING') {
      if ((demand.status === 'APPROVED' && action === 'APPROVE') || (demand.status === 'REJECTED' && action === 'REJECT')) {
        const existingDemand = await db.get('SELECT * FROM demands WHERE id = ?', [demandId]);
        return res.json({
          message: `Demand is already ${demand.status.toLowerCase()}.`,
          demand: existingDemand,
          demand_id: demandId,
          status: demand.status
        });
      }
      return res.status(400).json({ error: `Cannot review demand with current status '${demand.status}'. Only PENDING demands can be reviewed.` });
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db.run(
      `UPDATE demands 
       SET status = ?, reviewed_by = ?, review_remarks = ?, reviewed_at = ?
       WHERE id = ?`,
      [newStatus, req.user.id, remarks || '', now, demandId]
    );

    // Audit Log
    await db.run(
      'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
      ['DEMAND', demandId, newStatus, req.user.id, `${newStatus} demand ${demand.demand_number}. Remarks: ${remarks || 'None'}`]
    );

    // Timeline Activity Log
    await db.run(
      'INSERT INTO demand_activity (demand_id, user_id, action_type, old_status, new_status, message) VALUES (?, ?, ?, ?, ?, ?)',
      [demandId, req.user.id, 'STATUS_CHANGE', demand.status, newStatus, `Demand ${newStatus.toLowerCase()} by Unit.`]
    );

    // Notify Institution, Unit role, Admin role, and All clients
    const updatedDemand = await db.get('SELECT * FROM demands WHERE id = ?', [demandId]);
    const eventPayload = { ...updatedDemand, timestamp: Date.now() };
    broadcastToAll('DEMAND_UPDATED', eventPayload);
    broadcastToUser(demand.raised_by, 'DEMAND_UPDATED', eventPayload);
    broadcastToRole('INSTITUTION', 'DEMAND_UPDATED', eventPayload);
    broadcastToRole('UNIT', 'DEMAND_UPDATED', eventPayload);
    broadcastToRole('ADMIN', 'DEMAND_UPDATED', eventPayload);

    // Also trigger NEW_NOTIFICATION for the institution user if a notification was inserted
    const msg = `Your demand ${demand.demand_number} was ${newStatus.toLowerCase()}.`;
    await db.run('INSERT INTO notifications (user_id, title, message, link_url) VALUES (?, ?, ?, ?)', [demand.raised_by, 'Demand Update', msg, '/my-demands']);
    broadcastToUser(demand.raised_by, 'NEW_NOTIFICATION', { count: 1 });

    res.json({
      message: `Demand successfully ${newStatus.toLowerCase()}.`,
      status: newStatus
    });

  } catch (error) {
    console.error('Review demand error:', error);
    res.status(500).json({ error: 'Failed to process demand review.' });
  }
});

// POST /api/demands/:id/accept - ADMIN accepts an APPROVED demand
router.post('/:id/accept', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const demandId = req.params.id;
    const db = await getDB();
    const demand = await db.get('SELECT * FROM demands WHERE id = ? AND is_deleted = 0', [demandId]);

    if (demand.status === 'ACCEPTED') {
      return res.json({ message: 'Demand is already accepted.', status: 'ACCEPTED' });
    }
    if (demand.status !== 'APPROVED') return res.status(400).json({ error: `Only APPROVED demands can be accepted. Current status: ${demand.status}` });

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db.run(
      `UPDATE demands SET status = 'ACCEPTED', accepted_by = ?, accepted_at = ? WHERE id = ?`,
      [req.user.id, now, demandId]
    );

    // Timeline Activity Log
    await db.run(
      'INSERT INTO demand_activity (demand_id, user_id, action_type, old_status, new_status, message) VALUES (?, ?, ?, ?, ?, ?)',
      [demandId, req.user.id, 'STATUS_CHANGE', 'APPROVED', 'ACCEPTED', 'Demand accepted by Vendor/Admin.']
    );

    const updatedDemand = await db.get('SELECT * FROM demands WHERE id = ?', [demandId]);
    const eventPayload = { ...updatedDemand, timestamp: Date.now() };
    broadcastToAll('DEMAND_UPDATED', eventPayload);
    broadcastToUser(demand.raised_by, 'DEMAND_UPDATED', eventPayload);
    broadcastToRole('INSTITUTION', 'DEMAND_UPDATED', eventPayload);
    broadcastToRole('UNIT', 'DEMAND_UPDATED', eventPayload);
    broadcastToRole('ADMIN', 'DEMAND_UPDATED', eventPayload);

    const msg = `Your demand ${demand.demand_number} was accepted by the vendor.`;
    await db.run('INSERT INTO notifications (user_id, title, message, link_url) VALUES (?, ?, ?, ?)', [demand.raised_by, 'Demand Update', msg, '/my-demands']);
    broadcastToUser(demand.raised_by, 'NEW_NOTIFICATION', { count: 1 });

    res.json({ message: 'Demand successfully marked as ACCEPTED.', status: 'ACCEPTED' });
  } catch (error) {
    console.error('Accept demand error:', error);
    res.status(500).json({ error: 'Failed to accept demand.' });
  }
});

// POST /api/demands/:id/prepare - ADMIN marks ACCEPTED demand as PREPARING
router.post('/:id/prepare', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const demandId = req.params.id;
    const db = await getDB();
    const demand = await db.get('SELECT * FROM demands WHERE id = ? AND is_deleted = 0', [demandId]);

    if (!demand) return res.status(404).json({ error: 'Demand not found.' });
    if (demand.status === 'PREPARING') return res.json({ message: 'Demand is already preparing.', status: 'PREPARING' });
    if (demand.status !== 'ACCEPTED') return res.status(400).json({ error: `Only ACCEPTED demands can be prepared. Current status: ${demand.status}` });

    await db.run(
      `UPDATE demands SET status = 'PREPARING' WHERE id = ?`,
      [demandId]
    );

    // Timeline Activity Log
    await db.run(
      'INSERT INTO demand_activity (demand_id, user_id, action_type, old_status, new_status, message) VALUES (?, ?, ?, ?, ?, ?)',
      [demandId, req.user.id, 'STATUS_CHANGE', 'ACCEPTED', 'PREPARING', 'Demand preparation started at Supply Point.']
    );

    const updatedDemand = await db.get('SELECT * FROM demands WHERE id = ?', [demandId]);
    const eventPayload = { ...updatedDemand, timestamp: Date.now() };
    broadcastToAll('DEMAND_UPDATED', eventPayload);
    broadcastToUser(demand.raised_by, 'DEMAND_UPDATED', eventPayload);
    broadcastToRole('INSTITUTION', 'DEMAND_UPDATED', eventPayload);
    broadcastToRole('UNIT', 'DEMAND_UPDATED', eventPayload);
    broadcastToRole('ADMIN', 'DEMAND_UPDATED', eventPayload);

    res.json({ message: 'Demand successfully marked as PREPARING.', status: 'PREPARING' });
  } catch (error) {
    console.error('Prepare demand error:', error);
    res.status(500).json({ error: 'Failed to prepare demand.' });
  }
});

// POST /api/demands/:id/ready-for-dispatch - ADMIN marks PREPARING demand as READY_FOR_DISPATCH
router.post('/:id/ready-for-dispatch', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const demandId = req.params.id;
    const db = await getDB();
    const demand = await db.get('SELECT * FROM demands WHERE id = ? AND is_deleted = 0', [demandId]);

    if (!demand) return res.status(404).json({ error: 'Demand not found.' });
    if (demand.status === 'READY_FOR_DISPATCH') return res.json({ message: 'Demand is already ready for dispatch.', status: 'READY_FOR_DISPATCH' });
    if (demand.status !== 'PREPARING') return res.status(400).json({ error: `Only PREPARING demands can be sent to fleet. Current status: ${demand.status}` });

    await db.run(
      `UPDATE demands SET status = 'READY_FOR_DISPATCH' WHERE id = ?`,
      [demandId]
    );

    // Timeline Activity Log
    await db.run(
      'INSERT INTO demand_activity (demand_id, user_id, action_type, old_status, new_status, message) VALUES (?, ?, ?, ?, ?, ?)',
      [demandId, req.user.id, 'STATUS_CHANGE', 'PREPARING', 'READY_FOR_DISPATCH', 'Demand sent to Fleet Delivery portal.']
    );

    const updatedDemand = await db.get('SELECT * FROM demands WHERE id = ?', [demandId]);
    const eventPayload = { ...updatedDemand, timestamp: Date.now() };
    broadcastToAll('DEMAND_UPDATED', eventPayload);
    broadcastToUser(demand.raised_by, 'DEMAND_UPDATED', eventPayload);
    broadcastToRole('INSTITUTION', 'DEMAND_UPDATED', eventPayload);
    broadcastToRole('UNIT', 'DEMAND_UPDATED', eventPayload);
    broadcastToRole('ADMIN', 'DEMAND_UPDATED', eventPayload);

    res.json({ message: 'Demand successfully marked as READY_FOR_DISPATCH.', status: 'READY_FOR_DISPATCH' });
  } catch (error) {
    console.error('Ready for dispatch demand error:', error);
    res.status(500).json({ error: 'Failed to mark demand ready for dispatch.' });
  }
});

// POST /api/demands/:id/admin-reject - ADMIN rejects an APPROVED demand
router.post('/:id/admin-reject', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const demandId = req.params.id;
    const { reason } = req.body;
    const db = await getDB();
    const demand = await db.get('SELECT * FROM demands WHERE id = ? AND is_deleted = 0', [demandId]);

    if (!demand) return res.status(404).json({ error: 'Demand not found.' });
    if (demand.status !== 'APPROVED') return res.status(400).json({ error: `Only APPROVED demands can be rejected. Current status: ${demand.status}` });

    await db.run(
      `UPDATE demands SET status = 'REJECTED' WHERE id = ?`,
      [demandId]
    );

    // Timeline Activity Log
    const fullReason = reason || 'Rejected by Vendor/Admin.';
    await db.run(
      'INSERT INTO demand_activity (demand_id, user_id, action_type, old_status, new_status, message) VALUES (?, ?, ?, ?, ?, ?)',
      [demandId, req.user.id, 'STATUS_CHANGE', 'APPROVED', 'REJECTED', `Demand rejected by Vendor/Admin. Reason: ${fullReason}`]
    );

    const updatedDemand = await db.get('SELECT * FROM demands WHERE id = ?', [demandId]);
    const eventPayload = { ...updatedDemand, timestamp: Date.now() };
    broadcastToAll('DEMAND_UPDATED', eventPayload);
    broadcastToUser(demand.raised_by, 'DEMAND_UPDATED', eventPayload);
    broadcastToRole('INSTITUTION', 'DEMAND_UPDATED', eventPayload);
    broadcastToRole('UNIT', 'DEMAND_UPDATED', eventPayload);
    broadcastToRole('ADMIN', 'DEMAND_UPDATED', eventPayload);

    const msg = `Your demand ${demand.demand_number} was rejected by the vendor.`;
    await db.run('INSERT INTO notifications (user_id, title, message, link_url) VALUES (?, ?, ?, ?)', [demand.raised_by, 'Demand Update', msg, '/my-demands']);
    broadcastToUser(demand.raised_by, 'NEW_NOTIFICATION', { count: 1 });

    res.json({ message: 'Demand successfully marked as REJECTED.', status: 'REJECTED' });
  } catch (error) {
    console.error('Reject demand error:', error);
    res.status(500).json({ error: 'Failed to reject demand.' });
  }
});

// POST /api/demands/:id/fulfill - ADMIN marks DELIVERED demand as FULFILLED and uploads files
router.post('/:id/fulfill', authenticateToken, authorizeRoles('ADMIN'), upload.fields([{ name: 'receipt', maxCount: 1 }, { name: 'invoice', maxCount: 1 }]), async (req, res) => {
  try {
    const demandId = req.params.id;
    const db = await getDB();
    const demand = await db.get('SELECT * FROM demands WHERE id = ? AND is_deleted = 0', [demandId]);

    if (!demand) return res.status(404).json({ error: 'Demand not found.' });
    if (!['DELIVERED', 'FULFILLED'].includes(demand.status)) {
      return res.status(400).json({ error: `Only DELIVERED or FULFILLED demands can have delivery documents updated. Current status: ${demand.status}` });
    }

    let receiptUrl = demand.delivery_receipt_url;
    let invoiceUrl = demand.invoice_url;

    if (req.files) {
      if (req.files.receipt && req.files.receipt.length > 0) {
        receiptUrl = `/uploads/receipts/${req.files.receipt[0].filename}`;
      }
      if (req.files.invoice && req.files.invoice.length > 0) {
        invoiceUrl = `/uploads/receipts/${req.files.invoice[0].filename}`;
      }
    }

    if (!receiptUrl) {
      return res.status(400).json({ error: 'Signed delivery receipt is mandatory for fulfillment.' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db.run(
      `UPDATE demands SET status = 'FULFILLED', fulfilled_by = ?, fulfilled_at = ?, delivery_receipt_url = ?, invoice_url = ? WHERE id = ?`,
      [req.user.id, now, receiptUrl, invoiceUrl, demandId]
    );

    // Timeline Activity Log
    await db.run(
      'INSERT INTO demand_activity (demand_id, user_id, action_type, old_status, new_status, message) VALUES (?, ?, ?, ?, ?, ?)',
      [demandId, req.user.id, 'STATUS_CHANGE', demand.status, 'FULFILLED', 'Demand marked as FULFILLED (documents uploaded).']
    );

    const updatedDemand = await db.get('SELECT * FROM demands WHERE id = ?', [demandId]);
    const eventPayload = { ...updatedDemand, timestamp: Date.now() };
    broadcastToAll('DEMAND_UPDATED', eventPayload);
    broadcastToUser(demand.raised_by, 'DEMAND_UPDATED', eventPayload);
    broadcastToRole('INSTITUTION', 'DEMAND_UPDATED', eventPayload);
    broadcastToRole('UNIT', 'DEMAND_UPDATED', eventPayload);
    broadcastToRole('ADMIN', 'DEMAND_UPDATED', eventPayload);

    const msg = `Your demand ${demand.demand_number} was fulfilled and documents uploaded.`;
    await db.run('INSERT INTO notifications (user_id, title, message, link_url) VALUES (?, ?, ?, ?)', [demand.raised_by, 'Demand Update', msg, '/my-demands']);
    broadcastToUser(demand.raised_by, 'NEW_NOTIFICATION', { count: 1 });

    res.json({ message: 'Demand successfully marked as FULFILLED.', status: 'FULFILLED', delivery_receipt_url: receiptUrl, invoice_url: invoiceUrl });
  } catch (error) {
    console.error('Fulfill demand error:', error);
    res.status(500).json({ error: 'Failed to fulfill demand.' });
  }
});

// POST /api/demands/:id/cancel - NCC UNIT ONLY can cancel demand
router.post('/:id/cancel', authenticateToken, authorizeRoles('UNIT'), async (req, res) => {
  try {
    const demandId = req.params.id;
    const { remarks } = req.body;
    const db = await getDB();
    const demand = await db.get('SELECT * FROM demands WHERE id = ? AND unit_id = ? AND is_deleted = 0', [demandId, req.user.unit_id]);

    if (!demand) {
      return res.status(404).json({ error: 'Demand not found under your unit jurisdiction.' });
    }

    if (['FULFILLED', 'CANCELLED'].includes(demand.status)) {
      return res.status(400).json({ error: `Cannot cancel demand with status ${demand.status}` });
    }

    await db.run(
      `UPDATE demands SET status = 'CANCELLED', review_remarks = ? WHERE id = ?`,
      [remarks || 'Cancelled by NCC Unit', demandId]
    );

    // Audit Log
    await db.run(
      'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
      ['DEMAND', demandId, 'CANCELLED', req.user.id, `Cancelled demand ${demand.demand_number}. Reason: ${remarks || 'Unit decision'}`]
    );

    const cancelEvent = { id: demandId, status: 'CANCELLED', timestamp: Date.now() };
    broadcastToAll('DEMAND_UPDATED', cancelEvent);
    broadcastToUser(demand.raised_by, 'DEMAND_UPDATED', cancelEvent);
    broadcastToRole('INSTITUTION', 'DEMAND_UPDATED', cancelEvent);
    broadcastToRole('UNIT', 'DEMAND_UPDATED', cancelEvent);
    broadcastToRole('ADMIN', 'DEMAND_UPDATED', cancelEvent);

    res.json({ message: 'Demand cancelled successfully.', status: 'CANCELLED' });
  } catch (error) {
    console.error('Cancel demand error:', error);
    res.status(500).json({ error: 'Failed to cancel demand.' });
  }
});

// DELETE /api/demands/:id - NCC UNIT ONLY can soft-delete demand
router.delete('/:id', authenticateToken, authorizeRoles('UNIT'), async (req, res) => {
  try {
    const demandId = req.params.id;
    const db = await getDB();
    const demand = await db.get('SELECT * FROM demands WHERE id = ? AND unit_id = ? AND is_deleted = 0', [demandId, req.user.unit_id]);

    if (!demand) {
      return res.status(404).json({ error: 'Demand not found under your unit jurisdiction.' });
    }

    await db.run(
      `UPDATE demands SET is_deleted = 1 WHERE id = ?`,
      [demandId]
    );

    // Audit Log
    await db.run(
      'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
      ['DEMAND', demandId, 'DELETED', req.user.id, `Soft-deleted demand ${demand.demand_number}`]
    );

    const deleteEvent = { id: demandId, is_deleted: true, status: 'DELETED', timestamp: Date.now() };
    broadcastToAll('DEMAND_UPDATED', deleteEvent);
    broadcastToUser(demand.raised_by, 'DEMAND_UPDATED', deleteEvent);
    broadcastToRole('INSTITUTION', 'DEMAND_UPDATED', deleteEvent);
    broadcastToRole('UNIT', 'DEMAND_UPDATED', deleteEvent);
    broadcastToRole('ADMIN', 'DEMAND_UPDATED', deleteEvent);

    res.json({ message: 'Demand deleted successfully (soft-delete).' });
  } catch (error) {
    console.error('Delete demand error:', error);
    res.status(500).json({ error: 'Failed to delete demand.' });
  }
});

// GET /api/demands/:id/activity - Get activity timeline for a demand
router.get('/:id/activity', authenticateToken, async (req, res) => {
  try {
    const demandId = req.params.id;
    const db = await getDB();
    
    // Authorization check
    const demand = await db.get('SELECT * FROM demands WHERE id = ? AND is_deleted = 0', [demandId]);
    if (!demand) return res.status(404).json({ error: 'Demand not found.' });

    if (req.user.role === 'INSTITUTION' && demand.institution_id !== req.user.institution_id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user.role === 'UNIT' && demand.unit_id !== req.user.unit_id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user.role === 'ADMIN' && !['APPROVED', 'ACCEPTED', 'FULFILLED'].includes(demand.status)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const activities = await db.all(
      `SELECT da.*, u.name as user_name, u.role as user_role
       FROM demand_activity da
       LEFT JOIN users u ON da.user_id = u.id
       WHERE da.demand_id = ?
       ORDER BY da.created_at ASC`,
      [demandId]
    );

    res.json(activities);
  } catch (error) {
    console.error('Fetch activity error:', error);
    res.status(500).json({ error: 'Failed to retrieve activity timeline.' });
  }
});

// POST /api/demands/:id/activity - Add a message to the activity timeline
router.post('/:id/activity', authenticateToken, async (req, res) => {
  try {
    const demandId = req.params.id;
    const { message } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const db = await getDB();
    const demand = await db.get('SELECT * FROM demands WHERE id = ? AND is_deleted = 0', [demandId]);
    if (!demand) return res.status(404).json({ error: 'Demand not found.' });

    // Authorization check
    if (req.user.role === 'INSTITUTION' && demand.institution_id !== req.user.institution_id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user.role === 'UNIT' && demand.unit_id !== req.user.unit_id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user.role === 'ADMIN' && !['APPROVED', 'ACCEPTED', 'FULFILLED'].includes(demand.status)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    await db.run(
      'INSERT INTO demand_activity (demand_id, user_id, action_type, message) VALUES (?, ?, ?, ?)',
      [demandId, req.user.id, 'MESSAGE', message.trim()]
    );

    res.json({ message: 'Activity message added successfully.' });
  } catch (error) {
    console.error('Add activity error:', error);
    res.status(500).json({ error: 'Failed to add activity message.' });
  }
});

// PUT /api/demands/bulk-invoice - Bulk update invoice numbers & dates with strict uniqueness validation
router.put('/bulk-invoice', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    const { invoices } = req.body;
    if (Array.isArray(invoices)) {
      // 1. Check for duplicates within the request payload itself
      const seen = new Set();
      for (const item of invoices) {
        if (item.invoice_no && String(item.invoice_no).trim() !== '') {
          const norm = String(item.invoice_no).trim().toUpperCase();
          if (seen.has(norm)) {
            return res.status(400).json({ 
              error: `Duplicate invoice number "${item.invoice_no}" detected in request. Each invoice number must be unique.` 
            });
          }
          seen.add(norm);
        }
      }

      // 2. Check against database for duplicates on other demand records
      for (const item of invoices) {
        if (item.invoice_no && String(item.invoice_no).trim() !== '') {
          const idVal = item.id || null;
          const refVal = item.demand_number || item.demand_ref || null;
          let existing = null;
          if (idVal) {
            existing = await db.get(
              'SELECT id, demand_number FROM demands WHERE UPPER(invoice_no) = UPPER(?) AND id != ?',
              [String(item.invoice_no).trim(), idVal]
            );
          } else if (refVal) {
            existing = await db.get(
              'SELECT id, demand_number FROM demands WHERE UPPER(invoice_no) = UPPER(?) AND demand_number != ?',
              [String(item.invoice_no).trim(), refVal]
            );
          }
          if (existing) {
            return res.status(400).json({
              error: `Invoice number "${item.invoice_no}" is already used by demand ${existing.demand_number}. Invoice numbers cannot be repeated.`
            });
          }
        }
      }

      // 3. Perform database updates (by id OR demand_number / demand_ref)
      for (const item of invoices) {
        const invNo = item.invoice_no && String(item.invoice_no).trim() !== '' ? String(item.invoice_no).trim() : null;
        const invDate = item.invoice_date || null;
        const idVal = item.id || null;
        const refVal = item.demand_number || item.demand_ref || null;

        if (idVal) {
          await db.run(
            `UPDATE demands SET invoice_no = ?, invoice_date = ? WHERE id = ?`,
            [invNo, invDate, idVal]
          );
        } else if (refVal) {
          await db.run(
            `UPDATE demands SET invoice_no = ?, invoice_date = ? WHERE demand_number = ?`,
            [invNo, invDate, refVal]
          );
        }
      }

      // Keep database.sqlite synchronized with data.sqlite
      try {
        const fs = require('fs');
        const srcPath = path.join(__dirname, '../data.sqlite');
        const destPath = path.join(__dirname, '../database.sqlite');
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
        }
      } catch (e) {
        // silent sync
      }

      broadcastToAll('DEMAND_UPDATED', { message: 'Invoices updated successfully' });
    }
    res.json({ message: 'Invoices updated successfully' });
  } catch (err) {
    console.error('Bulk invoice update error:', err);
    res.status(500).json({ error: 'Failed to update invoices' });
  }
});

// PUT /api/demands/:id/invoice - Update invoice number & date for single demand with uniqueness validation
router.put('/:id/invoice', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    const { invoice_no, invoice_date } = req.body;
    const identifier = req.params.id;
    const isNumericId = /^\d+$/.test(identifier);

    if (invoice_no && String(invoice_no).trim() !== '') {
      let existing = null;
      if (isNumericId) {
        existing = await db.get(
          'SELECT id, demand_number FROM demands WHERE UPPER(invoice_no) = UPPER(?) AND id != ?',
          [String(invoice_no).trim(), identifier]
        );
      } else {
        existing = await db.get(
          'SELECT id, demand_number FROM demands WHERE UPPER(invoice_no) = UPPER(?) AND demand_number != ?',
          [String(invoice_no).trim(), identifier]
        );
      }
      if (existing) {
        return res.status(400).json({
          error: `Invoice number "${invoice_no}" is already assigned to demand ${existing.demand_number}. Duplicate invoice numbers are not allowed.`
        });
      }
    }

    if (isNumericId) {
      await db.run(
        `UPDATE demands SET invoice_no = ?, invoice_date = ? WHERE id = ?`,
        [invoice_no ? String(invoice_no).trim() : null, invoice_date || null, identifier]
      );
    } else {
      await db.run(
        `UPDATE demands SET invoice_no = ?, invoice_date = ? WHERE demand_number = ?`,
        [invoice_no ? String(invoice_no).trim() : null, invoice_date || null, identifier]
      );
    }

    // Keep database.sqlite synchronized with data.sqlite
    try {
      const fs = require('fs');
      const srcPath = path.join(__dirname, '../data.sqlite');
      const destPath = path.join(__dirname, '../database.sqlite');
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
    } catch (e) {}

    broadcastToAll('DEMAND_UPDATED', { message: 'Invoice updated successfully' });
    res.json({ message: 'Invoice updated successfully' });
  } catch (err) {
    console.error('Single invoice update error:', err);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

module.exports = router;
