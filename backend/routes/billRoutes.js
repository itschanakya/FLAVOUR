const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { uploadReceipt, getFileUrl } = require('../config/upload');
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
        gross_amount REAL DEFAULT 0,
        gst_tds_rate REAL DEFAULT 2.0,
        gst_tds_amount REAL DEFAULT 0,
        it_tds_rate REAL DEFAULT 2.0,
        it_tds_amount REAL DEFAULT 0,
        other_deductions REAL DEFAULT 0,
        total_deductions REAL DEFAULT 0,
        net_credit_amount REAL DEFAULT 0,
        submitted_to_pcda TINYINT DEFAULT 0,
        pcda_submission_date TEXT NULL,
        pcda_letter_ref TEXT NULL,
        vendor_verified TINYINT DEFAULT 0,
        vendor_verified_at DATETIME NULL,
        payment_advice_url TEXT NULL,
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

  const unitPayCols = [
    "ALTER TABLE unit_monthly_payments ADD COLUMN funding_type VARCHAR(50) DEFAULT 'STATE'",
    "ALTER TABLE unit_monthly_payments ADD COLUMN gross_amount REAL DEFAULT 0",
    "ALTER TABLE unit_monthly_payments ADD COLUMN gst_tds_rate REAL DEFAULT 2.0",
    "ALTER TABLE unit_monthly_payments ADD COLUMN gst_tds_amount REAL DEFAULT 0",
    "ALTER TABLE unit_monthly_payments ADD COLUMN it_tds_rate REAL DEFAULT 2.0",
    "ALTER TABLE unit_monthly_payments ADD COLUMN it_tds_amount REAL DEFAULT 0",
    "ALTER TABLE unit_monthly_payments ADD COLUMN other_deductions REAL DEFAULT 0",
    "ALTER TABLE unit_monthly_payments ADD COLUMN total_deductions REAL DEFAULT 0",
    "ALTER TABLE unit_monthly_payments ADD COLUMN net_credit_amount REAL DEFAULT 0",
    "ALTER TABLE unit_monthly_payments ADD COLUMN submitted_to_pcda TINYINT DEFAULT 0",
    "ALTER TABLE unit_monthly_payments ADD COLUMN pcda_submission_date TEXT NULL",
    "ALTER TABLE unit_monthly_payments ADD COLUMN pcda_letter_ref TEXT NULL",
    "ALTER TABLE unit_monthly_payments ADD COLUMN vendor_verified TINYINT DEFAULT 0",
    "ALTER TABLE unit_monthly_payments ADD COLUMN vendor_verified_at DATETIME NULL",
    "ALTER TABLE unit_monthly_payments ADD COLUMN payment_advice_url TEXT NULL"
  ];
  for (const sql of unitPayCols) {
    try { await db.run(sql); } catch (e) {}
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
      COALESCE(i.institution_type, 'STATE') as institution_type,
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
        institution_type: d.institution_type || 'STATE',
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

// Billing TDS settings (GST TDS & IT TDS), configured in App Settings (default 2% + 2%)
async function getTdsSettings(db) {
  try {
    await ensureAppSettingsTable(db);
    const row = await db.get("SELECT setting_value FROM app_settings WHERE setting_key = 'bill_tds_settings'");
    if (row && row.setting_value) {
      const parsed = JSON.parse(row.setting_value);
      return {
        gst_tds_rate: Number(parsed.gst_tds_rate !== undefined ? parsed.gst_tds_rate : 2.0),
        it_tds_rate: Number(parsed.it_tds_rate !== undefined ? parsed.it_tds_rate : 2.0)
      };
    }
  } catch (e) {}
  return { gst_tds_rate: 2.0, it_tds_rate: 2.0 };
}

// GET /api/refreshment-bills/tds-settings
router.get('/tds-settings', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    const settings = await getTdsSettings(db);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read TDS settings.' });
  }
});

// PUT /api/refreshment-bills/tds-settings (ADMIN only)
router.put('/tds-settings', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const db = await getDB();
    await ensureAppSettingsTable(db);
    const gstRate = Math.max(0, Number(req.body.gst_tds_rate !== undefined ? req.body.gst_tds_rate : 2.0));
    const itRate = Math.max(0, Number(req.body.it_tds_rate !== undefined ? req.body.it_tds_rate : 2.0));
    const val = JSON.stringify({ gst_tds_rate: gstRate, it_tds_rate: itRate });
    const existing = await db.get("SELECT setting_key FROM app_settings WHERE setting_key = 'bill_tds_settings'");
    if (existing) {
      await db.run("UPDATE app_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = 'bill_tds_settings'", [val]);
    } else {
      await db.run("INSERT INTO app_settings (setting_key, setting_value) VALUES ('bill_tds_settings', ?)", [val]);
    }
    res.json({ success: true, gst_tds_rate: gstRate, it_tds_rate: itRate });
  } catch (error) {
    console.error('Save TDS settings error:', error);
    res.status(500).json({ error: 'Failed to save TDS settings.' });
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
        COALESCE(i.institution_type, 'STATE') as institution_type,
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
      const fund = p.funding_type || 'STATE';
      paymentMap[`${p.unit_id}_${fund}`] = p;
      if (!paymentMap[p.unit_id]) {
        paymentMap[p.unit_id] = p;
      }
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

    // 4b. Fetch master institution count by unit and funding type (to know if unit has Centre schools registered)
    let masterCounts = [];
    try {
      masterCounts = await db.all(`
        SELECT unit_id, COALESCE(institution_type, 'STATE') as institution_type, COUNT(*) as cnt
        FROM institutions
        GROUP BY unit_id, institution_type
      `);
    } catch (e) {
      console.warn('masterCounts select fallback:', e.message);
      masterCounts = [];
    }
    const unitMasterCounts = {};
    masterCounts.forEach(m => {
      if (!unitMasterCounts[m.unit_id]) unitMasterCounts[m.unit_id] = { STATE: 0, CENTRE: 0 };
      unitMasterCounts[m.unit_id][m.institution_type] = Number(m.cnt || 0);
    });

    // 5. Group demands by unit & funding type (STATE vs CENTRE)
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
        state_packets: 0,
        state_amount: 0,
        centre_packets: 0,
        centre_amount: 0,
        state_institutions_map: {},
        centre_institutions_map: {}
      };
    });

    demands.forEach(d => {
      if (!unitDataMap[d.unit_id]) return;
      const uEntry = unitDataMap[d.unit_id];
      const q = Number(d.total_quantity) || 0;
      const a = Number(d.total_amount) || 0;
      uEntry.total_packets += q;
      uEntry.total_amount += a;

      const isCentre = (d.institution_type === 'CENTRE');
      const targetMap = isCentre ? uEntry.centre_institutions_map : uEntry.state_institutions_map;

      if (isCentre) {
        uEntry.centre_packets += q;
        uEntry.centre_amount += a;
      } else {
        uEntry.state_packets += q;
        uEntry.state_amount += a;
      }

      const instKey = d.institution_id || `direct_${d.unit_id}`;
      if (!targetMap[instKey]) {
        const bRec = d.institution_id ? instBillMap[d.institution_id] : null;
        targetMap[instKey] = {
          institution_id: d.institution_id,
          institution_name: d.institution_name,
          ano_cto_name: d.ano_cto_name || '',
          ano_cto_contact: d.ano_cto_contact || '',
          pin_code: d.pin_code || '',
          institution_type: isCentre ? 'CENTRE' : 'STATE',
          total_packets: 0,
          total_amount: 0,
          demand_count: 0,
          demands: [],
          bill_submitted: Number(bRec?.bill_submitted || 0) === 1 ? 1 : 0,
          bill_submitted_date: bRec?.bill_submitted_date || null,
          payment_status: bRec?.payment_status || 'PENDING'
        };
      }
      const instEntry = targetMap[instKey];
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

    const tdsSettings = await getTdsSettings(db);
    const defaultGstRate = tdsSettings.gst_tds_rate;
    const defaultItRate = tdsSettings.it_tds_rate;

    // Helper to build a distinct slice (STATE or CENTRE) for a Unit
    const buildSlice = (u, fundType, instMap, pkts, amount) => {
      const pRecKey = `${u.unit_id}_${fundType}`;
      const pRec = paymentMap[pRecKey] || (fundType === 'STATE' ? paymentMap[u.unit_id] : null);
      const instList = Object.values(instMap).sort((a, b) => (a.institution_name || '').localeCompare(b.institution_name || ''));
      const grossAmount = amount;

      const gstRate = pRec?.gst_tds_rate !== undefined && pRec?.gst_tds_rate !== null ? Number(pRec.gst_tds_rate) : defaultGstRate;
      const itRate = pRec?.it_tds_rate !== undefined && pRec?.it_tds_rate !== null ? Number(pRec.it_tds_rate) : defaultItRate;

      // Calculate statutory TDS deductions (default 2% GST TDS + 2% IT TDS)
      const calculatedGstTds = Math.round((grossAmount * (gstRate || 2.0) / 100) * 100) / 100;
      const calculatedItTds = Math.round((grossAmount * (itRate || 2.0) / 100) * 100) / 100;

      const gstTdsAmount = (pRec?.gst_tds_amount !== undefined && pRec?.gst_tds_amount !== null && Number(pRec.gst_tds_amount) > 0)
        ? Number(pRec.gst_tds_amount)
        : calculatedGstTds;

      const itTdsAmount = (pRec?.it_tds_amount !== undefined && pRec?.it_tds_amount !== null && Number(pRec.it_tds_amount) > 0)
        ? Number(pRec.it_tds_amount)
        : calculatedItTds;

      const otherDeductions = Number(pRec?.other_deductions || 0);
      const calculatedTotalDeductions = Math.round((gstTdsAmount + itTdsAmount + otherDeductions) * 100) / 100;

      const totalDeductions = (pRec?.total_deductions !== undefined && pRec?.total_deductions !== null && Number(pRec.total_deductions) > 0)
        ? Number(pRec.total_deductions)
        : calculatedTotalDeductions;

      const expectedNetCredit = Math.max(0, Math.round((grossAmount - totalDeductions) * 100) / 100);

      const isPaid = pRec?.payment_status === 'PAID';
      const isSubmittedToPcda = Number(pRec?.submitted_to_pcda || 0) === 1 || pRec?.payment_status === 'SUBMITTED_TO_PCDA';

      const netCreditAmount = (pRec?.net_credit_amount !== undefined && pRec?.net_credit_amount !== null && Number(pRec.net_credit_amount) > 0)
        ? Number(pRec.net_credit_amount)
        : (isPaid && Number(pRec?.paid_amount) > 0 ? Number(pRec.paid_amount) : expectedNetCredit);

      const paidAmount = Number(pRec?.paid_amount || 0);
      const paymentStatus = isPaid ? 'PAID' : (isSubmittedToPcda ? 'SUBMITTED_TO_PCDA' : 'PENDING');
      const balanceAmount = isPaid ? 0 : grossAmount;

      return {
        id: `${u.unit_id}_${fundType}`,
        row_key: `${u.unit_id}_${fundType}`,
        unit_id: u.unit_id,
        funding_type: fundType,
        funding_label: fundType === 'CENTRE' ? 'CENTRE FUND' : 'STATE FUND',
        unit_name: u.unit_name,
        unit_code: u.unit_code,
        location: u.location,
        ncc_group: u.ncc_group,
        month: u.month,
        month_label: u.month_label,
        institutions_count: instList.length,
        total_packets: pkts,
        total_amount: grossAmount,
        gross_amount: grossAmount,
        gst_tds_rate: gstRate,
        gst_tds_amount: gstTdsAmount,
        it_tds_rate: itRate,
        it_tds_amount: itTdsAmount,
        other_deductions: otherDeductions,
        total_deductions: totalDeductions,
        expected_net_credit: expectedNetCredit,
        net_credit_amount: netCreditAmount,
        paid_amount: paidAmount,
        balance_amount: balanceAmount,
        payment_status: paymentStatus,
        submitted_to_pcda: isSubmittedToPcda ? 1 : 0,
        pcda_submission_date: pRec?.pcda_submission_date || null,
        pcda_letter_ref: pRec?.pcda_letter_ref || '',
        vendor_verified: Number(pRec?.vendor_verified || 0),
        vendor_verified_at: pRec?.vendor_verified_at || null,
        payment_advice_url: pRec?.payment_advice_url || null,
        payment_date: pRec?.payment_date || null,
        payment_mode: pRec?.payment_mode || '',
        payment_ref: pRec?.payment_ref || '',
        remarks: pRec?.remarks || '',
        registered_by: pRec?.registered_by || null,
        updated_at: pRec?.updated_at || null,
        institutions: instList
      };
    };

    // 6. Shape final response: Generate TWO rows per Unit (One for STATE and One for CENTRE)
    const result = [];
    Object.values(unitDataMap).forEach(u => {
      const masterCountsForUnit = unitMasterCounts[u.unit_id] || { STATE: 0, CENTRE: 0 };
      const hasStateDemands = u.state_packets > 0 || Object.keys(u.state_institutions_map).length > 0;
      const hasCentreDemands = u.centre_packets > 0 || Object.keys(u.centre_institutions_map).length > 0;
      const hasStatePayment = !!paymentMap[`${u.unit_id}_STATE`] || !!paymentMap[u.unit_id];
      const hasCentrePayment = !!paymentMap[`${u.unit_id}_CENTRE`];

      // Include STATE row if unit has state demands, state payment, or registered state institutions
      const includeState = hasStateDemands || hasStatePayment || masterCountsForUnit.STATE > 0 || (!hasCentreDemands && !hasCentrePayment);
      // Include CENTRE row if unit has centre demands, centre payment, or registered centre institutions (APS/Sainik)
      const includeCentre = hasCentreDemands || hasCentrePayment || masterCountsForUnit.CENTRE > 0;

      if (includeState) {
        result.push(buildSlice(u, 'STATE', u.state_institutions_map, u.state_packets, u.state_amount));
      }
      if (includeCentre) {
        result.push(buildSlice(u, 'CENTRE', u.centre_institutions_map, u.centre_packets, u.centre_amount));
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Fetch unit payments error:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve unit payments.' });
  }
});

// POST /api/refreshment-bills/unit-pcda-submit (Unit records that monthly bill is submitted to PCDA)
router.post('/unit-pcda-submit', authenticateToken, authorizeRoles('UNIT', 'ADMIN'), async (req, res) => {
  try {
    const db = await getDB();
    await ensureBillColumns(db);
    const unitId = req.user.role === 'UNIT' ? req.user.unit_id : req.body.unit_id;
    const { month, submission_date, letter_ref, remarks, gross_amount, gst_tds_amount, it_tds_amount, total_deductions, net_credit_amount, funding_type } = req.body;

    if (!unitId || !month) {
      return res.status(400).json({ error: 'unit_id and month are required.' });
    }

    const effectiveFunding = (funding_type === 'CENTRE' || funding_type === 'STATE') ? funding_type : 'STATE';
    const subDate = submission_date || new Date().toISOString().split('T')[0];
    const existing = await db.get(
      'SELECT id, payment_status FROM unit_monthly_payments WHERE unit_id = ? AND month = ? AND funding_type = ?',
      [unitId, month, effectiveFunding]
    );

    const gross = Number(gross_amount) || 0;
    const gstTds = Number(gst_tds_amount) || (gross > 0 ? Math.round((gross * 2 / 100) * 100) / 100 : 0);
    const itTds = Number(it_tds_amount) || (gross > 0 ? Math.round((gross * 2 / 100) * 100) / 100 : 0);
    const totDeduct = Number(total_deductions) || (gstTds + itTds);
    const netCredit = Number(net_credit_amount) || (gross > 0 ? Math.max(0, gross - totDeduct) : 0);

    if (existing) {
      const nextStatus = existing.payment_status === 'PAID' ? 'PAID' : 'SUBMITTED_TO_PCDA';
      await db.run(
        `UPDATE unit_monthly_payments
         SET submitted_to_pcda = 1,
             pcda_submission_date = ?,
             pcda_letter_ref = ?,
             gross_amount = CASE WHEN ? > 0 THEN ? ELSE gross_amount END,
             gst_tds_amount = CASE WHEN ? > 0 THEN ? ELSE gst_tds_amount END,
             it_tds_amount = CASE WHEN ? > 0 THEN ? ELSE it_tds_amount END,
             total_deductions = CASE WHEN ? > 0 THEN ? ELSE total_deductions END,
             net_credit_amount = CASE WHEN ? > 0 THEN ? ELSE net_credit_amount END,
             remarks = COALESCE(?, remarks),
             payment_status = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          subDate, letter_ref || null,
          gross, gross,
          gstTds, gstTds,
          itTds, itTds,
          totDeduct, totDeduct,
          netCredit, netCredit,
          remarks || null, nextStatus, existing.id
        ]
      );
    } else {
      await db.run(
        `INSERT INTO unit_monthly_payments (
           unit_id, month, funding_type, submitted_to_pcda, pcda_submission_date,
           pcda_letter_ref, gross_amount, gst_tds_amount, it_tds_amount,
           total_deductions, net_credit_amount, remarks, payment_status
         ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED_TO_PCDA')`,
        [
          unitId, month, effectiveFunding, subDate, letter_ref || null,
          gross, gstTds, itTds, totDeduct, netCredit, remarks || null
        ]
      );
    }

    res.json({
      success: true,
      message: `Monthly bill for ${effectiveFunding} FUND marked as submitted to PCDA successfully.`
    });
  } catch (error) {
    console.error('PCDA submit error:', error);
    res.status(500).json({ error: error.message || 'Failed to record PCDA submission.' });
  }
});

// POST /api/refreshment-bills/upload-advice (Vendor uploads bank payment advice / credit proof)
router.post('/upload-advice', authenticateToken, authorizeRoles('ADMIN'), uploadReceipt.single('document'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  const fileUrl = getFileUrl(req, req.file);
  res.json({ url: fileUrl });
});

// POST /api/refreshment-bills/verify-vendor-credit (Admin/Vendor confirms received bank credit from PCDA)
router.post('/verify-vendor-credit', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const db = await getDB();
    await ensureBillColumns(db);
    const {
      unit_id, month, paid_amount, payment_date, payment_mode,
      payment_ref, payment_advice_url, other_deductions, remarks,
      gst_tds_amount, it_tds_amount, gross_amount, funding_type
    } = req.body;

    if (!unit_id || !month) {
      return res.status(400).json({ error: 'unit_id and month are required.' });
    }

    const unit = await db.get('SELECT id, unit_name FROM units WHERE id = ?', [unit_id]);
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found.' });
    }

    const effectiveFunding = (funding_type === 'CENTRE' || funding_type === 'STATE') ? funding_type : 'STATE';
    const gross = Number(gross_amount) || 0;
    const netAmount = Number(paid_amount) || 0;
    const otherDeduct = Number(other_deductions) || 0;
    const gstTds = Number(gst_tds_amount) || 0;
    const itTds = Number(it_tds_amount) || 0;
    const totalDeduct = gstTds + itTds + otherDeduct;
    const today = new Date().toISOString().split('T')[0];
    const pDate = payment_date || today;

    const existing = await db.get(
      'SELECT id FROM unit_monthly_payments WHERE unit_id = ? AND month = ? AND funding_type = ?',
      [unit_id, month, effectiveFunding]
    );

    if (existing) {
      await db.run(
        `UPDATE unit_monthly_payments
         SET payment_status = 'PAID',
             gross_amount = COALESCE(?, gross_amount),
             paid_amount = ?,
             net_credit_amount = ?,
             gst_tds_amount = ?,
             it_tds_amount = ?,
             other_deductions = ?,
             total_deductions = ?,
             payment_date = ?,
             payment_mode = ?,
             payment_ref = ?,
             payment_advice_url = COALESCE(?, payment_advice_url),
             remarks = ?,
             vendor_verified = 1,
             vendor_verified_at = CURRENT_TIMESTAMP,
             registered_by = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          gross > 0 ? gross : null,
          netAmount, netAmount, gstTds, itTds, otherDeduct, totalDeduct,
          pDate, payment_mode || 'NEFT / RTGS (Bank Transfer)', payment_ref || null,
          payment_advice_url || null, remarks || null, req.user.id, existing.id
        ]
      );
    } else {
      await db.run(
        `INSERT INTO unit_monthly_payments (
           unit_id, month, funding_type, payment_status, gross_amount, paid_amount, net_credit_amount,
           gst_tds_amount, it_tds_amount, other_deductions, total_deductions,
           payment_date, payment_mode, payment_ref, payment_advice_url,
           remarks, vendor_verified, vendor_verified_at, registered_by
         ) VALUES (?, ?, ?, 'PAID', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, ?)`,
        [
          unit_id, month, effectiveFunding, gross, netAmount, netAmount, gstTds, itTds, otherDeduct, totalDeduct,
          pDate, payment_mode || 'NEFT / RTGS (Bank Transfer)', payment_ref || null,
          payment_advice_url || null, remarks || null, req.user.id
        ]
      );
    }

    res.json({
      success: true,
      message: `Bank credit confirmed for ${unit.unit_name} [${effectiveFunding} FUND] (${formatMonthLabel(month)}).`
    });
  } catch (error) {
    console.error('Verify credit error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify bank credit.' });
  }
});

// POST /api/refreshment-bills/unit-payments - Admin registers/records Unit payment for a month
router.post('/unit-payments', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const db = await getDB();
    await ensureBillColumns(db);
    const {
      unit_id, month, payment_status, paid_amount,
      payment_date, payment_mode, payment_ref, remarks, funding_type
    } = req.body;

    if (!unit_id || !month) {
      return res.status(400).json({ error: 'unit_id and month are required.' });
    }

    const unit = await db.get('SELECT id, unit_name FROM units WHERE id = ?', [unit_id]);
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found.' });
    }

    const effectiveFunding = (funding_type === 'CENTRE' || funding_type === 'STATE') ? funding_type : 'STATE';
    const status = payment_status || 'PENDING';
    const amount = Number(paid_amount) || 0;
    const today = new Date().toISOString().split('T')[0];
    const pDate = status !== 'PENDING' ? (payment_date || today) : null;

    const existing = await db.get(
      'SELECT id FROM unit_monthly_payments WHERE unit_id = ? AND month = ? AND funding_type = ?',
      [unit_id, month, effectiveFunding]
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
           unit_id, month, funding_type, payment_status, paid_amount, payment_date,
           payment_mode, payment_ref, remarks, registered_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          unit_id, month, effectiveFunding, status, amount, pDate,
          payment_mode || null, payment_ref || null, remarks || null, req.user.id
        ]
      );
    }

    // Sync to all institutions under this unit for this month in refreshment_bills matching this funding_type
    const instRows = await db.all(
      `SELECT DISTINCT d.institution_id
       FROM demands d
       JOIN institutions i ON d.institution_id = i.id
       WHERE d.is_deleted = 0
         AND d.unit_id = ?
         AND LEFT(d.demand_date, 7) = ?
         AND COALESCE(i.institution_type, 'STATE') = ?`,
      [unit_id, month, effectiveFunding]
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
