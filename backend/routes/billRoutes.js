const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  sendAnoBillReminderEmail,
  sendAnoBillReceivedConfirmationEmail
} = require('../utils/emailService');

let billColsVerified = false;
async function ensureBillColumns(db) {
  if (billColsVerified) return;
  const cols = [
    "ALTER TABLE refreshment_bills ADD COLUMN received_by INTEGER NULL",
    "ALTER TABLE refreshment_bills ADD COLUMN last_reminder_sent_at DATETIME NULL",
    "ALTER TABLE refreshment_bills ADD COLUMN reminder_count INTEGER DEFAULT 0"
  ];
  for (const sql of cols) {
    try { await db.run(sql); } catch (e) {}
  }
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS unit_monthly_payments (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        unit_id INTEGER NOT NULL,
        month VARCHAR(50) NOT NULL,
        total_packets INTEGER DEFAULT 0,
        total_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        payment_status VARCHAR(50) DEFAULT 'PENDING',
        payment_date TEXT,
        payment_mode TEXT,
        payment_ref TEXT,
        remarks TEXT,
        registered_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_unit_month (unit_id, month)
      )
    `);
  } catch (e) {
    console.warn('ensure unit_monthly_payments error:', e.message);
  }
  billColsVerified = true;
}

function formatMonthLabel(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return String(ym || '');
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
}

// Helper to gather institution monthly demands and bill return status
async function buildMonthInstitutionBillData(db, month, unitIdFilter = null) {
  await ensureBillColumns(db);
  let demandQuery = `
    SELECT
      d.id,
      d.demand_number,
      d.demand_date,
      d.status,
      d.delivery_status,
      d.invoice_no,
      d.invoice_date,
      d.institution_id,
      d.unit_id,
      i.institution_name,
      i.ano_cto_name,
      i.ano_cto_contact,
      i.complete_address,
      u.unit_name,
      u.unit_code,
      u.ncc_group,
      COALESCE(SUM(di.quantity), 0) as total_quantity,
      COALESCE(SUM(di.quantity * di.unit_price_snapshot), 0) as total_amount
    FROM demands d
    JOIN institutions i ON d.institution_id = i.id
    JOIN units u ON d.unit_id = u.id
    LEFT JOIN demand_items di ON d.id = di.demand_id
    WHERE d.is_deleted = 0
      AND d.status NOT IN ('REJECTED', 'CANCELLED')
      AND LEFT(d.demand_date, 7) = ?
  `;
  const params = [month];

  if (unitIdFilter && unitIdFilter !== 'ALL') {
    demandQuery += ' AND d.unit_id = ?';
    params.push(unitIdFilter);
  }

  demandQuery += ' GROUP BY d.id ORDER BY i.institution_name ASC, d.demand_date ASC';

  const demandRows = await db.all(demandQuery, params);

  // Fetch linked ANO users (for registered email address)
  const userRows = await db.all(
    `SELECT id, institution_id, name, email FROM users WHERE role = 'INSTITUTION' AND institution_id IS NOT NULL`
  );
  const userByInstId = {};
  userRows.forEach(u => {
    if (u.institution_id && (!userByInstId[u.institution_id] || u.email)) {
      userByInstId[u.institution_id] = u;
    }
  });

  // Fetch existing refreshment_bills rows for this month
  const billRows = await db.all(
    `SELECT * FROM refreshment_bills WHERE month = ?`,
    [month]
  );
  const billByInstId = {};
  billRows.forEach(b => {
    billByInstId[b.institution_id] = b;
  });

  // Group demands by institution_id
  const instMap = {};
  demandRows.forEach(d => {
    const instId = d.institution_id;
    if (!instMap[instId]) {
      const anoUser = userByInstId[instId] || {};
      const billRec = billByInstId[instId] || null;
      instMap[instId] = {
        institution_id: instId,
        institution_name: d.institution_name,
        ano_cto_name: d.ano_cto_name || anoUser.name || 'ANO Incharge',
        ano_cto_contact: d.ano_cto_contact || '',
        ano_email: anoUser.email || '',
        ano_user_id: anoUser.id || null,
        complete_address: d.complete_address || '',
        unit_id: d.unit_id,
        unit_name: d.unit_name,
        unit_code: d.unit_code,
        ncc_group: d.ncc_group,
        month,
        month_label: formatMonthLabel(month),
        total_packets: 0,
        total_amount: 0,
        demands: [],
        bill_id: billRec?.id || null,
        bill_submitted: billRec?.bill_submitted === 1 ? 1 : 0,
        bill_submitted_date: billRec?.bill_submitted_date || null,
        payment_status: billRec?.payment_status || 'PENDING',
        remarks: billRec?.remarks || '',
        last_reminder_sent_at: billRec?.last_reminder_sent_at || null,
        reminder_count: Number(billRec?.reminder_count || 0)
      };
    }
    instMap[instId].total_packets += Number(d.total_quantity || 0);
    instMap[instId].total_amount += Number(d.total_amount || 0);
    instMap[instId].demands.push({
      id: d.id,
      demand_number: d.demand_number,
      demand_date: d.demand_date,
      status: d.status,
      invoice_no: d.invoice_no || '',
      invoice_date: d.invoice_date || '',
      total_quantity: Number(d.total_quantity || 0),
      total_amount: Number(d.total_amount || 0)
    });
  });

  return Object.values(instMap).sort((a, b) => (a.institution_name || '').localeCompare(b.institution_name || ''));
}

// GET /api/refreshment-bills/ano-returns - Institution-wise monthly bill return & reminder tracker
router.get('/ano-returns', authenticateToken, authorizeRoles('ADMIN', 'UNIT'), async (req, res) => {
  try {
    const db = await getDB();
    const { month, unit_id } = req.query;
    if (!month) {
      return res.status(400).json({ error: 'Month parameter (YYYY-MM) is required.' });
    }

    const effectiveUnitId = req.user.role === 'UNIT' ? req.user.unit_id : (unit_id || 'ALL');
    const items = await buildMonthInstitutionBillData(db, month, effectiveUnitId);

    res.json(items);
  } catch (error) {
    console.error('Fetch ANO bill returns error:', error);
    res.status(500).json({ error: 'Failed to retrieve ANO bill returns.' });
  }
});

// Helper: Current YYYY-MM in IST (Asia/Kolkata)
const getCurrentISTYearMonth = () => {
  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return `${nowIST.getFullYear()}-${String(nowIST.getMonth() + 1).padStart(2, '0')}`;
};

// POST /api/refreshment-bills/mark-received - Unit/Admin marks physical countersigned bill as RECEIVED (or reverts to BALANCE)
router.post('/mark-received', authenticateToken, authorizeRoles('ADMIN', 'UNIT'), async (req, res) => {
  try {
    const db = await getDB();
    await ensureBillColumns(db);
    const { institution_id, month, received, received_date, remarks } = req.body;

    if (!institution_id || !month) {
      return res.status(400).json({ error: 'institution_id and month are required.' });
    }

    const currentYM = getCurrentISTYearMonth();
    if (Boolean(received) && String(month) >= currentYM) {
      return res.status(400).json({
        error: `Mark Received is locked for ongoing month (${month}). Bills can only be marked Received for completed past months.`
      });
    }

    // Scope check for UNIT
    const inst = await db.get('SELECT * FROM institutions WHERE id = ?', [institution_id]);
    if (!inst) {
      return res.status(404).json({ error: 'Institution not found.' });
    }
    if (req.user.role === 'UNIT' && String(inst.unit_id) !== String(req.user.unit_id)) {
      return res.status(403).json({ error: 'Access denied: Institution belongs to another NCC Unit.' });
    }

    const isReceived = Boolean(received);
    const todayStr = new Date().toISOString().split('T')[0];
    const subDate = isReceived ? (received_date || todayStr) : null;

    // Calculate current month totals for this institution
    const allMonthData = await buildMonthInstitutionBillData(db, month, inst.unit_id);
    const instSummary = allMonthData.find(x => String(x.institution_id) === String(institution_id)) || {
      total_packets: 0,
      total_amount: 0,
      ano_email: '',
      ano_user_id: null,
      ano_cto_name: inst.ano_cto_name,
      unit_name: 'NCC Unit',
      unit_code: '',
      month_label: formatMonthLabel(month)
    };

    const existing = await db.get(
      'SELECT id, bill_submitted FROM refreshment_bills WHERE institution_id = ? AND month = ?',
      [institution_id, month]
    );
    const wasAlreadyReceived = Boolean(existing && Number(existing.bill_submitted) === 1);

    if (existing) {
      try {
        await db.run(
          `UPDATE refreshment_bills
           SET bill_submitted = ?,
               bill_submitted_date = ?,
               bill_amount = ?,
               demand_packets = ?,
               remarks = COALESCE(?, remarks),
               received_by = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            isReceived ? 1 : 0,
            subDate,
            instSummary.total_amount || 0,
            instSummary.total_packets || 0,
            remarks !== undefined ? remarks : null,
            isReceived ? req.user.id : null,
            existing.id
          ]
        );
      } catch (colErr) {
        await db.run(
          `UPDATE refreshment_bills
           SET bill_submitted = ?,
               bill_submitted_date = ?,
               bill_amount = ?,
               demand_packets = ?,
               remarks = COALESCE(?, remarks),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            isReceived ? 1 : 0,
            subDate,
            instSummary.total_amount || 0,
            instSummary.total_packets || 0,
            remarks !== undefined ? remarks : null,
            existing.id
          ]
        );
      }
    } else {
      try {
        await db.run(
          `INSERT INTO refreshment_bills (
             institution_id, month, bill_submitted, bill_submitted_date,
             bill_amount, demand_packets, payment_status, remarks, received_by
           ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
          [
            institution_id,
            month,
            isReceived ? 1 : 0,
            subDate,
            instSummary.total_amount || 0,
            instSummary.total_packets || 0,
            remarks || null,
            isReceived ? req.user.id : null
          ]
        );
      } catch (colErr) {
        await db.run(
          `INSERT INTO refreshment_bills (
             institution_id, month, bill_submitted, bill_submitted_date,
             bill_amount, demand_packets, payment_status, remarks
           ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
          [
            institution_id,
            month,
            isReceived ? 1 : 0,
            subDate,
            instSummary.total_amount || 0,
            instSummary.total_packets || 0,
            remarks || null
          ]
        );
      }
    }

    let emailSent = false;
    // Thanks message goes out only when status changes Balance -> Received (never duplicated)
    if (isReceived && !wasAlreadyReceived) {
      // Send Confirmation & Appreciation Email to ANO
      if (instSummary.ano_email && instSummary.ano_email.includes('@')) {
        emailSent = await sendAnoBillReceivedConfirmationEmail(instSummary.ano_email, {
          institutionName: inst.institution_name,
          anoName: instSummary.ano_cto_name,
          unitName: instSummary.unit_name,
          unitCode: instSummary.unit_code,
          monthLabel: instSummary.month_label,
          receivedDate: subDate,
          totalPackets: instSummary.total_packets,
          totalAmount: instSummary.total_amount,
          remarks: remarks || ''
        });
      }

      // Create in-app notification for ANO
      if (instSummary.ano_user_id) {
        await db.run(
          `INSERT INTO notifications (user_id, title, message, link_url) VALUES (?, ?, ?, '/bills')`,
          [
            instSummary.ano_user_id,
            `Countersigned Bill Received (${instSummary.month_label})`,
            `Your physical countersigned refreshment bill(s) for ${instSummary.month_label} (${instSummary.total_packets} pkts, ₹${Number(instSummary.total_amount || 0).toLocaleString('en-IN')}) have been marked as RECEIVED by ${instSummary.unit_name}. Thank you!`
          ]
        );
      }
    }

    res.json({
      message: isReceived
        ? `Marked as RECEIVED at Unit.${emailSent ? ' Confirmation & Thanks email sent to ANO.' : ''}`
        : 'Reverted status to BALANCE (Pending Submission).',
      emailSent
    });
  } catch (error) {
    console.error('Mark bill received error:', error);
    res.status(500).json({ error: 'Failed to update bill receipt status.' });
  }
});

// POST /api/refreshment-bills/send-reminder - Manual or Bulk military reminder email to Balance ANOs
router.post('/send-reminder', authenticateToken, authorizeRoles('ADMIN', 'UNIT'), async (req, res) => {
  try {
    const db = await getDB();
    const { month, institution_ids } = req.body;

    if (!month) {
      return res.status(400).json({ error: 'Month parameter (YYYY-MM) is required.' });
    }

    const currentYM = getCurrentISTYearMonth();
    if (String(month) >= currentYM) {
      return res.status(400).json({
        error: `Reminders can only be initiated for completed past months (before ${currentYM}).`
      });
    }

    if (req.user.role === 'UNIT' && !req.user.unit_id) {
      return res.status(403).json({ error: 'Unit scope missing. Cannot send reminders.' });
    }
    const effectiveUnitId = req.user.role === 'UNIT' ? req.user.unit_id : (req.body.unit_id || 'ALL');
    const allMonthData = await buildMonthInstitutionBillData(db, month, effectiveUnitId);

    // Filter only BALANCE (bill_submitted === 0) institutions
    let targets = allMonthData.filter(item => item.bill_submitted === 0);
    // Hard safety: a Unit (or Admin with a unit selected) only reminds institutions of that unit
    if (effectiveUnitId && effectiveUnitId !== 'ALL') {
      targets = targets.filter(item => String(item.unit_id) === String(effectiveUnitId));
    }
    if (Array.isArray(institution_ids) && institution_ids.length > 0) {
      const idSet = new Set(institution_ids.map(String));
      targets = targets.filter(item => idSet.has(String(item.institution_id)));
    }

    if (targets.length === 0) {
      return res.json({ message: 'No pending/balance institutions found to remind.', sentCount: 0, totalTargets: 0 });
    }

    let sentCount = 0;
    for (const item of targets) {
      let ok = false;
      if (item.ano_email && item.ano_email.includes('@')) {
        ok = await sendAnoBillReminderEmail(item.ano_email, {
          institutionName: item.institution_name,
          anoName: item.ano_cto_name,
          unitName: item.unit_name,
          unitCode: item.unit_code,
          monthLabel: item.month_label,
          demands: item.demands,
          totalPackets: item.total_packets,
          totalAmount: item.total_amount
        });
      }

      // Upsert refreshment_bills to track reminder count and timestamp
      const existing = await db.get(
        'SELECT id, reminder_count FROM refreshment_bills WHERE institution_id = ? AND month = ?',
        [item.institution_id, month]
      );
      if (existing) {
        await db.run(
          `UPDATE refreshment_bills
           SET last_reminder_sent_at = CURRENT_TIMESTAMP,
               reminder_count = COALESCE(reminder_count, 0) + 1
           WHERE id = ?`,
          [existing.id]
        );
      } else {
        await db.run(
          `INSERT INTO refreshment_bills (
             institution_id, month, bill_submitted, bill_amount, demand_packets,
             payment_status, last_reminder_sent_at, reminder_count
           ) VALUES (?, ?, 0, ?, ?, 'PENDING', CURRENT_TIMESTAMP, 1)`,
          [item.institution_id, month, item.total_amount || 0, item.total_packets || 0]
        );
      }

      // Also push an in-app notification for the ANO
      if (item.ano_user_id) {
        await db.run(
          `INSERT INTO notifications (user_id, title, message, link_url) VALUES (?, ?, ?, '/bills')`,
          [
            item.ano_user_id,
            `URGENT: Pending Bill Submission (${item.month_label})`,
            `Refreshment bill(s) for ${item.month_label} (${item.total_packets} pkts, ₹${Number(item.total_amount || 0).toLocaleString('en-IN')}) duly countersigned by the Principal are pending submission at ${item.unit_name}. Please submit immediately.`
          ]
        );
      }

      if (ok) sentCount++;
    }

    res.json({
      message: `Dispatched ${sentCount} military reminder email(s) and portal notifications out of ${targets.length} balance institution(s).`,
      sentCount,
      totalTargets: targets.length
    });
  } catch (error) {
    console.error('Send bill reminder error:', error);
    res.status(500).json({ error: 'Failed to send reminder emails.' });
  }
});

// GET /api/refreshment-bills/my-pending-returns - Used by ANO Portal login center-screen alert & Bill Submission page
router.get('/my-pending-returns', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'INSTITUTION' || !req.user.institution_id) {
      return res.json([]);
    }

    const db = await getDB();
    const myInst = await db.get('SELECT unit_id FROM institutions WHERE id = ?', [req.user.institution_id]);
    if (!myInst || !(await isAnoPopupEnabled(db, myInst.unit_id))) {
      return res.json([]);
    }
    const instId = req.user.institution_id;

    // Find all distinct months where this institution has valid demands (not cancelled/rejected/pending)
    const monthsRows = await db.all(
      `SELECT DISTINCT LEFT(d.demand_date, 7) as month
       FROM demands d
       WHERE d.institution_id = ?
         AND d.is_deleted = 0
         AND d.status NOT IN ('REJECTED', 'CANCELLED')
       ORDER BY month DESC`,
      [instId]
    );

    const currentYM = getCurrentISTYearMonth();
    const pendingList = [];
    for (const r of monthsRows) {
      if (!r.month || String(r.month) >= currentYM) continue;
      const monthData = await buildMonthInstitutionBillData(db, r.month, 'ALL');
      const myRecord = monthData.find(x => String(x.institution_id) === String(instId));
      if (myRecord && myRecord.bill_submitted === 0 && myRecord.total_packets > 0) {
        pendingList.push(myRecord);
      }
    }

    res.json(pendingList);
  } catch (error) {
    console.error('Fetch my pending bill returns error:', error);
    res.status(500).json({ error: 'Failed to check pending bill returns.' });
  }
});

// ANO balance-bill popup toggle, controlled per NCC Unit from the Unit portal's App Settings (OFF by default)
const anoPopupKey = (unitId) => `ano_balance_popup_enabled_unit_${unitId}`;
async function ensureAppSettingsTable(db) {
  await db.run(`CREATE TABLE IF NOT EXISTS app_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
}
async function isAnoPopupEnabled(db, unitId) {
  try {
    if (!unitId) return false;
    await ensureAppSettingsTable(db);
    const row = await db.get('SELECT setting_value FROM app_settings WHERE setting_key = ?', [anoPopupKey(unitId)]);
    return row ? String(row.setting_value) === 'true' : false;
  } catch (e) {
    return false;
  }
}

// GET /api/refreshment-bills/ano-popup-setting (Unit: own unit; Admin: ?unit_id=)
router.get('/ano-popup-setting', authenticateToken, authorizeRoles('ADMIN', 'UNIT'), async (req, res) => {
  try {
    const db = await getDB();
    const unitId = req.user.role === 'UNIT' ? req.user.unit_id : req.query.unit_id;
    res.json({ enabled: await isAnoPopupEnabled(db, unitId) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read setting.' });
  }
});

// PUT /api/refreshment-bills/ano-popup-setting
router.put('/ano-popup-setting', authenticateToken, authorizeRoles('ADMIN', 'UNIT'), async (req, res) => {
  try {
    const db = await getDB();
    const unitId = req.user.role === 'UNIT' ? req.user.unit_id : req.body.unit_id;
    if (!unitId) {
      return res.status(400).json({ error: 'unit_id is required.' });
    }
    await ensureAppSettingsTable(db);
    const key = anoPopupKey(unitId);
    const value = req.body.enabled ? 'true' : 'false';
    const existing = await db.get('SELECT setting_key FROM app_settings WHERE setting_key = ?', [key]);
    if (existing) {
      await db.run('UPDATE app_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?', [value, key]);
    } else {
      await db.run('INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)', [key, value]);
    }
    res.json({ enabled: value === 'true' });
  } catch (error) {
    console.error('Save ano popup setting error:', error);
    res.status(500).json({ error: 'Failed to save setting.' });
  }
});

// GET /api/refreshment-bills/unit-payments - Unit-wise monthly bill & payment tracking with expandable institutions
router.get('/unit-payments', authenticateToken, authorizeRoles('ADMIN', 'UNIT'), async (req, res) => {
  try {
    const db = await getDB();
    await ensureBillColumns(db);
    const { month, ncc_group, unit_id } = req.query;

    if (!month) {
      return res.status(400).json({ error: 'Month parameter (YYYY-MM) is required.' });
    }

    // 1. Fetch units (Note: units table does not have is_deleted column)
    let unitQuery = 'SELECT id, unit_name, unit_code, location, ncc_group FROM units WHERE 1=1';
    const unitParams = [];
    if (req.user.role === 'UNIT') {
      unitQuery += ' AND id = ?';
      unitParams.push(req.user.unit_id);
    } else if (unit_id && unit_id !== 'ALL') {
      unitQuery += ' AND id = ?';
      unitParams.push(unit_id);
    } else if (ncc_group && ncc_group !== 'All') {
      unitQuery += ' AND ncc_group = ?';
      unitParams.push(ncc_group);
    }
    unitQuery += ' ORDER BY unit_name ASC';
    const units = await db.all(unitQuery, unitParams);

    // 2. Fetch demands for the month with calculated packets and amounts from demand_items
    const demandsQuery = `
      SELECT
        d.id, d.demand_number, d.demand_date, d.status, d.invoice_no, d.invoice_date,
        d.institution_id, d.unit_id,
        COALESCE(i.institution_name, 'Battalion Direct Demand') as institution_name,
        COALESCE(i.ano_cto_name, '') as ano_cto_name,
        COALESCE(i.ano_cto_contact, '') as ano_cto_contact,
        COALESCE(i.pin_code, '') as pin_code,
        COALESCE(di_agg.total_quantity, 0) as total_quantity,
        COALESCE(di_agg.total_amount, 0) as total_amount
      FROM demands d
      LEFT JOIN institutions i ON d.institution_id = i.id
      LEFT JOIN (
        SELECT 
          demand_id,
          SUM(quantity) as total_quantity,
          SUM(quantity * unit_price_snapshot) as total_amount
        FROM demand_items
        GROUP BY demand_id
      ) di_agg ON di_agg.demand_id = d.id
      WHERE d.is_deleted = 0
        AND d.status NOT IN ('CANCELLED', 'REJECTED')
        AND LEFT(d.demand_date, 7) = ?
      ORDER BY i.institution_name ASC, d.demand_date ASC
    `;
    const demands = await db.all(demandsQuery, [month]);

    // 3. Fetch unit_monthly_payments for the month (safely handled if table freshly created)
    let unitPayments = [];
    try {
      unitPayments = await db.all(
        'SELECT * FROM unit_monthly_payments WHERE month = ?',
        [month]
      );
    } catch (e) {
      console.warn('unit_monthly_payments select fallback:', e.message);
      unitPayments = [];
    }
    const paymentMap = {};
    (unitPayments || []).forEach(p => {
      paymentMap[p.unit_id] = p;
    });

    // 4. Fetch refreshment_bills for the month
    let instBills = [];
    try {
      instBills = await db.all(
        'SELECT * FROM refreshment_bills WHERE month = ?',
        [month]
      );
    } catch (e) {
      console.warn('refreshment_bills select fallback:', e.message);
      instBills = [];
    }
    const instBillMap = {};
    (instBills || []).forEach(b => {
      instBillMap[b.institution_id] = b;
    });

    // 5. Group demands by unit & institution
    const unitDataMap = {};
    units.forEach(u => {
      unitDataMap[u.id] = {
        unit_id: u.id,
        unit_name: u.unit_name,
        unit_code: u.unit_code,
        location: u.location,
        ncc_group: u.ncc_group,
        month,
        month_label: formatMonthLabel(month),
        total_packets: 0,
        total_amount: 0,
        institutions_map: {}
      };
    });

    demands.forEach(d => {
      if (!unitDataMap[d.unit_id]) return;
      const uEntry = unitDataMap[d.unit_id];
      const q = Number(d.total_quantity) || 0;
      const a = Number(d.total_amount) || 0;
      uEntry.total_packets += q;
      uEntry.total_amount += a;

      const instKey = d.institution_id || `direct_${d.unit_id}`;
      if (!uEntry.institutions_map[instKey]) {
        const bRec = d.institution_id ? instBillMap[d.institution_id] : null;
        uEntry.institutions_map[instKey] = {
          institution_id: d.institution_id,
          institution_name: d.institution_name,
          ano_cto_name: d.ano_cto_name || '',
          ano_cto_contact: d.ano_cto_contact || '',
          pin_code: d.pin_code || '',
          total_packets: 0,
          total_amount: 0,
          demand_count: 0,
          demands: [],
          bill_submitted: Number(bRec?.bill_submitted || 0) === 1 ? 1 : 0,
          bill_submitted_date: bRec?.bill_submitted_date || null,
          payment_status: bRec?.payment_status || 'PENDING'
        };
      }
      const instEntry = uEntry.institutions_map[instKey];
      instEntry.total_packets += q;
      instEntry.total_amount += a;
      instEntry.demand_count += 1;
      instEntry.demands.push({
        id: d.id,
        demand_number: d.demand_number,
        demand_date: d.demand_date,
        invoice_no: d.invoice_no || '',
        invoice_date: d.invoice_date || '',
        quantity: q,
        amount: a
      });
    });

    // 6. Shape final response
    const result = Object.values(unitDataMap).map(u => {
      const pRec = paymentMap[u.unit_id];
      const instList = Object.values(u.institutions_map);
      const paidAmount = Number(pRec?.paid_amount !== undefined && pRec?.paid_amount !== null
        ? pRec.paid_amount
        : (pRec?.payment_status === 'PAID' ? u.total_amount : 0));
      const paymentStatus = pRec?.payment_status || (u.total_amount > 0 && paidAmount >= u.total_amount ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'PENDING'));
      const balanceAmount = Math.max(0, u.total_amount - paidAmount);

      return {
        unit_id: u.unit_id,
        unit_name: u.unit_name,
        unit_code: u.unit_code,
        location: u.location,
        ncc_group: u.ncc_group,
        month: u.month,
        month_label: u.month_label,
        institutions_count: instList.length,
        total_packets: u.total_packets,
        total_amount: u.total_amount,
        paid_amount: paidAmount,
        balance_amount: balanceAmount,
        payment_status: paymentStatus,
        payment_date: pRec?.payment_date || null,
        payment_mode: pRec?.payment_mode || '',
        payment_ref: pRec?.payment_ref || '',
        remarks: pRec?.remarks || '',
        registered_by: pRec?.registered_by || null,
        updated_at: pRec?.updated_at || null,
        institutions: instList
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Fetch unit payments error:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve unit payments.' });
  }
});

// POST /api/refreshment-bills/unit-payments - Admin registers/records Unit payment for a month
router.post('/unit-payments', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const db = await getDB();
    await ensureBillColumns(db);
    const {
      unit_id, month, payment_status, paid_amount,
      payment_date, payment_mode, payment_ref, remarks
    } = req.body;

    if (!unit_id || !month) {
      return res.status(400).json({ error: 'unit_id and month are required.' });
    }

    const unit = await db.get('SELECT id, unit_name FROM units WHERE id = ?', [unit_id]);
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found.' });
    }

    const status = payment_status || 'PENDING';
    const amount = Number(paid_amount) || 0;
    const today = new Date().toISOString().split('T')[0];
    const pDate = status !== 'PENDING' ? (payment_date || today) : null;

    const existing = await db.get(
      'SELECT id FROM unit_monthly_payments WHERE unit_id = ? AND month = ?',
      [unit_id, month]
    );

    if (existing) {
      await db.run(
        `UPDATE unit_monthly_payments
         SET payment_status = ?,
             paid_amount = ?,
             payment_date = ?,
             payment_mode = ?,
             payment_ref = ?,
             remarks = ?,
             registered_by = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          status, amount, pDate, payment_mode || null,
          payment_ref || null, remarks || null, req.user.id,
          existing.id
        ]
      );
    } else {
      await db.run(
        `INSERT INTO unit_monthly_payments (
           unit_id, month, payment_status, paid_amount, payment_date,
           payment_mode, payment_ref, remarks, registered_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          unit_id, month, status, amount, pDate,
          payment_mode || null, payment_ref || null, remarks || null, req.user.id
        ]
      );
    }

    // Sync to all institutions under this unit for this month in refreshment_bills
    const instRows = await db.all(
      `SELECT DISTINCT institution_id
       FROM demands
       WHERE is_deleted = 0
         AND unit_id = ?
         AND LEFT(demand_date, 7) = ?`,
      [unit_id, month]
    );

    for (const inst of instRows) {
      const bExists = await db.get(
        'SELECT id FROM refreshment_bills WHERE institution_id = ? AND month = ?',
        [inst.institution_id, month]
      );
      if (bExists) {
        await db.run(
          `UPDATE refreshment_bills
           SET payment_status = ?,
               payment_date = ?,
               payment_ref = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [status === 'PAID' ? 'PAID' : (status === 'PARTIAL' ? 'PROCESSED' : 'PENDING'), pDate, payment_ref || null, bExists.id]
        );
      } else {
        await db.run(
          `INSERT INTO refreshment_bills (
             institution_id, month, bill_submitted, payment_status, payment_date, payment_ref
           ) VALUES (?, ?, 0, ?, ?, ?)`,
          [inst.institution_id, month, status === 'PAID' ? 'PAID' : (status === 'PARTIAL' ? 'PROCESSED' : 'PENDING'), pDate, payment_ref || null]
        );
      }
    }

    res.json({
      success: true,
      message: `Payment registered successfully for ${unit.unit_name} (${formatMonthLabel(month)}).`
    });
  } catch (error) {
    console.error('Register unit payment error:', error);
    res.status(500).json({ error: 'Failed to register unit payment.' });
  }
});

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
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'UNIT'), async (req, res) => {
  try {
    const db = await getDB();
    await ensureBillColumns(db);
    const {
      institution_id, institution, month, billSubmitted, billSubmittedDate,
      billAmount, demandPackets, paymentStatus, paymentDate, paymentRef, remarks
    } = req.body;

    let instId = institution_id ? Number(institution_id) : null;
    if (!instId && institution) {
      const inst = await db.get('SELECT id FROM institutions WHERE TRIM(UPPER(institution_name)) = TRIM(UPPER(?))', [institution]);
      if (inst) instId = inst.id;
    }
    if (!instId) {
      return res.status(404).json({ error: `Institution ${institution || institution_id} not found.` });
    }

    const existing = await db.get(
      'SELECT id, bill_submitted FROM refreshment_bills WHERE institution_id = ? AND month = ?',
      [instId, month]
    );
    const wasAlreadyReceived = Boolean(existing && Number(existing.bill_submitted) === 1);

    if (existing) {
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
          existing.id
        ]
      );
    } else {
      await db.run(
        `INSERT INTO refreshment_bills (
          institution_id, month, bill_submitted, bill_submitted_date,
          bill_amount, demand_packets, payment_status, payment_date, payment_ref, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          instId, month, billSubmitted ? 1 : 0, billSubmittedDate || null,
          billAmount || 0, demandPackets || 0, paymentStatus || 'PENDING',
          paymentDate || null, paymentRef || null, remarks || null
        ]
      );
    }

    // Thanks email + in-app notification to ANO when bill newly marked Received via this route
    if (billSubmitted && !wasAlreadyReceived) {
      try {
        const inst = await db.get('SELECT * FROM institutions WHERE id = ?', [instId]);
        const data = await buildMonthInstitutionBillData(db, month, 'ALL');
        const s = data.find(x => String(x.institution_id) === String(instId));
        if (inst && s) {
          if (s.ano_email && s.ano_email.includes('@')) {
            await sendAnoBillReceivedConfirmationEmail(s.ano_email, {
              institutionName: inst.institution_name,
              anoName: s.ano_cto_name,
              unitName: s.unit_name,
              unitCode: s.unit_code,
              monthLabel: s.month_label,
              receivedDate: billSubmittedDate || new Date().toISOString().split('T')[0],
              totalPackets: s.total_packets,
              totalAmount: s.total_amount,
              remarks: remarks || ''
            });
          }
          if (s.ano_user_id) {
            await db.run(
              `INSERT INTO notifications (user_id, title, message, link_url) VALUES (?, ?, ?, '/bills')`,
              [
                s.ano_user_id,
                `Countersigned Bill Received (${s.month_label})`,
                `Your physical countersigned refreshment bill(s) for ${s.month_label} (${s.total_packets} pkts, ₹${Number(s.total_amount || 0).toLocaleString('en-IN')}) have been marked as RECEIVED by ${s.unit_name}. Thank you!`
              ]
            );
          }
        }
      } catch (thanksErr) {
        console.error('Thanks message error:', thanksErr.message);
      }
    }

    res.json({ message: 'Bill saved successfully.' });
  } catch (error) {
    console.error('Save bill error:', error);
    res.status(500).json({ error: 'Failed to save bill.' });
  }
});

// PUT /api/refreshment-bills/:id
router.put('/:id', authenticateToken, authorizeRoles('ADMIN', 'UNIT'), async (req, res) => {
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

// Automated Daily Reminder Scheduler (checks hourly; sends once per day after 09:00 AM IST to unreminded Balance ANOs)
let dailyReminderInterval = null;
router.startDailyBillReminderScheduler = function () {
  if (dailyReminderInterval) return;

  const checkAndSendDailyReminders = async () => {
    try {
      // Calculate current hour & date in IST (Asia/Kolkata)
      const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const istHour = nowIST.getHours();
      if (istHour < 9) return; // Send at or after 09:00 AM IST

      const todayIST = `${nowIST.getFullYear()}-${String(nowIST.getMonth() + 1).padStart(2, '0')}-${String(nowIST.getDate()).padStart(2, '0')}`;
      const currentMonth = `${nowIST.getFullYear()}-${String(nowIST.getMonth() + 1).padStart(2, '0')}`;

      const db = await getDB();

      // Only send reminders for completed past months (month < currentMonth)
      const pastMonthsRows = await db.all(
        `SELECT DISTINCT LEFT(d.demand_date, 7) as month
         FROM demands d
         WHERE d.is_deleted = 0
           AND d.status NOT IN ('REJECTED', 'CANCELLED')
           AND LEFT(d.demand_date, 7) < ?
         ORDER BY month DESC`,
        [currentMonth]
      );
      const pastMonths = pastMonthsRows.map(r => r.month).filter(Boolean);

      for (const m of pastMonths) {
        const items = await buildMonthInstitutionBillData(db, m, 'ALL');
        const balanceItems = items.filter(it => it.bill_submitted === 0 && it.total_packets > 0);

        for (const item of balanceItems) {
          // Check if already reminded today
          if (item.last_reminder_sent_at) {
            const lastDateStr = new Date(item.last_reminder_sent_at).toISOString().split('T')[0];
            if (lastDateStr === todayIST) continue;
          }

          if (item.ano_email && item.ano_email.includes('@')) {
            await sendAnoBillReminderEmail(item.ano_email, {
              institutionName: item.institution_name,
              anoName: item.ano_cto_name,
              unitName: item.unit_name,
              unitCode: item.unit_code,
              monthLabel: item.month_label,
              demands: item.demands,
              totalPackets: item.total_packets,
              totalAmount: item.total_amount
            });
          }

          const existing = await db.get(
            'SELECT id FROM refreshment_bills WHERE institution_id = ? AND month = ?',
            [item.institution_id, m]
          );
          if (existing) {
            await db.run(
              `UPDATE refreshment_bills
               SET last_reminder_sent_at = CURRENT_TIMESTAMP,
                   reminder_count = COALESCE(reminder_count, 0) + 1
               WHERE id = ?`,
              [existing.id]
            );
          } else {
            await db.run(
              `INSERT INTO refreshment_bills (
                 institution_id, month, bill_submitted, bill_amount, demand_packets,
                 payment_status, last_reminder_sent_at, reminder_count
               ) VALUES (?, ?, 0, ?, ?, 'PENDING', CURRENT_TIMESTAMP, 1)`,
              [item.institution_id, m, item.total_amount || 0, item.total_packets || 0]
            );
          }
        }
      }
    } catch (err) {
      console.error('[Daily Bill Reminder Scheduler] Error:', err.message);
    }
  };

  // Run first check 60 seconds after server start, then every 60 minutes
  setTimeout(checkAndSendDailyReminders, 60 * 1000);
  dailyReminderInterval = setInterval(checkAndSendDailyReminders, 60 * 60 * 1000);
};

module.exports = router;
