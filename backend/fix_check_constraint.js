const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run('PRAGMA foreign_keys=off;');
  db.run('BEGIN TRANSACTION;');
  
  db.run(`
    CREATE TABLE IF NOT EXISTS demands_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      demand_number TEXT NOT NULL UNIQUE,
      institution_id INTEGER,
      unit_id INTEGER NOT NULL,
      raised_by INTEGER NOT NULL,
      demand_date TEXT NOT NULL,
      demand_time TEXT DEFAULT '08:00',
      purpose TEXT NOT NULL,
      status TEXT CHECK(status IN ('PENDING', 'APPROVED', 'ACCEPTED', 'PREPARING', 'READY_FOR_DISPATCH', 'DELIVERED', 'REJECTED', 'CANCELLED', 'FULFILLED')) DEFAULT 'PENDING',
      reviewed_by INTEGER,
      review_remarks TEXT,
      reviewed_at DATETIME,
      accepted_by INTEGER,
      accepted_at DATETIME,
      delivery_receipt_url TEXT,
      invoice_url TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      fulfilled_by INTEGER,
      fulfilled_at DATETIME,
      delivery_partner_id INTEGER,
      delivery_partner_name TEXT,
      delivery_partner_phone TEXT,
      delivery_partner_vehicle TEXT,
      delivery_status TEXT DEFAULT 'PENDING',
      dispatched_at DATETIME,
      delivered_at DATETIME,
      delivery_notes TEXT,
      delivery_rejection_reason TEXT,
      bill_collection_status TEXT,
      bill_collection_notes TEXT,
      invoice_no TEXT,
      invoice_date TEXT,
      start_km_reading REAL,
      closing_km_reading REAL,
      total_km REAL,
      demand_type TEXT DEFAULT 'INSTITUTION',
      packet_type TEXT DEFAULT 'REGULAR',
      custom_unit_rate REAL,
      delivery_venue TEXT,
      FOREIGN KEY (institution_id) REFERENCES institutions (id),
      FOREIGN KEY (unit_id) REFERENCES units (id),
      FOREIGN KEY (raised_by) REFERENCES users (id),
      FOREIGN KEY (reviewed_by) REFERENCES users (id),
      FOREIGN KEY (accepted_by) REFERENCES users (id)
    )
  `);

  db.run('INSERT INTO demands_new SELECT * FROM demands;');
  db.run('DROP TABLE demands;');
  db.run('ALTER TABLE demands_new RENAME TO demands;');
  
  db.run('COMMIT;', (err) => {
    if (err) console.error('Migration failed:', err);
    else console.log('Migration completed successfully.');
    db.run('PRAGMA foreign_keys=on;');
    db.close();
  });
});
