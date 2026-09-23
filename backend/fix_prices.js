const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run(
    `UPDATE demand_items SET unit_price_snapshot = 75.0`,
    [],
    function(err) {
      if (err) {
        console.error('Error updating records:', err.message);
      } else {
        console.log(`Successfully updated ${this.changes} records in demand_items to fixed 75 rate.`);
      }
    }
  );
});

db.close();
