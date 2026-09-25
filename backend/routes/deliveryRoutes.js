const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { getDB } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { broadcastToAll } = require('../sse');

// Receipt Upload Multer Configuration
const receiptStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/receipts/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// GET /api/delivery/demands - List demands ready/scheduled for physical delivery
router.get('/demands', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const db = await getDB();
    const { status, pin_code, partner_id } = req.query;

    let query = `
      SELECT 
        d.id,
        d.demand_number,
        d.demand_date,
        d.demand_time,
        d.purpose,
        d.status,
        d.delivery_receipt_url,
        d.invoice_url,
        d.delivery_partner_id,
        d.delivery_partner_name,
        d.delivery_partner_phone,
        d.delivery_partner_vehicle,
        COALESCE(d.delivery_status, 'PENDING') as delivery_status,
        d.dispatched_at,
        d.delivered_at,
        d.delivery_notes,
        d.created_at,
        i.id as institution_id,
        COALESCE(i.institution_name, u.unit_name) as institution_name,
        COALESCE(i.pin_code, 'N/A') as pin_code,
        COALESCE(i.complete_address, d.delivery_venue, u.location, 'Unit Battalion HQ') as complete_address,
        COALESCE(i.google_location, '') as google_location,
        COALESCE(i.ano_cto_name, 'Unit HQ') as ano_cto_name,
        COALESCE(i.ano_cto_contact, '') as ano_cto_contact,
        u.id as unit_id,
        u.unit_name,
        u.unit_code,
        u.ncc_group,
        (SELECT COALESCE(SUM(di.quantity), 0) FROM demand_items di WHERE di.demand_id = d.id) as total_quantity,
        (SELECT COALESCE(SUM(di.quantity * di.unit_price_snapshot), 0) FROM demand_items di WHERE di.demand_id = d.id) as total_amount
      FROM demands d
      LEFT JOIN institutions i ON d.institution_id = i.id
      JOIN units u ON d.unit_id = u.id
      WHERE d.is_deleted = 0
        AND d.status IN ('READY_FOR_DISPATCH', 'DELIVERED', 'FULFILLED')
    `;

    const params = [];

    if (status && status !== 'ALL') {
      query += ` AND COALESCE(d.delivery_status, 'PENDING') = ?`;
      params.push(status);
    }

    if (pin_code && pin_code !== 'ALL') {
      query += ` AND i.pin_code = ?`;
      params.push(pin_code);
    }

    if (partner_id && partner_id !== 'ALL') {
      query += ` AND d.delivery_partner_id = ?`;
      params.push(partner_id);
    }

    query += ` ORDER BY d.demand_date DESC, d.id DESC`;

    const demands = await db.all(query, params);

    // Fetch items for each demand and coerce quantities to numbers
    for (const dem of demands) {
      dem.total_quantity = Number(dem.total_quantity) || 0;
      dem.total_amount = Number(dem.total_amount) || 0;
      const items = await db.all(
        `SELECT di.*, 
                COALESCE(di.unit_price_snapshot, 0) AS unit_price,
                (di.quantity * COALESCE(di.unit_price_snapshot, 0)) AS total_cost,
                ri.item_name, ri.unit_of_measure 
         FROM demand_items di 
         JOIN refreshment_items ri ON di.item_id = ri.id 
         WHERE di.demand_id = ?`,
        [dem.id]
      );
      dem.items = items;
    }

    res.json(demands);
  } catch (error) {
    console.error('Error fetching delivery demands:', error);
    res.status(500).json({ error: 'Failed to fetch delivery demands' });
  }
});

// GET /api/delivery/partners - List all delivery partners
router.get('/partners', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const db = await getDB();
    const partners = await db.all(
      `SELECT id, name, phone, vehicle_no, 
              COALESCE(vehicle_type, 'ECO') as vehicle_type,
              COALESCE(vehicle_model, 'Maruti Eeco Cargo Van') as vehicle_model,
              COALESCE(load_capacity_packets, 750) as load_capacity_packets,
              COALESCE(max_travel_km, 80) as max_travel_km,
              COALESCE(rate_per_km, 0) as rate_per_km,
              assigned_pins, is_active, login_id, created_at 
       FROM delivery_partners ORDER BY id ASC`
    );

    // Attach latest start_km from driver_daily_logs
    try {
      const logs = await db.all(
        `SELECT driver_id, start_km, end_km, log_date 
         FROM driver_daily_logs 
         WHERE start_km IS NOT NULL 
         ORDER BY log_date DESC, id DESC`
      );
      const logMap = {};
      for (const l of logs) {
        if (!logMap[l.driver_id]) {
          logMap[l.driver_id] = l;
        }
      }
      for (const p of partners) {
        if (logMap[p.id]) {
          p.start_km = logMap[p.id].start_km;
          p.latest_end_km = logMap[p.id].end_km;
        }
      }
    } catch (logErr) {
      console.error('Error attaching partner driver logs:', logErr);
    }

    res.json(partners);
  } catch (error) {
    console.error('Error fetching delivery partners:', error);
    res.status(500).json({ error: 'Failed to fetch delivery partners' });
  }
});

// POST /api/delivery/partners - Add a new delivery partner with login credentials & vehicle capacity
router.post('/partners', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { name, phone, vehicle_no, vehicle_type, vehicle_model, load_capacity_packets, max_travel_km, rate_per_km, assigned_pins, login_id, password } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and Phone number are required' });
    }

    const db = await getDB();
    const cleanPhone = phone.trim();
    const cleanLoginId = (login_id || cleanPhone).trim();

    // Check duplicate phone or login_id
    const existing = await db.get(
      'SELECT id FROM delivery_partners WHERE phone = ? OR login_id = ?',
      [cleanPhone, cleanLoginId]
    );
    if (existing) {
      return res.status(400).json({ error: 'A driver with this phone number or Login ID already exists.' });
    }

    const defaultPassword = password && password.trim() ? password.trim() : 'Driver@123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const vType = (vehicle_type || 'ECO').trim();
    const vModel = (vehicle_model || 'Maruti Eeco Cargo Van').trim();
    const vCapacity = parseInt(load_capacity_packets, 10) || 750;
    const vMaxKm = parseInt(max_travel_km, 10) || 80;
    const vRate = parseFloat(rate_per_km) || 0;

    const result = await db.run(
      `INSERT INTO delivery_partners (name, phone, vehicle_no, vehicle_type, vehicle_model, load_capacity_packets, max_travel_km, rate_per_km, assigned_pins, is_active, login_id, password_hash) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [name.trim(), cleanPhone, (vehicle_no || '').trim(), vType, vModel, vCapacity, vMaxKm, vRate, (assigned_pins || '').trim(), cleanLoginId, passwordHash]
    );

    const newPartner = await db.get(
      `SELECT id, name, phone, vehicle_no, vehicle_type, vehicle_model, load_capacity_packets, max_travel_km, rate_per_km, assigned_pins, is_active, login_id, created_at 
       FROM delivery_partners WHERE id = ?`,
      [result.lastID]
    );
    res.status(201).json(newPartner);
  } catch (error) {
    console.error('Error adding delivery partner:', error);
    res.status(500).json({ error: 'Failed to add delivery partner' });
  }
});

// PUT /api/delivery/partners/:id - Update delivery partner & credentials & vehicle capacity
router.put('/partners/:id', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const partnerId = req.params.id;
    const { name, phone, vehicle_no, vehicle_type, vehicle_model, load_capacity_packets, max_travel_km, rate_per_km, assigned_pins, is_active, login_id, password } = req.body;

    const db = await getDB();
    const existing = await db.get('SELECT * FROM delivery_partners WHERE id = ?', [partnerId]);
    if (!existing) {
      return res.status(404).json({ error: 'Delivery partner not found' });
    }

    const newName = name !== undefined ? name.trim() : existing.name;
    const newPhone = phone !== undefined ? phone.trim() : existing.phone;
    const newVehicle = vehicle_no !== undefined ? vehicle_no.trim() : existing.vehicle_no;
    const newType = vehicle_type !== undefined ? vehicle_type.trim() : (existing.vehicle_type || 'ECO');
    const newModel = vehicle_model !== undefined ? vehicle_model.trim() : (existing.vehicle_model || 'Maruti Eeco Cargo Van');
    const newCapacity = load_capacity_packets !== undefined ? parseInt(load_capacity_packets, 10) : (existing.load_capacity_packets || 750);
    const newMaxKm = max_travel_km !== undefined ? parseInt(max_travel_km, 10) : (existing.max_travel_km || 80);
    const newRate = rate_per_km !== undefined ? parseFloat(rate_per_km) : (existing.rate_per_km || 0);
    const newPins = assigned_pins !== undefined ? assigned_pins.trim() : existing.assigned_pins;
    const newActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;
    const newLoginId = login_id !== undefined && login_id.trim() ? login_id.trim() : (existing.login_id || newPhone);

    if (password && password.trim()) {
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      await db.run(
        `UPDATE delivery_partners 
         SET name = ?, phone = ?, vehicle_no = ?, vehicle_type = ?, vehicle_model = ?, load_capacity_packets = ?, max_travel_km = ?, rate_per_km = ?, assigned_pins = ?, is_active = ?, login_id = ?, password_hash = ?
         WHERE id = ?`,
        [newName, newPhone, newVehicle, newType, newModel, newCapacity, newMaxKm, newRate, newPins, newActive, newLoginId, passwordHash, partnerId]
      );
    } else {
      await db.run(
        `UPDATE delivery_partners 
         SET name = ?, phone = ?, vehicle_no = ?, vehicle_type = ?, vehicle_model = ?, load_capacity_packets = ?, max_travel_km = ?, rate_per_km = ?, assigned_pins = ?, is_active = ?, login_id = ?
         WHERE id = ?`,
        [newName, newPhone, newVehicle, newType, newModel, newCapacity, newMaxKm, newRate, newPins, newActive, newLoginId, partnerId]
      );
    }

    const updated = await db.get(
      `SELECT id, name, phone, vehicle_no, vehicle_type, vehicle_model, load_capacity_packets, max_travel_km, rate_per_km, assigned_pins, is_active, login_id, created_at 
       FROM delivery_partners WHERE id = ?`,
      [partnerId]
    );
    res.json(updated);
  } catch (error) {
    console.error('Error updating delivery partner:', error);
    res.status(500).json({ error: 'Failed to update delivery partner' });
  }
});

// DELETE /api/delivery/partners/:id - Delete or deactivate delivery partner
router.delete('/partners/:id', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const partnerId = req.params.id;
    const db = await getDB();

    // Check if demands are assigned to this driver
    const assignedCount = await db.get(
      'SELECT COUNT(*) as count FROM demands WHERE delivery_partner_id = ? AND delivery_status IN ("PENDING", "OUT_FOR_DELIVERY")',
      [partnerId]
    );

    if (assignedCount && assignedCount.count > 0) {
      await db.run('UPDATE delivery_partners SET is_active = 0 WHERE id = ?', [partnerId]);
      return res.json({ message: `Driver has ${assignedCount.count} active deliveries and has been deactivated instead of deleted.` });
    }

    await db.run('DELETE FROM delivery_partners WHERE id = ?', [partnerId]);
    res.json({ message: 'Delivery partner deleted successfully.' });
  } catch (error) {
    console.error('Error deleting delivery partner:', error);
    res.status(500).json({ error: 'Failed to delete delivery partner' });
  }
});

// POST /api/delivery/assign - Assign delivery partner & vehicle to demands
router.post('/assign', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const {
      demandIds,
      partnerId,
      partnerName,
      partnerPhone,
      partnerVehicle,
      deliveryNotes,
      startKm,
      closingKm,
      totalKm,
      start_km_reading,
      closing_km_reading
    } = req.body;

    if (!demandIds || !Array.isArray(demandIds) || demandIds.length === 0) {
      return res.status(400).json({ error: 'At least one demand ID is required' });
    }
    if (!partnerName) {
      return res.status(400).json({ error: 'Delivery partner name is required' });
    }

    const sKm = (startKm !== undefined && startKm !== null && startKm !== '') ? parseFloat(startKm) : ((start_km_reading !== undefined && start_km_reading !== null && start_km_reading !== '') ? parseFloat(start_km_reading) : null);
    const cKm = (closingKm !== undefined && closingKm !== null && closingKm !== '') ? parseFloat(closingKm) : ((closing_km_reading !== undefined && closing_km_reading !== null && closing_km_reading !== '') ? parseFloat(closing_km_reading) : null);
    const tKm = (totalKm !== undefined && totalKm !== null && totalKm !== '') ? parseFloat(totalKm) : ((sKm !== null && cKm !== null) ? Math.max(0, cKm - sKm) : null);

    const db = await getDB();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    for (const demandId of demandIds) {
      await db.run(
        `UPDATE demands 
         SET delivery_partner_id = ?, 
             delivery_partner_name = ?, 
             delivery_partner_phone = ?, 
             delivery_partner_vehicle = ?, 
             delivery_status = 'OUT_FOR_DELIVERY',
             dispatched_at = ?,
             delivery_notes = ?,
             start_km_reading = ?,
             closing_km_reading = ?,
             total_km = ?
         WHERE id = ?`,
        [
          partnerId || null,
          partnerName,
          partnerPhone || '',
          partnerVehicle || '',
          now,
          deliveryNotes || '',
          sKm,
          cKm,
          tKm,
          demandId
        ]
      );

      // Auto-sync start km to driver_daily_logs if partnerId and sKm are provided
      if (partnerId && sKm !== null) {
        try {
          const todayDate = new Date().toISOString().split('T')[0];
          const existingLog = await db.get('SELECT id, start_km FROM driver_daily_logs WHERE driver_id = ? AND log_date = ?', [partnerId, todayDate]);
          if (!existingLog) {
            await db.run('INSERT INTO driver_daily_logs (driver_id, log_date, start_km) VALUES (?, ?, ?)', [partnerId, todayDate, sKm]);
          } else if (existingLog.start_km === null) {
            await db.run('UPDATE driver_daily_logs SET start_km = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [sKm, existingLog.id]);
          }
        } catch (syncErr) {
          console.error('Auto-sync driver log error:', syncErr);
        }
      }

      // Audit log
      await db.run(
        'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
        ['DEMAND', demandId, 'DELIVERY_DISPATCHED', req.user.id, `Assigned to delivery partner ${partnerName} (${partnerVehicle || 'No Vehicle'}).`]
      );

      // Activity log
      await db.run(
        'INSERT INTO demand_activity (demand_id, user_id, action_type, old_status, new_status, message) VALUES (?, ?, ?, ?, ?, ?)',
        [demandId, req.user.id, 'STATUS_CHANGE', 'ACCEPTED', 'OUT_FOR_DELIVERY', `Out for delivery via ${partnerName}.`]
      );

      broadcastToAll('DEMAND_UPDATED', { id: demandId, delivery_status: 'OUT_FOR_DELIVERY', timestamp: Date.now() });
    }

    res.json({ message: `Successfully assigned ${demandIds.length} demand(s) for physical delivery.` });
  } catch (error) {
    console.error('Error assigning delivery:', error);
    res.status(500).json({ error: 'Failed to assign delivery' });
  }
});

// POST /api/delivery/reorder - Update delivery sequence (ADMIN only)
router.post('/reorder', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { sequences } = req.body;
    if (!Array.isArray(sequences)) {
      return res.status(400).json({ error: 'Invalid sequences array' });
    }

    const db = await getDB();
    await db.run('BEGIN TRANSACTION');
    try {
      for (const item of sequences) {
        if (item.id !== undefined && item.delivery_sequence !== undefined) {
          await db.run(
            'UPDATE demands SET delivery_sequence = ? WHERE id = ?',
            [item.delivery_sequence, item.id]
          );
        }
      }
      await db.run('COMMIT');
    } catch (txErr) {
      await db.run('ROLLBACK');
      throw txErr;
    }

    // Trigger SSE for connected clients (driver and admin)
    broadcastToAll('DEMAND_UPDATED', {
      type: 'DEMAND_UPDATED',
      timestamp: Date.now()
    });

    res.json({ message: 'Sequence updated successfully' });
  } catch (error) {
    console.error('Error reordering deliveries:', error);
    res.status(500).json({ error: 'Failed to update sequence' });
  }
});

// POST /api/delivery/status - Update delivery status (dynamic multi-stage)
router.post('/status', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { demandId, deliveryStatus } = req.body;
    if (!demandId || !deliveryStatus) {
      return res.status(400).json({ error: 'Demand ID and delivery status are required' });
    }

    const validStatuses = ['PENDING', 'OUT_FOR_DELIVERY', 'ARRIVED', 'DELIVERED'];
    if (!validStatuses.includes(deliveryStatus)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const db = await getDB();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    let query = `UPDATE demands SET delivery_status = ?`;
    const params = [deliveryStatus];

    if (deliveryStatus === 'DELIVERED') {
      // User requested that marking as delivered automatically pushes to Documentation (status='DELIVERED')
      query += `, delivered_at = ?, status = 'DELIVERED'`;
      params.push(now);
    } else if (deliveryStatus === 'OUT_FOR_DELIVERY') {
      query += `, dispatched_at = COALESCE(dispatched_at, ?)`;
      params.push(now);
    }
    query += ` WHERE id = ?`;
    params.push(demandId);

    await db.run(query, params);

    // Human-readable message
    const stageLabels = {
      PENDING: 'Supply Depot / Warehouse Preparation',
      OUT_FOR_DELIVERY: 'Dispatched & In Transit with Delivery Partner',
      ARRIVED: 'Arrived at Institution Gate / Venue',
      DELIVERED: 'Handed Over, Verified & Completed'
    };

    // Activity log for real-time history
    try {
      const activityUserId = req.user.role === 'DELIVERY' ? null : (req.user.id || null);
      await db.run(
        'INSERT INTO demand_activity (demand_id, user_id, action_type, old_status, new_status, message) VALUES (?, ?, ?, ?, ?, ?)',
        [demandId, activityUserId, 'STATUS_CHANGE', 'ACCEPTED', deliveryStatus, `Live logistics update: ${stageLabels[deliveryStatus] || deliveryStatus}`]
      );
    } catch (e) { }

    // Audit log
    try {
      let auditUserId = req.user.role === 'DELIVERY' ? null : req.user.id;
      if (!auditUserId) {
        const adminUser = await db.get("SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id ASC LIMIT 1");
        auditUserId = adminUser ? adminUser.id : 1;
      }
      await db.run(
        'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
        ['DEMAND', demandId, 'DELIVERY_STATUS', auditUserId, `Physical logistics updated to ${deliveryStatus}`]
      );
    } catch (e) { }

    // Real-time broadcast
    broadcastToAll('DEMAND_UPDATED', {
      id: demandId,
      delivery_status: deliveryStatus,
      dispatched_at: deliveryStatus === 'OUT_FOR_DELIVERY' ? now : undefined,
      delivered_at: deliveryStatus === 'DELIVERED' ? now : undefined,
      timestamp: Date.now()
    });

    res.json({
      message: `Delivery status updated to ${deliveryStatus}`,
      deliveryStatus,
      timestamp: now
    });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({ error: 'Failed to update delivery status' });
  }
});

// ==========================================
// DELIVERY DRIVER MOBILE PORTAL ENDPOINTS
// ==========================================

// GET /api/delivery/driver/profile - Fetch driver profile & vehicle load capacity metrics
router.get('/driver/profile', authenticateToken, authorizeRoles('DELIVERY', 'ADMIN'), async (req, res) => {
  try {
    const db = await getDB();
    const partnerId = req.user.partner_id || req.user.id;
    const partnerPhone = req.user.phone || '';

    let partner = await db.get(
      `SELECT id, name, phone, vehicle_no, 
              COALESCE(vehicle_type, 'ECO') as vehicle_type,
              COALESCE(vehicle_model, 'Maruti Eeco Cargo Van') as vehicle_model,
              COALESCE(load_capacity_packets, 750) as load_capacity_packets,
              COALESCE(max_travel_km, 80) as max_travel_km,
              assigned_pins, is_active, login_id 
       FROM delivery_partners WHERE id = ? OR phone = ?`,
      [partnerId, partnerPhone]
    );

    if (!partner) {
      partner = {
        id: partnerId,
        name: req.user.name || 'Delivery Partner',
        phone: partnerPhone,
        vehicle_no: req.user.vehicle_no || 'DL-01-AB-1234 (Eco Van)',
        vehicle_type: 'ECO',
        vehicle_model: 'Maruti Eeco Cargo Van',
        load_capacity_packets: 750,
        max_travel_km: 80,
        assigned_pins: '110010, 110021',
        is_active: 1,
        login_id: partnerPhone
      };
    }

    // Default capacity values if null
    partner.vehicle_type = partner.vehicle_type || 'ECO';
    partner.vehicle_model = partner.vehicle_model || 'Maruti Eeco Cargo Van';
    partner.load_capacity_packets = partner.load_capacity_packets || 750;
    partner.max_travel_km = partner.max_travel_km || 80;

    // Calculate current live assigned load metrics
    const loadStats = await db.get(`
      SELECT 
        COUNT(DISTINCT d.id) as assigned_stops,
        COALESCE(SUM(di.quantity), 0) as total_load_packets,
        COALESCE(SUM(CASE WHEN d.delivery_status = 'DELIVERED' THEN di.quantity ELSE 0 END), 0) as delivered_packets,
        COALESCE(SUM(CASE WHEN d.delivery_status != 'DELIVERED' AND d.delivery_status != 'REJECTED' THEN di.quantity ELSE 0 END), 0) as remaining_packets
      FROM demands d
      LEFT JOIN demand_items di ON d.id = di.demand_id
      WHERE d.is_deleted = 0 
        AND d.status IN ('READY_FOR_DISPATCH', 'DELIVERED', 'FULFILLED')
        AND (d.delivery_partner_id = ? OR d.delivery_partner_phone = ?)
    `, [partner.id, partner.phone]);

    const totalLoad = loadStats?.total_load_packets || 0;
    const capacity = partner.load_capacity_packets || 750;
    const utilizationPercent = Math.round((totalLoad / capacity) * 100);
    const isOverloaded = totalLoad > capacity;
    const remainingVehicleCapacity = Math.max(0, capacity - totalLoad);

    res.json({
      ...partner,
      metrics: {
        assigned_stops: loadStats?.assigned_stops || 0,
        total_load_packets: totalLoad,
        delivered_packets: loadStats?.delivered_packets || 0,
        remaining_packets: loadStats?.remaining_packets || 0,
        load_capacity_packets: capacity,
        remaining_vehicle_capacity: remainingVehicleCapacity,
        utilization_percent: utilizationPercent,
        is_overloaded: isOverloaded
      }
    });
  } catch (error) {
    console.error('Error fetching driver profile:', error);
    res.status(500).json({ error: 'Failed to fetch driver profile' });
  }
});

// PUT /api/delivery/driver/profile - Update driver vehicle details and password
router.put('/driver/profile', authenticateToken, authorizeRoles('DELIVERY'), async (req, res) => {
  try {
    const db = await getDB();
    const partnerId = req.user.partner_id || req.user.id;
    const { name, vehicle_no, vehicle_type, vehicle_model, load_capacity_packets, max_travel_km, password } = req.body;

    const existing = await db.get('SELECT * FROM delivery_partners WHERE id = ?', [partnerId]);
    if (!existing) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    const updatedName = name !== undefined ? name.trim() : existing.name;
    const updatedVehicleNo = vehicle_no !== undefined ? vehicle_no.trim() : existing.vehicle_no;
    const updatedVehicleType = vehicle_type !== undefined ? vehicle_type.trim() : (existing.vehicle_type || 'ECO');
    const updatedVehicleModel = vehicle_model !== undefined ? vehicle_model.trim() : (existing.vehicle_model || 'Maruti Eeco Cargo Van');
    const updatedCapacity = load_capacity_packets !== undefined ? parseInt(load_capacity_packets, 10) : (existing.load_capacity_packets || 750);
    const updatedMaxKm = max_travel_km !== undefined ? parseInt(max_travel_km, 10) : (existing.max_travel_km || 80);

    if (password && password.trim()) {
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      await db.run(`
        UPDATE delivery_partners
        SET name = ?, vehicle_no = ?, vehicle_type = ?, vehicle_model = ?, load_capacity_packets = ?, max_travel_km = ?, password_hash = ?
        WHERE id = ?
      `, [updatedName, updatedVehicleNo, updatedVehicleType, updatedVehicleModel, updatedCapacity, updatedMaxKm, passwordHash, partnerId]);
    } else {
      await db.run(`
        UPDATE delivery_partners
        SET name = ?, vehicle_no = ?, vehicle_type = ?, vehicle_model = ?, load_capacity_packets = ?, max_travel_km = ?
        WHERE id = ?
      `, [updatedName, updatedVehicleNo, updatedVehicleType, updatedVehicleModel, updatedCapacity, updatedMaxKm, partnerId]);
    }

    const updated = await db.get(
      `SELECT id, name, phone, vehicle_no, vehicle_type, vehicle_model, load_capacity_packets, max_travel_km, assigned_pins, is_active, login_id 
       FROM delivery_partners WHERE id = ?`,
      [partnerId]
    );

    res.json({ message: 'Driver vehicle & load capacity updated successfully', driver: updated });
  } catch (error) {
    console.error('Error updating driver profile:', error);
    res.status(500).json({ error: 'Failed to update driver profile' });
  }
});

// GET /api/delivery/driver/demands - List all demands assigned to the logged-in driver (supports datewise filtering)
router.get('/driver/demands', authenticateToken, authorizeRoles('DELIVERY', 'ADMIN'), async (req, res) => {
  try {
    const db = await getDB();
    const partnerId = req.user.partner_id || req.user.id;
    const partnerPhone = req.user.phone || '';
    const filterDate = req.query.date;

    let query = `
      SELECT 
        d.id,
        d.demand_number,
        d.demand_date,
        d.demand_time,
        d.purpose,
        d.status,
        d.delivery_receipt_url,
        d.invoice_url,
        d.delivery_partner_id,
        d.delivery_partner_name,
        d.delivery_partner_phone,
        d.delivery_partner_vehicle,
        COALESCE(d.delivery_status, 'PENDING') as delivery_status,
        COALESCE(d.delivery_sequence, 0) as delivery_sequence,
        d.dispatched_at,
        d.delivered_at,
        d.delivery_notes,
        d.delivery_rejection_reason,
        d.bill_collection_status,
        d.start_km_reading as start_odometer_reading,
        d.closing_km_reading as delivery_odometer_reading,
        d.start_km_reading,
        d.closing_km_reading,
        d.total_km,
        d.created_at,
        i.id as institution_id,
        COALESCE(i.institution_name, u.unit_name, 'N/A') as institution_name,
        COALESCE(i.pin_code, 'N/A') as pin_code,
        COALESCE(i.complete_address, d.delivery_venue, u.location, '') as complete_address,
        COALESCE(i.google_location, '') as google_location,
        COALESCE(i.ano_cto_name, 'Unit HQ') as ano_cto_name,
        COALESCE(i.ano_cto_contact, '') as ano_cto_contact,
        u.id as unit_id,
        COALESCE(u.unit_name, 'N/A') as unit_name,
        COALESCE(u.unit_code, '') as unit_code,
        COALESCE(u.ncc_group, '') as ncc_group,
        (SELECT COALESCE(SUM(di.quantity), 0) FROM demand_items di WHERE di.demand_id = d.id) as total_quantity,
        (SELECT COALESCE(SUM(di.quantity * di.unit_price_snapshot), 0) FROM demand_items di WHERE di.demand_id = d.id) as total_amount
      FROM demands d
      LEFT JOIN institutions i ON d.institution_id = i.id
      LEFT JOIN units u ON d.unit_id = u.id
      WHERE d.is_deleted = 0
        AND d.status IN ('READY_FOR_DISPATCH', 'DELIVERED', 'FULFILLED')
    `;

    const params = [];

    // If delivery partner role, scope to their assigned demands
    if (req.user.role === 'DELIVERY') {
      query += ` AND (d.delivery_partner_id = ? OR d.delivery_partner_phone = ?)`;
      params.push(partnerId, partnerPhone);
    } else if (req.query.partner_id) {
      query += ` AND d.delivery_partner_id = ?`;
      params.push(req.query.partner_id);
    }

    // Datewise filtering
    if (filterDate && filterDate !== 'ALL' && filterDate.trim() !== '') {
      query += ` AND (
        d.demand_date = ? 
        OR DATE(d.dispatched_at) = ? 
        OR DATE(d.delivered_at) = ?
      )`;
      params.push(filterDate, filterDate, filterDate);
    }

    query += ` ORDER BY 
        COALESCE(d.delivery_sequence, 0) ASC,
        CASE COALESCE(d.delivery_status, 'PENDING')
        WHEN 'OUT_FOR_DELIVERY' THEN 1
        WHEN 'ARRIVED' THEN 2
        WHEN 'PENDING' THEN 3
        WHEN 'DELIVERED' THEN 4
        ELSE 5
      END ASC,
      d.demand_date DESC, d.id DESC`;

    const demands = await db.all(query, params);

    for (const dem of demands) {
      dem.total_quantity = Number(dem.total_quantity) || 0;
      dem.total_amount = Number(dem.total_amount) || 0;

      // Auto-fallback for start_km_reading from driver_daily_logs if missing or 0
      if ((!dem.start_km_reading || dem.start_km_reading === 0) && dem.delivery_partner_id) {
        try {
          const log = await db.get(
            `SELECT start_km FROM driver_daily_logs 
             WHERE driver_id = ? 
               AND (DATE(log_date) = DATE(?) OR DATE(log_date) = DATE(?))
               AND start_km IS NOT NULL 
             ORDER BY id DESC LIMIT 1`,
            [dem.delivery_partner_id, dem.dispatched_at || dem.demand_date, dem.demand_date]
          );
          if (log && log.start_km) {
            dem.start_km_reading = log.start_km;
            dem.start_odometer_reading = log.start_km;
          } else {
            const fallbackLog = await db.get(
              `SELECT start_km FROM driver_daily_logs 
               WHERE driver_id = ? AND start_km IS NOT NULL 
               ORDER BY log_date DESC, id DESC LIMIT 1`,
              [dem.delivery_partner_id]
            );
            if (fallbackLog && fallbackLog.start_km) {
              dem.start_km_reading = fallbackLog.start_km;
              dem.start_odometer_reading = fallbackLog.start_km;
            }
          }
        } catch (logErr) {
          console.error('Error fetching fallback driver start km:', logErr);
        }
      }

      if (!dem.start_odometer_reading && dem.start_km_reading) {
        dem.start_odometer_reading = dem.start_km_reading;
      }
      if (!dem.delivery_odometer_reading && dem.closing_km_reading) {
        dem.delivery_odometer_reading = dem.closing_km_reading;
      }
      if (dem.start_km_reading && dem.closing_km_reading && !dem.total_km) {
        dem.total_km = Math.max(0, dem.closing_km_reading - dem.start_km_reading);
      }

      const items = await db.all(
        `SELECT di.*, 
                COALESCE(di.unit_price_snapshot, 0) AS unit_price,
                (di.quantity * COALESCE(di.unit_price_snapshot, 0)) AS total_cost,
                ri.item_name, ri.unit_of_measure 
         FROM demand_items di 
         JOIN refreshment_items ri ON di.item_id = ri.id 
         WHERE di.demand_id = ?`,
        [dem.id]
      );
      dem.items = items;
    }

    res.json(demands);
  } catch (error) {
    console.error('Error fetching driver demands:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch assigned delivery demands', detail: error.message });
  }
});


// POST /api/delivery/driver/status - Update stage (Delivered, Arrived, Transit, Rejected)
router.post('/driver/status', authenticateToken, authorizeRoles('DELIVERY', 'ADMIN'), async (req, res) => {
  try {
    const { demandId, status, rejectionReason, notes, start_odometer, delivery_odometer } = req.body;
    if (!demandId || !status) {
      return res.status(400).json({ error: 'Demand ID and status are required' });
    }

    const validStatuses = ['PENDING', 'OUT_FOR_DELIVERY', 'ARRIVED', 'DELIVERED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const db = await getDB();
    const demand = await db.get('SELECT * FROM demands WHERE id = ? AND is_deleted = 0', [demandId]);
    if (!demand) {
      return res.status(404).json({ error: 'Demand not found' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    let query = `UPDATE demands SET delivery_status = ?`;
    const params = [status];

    if (status === 'DELIVERED') {
      query += `, delivered_at = ?, status = 'DELIVERED'`;
      params.push(now);
      if (delivery_odometer) {
        query += `, closing_km_reading = ?`;
        params.push(parseFloat(delivery_odometer));
      }
    } else if (status === 'OUT_FOR_DELIVERY') {
      query += `, dispatched_at = COALESCE(dispatched_at, ?)`;
      params.push(now);
      if (start_odometer) {
        query += `, start_km_reading = ?`;
        params.push(parseFloat(start_odometer));
      }
    } else if (status === 'REJECTED') {
      query += `, delivery_rejection_reason = ?`;
      params.push(rejectionReason || 'Delivery incomplete / rejected at venue');
    }

    if (notes) {
      const updatedNotes = demand.delivery_notes
        ? `${demand.delivery_notes}\n[Driver: ${notes}]`
        : `[Driver: ${notes}]`;
      query += `, delivery_notes = ?`;
      params.push(updatedNotes);
    }

    query += ` WHERE id = ?`;
    params.push(demandId);

    await db.run(query, params);

    // Dynamic activity log
    let logMsg = `Driver ${req.user.name}: Delivery stage updated to ${status}`;
    if (status === 'OUT_FOR_DELIVERY') logMsg = `🚚 Driver ${req.user.name} is on the way (Out for Delivery)`;
    if (status === 'ARRIVED') logMsg = `📍 Driver ${req.user.name} arrived at institution gate/venue`;
    if (status === 'DELIVERED') logMsg = `✅ Driver ${req.user.name} completed handover of packets`;
    if (status === 'REJECTED') logMsg = `❌ Delivery rejected/incomplete: ${rejectionReason || 'Reason not specified'}`;

    // Activity log (user_id is nullable; for drivers pass null to satisfy users(id) foreign key)
    try {
      const activityUserId = req.user.role === 'DELIVERY' ? null : (req.user.id || null);
      await db.run(
        'INSERT INTO demand_activity (demand_id, user_id, action_type, old_status, new_status, message) VALUES (?, ?, ?, ?, ?, ?)',
        [demandId, activityUserId, 'STATUS_CHANGE', demand.delivery_status || 'PENDING', status, logMsg]
      );
    } catch (e) {
      console.warn('demand_activity log warning:', e.message);
    }

    // Audit log (performed_by requires valid users(id))
    try {
      let auditUserId = req.user.role === 'DELIVERY' ? null : req.user.id;
      if (!auditUserId) {
        const adminUser = await db.get("SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id ASC LIMIT 1");
        auditUserId = adminUser ? adminUser.id : 1;
      }
      await db.run(
        'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
        ['DEMAND', demandId, 'DRIVER_STATUS', auditUserId, logMsg]
      );
    } catch (e) {
      console.warn('audit_logs warning:', e.message);
    }

    broadcastToAll('DEMAND_UPDATED', {
      id: demandId,
      delivery_status: status,
      delivery_rejection_reason: status === 'REJECTED' ? rejectionReason : undefined,
      dispatched_at: status === 'OUT_FOR_DELIVERY' ? now : undefined,
      delivered_at: status === 'DELIVERED' ? now : undefined,
      timestamp: Date.now()
    });

    res.json({ message: 'Delivery status updated successfully', status, timestamp: now });
  } catch (error) {
    console.error('Error updating driver status:', error);
    res.status(500).json({ error: 'Failed to update delivery status' });
  }
});

// POST /api/delivery/driver/upload-receipt - Upload photo of physical delivery receipt
router.post('/driver/upload-receipt', authenticateToken, authorizeRoles('DELIVERY', 'ADMIN'), uploadReceipt.single('receipt'), async (req, res) => {
  try {
    const demandId = req.body.demandId;
    if (!demandId) {
      return res.status(400).json({ error: 'Demand ID is required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Receipt photo or document file is required' });
    }

    const receiptUrl = `/uploads/receipts/${req.file.filename}`;
    const db = await getDB();

    await db.run(
      `UPDATE demands SET delivery_receipt_url = ? WHERE id = ?`,
      [receiptUrl, demandId]
    );

    // Log in demand_activity (user_id is nullable; for drivers pass null to satisfy users(id) foreign key)
    try {
      const activityUserId = req.user.role === 'DELIVERY' ? null : (req.user.id || null);
      await db.run(
        'INSERT INTO demand_activity (demand_id, user_id, action_type, message) VALUES (?, ?, ?, ?)',
        [demandId, activityUserId, 'STATUS_CHANGE', `📄 Driver ${req.user.name} uploaded signed delivery receipt.`]
      );
    } catch (e) {
      console.warn('demand_activity upload receipt warning:', e.message);
    }

    broadcastToAll('DEMAND_UPDATED', {
      id: demandId,
      delivery_receipt_url: receiptUrl,
      timestamp: Date.now()
    });

    res.json({
      message: 'Signed delivery receipt uploaded successfully',
      receiptUrl
    });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    res.status(500).json({ error: 'Failed to upload delivery receipt' });
  }
});

// POST /api/delivery/driver/bill-collection - Drop bill collection status & notes
router.post('/driver/bill-collection', authenticateToken, authorizeRoles('DELIVERY', 'ADMIN'), async (req, res) => {
  try {
    const { demandId, collectionStatus, remarks, paymentRef } = req.body;
    if (!demandId || !collectionStatus) {
      return res.status(400).json({ error: 'Demand ID and collection status are required' });
    }

    const db = await getDB();
    const demand = await db.get('SELECT * FROM demands WHERE id = ? AND is_deleted = 0', [demandId]);
    if (!demand) {
      return res.status(404).json({ error: 'Demand not found' });
    }

    const statusMap = {
      SIGNED_CHALLAN: 'Signed Delivery Challan Collected',
      BILL_SIGNED: 'Bill Signed & Stamped by ANO / Principal',
      CHEQUE_COLLECTED: 'Payment Cheque Collected',
      CASH_COLLECTED: 'Payment Cash Collected',
      BILL_DROPPED: 'Bill Dropped at Office - Payment Awaited'
    };

    const statusLabel = statusMap[collectionStatus] || collectionStatus;
    const noteContent = remarks ? `${statusLabel} (Note: ${remarks})` : statusLabel;

    await db.run(
      `UPDATE demands SET bill_collection_status = ?, bill_collection_notes = ? WHERE id = ?`,
      [collectionStatus, noteContent, demandId]
    );

    const logMessage = `💰 Bill Collection Note dropped by Driver ${req.user.name}: ${noteContent}${paymentRef ? ` [Ref: ${paymentRef}]` : ''}`;

    try {
      const activityUserId = req.user.role === 'DELIVERY' ? null : (req.user.id || null);
      await db.run(
        'INSERT INTO demand_activity (demand_id, user_id, action_type, message) VALUES (?, ?, ?, ?)',
        [demandId, activityUserId, 'STATUS_CHANGE', logMessage]
      );
    } catch (e) {
      console.warn('demand_activity bill collection warning:', e.message);
    }

    // Notify Admin
    try {
      const inst = await db.get('SELECT institution_name FROM institutions WHERE id = ?', [demand.institution_id]);
      const instName = inst ? inst.institution_name : 'Institution';

      await db.run(
        'INSERT INTO notifications (user_id, title, message, link_url) SELECT id, ?, ?, ? FROM users WHERE role = ?',
        [
          `Bill Collection: ${instName}`,
          `Driver ${req.user.name} reported: ${noteContent} for Demand #${demand.demand_number}`,
          '/delivery',
          'ADMIN'
        ]
      );
    } catch (e) { }

    broadcastToAll('DEMAND_UPDATED', {
      id: demandId,
      bill_collection_status: collectionStatus,
      bill_collection_notes: noteContent,
      timestamp: Date.now()
    });

    res.json({ message: 'Bill collection note recorded successfully', collectionStatus, noteContent });
  } catch (error) {
    console.error('Error saving bill collection note:', error);
    res.status(500).json({ error: 'Failed to record bill collection update' });
  }
});

// ==========================================
// DRIVER KM RUN HISTORY (DAILY LOGS)
// ==========================================

// GET driver logs (optionally filtered by date)
router.get('/km-logs', authenticateToken, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' });
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const db = await getDB();
    // Get ALL drivers (active and inactive) and their log for the specified date or today
    const drivers = await db.all('SELECT id, name, vehicle_no, phone, rate_per_km, is_active FROM delivery_partners ORDER BY name ASC');
    const logs = await db.all('SELECT * FROM driver_daily_logs WHERE log_date = ? OR log_date = CURDATE() ORDER BY log_date DESC, id DESC', [date]);

    // Also get the latest recorded km (end_km or start_km) for all drivers for suggestions safely
    const allLatest = await db.all('SELECT driver_id, COALESCE(end_km, start_km) as latest_km, log_date FROM driver_daily_logs WHERE end_km IS NOT NULL OR start_km IS NOT NULL ORDER BY log_date DESC, id DESC');
    const latestLogsMap = {};
    for (const row of allLatest) {
      if (latestLogsMap[row.driver_id] === undefined && row.latest_km !== null) {
        latestLogsMap[row.driver_id] = row.latest_km;
      }
    }

    const result = drivers.map(d => {
      const todayLog = logs.find(l => l.driver_id === d.id);
      return {
        driver_id: d.id,
        driver_name: d.name,
        vehicle_no: d.vehicle_no,
        is_active: d.is_active,
        rate_per_km: d.rate_per_km || 0,
        log_date: date,
        start_km: todayLog ? todayLog.start_km : null,
        end_km: todayLog ? todayLog.end_km : null,
        total_km: todayLog ? todayLog.total_km : null,
        suggested_start_km: latestLogsMap[d.id] !== undefined ? latestLogsMap[d.id] : 0
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching driver km logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// POST start km
router.post('/km-logs/start', authenticateToken, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' });
  const { driver_id, log_date, start_km } = req.body;
  if (!driver_id || !log_date || start_km === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const db = await getDB();
    const existing = await db.get('SELECT id, end_km FROM driver_daily_logs WHERE driver_id = ? AND log_date = ?', [driver_id, log_date]);

    if (existing) {
      let total_km = null;
      if (existing.end_km !== null) {
        if (parseFloat(existing.end_km) >= parseFloat(start_km)) {
          total_km = parseFloat(existing.end_km) - parseFloat(start_km);
        } else {
          return res.status(400).json({ error: 'Start KM cannot be greater than End KM' });
        }
      }
      await db.run('UPDATE driver_daily_logs SET start_km = ?, total_km = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [start_km, total_km, existing.id]);
    } else {
      await db.run(
        'INSERT INTO driver_daily_logs (driver_id, log_date, start_km) VALUES (?, ?, ?)',
        [driver_id, log_date, start_km]
      );
    }
    res.json({ message: 'Start KM recorded successfully' });
  } catch (error) {
    console.error('Error saving start km:', error);
    res.status(500).json({ error: 'Failed to save Start KM' });
  }
});

// POST end km
router.post('/km-logs/end', authenticateToken, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' });
  const { driver_id, log_date, end_km } = req.body;
  if (!driver_id || !log_date || end_km === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const db = await getDB();
    const existing = await db.get('SELECT id, start_km FROM driver_daily_logs WHERE driver_id = ? AND log_date = ?', [driver_id, log_date]);

    if (!existing) {
      return res.status(400).json({ error: 'Start KM not recorded for this day yet.' });
    }

    if (parseFloat(end_km) < parseFloat(existing.start_km)) {
      return res.status(400).json({ error: 'End KM cannot be less than Start KM' });
    }

    const total_km = parseFloat(end_km) - parseFloat(existing.start_km);

    await db.run(
      'UPDATE driver_daily_logs SET end_km = ?, total_km = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [end_km, total_km, existing.id]
    );

    res.json({ message: 'End KM recorded successfully', total_km });
  } catch (error) {
    console.error('Error saving end km:', error);
    res.status(500).json({ error: 'Failed to save End KM' });
  }
});

// GET driver km stats
router.get('/driver/:id/km-stats', authenticateToken, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' });
  const driverId = req.params.id;

  try {
    const db = await getDB();
    const driver = await db.get('SELECT name, vehicle_no, rate_per_km FROM delivery_partners WHERE id = ?', [driverId]);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    // Fetch driver's logs and calculate aggregates in JavaScript for cross-database compatibility
    const allDriverLogs = await db.all(
      'SELECT log_date, total_km FROM driver_daily_logs WHERE driver_id = ? AND total_km IS NOT NULL',
      [driverId]
    );

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM
    const currentYearPrefix = todayStr.substring(0, 4); // YYYY

    let todayKm = 0;
    let weekKm = 0;
    let monthKm = 0;
    let yearKm = 0;
    let allTimeKm = 0;

    for (const l of allDriverLogs) {
      const km = parseFloat(l.total_km) || 0;
      const logD = typeof l.log_date === 'string' ? l.log_date.split('T')[0] : '';
      allTimeKm += km;
      if (logD === todayStr) todayKm += km;
      if (logD >= sevenDaysAgo) weekKm += km;
      if (logD.startsWith(currentMonthPrefix)) monthKm += km;
      if (logD.startsWith(currentYearPrefix)) yearKm += km;
    }

    const recentLogs = await db.all('SELECT log_date, start_km, end_km, total_km FROM driver_daily_logs WHERE driver_id = ? ORDER BY log_date DESC LIMIT 5', [driverId]);

    res.json({
      driver,
      stats: {
        today: Math.round(todayKm * 100) / 100,
        week: Math.round(weekKm * 100) / 100,
        month: Math.round(monthKm * 100) / 100,
        year: Math.round(yearKm * 100) / 100,
        allTime: Math.round(allTimeKm * 100) / 100
      },
      recentLogs
    });
  } catch (error) {
    console.error('Error fetching driver km stats:', error);
    res.status(500).json({ error: 'Failed to fetch driver stats' });
  }
});

module.exports = router;
