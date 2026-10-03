require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getDB } = require('./database');

const APPLY = process.argv.includes('--apply');

(async () => {
  const db = await getDB();

  // Every table that references demands
  const cols = await db.all(
    `SELECT table_name AS t, column_name AS c FROM information_schema.columns
     WHERE table_schema = DATABASE() AND column_name IN ('demand_id')`
  );
  console.log('Tables with demand_id:', cols.map(x => `${x.t}.${x.c}`).join(', '));

  const toDelete = await db.all(
    `SELECT id, demand_number FROM demands
     WHERE demand_number LIKE 'DEM-2026-%' AND CAST(SUBSTRING_INDEX(demand_number,'-',-1) AS UNSIGNED) BETWEEN 1 AND 22
     ORDER BY id`
  );
  const keep = await db.all(
    `SELECT id, demand_number FROM demands
     WHERE demand_number LIKE 'DEM-2026-%' AND CAST(SUBSTRING_INDEX(demand_number,'-',-1) AS UNSIGNED) >= 23
     ORDER BY CAST(SUBSTRING_INDEX(demand_number,'-',-1) AS UNSIGNED)`
  );
  console.log(`To delete: ${toDelete.length}, to keep/renumber: ${keep.length}`);
  if (!APPLY) { console.log('DRY RUN. Re-run with --apply.'); process.exit(0); }

  const ids = toDelete.map(d => d.id);
  const ph = ids.map(() => '?').join(',');

  // Backup
  const backup = { demands: await db.all(`SELECT * FROM demands WHERE id IN (${ph})`, ids) };
  for (const { t } of cols) {
    backup[t] = await db.all(`SELECT * FROM \`${t}\` WHERE demand_id IN (${ph})`, ids);
  }
  backup.audit_logs = await db.all(`SELECT * FROM audit_logs WHERE entity_type='DEMAND' AND entity_id IN (${ph})`, ids);
  const file = path.join(__dirname, `demands_backup_${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log('Backup written:', file);

  // Delete children, then demands
  for (const { t } of cols) {
    const r = await db.run(`DELETE FROM \`${t}\` WHERE demand_id IN (${ph})`, ids);
    console.log(`Deleted ${r.changes} from ${t}`);
  }
  const a = await db.run(`DELETE FROM audit_logs WHERE entity_type='DEMAND' AND entity_id IN (${ph})`, ids);
  console.log(`Deleted ${a.changes} audit_logs`);
  const d = await db.run(`DELETE FROM demands WHERE id IN (${ph})`, ids);
  console.log(`Deleted ${d.changes} demands`);

  // Renumber 023.. -> 001.. in ascending order (no collisions since 001-022 are gone)
  let n = 1;
  for (const k of keep) {
    const newNo = `DEM-2026-${String(n).padStart(3, '0')}`;
    await db.run('UPDATE demands SET demand_number = ? WHERE id = ?', [newNo, k.id]);
    console.log(`${k.demand_number} -> ${newNo}`);
    n++;
  }
  console.log('Done.');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
