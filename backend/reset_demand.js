require('dotenv').config();
const { getDB } = require('./database');

async function main() {
  const demandArg = process.argv[2];
  if (!demandArg) {
    console.log('\n❌ Usage: node reset_demand.js <DEMAND_NUMBER_OR_ID>');
    console.log('   Example: node reset_demand.js DEM-2026-065\n');
    process.exit(1);
  }

  const db = await getDB();
  const query = isNaN(demandArg)
    ? 'SELECT * FROM demands WHERE demand_number = ? AND is_deleted = 0'
    : 'SELECT * FROM demands WHERE (id = ? OR demand_number = ?) AND is_deleted = 0';
  const params = isNaN(demandArg) ? [demandArg.trim()] : [parseInt(demandArg), demandArg.trim()];

  const demand = await db.get(query, params);
  if (!demand) {
    console.error(`\n❌ Error: Demand "${demandArg}" was not found in the database.\n`);
    process.exit(1);
  }

  console.log(`\nFound Demand #${demand.id} (${demand.demand_number}):`);
  console.log(`- Current Demand Status   : ${demand.status}`);
  console.log(`- Current Delivery Status : ${demand.delivery_status || 'PENDING'}`);
  console.log(`- Current Delivery Mode   : ${demand.delivery_mode || 'DRIVER'}`);
  console.log(`- Delivery Partner Name   : ${demand.delivery_partner_name || 'None'}`);

  await db.run(
    `UPDATE demands
     SET status = 'READY_FOR_DISPATCH',
         delivery_status = 'PENDING',
         delivery_mode = 'DRIVER',
         delivery_partner_id = NULL,
         delivery_partner_name = NULL,
         delivery_partner_phone = NULL,
         delivery_partner_vehicle = NULL,
         dispatched_at = NULL,
         delivered_at = NULL,
         delivery_notes = '',
         delivery_rejection_reason = NULL,
         start_km_reading = NULL,
         closing_km_reading = NULL,
         total_km = NULL,
         delivery_receipt_url = NULL,
         delivery_sequence = 0
     WHERE id = ?`,
    [demand.id]
  );

  // Activity log
  try {
    await db.run(
      'INSERT INTO demand_activity (demand_id, user_id, action_type, old_status, new_status, message) VALUES (?, ?, ?, ?, ?, ?)',
      [
        demand.id,
        1,
        'STATUS_CHANGE',
        demand.delivery_status || 'DELIVERED',
        'PENDING',
        'Reverted delivery assignment and status back to initial state (Ready for Dispatch / Pending).'
      ]
    );
  } catch (e) {}

  // Audit log
  try {
    await db.run(
      'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
      ['DEMAND', demand.id, 'DELIVERY_RESET', 1, `Reverted delivery for ${demand.demand_number}. Reset to initial state.`]
    );
  } catch (e) {}

  console.log(`\n✅ Successfully reverted ${demand.demand_number}!`);
  console.log(`- Status is now: READY_FOR_DISPATCH`);
  console.log(`- Delivery Status is now: PENDING (Ready for Dispatch)`);
  console.log(`- Delivery Partner / Mode: Cleared to initial state\n`);
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Execution error:', err);
  process.exit(1);
});
