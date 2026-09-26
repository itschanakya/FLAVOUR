const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// ─── Helper: Get today's expected reset password ─────────────────────────────
// Format: Jadugar + DDMMYYYY  (e.g. Jadugar26092026)
function getTodayPassword() {
  const now = new Date();
  const dd   = String(now.getDate()).padStart(2, '0');
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `Jadugar${dd}${mm}${yyyy}`;
}

// ─── All routes require ADMIN auth ────────────────────────────────────────────
router.use(authenticateToken, authorizeRoles('ADMIN'));

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/backup/export
// Returns a full JSON snapshot of every important table in the database.
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/backup/export', async (req, res) => {
  try {
    const db = await getDB();

    const tables = [
      'units',
      'institutions',
      'users',
      'refreshment_items',
      'demands',
      'demand_items',
      'demand_activity',
      'notifications',
      'bill_collection_events',
      'audit_logs',
      'refreshment_bills',
      'item_stock_logs',
      'packet_templates',
      'packet_template_items',
      'stock_demand_indents',
      'stock_demand_indent_items',
      'delivery_partners',
      'delivery_routes',
      'km_logs',
    ];

    const backup = {
      exported_at: new Date().toISOString(),
      version: '1.0',
      tables: {}
    };

    for (const table of tables) {
      try {
        const rows = await db.all(`SELECT * FROM \`${table}\``);
        backup.tables[table] = rows;
      } catch (e) {
        // Table may not exist yet — skip gracefully
        backup.tables[table] = [];
      }
    }

    const filename = `refreshment-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(backup);
  } catch (err) {
    console.error('Backup export error:', err);
    res.status(500).json({ error: 'Failed to export backup: ' + err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/admin/backup/import
// Body: { backup: <JSON string or object from export> }
// Restores data from a previously exported backup file.
// WARNING: This REPLACES existing data in each table included in the backup.
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/backup/import', async (req, res) => {
  try {
    const db = await getDB();
    let backup = req.body.backup;

    if (typeof backup === 'string') {
      try { backup = JSON.parse(backup); } catch {
        return res.status(400).json({ error: 'Invalid JSON in backup file.' });
      }
    }

    if (!backup || !backup.tables) {
      return res.status(400).json({ error: 'Invalid backup format. Missing "tables" key.' });
    }

    // Import order respects FK dependencies
    const importOrder = [
      'units',
      'institutions',
      'users',
      'refreshment_items',
      'packet_templates',
      'packet_template_items',
      'demands',
      'demand_items',
      'demand_activity',
      'notifications',
      'bill_collection_events',
      'audit_logs',
      'refreshment_bills',
      'item_stock_logs',
      'stock_demand_indents',
      'stock_demand_indent_items',
      'delivery_partners',
      'delivery_routes',
      'km_logs',
    ];

    const stats = {};

    for (const table of importOrder) {
      const rows = backup.tables[table];
      if (!Array.isArray(rows) || rows.length === 0) {
        stats[table] = { skipped: true, reason: 'no data in backup' };
        continue;
      }

      try {
        // Clear existing rows
        await db.run(`DELETE FROM \`${table}\``);

        // Re-insert from backup
        let inserted = 0;
        for (const row of rows) {
          const cols = Object.keys(row);
          if (cols.length === 0) continue;
          const placeholders = cols.map(() => '?').join(', ');
          const colNames = cols.map(c => `\`${c}\``).join(', ');
          const values = cols.map(c => row[c]);
          try {
            await db.run(
              `INSERT INTO \`${table}\` (${colNames}) VALUES (${placeholders})`,
              values
            );
            inserted++;
          } catch (rowErr) {
            // Skip conflicting rows, continue
          }
        }
        stats[table] = { inserted, total: rows.length };
      } catch (tableErr) {
        stats[table] = { error: tableErr.message };
      }
    }

    res.json({
      success: true,
      message: 'Backup imported successfully.',
      imported_at: new Date().toISOString(),
      stats
    });
  } catch (err) {
    console.error('Backup import error:', err);
    res.status(500).json({ error: 'Failed to import backup: ' + err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/admin/demands/reset
// Body: { password: "Jadugar26092026" }
// Soft-deletes ALL demands (is_deleted = 1) — they move to deleted records.
// Password changes every day: Jadugar + DDMMYYYY
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/demands/reset', async (req, res) => {
  try {
    const { password } = req.body;
    const expected = getTodayPassword();

    if (!password || password !== expected) {
      return res.status(403).json({
        error: 'Incorrect password. The reset password changes daily.',
        hint: "Format: Jadugar + today's date (DDMMYYYY)"
      });
    }

    const db = await getDB();

    // Count before reset
    const before = await db.get('SELECT COUNT(*) as count FROM demands WHERE is_deleted = 0');

    // Soft-delete: mark all active demands as deleted
    await db.run('UPDATE demands SET is_deleted = 1 WHERE is_deleted = 0');

    // Log the reset action in audit_logs
    try {
      await db.run(
        `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details, timestamp)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          'demands',
          0,
          'MASS_RESET',
          req.user.id,
          `Admin reset all demands. ${before?.count || 0} demands moved to deleted records.`
        ]
      );
    } catch (logErr) {
      // Audit log failure is non-fatal
    }

    res.json({
      success: true,
      message: `All demands have been reset. ${before?.count || 0} demand(s) moved to deleted records.`,
      demands_archived: before?.count || 0,
      reset_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Demand reset error:', err);
    res.status(500).json({ error: 'Failed to reset demands: ' + err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/demands/reset/hint
// Returns today's date portion of the password (for reference/debugging)
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/demands/reset/hint', async (req, res) => {
  const now = new Date();
  const dd   = String(now.getDate()).padStart(2, '0');
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  res.json({
    hint: `Password format: Jadugar + DDMMYYYY`,
    today_date_part: `${dd}${mm}${yyyy}`,
    note: 'The password changes every day at midnight.'
  });
});

module.exports = router;
