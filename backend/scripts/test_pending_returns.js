require('dotenv').config();
const { getDB } = require('../database');

(async () => {
  try {
    const db = await getDB();
    const instRows = await db.all('SELECT id, institution_name, unit_id FROM institutions LIMIT 10');

    // Simulate my-pending-returns for each institution
    for (const inst of instRows) {
      const instId = inst.id;
      const monthsRows = await db.all(
        `SELECT DISTINCT LEFT(d.demand_date, 7) as month
         FROM demands d
         WHERE d.institution_id = ?
           AND d.is_deleted = 0
           AND d.status NOT IN ('REJECTED', 'CANCELLED')
         ORDER BY month DESC`,
        [instId]
      );
      if (monthsRows.length > 0) {
        console.log(`Inst ${instId} (${inst.institution_name}): months =`, monthsRows.map(m => m.month));
      }
    }
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit(0);
})();
