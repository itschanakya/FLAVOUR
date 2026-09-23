const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.sqlite');

db.serialize(() => {
  console.log('Starting foreign keys repair...');

  // 1. Disable FKs during table rebuild
  db.run('PRAGMA foreign_keys = OFF;');

  // 2. Rebuild demand_items
  db.run(`
    CREATE TABLE demand_items_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      demand_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      year_group TEXT CHECK(year_group IN ('1st Year', '2nd Year', '3rd Year')) NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_snapshot REAL NOT NULL,
      FOREIGN KEY (demand_id) REFERENCES demands(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES refreshment_items(id)
    );
  `);
  db.run(`INSERT INTO demand_items_new SELECT * FROM demand_items;`);
  db.run(`DROP TABLE demand_items;`);
  db.run(`ALTER TABLE demand_items_new RENAME TO demand_items;`);
  console.log('demand_items rebuilt successfully.');

  // 3. Rebuild demand_activity
  db.run(`
    CREATE TABLE demand_activity_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      demand_id INTEGER NOT NULL,
      user_id INTEGER,
      action_type TEXT NOT NULL CHECK( action_type IN ('STATUS_CHANGE', 'MESSAGE') ),
      old_status TEXT,
      new_status TEXT,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (demand_id) REFERENCES demands(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  db.run(`INSERT INTO demand_activity_new SELECT * FROM demand_activity;`);
  db.run(`DROP TABLE demand_activity;`);
  db.run(`ALTER TABLE demand_activity_new RENAME TO demand_activity;`);
  console.log('demand_activity rebuilt successfully.');

  // 4. Rebuild grievances
  db.run(`
    CREATE TABLE grievances_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_no TEXT UNIQUE NOT NULL,
      institution_id INTEGER,
      unit_id INTEGER NOT NULL,
      demand_id INTEGER,
      initiated_by TEXT NOT NULL DEFAULT 'ANO',
      created_by_user_id INTEGER NOT NULL,
      category TEXT NOT NULL DEFAULT 'QUALITY',
      severity TEXT NOT NULL DEFAULT 'MEDIUM',
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      photo_url TEXT,
      status TEXT NOT NULL DEFAULT 'SUBMITTED_TO_UNIT',
      unit_remarks TEXT,
      forwarded_to_vendor_at DATETIME,
      forwarded_by_user_id INTEGER,
      vendor_remarks TEXT,
      vendor_action_at DATETIME,
      resolved_at DATETIME,
      resolved_by_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL,
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
      FOREIGN KEY (demand_id) REFERENCES demands(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id),
      FOREIGN KEY (forwarded_by_user_id) REFERENCES users(id),
      FOREIGN KEY (resolved_by_user_id) REFERENCES users(id)
    );
  `);
  db.run(`INSERT INTO grievances_new SELECT * FROM grievances;`);
  db.run(`DROP TABLE grievances;`);
  db.run(`ALTER TABLE grievances_new RENAME TO grievances;`);
  console.log('grievances rebuilt successfully.');

  // 5. Re-enable foreign keys
  db.run('PRAGMA foreign_keys = ON;');

  // 6. Verify FK integrity
  db.all('PRAGMA foreign_key_check;', (err, rows) => {
    if (err) {
      console.error('FK check error:', err);
    } else {
      console.log('Foreign key check result (should be empty):', rows);
    }
    db.close();
  });
});
