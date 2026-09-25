const fs = require('fs');
require('dotenv').config();
const { getDB } = require('./database');

async function dumpDatabase() {
  const db = await getDB();
  const tables = [
    'users',
    'units',
    'institutions',
    'refreshment_items',
    'packet_templates',
    'packet_template_items',
    'demands',
    'demand_items',
    'demand_activity',
    'delivery_partners',
    'driver_daily_logs',
    'refreshment_bills',
    'bill_collection_events',
    'grievances',
    'grievance_activity',
    'notifications',
    'audit_logs',
    'item_stock_logs'
  ];

  let sql = `-- =====================================================================
-- NCC CADETS REFRESHMENT MANAGEMENT SYSTEM
-- FULL DATABASE SCHEMA & MASTER SEED DUMP
-- Generated on: ${new Date().toISOString()}
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";

`;

  // 1. Table Schemas
  for (const t of tables) {
    try {
      const createRes = await db.all(`SHOW CREATE TABLE \`${t}\``);
      if (createRes && createRes[0]) {
        const createSql = createRes[0]['Create Table'] || createRes[0]['Create Table\n'];
        sql += `-- -----------------------------------------------------\n`;
        sql += `-- Table structure for \`${t}\`\n`;
        sql += `-- -----------------------------------------------------\n`;
        sql += `DROP TABLE IF EXISTS \`${t}\`;\n`;
        sql += `${createSql};\n\n`;
      }
    } catch (e) {
      console.error(`Error dumping schema for table ${t}:`, e.message);
    }
  }

  // 2. Master Seed Data (master configuration, units, institutions, items, templates, drivers)
  const seedTables = ['units', 'institutions', 'refreshment_items', 'packet_templates', 'packet_template_items', 'delivery_partners'];
  
  sql += `-- =====================================================================\n`;
  sql += `-- MASTER SEED DATA\n`;
  sql += `-- =====================================================================\n\n`;

  for (const t of seedTables) {
    try {
      const rows = await db.all(`SELECT * FROM \`${t}\``);
      if (rows && rows.length > 0) {
        sql += `-- Dumping seed data for \`${t}\` (${rows.length} rows)\n`;
        for (const row of rows) {
          const cols = Object.keys(row);
          const vals = cols.map(c => {
            const v = row[c];
            if (v === null || v === undefined) return 'NULL';
            if (typeof v === 'number') return v;
            const escaped = String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            return `'${escaped}'`;
          });
          sql += `INSERT INTO \`${t}\` (\`${cols.join('`, `')}\`) VALUES (${vals.join(', ')}) ON DUPLICATE KEY UPDATE \`id\`=\`id\`;\n`;
        }
        sql += `\n`;
      }
    } catch (e) {
      console.error(`Error dumping seed data for table ${t}:`, e.message);
    }
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;

  fs.writeFileSync('database_schema.sql', sql, 'utf8');
  console.log(`✅ Successfully generated database_schema.sql (${sql.length} bytes)`);
  process.exit(0);
}

dumpDatabase().catch(err => {
  console.error('Fatal dump error:', err);
  process.exit(1);
});
