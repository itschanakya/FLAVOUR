const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

async function migrate() {
  const db = await open({
    filename: path.join(__dirname, 'data.sqlite'),
    driver: sqlite3.Database
  });

  try {
    // Demands new columns
    try {
      await db.run('ALTER TABLE demands ADD COLUMN accepted_by INTEGER REFERENCES users(id)');
      console.log('Added accepted_by to demands');
    } catch(e) { console.log('accepted_by exists'); }

    try {
      await db.run('ALTER TABLE demands ADD COLUMN accepted_at DATETIME');
      console.log('Added accepted_at to demands');
    } catch(e) { console.log('accepted_at exists'); }
    
    try {
      await db.run('ALTER TABLE demands ADD COLUMN invoice_url TEXT');
      console.log('Added invoice_url to demands');
    } catch(e) { console.log('invoice_url exists'); }

    // New tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS demand_activity (
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

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT 0,
        link_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS bill_collection_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER NOT NULL,
        event_date DATE NOT NULL,
        event_time TEXT NOT NULL,
        message TEXT,
        status TEXT DEFAULT 'SCHEDULED' CHECK( status IN ('SCHEDULED', 'DELAYED', 'COMPLETED', 'CANCELLED') ),
        target_pin_codes TEXT, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id)
      );
    `);
    console.log('New tables created.');

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await db.close();
  }
}

migrate();
