/**
 * Script to remove all fake/seed demand data for APS SHANKAR VIHAR.
 * Deletes demand_activity, demand_items, demands, and related audit_logs
 * for demands associated with APS SHANKAR VIHAR institution.
 */

require('dotenv').config();
const { getDB } = require('./database');

async function removeFakeDemands() {
  const db = await getDB();

  console.log('🔍 Looking up APS SHANKAR VIHAR institution...');
  const inst = await db.get(
    `SELECT id, institution_name FROM institutions WHERE institution_name = ?`,
    ['APS SHANKAR VIHAR']
  );

  if (!inst) {
    console.log('❌ APS SHANKAR VIHAR institution not found in database.');
    process.exit(0);
  }

  console.log(`✓ Found institution: ${inst.institution_name} (ID: ${inst.id})`);

  // Get all demand IDs for this institution
  const demands = await db.all(
    `SELECT id, demand_number, status FROM demands WHERE institution_id = ?`,
    [inst.id]
  );

  if (demands.length === 0) {
    console.log('ℹ️  No demands found for APS SHANKAR VIHAR. Nothing to delete.');
    process.exit(0);
  }

  console.log(`\n📋 Found ${demands.length} demand(s) to delete:`);
  demands.forEach(d => console.log(`   - ${d.demand_number} [${d.status}] (ID: ${d.id})`));

  const demandIds = demands.map(d => d.id);
  const placeholders = demandIds.map(() => '?').join(',');

  // 1. Delete demand_activity
  const actDel = await db.run(
    `DELETE FROM demand_activity WHERE demand_id IN (${placeholders})`,
    demandIds
  );
  console.log(`\n🗑️  Deleted ${actDel.changes} demand_activity row(s)`);

  // 2. Delete demand_items
  const itemDel = await db.run(
    `DELETE FROM demand_items WHERE demand_id IN (${placeholders})`,
    demandIds
  );
  console.log(`🗑️  Deleted ${itemDel.changes} demand_items row(s)`);

  // 3. Delete related audit_logs for these demands
  const auditDel = await db.run(
    `DELETE FROM audit_logs WHERE entity_type = 'DEMAND' AND entity_id IN (${placeholders})`,
    demandIds
  );
  console.log(`🗑️  Deleted ${auditDel.changes} audit_log row(s)`);

  // 4. Delete demands themselves
  const demDel = await db.run(
    `DELETE FROM demands WHERE id IN (${placeholders})`,
    demandIds
  );
  console.log(`🗑️  Deleted ${demDel.changes} demand(s)`);

  console.log('\n✅ All fake demand data for APS SHANKAR VIHAR has been removed successfully!');
  process.exit(0);
}

removeFakeDemands().catch(err => {
  console.error('❌ Error removing fake demands:', err);
  process.exit(1);
});
