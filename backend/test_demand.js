const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.sqlite');
db.all("SELECT id, demand_number, institution_id, demand_type FROM demands WHERE demand_number LIKE 'DEM-2026%';", (err, rows) => {
  if (err) console.error(err);
  console.log(rows);
});
