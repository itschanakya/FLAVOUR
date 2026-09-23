const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data.sqlite');

db.run(
  "UPDATE demands SET status = 'APPROVED', accepted_by = NULL, accepted_at = NULL WHERE id = 36",
  function (err) {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('Successfully reset Demand 36 to APPROVED. Changes:', this.changes);
    }
    db.all(
      "SELECT id, demand_number, status, institution_id, accepted_by FROM demands WHERE id IN (35, 36)",
      (e, rows) => {
        console.log('Current status of Demands 35 & 36:', rows);
        db.close();
      }
    );
  }
);
