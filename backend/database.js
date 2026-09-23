const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

let dbInstance = null;

class DBWrapper {
  constructor(pool) { this.pool = pool; }
  async get(sql, params) {
    try {
      const [rows] = await this.pool.execute(sql, params || []);
      return rows[0] || null;
    } catch (err) {
      if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET' || err.fatal) {
        const [rows] = await this.pool.execute(sql, params || []);
        return rows[0] || null;
      }
      throw err;
    }
  }
  async all(sql, params) {
    try {
      const [rows] = await this.pool.execute(sql, params || []);
      return rows;
    } catch (err) {
      if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET' || err.fatal) {
        const [rows] = await this.pool.execute(sql, params || []);
        return rows;
      }
      throw err;
    }
  }
  async run(sql, params) {
    try {
      const [result] = await this.pool.execute(sql, params || []);
      return { lastID: result.insertId, changes: result.affectedRows };
    } catch (err) {
      if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET' || err.fatal) {
        const [result] = await this.pool.execute(sql, params || []);
        return { lastID: result.insertId, changes: result.affectedRows };
      }
      throw err;
    }
  }
  async exec(sql) {
    try {
      await this.pool.query(sql);
    } catch (err) {
      if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET' || err.fatal) {
        await this.pool.query(sql);
      } else {
        throw err;
      }
    }
  }
}

let initPromise = null;

async function getDB() {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const pool = mysql.createPool({
      uri: process.env.DATABASE_URL || 'mysql://root:password@127.0.0.1:4000/test',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: true } : undefined
    });

    const instance = new DBWrapper(pool);
    await initializeSchema(instance);
    dbInstance = instance;
    return dbInstance;
  })();

  return initPromise;
}

async function initializeSchema(db) {
  // Fast check: if units table exists, schema is already built - skip redundant migrations
  try {
    const existing = await db.get("SELECT 1 FROM units LIMIT 1");
    if (existing) {
      console.log('✓ Database schema verified. Skipping redundant migrations for instant startup.');
      return;
    }
  } catch (err) {
    // Tables not created yet, proceed with full schema setup
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      unit_name TEXT NOT NULL,
      unit_code VARCHAR(255) UNIQUE NOT NULL,
      location TEXT,
      ncc_group VARCHAR(255) DEFAULT 'Group B',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS institutions (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      unit_id INTEGER NOT NULL,
      institution_name TEXT NOT NULL,
      ano_cto_name TEXT NOT NULL,
      ano_cto_contact TEXT,
      pin_code TEXT,
      strength_1st_year INTEGER DEFAULT 0,
      strength_2nd_year INTEGER DEFAULT 0,
      strength_3rd_year INTEGER DEFAULT 0,
      google_location TEXT,
      complete_address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      name TEXT NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      login_id VARCHAR(255) UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(255) CHECK(role IN ('ADMIN', 'UNIT', 'INSTITUTION')) NOT NULL,
      unit_id INTEGER,
      institution_id INTEGER,
      otp TEXT,
      otp_expiry DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS refreshment_items (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      item_name TEXT NOT NULL,
      unit_price REAL NOT NULL,
      unit_of_measure TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      current_stock INTEGER DEFAULT 100,
      min_threshold INTEGER DEFAULT 10,
      expiry_date TEXT,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS demands (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      demand_number VARCHAR(255) UNIQUE NOT NULL,
      institution_id INTEGER NOT NULL,
      unit_id INTEGER NOT NULL,
      raised_by INTEGER NOT NULL,
      demand_date TEXT NOT NULL,
      demand_time VARCHAR(255) DEFAULT '08:00',
      purpose TEXT NOT NULL,
      status VARCHAR(255) CHECK(status IN ('PENDING', 'APPROVED', 'ACCEPTED', 'PREPARING', 'READY_FOR_DISPATCH', 'DELIVERED', 'REJECTED', 'CANCELLED', 'FULFILLED')) DEFAULT 'PENDING',
      reviewed_by INTEGER,
      review_remarks TEXT,
      reviewed_at DATETIME,
      accepted_by INTEGER,
      accepted_at DATETIME,
      delivery_receipt_url TEXT,
      invoice_url TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (institution_id) REFERENCES institutions(id),
      FOREIGN KEY (unit_id) REFERENCES units(id),
      FOREIGN KEY (raised_by) REFERENCES users(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id),
      FOREIGN KEY (accepted_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS demand_items (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      demand_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      year_group VARCHAR(255) CHECK(year_group IN ('1st Year', '2nd Year', '3rd Year')) NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_snapshot REAL NOT NULL,
      FOREIGN KEY (demand_id) REFERENCES demands(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES refreshment_items(id)
    );

    CREATE TABLE IF NOT EXISTS demand_activity (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      demand_id INTEGER NOT NULL,
      user_id INTEGER,
      action_type VARCHAR(255) NOT NULL CHECK( action_type IN ('STATUS_CHANGE', 'MESSAGE') ),
      old_status TEXT,
      new_status TEXT,
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (demand_id) REFERENCES demands(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT 0,
      link_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bill_collection_events (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      admin_id INTEGER NOT NULL,
      event_date DATE NOT NULL,
      event_time TEXT NOT NULL,
      message TEXT,
      status VARCHAR(255) DEFAULT 'SCHEDULED' CHECK( status IN ('SCHEDULED', 'DELAYED', 'COMPLETED', 'CANCELLED') ),
      target_pin_codes TEXT, 
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      performed_by INTEGER NOT NULL,
      details TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (performed_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS refreshment_bills (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      institution_id INTEGER NOT NULL,
      month VARCHAR(255) NOT NULL,
      bill_submitted INTEGER DEFAULT 0,
      bill_submitted_date TEXT,
      bill_amount REAL DEFAULT 0,
      demand_packets INTEGER DEFAULT 0,
      payment_status VARCHAR(255) CHECK(payment_status IN ('PENDING', 'PROCESSED', 'PAID')) DEFAULT 'PENDING',
      payment_date TEXT,
      payment_ref TEXT,
      remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (institution_id) REFERENCES institutions(id),
      UNIQUE(institution_id, month)
    );
    CREATE TABLE IF NOT EXISTS item_stock_logs (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      item_id INTEGER NOT NULL,
      log_type VARCHAR(255) CHECK(log_type IN ('STOCK_IN', 'CONSUMED', 'ADJUSTMENT')) NOT NULL,
      quantity INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      expiry_date TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      FOREIGN KEY (item_id) REFERENCES refreshment_items(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS packet_templates (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL DEFAULT 'Standard Refreshment Packet',
      target_budget REAL DEFAULT 75.0,
      gst_rate REAL DEFAULT 5.0,
      is_active INTEGER DEFAULT 1,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS packet_template_items (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      template_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      expiry_date TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES packet_templates(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES refreshment_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS grievances (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      ticket_no VARCHAR(255) UNIQUE NOT NULL,
      institution_id INTEGER,
      unit_id INTEGER NOT NULL,
      demand_id INTEGER,
      initiated_by VARCHAR(255) NOT NULL DEFAULT 'ANO',
      created_by_user_id INTEGER NOT NULL,
      category VARCHAR(255) NOT NULL DEFAULT 'QUALITY',
      severity VARCHAR(255) NOT NULL DEFAULT 'MEDIUM',
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      photo_url TEXT,
      status VARCHAR(255) NOT NULL DEFAULT 'SUBMITTED_TO_UNIT',
      unit_remarks TEXT,
      forwarded_to_vendor_at DATETIME,
      forwarded_by_user_id INTEGER,
      vendor_remarks TEXT,
      vendor_action_at DATETIME,
      resolved_at DATETIME,
      resolved_by_user_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL,
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
      FOREIGN KEY (demand_id) REFERENCES demands(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id),
      FOREIGN KEY (forwarded_by_user_id) REFERENCES users(id),
      FOREIGN KEY (resolved_by_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS grievance_activity (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      grievance_id INTEGER NOT NULL,
      user_id INTEGER,
      action_type TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Ensure stock and expiry columns exist in refreshment_items table
  try {
    await db.run("ALTER TABLE refreshment_items ADD COLUMN current_stock INTEGER DEFAULT 100");
  } catch (err) { }
  try {
    await db.run("ALTER TABLE refreshment_items ADD COLUMN min_threshold INTEGER DEFAULT 10");
  } catch (err) { }
  try {
    await db.run("ALTER TABLE refreshment_items ADD COLUMN expiry_date TEXT");
  } catch (err) { }
  try {
    await db.run("ALTER TABLE refreshment_items ADD COLUMN image_url TEXT");
  } catch (err) { }

  // Set default future expiry dates for any existing items that don't have one
  try {
    const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await db.run("UPDATE refreshment_items SET expiry_date = ? WHERE expiry_date IS NULL OR expiry_date = ''", [futureDate]);
    await db.run("UPDATE refreshment_items SET current_stock = 150 WHERE current_stock IS NULL");
  } catch (err) { }

  // Ensure default packet template exists
  try {
    const existingTemplate = await db.get("SELECT id FROM packet_templates WHERE is_active = 1");
    if (!existingTemplate) {
      const tRes = await db.run("INSERT INTO packet_templates (name, target_budget, gst_rate, is_active) VALUES ('Cadet Standard Refreshment Packet', 75.0, 5.0, 1)");
      const tId = tRes.lastID;
      // Pre-populate with sample items if catalog has items
      const sampleItems = await db.all("SELECT id, item_name, unit_price FROM refreshment_items WHERE is_active = 1 LIMIT 3");
      const defaultExp = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      for (const sItem of sampleItems) {
        await db.run(
          "INSERT INTO packet_template_items (template_id, item_id, quantity, expiry_date) VALUES (?, ?, 1, ?)",
          [tId, sItem.id, defaultExp]
        );
      }
    }
  } catch (err) { }

  // Ensure demand_time column exists in demands table
  try {
    await db.run("ALTER TABLE demands ADD COLUMN demand_time VARCHAR(255) DEFAULT '08:00'");
  } catch (err) {
    // Column already exists or freshly created
  }

  try {
    await db.run("ALTER TABLE demands ADD COLUMN fulfilled_by INTEGER REFERENCES users(id)");
  } catch (err) { }
  try {
    await db.run("ALTER TABLE demands ADD COLUMN fulfilled_at DATETIME");
  } catch (err) { }

  // Ensure demands status CHECK constraint includes 'ACCEPTED'
  try {
    const tbl = await db.get("SELECT COLUMN_TYPE as `sql` FROM information_schema.COLUMNS WHERE TABLE_NAME='demands' AND COLUMN_NAME='status'");
    if (tbl && tbl.sql && !tbl.sql.includes("'ACCEPTED'")) {
      
      await db.run(`
        CREATE TABLE demands_new (
          id INTEGER PRIMARY KEY AUTO_INCREMENT,
          demand_number VARCHAR(255) UNIQUE NOT NULL,
          institution_id INTEGER NOT NULL,
          unit_id INTEGER NOT NULL,
          raised_by INTEGER NOT NULL,
          demand_date TEXT NOT NULL,
          demand_time VARCHAR(255) DEFAULT '08:00',
          purpose TEXT NOT NULL,
          status VARCHAR(255) CHECK(status IN ('PENDING', 'APPROVED', 'ACCEPTED', 'PREPARING', 'READY_FOR_DISPATCH', 'DELIVERED', 'REJECTED', 'CANCELLED', 'FULFILLED')) DEFAULT 'PENDING',
          reviewed_by INTEGER,
          review_remarks TEXT,
          reviewed_at DATETIME,
          accepted_by INTEGER,
          accepted_at DATETIME,
          delivery_receipt_url TEXT,
          invoice_url TEXT,
          is_deleted INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (institution_id) REFERENCES institutions(id),
          FOREIGN KEY (unit_id) REFERENCES units(id),
          FOREIGN KEY (raised_by) REFERENCES users(id),
          FOREIGN KEY (reviewed_by) REFERENCES users(id),
          FOREIGN KEY (accepted_by) REFERENCES users(id)
        )
      `);
      await db.run(`INSERT INTO demands_new SELECT id, demand_number, institution_id, unit_id, raised_by, demand_date, COALESCE(demand_time, '08:00'), purpose, status, reviewed_by, review_remarks, reviewed_at, accepted_by, accepted_at, delivery_receipt_url, invoice_url, is_deleted, created_at FROM demands`);
      await db.run('DROP TABLE demands');
      await db.run('ALTER TABLE demands_new RENAME TO demands');
      await db.run('SET FOREIGN_KEY_CHECKS = 1');
    }
  } catch (err) {
    console.error('Migration error for demands status check:', err);
  }

  // Delivery partners table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS delivery_partners (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      vehicle_no TEXT,
      assigned_pins TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS driver_daily_logs (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      driver_id INTEGER NOT NULL,
      log_date DATE NOT NULL,
      start_km REAL,
      end_km REAL,
      total_km REAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (driver_id) REFERENCES delivery_partners(id) ON DELETE CASCADE,
      UNIQUE(driver_id, log_date)
    );
  `);

  // Ensure delivery and invoice columns exist in demands table
  const deliveryCols = [
    "ALTER TABLE demands ADD COLUMN delivery_partner_id INTEGER",
    "ALTER TABLE demands ADD COLUMN delivery_partner_name TEXT",
    "ALTER TABLE demands ADD COLUMN delivery_partner_phone TEXT",
    "ALTER TABLE demands ADD COLUMN delivery_partner_vehicle TEXT",
    "ALTER TABLE demands ADD COLUMN delivery_status VARCHAR(255) DEFAULT 'PENDING'",
    "ALTER TABLE demands ADD COLUMN dispatched_at DATETIME",
    "ALTER TABLE demands ADD COLUMN delivered_at DATETIME",
    "ALTER TABLE demands ADD COLUMN delivery_notes TEXT",
    "ALTER TABLE demands ADD COLUMN delivery_rejection_reason TEXT",
    "ALTER TABLE demands ADD COLUMN bill_collection_status TEXT",
    "ALTER TABLE demands ADD COLUMN bill_collection_notes TEXT",
    "ALTER TABLE demands ADD COLUMN invoice_no TEXT",
    "ALTER TABLE demands ADD COLUMN invoice_date TEXT",
    "ALTER TABLE demands ADD COLUMN start_km_reading REAL",
    "ALTER TABLE demands ADD COLUMN closing_km_reading REAL",
    "ALTER TABLE demands ADD COLUMN total_km REAL",
    "ALTER TABLE demands ADD COLUMN demand_type VARCHAR(255) DEFAULT 'INSTITUTION'",
    "ALTER TABLE demands ADD COLUMN packet_type VARCHAR(255) DEFAULT 'REGULAR'",
    "ALTER TABLE demands ADD COLUMN custom_unit_rate REAL",
    "ALTER TABLE demands ADD COLUMN delivery_venue TEXT"
  ];
  for (const query of deliveryCols) {
    try {
      await db.run(query);
    } catch (e) { }
  }

  // Ensure institution_id in demands is nullable for Unit Direct demands
  try {
    const dCols = await db.all("SHOW COLUMNS FROM demands");
    const instCol = dCols.find(c => c.Field === 'institution_id');
    if (instCol && instCol.Null === 'NO') {
      // TiDB/MySQL: use ALTER TABLE MODIFY COLUMN directly
      await db.run("ALTER TABLE demands MODIFY COLUMN institution_id INTEGER NULL");
    }
  } catch (err) {
    console.error('Error migrating demands institution_id to nullable:', err);
  }

  // Ensure delivery_partners has login credentials and vehicle capacity columns
  try {
    await db.run("ALTER TABLE delivery_partners ADD COLUMN login_id TEXT");
  } catch (e) { }
  try {
    await db.run("ALTER TABLE delivery_partners ADD COLUMN password_hash TEXT");
  } catch (e) { }
  try {
    await db.run("ALTER TABLE delivery_partners ADD COLUMN vehicle_type VARCHAR(255) DEFAULT 'ECO'");
  } catch (e) { }
  try {
    await db.run("ALTER TABLE delivery_partners ADD COLUMN vehicle_model VARCHAR(255) DEFAULT 'Maruti Eeco Cargo'");
  } catch (e) { }
  try {
    await db.run("ALTER TABLE delivery_partners ADD COLUMN load_capacity_packets INTEGER DEFAULT 750");
  } catch (e) { }
  try {
    await db.run("ALTER TABLE delivery_partners ADD COLUMN max_travel_km INTEGER DEFAULT 80");
  } catch (e) { }
  try {
    await db.run("ALTER TABLE delivery_partners ADD COLUMN rate_per_km REAL DEFAULT 0");
  } catch (e) { }

  // Seed default delivery partners if empty or set default driver passwords
  try {
    const defaultDriverHash = await bcrypt.hash('Driver@123', 10);
    const partnerCount = await db.get('SELECT COUNT(*) as count FROM delivery_partners');
    if (partnerCount && partnerCount.count === 0) {
      await db.run(
        `INSERT INTO delivery_partners (name, phone, vehicle_no, vehicle_type, vehicle_model, load_capacity_packets, max_travel_km, rate_per_km, assigned_pins, login_id, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Rajesh Kumar', '9876543210', 'DL-01-AB-1234 (Eco Van)', 'ECO', 'Maruti Eeco Cargo Van', 750, 80, 10, '110010, 110021, 110022', '9876543210', defaultDriverHash]
      );
      await db.run(
        `INSERT INTO delivery_partners (name, phone, vehicle_no, vehicle_type, vehicle_model, load_capacity_packets, max_travel_km, rate_per_km, assigned_pins, login_id, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Vikram Singh', '9876543211', 'DL-04-XY-5678 (Auto Carrier)', 'THREE_WHEELER', 'Piaggio Ape Auto Cargo', 450, 50, 8, '110001, 110002, 110003', '9876543211', defaultDriverHash]
      );
      await db.run(
        `INSERT INTO delivery_partners (name, phone, vehicle_no, vehicle_type, vehicle_model, load_capacity_packets, max_travel_km, rate_per_km, assigned_pins, login_id, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Sunil Sharma', '9876543212', 'DL-08-JK-9012 (Delivery Bike)', 'TWO_WHEELER', 'Hero Splendor Delivery Bike', 100, 40, 5, '110029, 110030', '9876543212', defaultDriverHash]
      );
    } else {
      // Ensure existing partners have password_hash and login_id set
      await db.run(
        `UPDATE delivery_partners SET password_hash = ? WHERE password_hash IS NULL`,
        [defaultDriverHash]
      );
      await db.run(
        `UPDATE delivery_partners SET login_id = phone WHERE login_id IS NULL`
      );
      // Ensure capacity values are set for existing rows
      await db.run(
        `UPDATE delivery_partners SET vehicle_type = 'ECO', vehicle_model = 'Maruti Eeco Cargo Van', load_capacity_packets = 750, max_travel_km = 80 WHERE (vehicle_type IS NULL OR load_capacity_packets IS NULL) AND vehicle_no LIKE '%Eco%'`
      );
      await db.run(
        `UPDATE delivery_partners SET vehicle_type = 'THREE_WHEELER', vehicle_model = 'Piaggio Ape Auto Cargo', load_capacity_packets = 450, max_travel_km = 50 WHERE (vehicle_type IS NULL OR load_capacity_packets IS NULL) AND (vehicle_no LIKE '%Auto%' OR vehicle_no LIKE '%Carrier%')`
      );
      await db.run(
        `UPDATE delivery_partners SET vehicle_type = 'TWO_WHEELER', vehicle_model = 'Hero Splendor Delivery Bike', load_capacity_packets = 100, max_travel_km = 40 WHERE (vehicle_type IS NULL OR load_capacity_packets IS NULL) AND vehicle_no LIKE '%Bike%'`
      );
      await db.run(
        `UPDATE delivery_partners SET vehicle_type = 'ECO', vehicle_model = 'Maruti Eeco Cargo Van', load_capacity_packets = 750, max_travel_km = 80 WHERE vehicle_type IS NULL OR load_capacity_packets IS NULL`
      );
    }
  } catch (err) {
    console.error('Error seeding delivery partners:', err);
  }

  // Seed default data if users table is empty
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    await seedDefaultData(db);
  }

  // Ensure Standard Refreshment Packet in catalog & demands match the active packet template rate
  await syncStandardPacketPrice(db);
}

async function seedDefaultData(db) {
  console.log('Seeding initial demo database...');

  // 1. Create Default Admin Password: Admin@123
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const unitPasswordHash = await bcrypt.hash('Unit@123', 10);
  const instPasswordHash = await bcrypt.hash('Inst@123', 10);

  // Insert Admin
  const adminRes = await db.run(
    `INSERT INTO users (name, email, login_id, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
    ['HQ Vendor Admin', 'admin@ncc.gov.in', 'ADMIN', adminPasswordHash, 'ADMIN']
  );
  const adminId = adminRes.lastID;

  // 2. Insert Units
  const unit1 = await db.run(
    `INSERT INTO units (unit_name, unit_code, location, ncc_group) VALUES (?, ?, ?, ?)`,
    ['2 DELHI ARTY BTY NCC', '2 DAB NCC', 'DELHI', 'Group C']
  );
  const unit1Id = unit1.lastID;

  // Insert Unit User
  const unit1User = await db.run(
    `INSERT INTO users (name, email, login_id, password_hash, role, unit_id) VALUES (?, ?, ?, ?, ?, ?)`,
    ['2 DELHI ARTY BTY NCC HQ', 'co2abncc@gmail.com', '2DABNCC', unitPasswordHash, 'UNIT', unit1Id]
  );

  // 3. Insert Institutions
  const inst1 = await db.run(
    `INSERT INTO institutions (unit_id, institution_name, ano_cto_name, ano_cto_contact, pin_code, strength_1st_year, strength_2nd_year, strength_3rd_year)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [unit1Id, 'APS SHANKAR VIHAR', 'MUKESH RAUTELA (ANO)', '+91 9876543210', '110010', 50, 40, 30]
  );
  const inst1Id = inst1.lastID;

  // Insert Institution User
  const inst1User = await db.run(
    `INSERT INTO users (name, email, login_id, password_hash, role, unit_id, institution_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['MUKESH RAUTELA', 'mukesh@gmail.com', 'mukesh@gmail.com', instPasswordHash, 'INSTITUTION', unit1Id, inst1Id]
  );

  // 4. Insert Refreshment Items
  const items = [
    { name: 'Glucose Biscuit Packet (100g)', price: 15.0, unit: 'Packet' },
    { name: 'Fruit Juice Pack (200ml)', price: 25.0, unit: 'Tetra Pack' },
    { name: 'High-Protein Energy Bar', price: 35.0, unit: 'Bar' },
    { name: 'Fresh Vegetable Samosa & Tea', price: 30.0, unit: 'Serving' },
    { name: 'Mineral Water Bottle (500ml)', price: 10.0, unit: 'Bottle' },
    { name: 'Cadet Packed Refreshment Lunch Box', price: 75.0, unit: 'Box' }
  ];

  const itemMap = {};
  for (const item of items) {
    const res = await db.run(
      `INSERT INTO refreshment_items (item_name, unit_price, unit_of_measure, is_active) VALUES (?, ?, ?, 1)`,
      [item.name, item.price, item.unit]
    );
    itemMap[item.name] = res.lastID;
  }

  // 5. Create Sample Demands
  // Demand 1: St. Joseph - PENDING
  const d1 = await db.run(
    `INSERT INTO demands (demand_number, institution_id, unit_id, raised_by, demand_date, purpose, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['DEM-2026-001', inst1Id, unit1Id, inst1User.lastID, '2026-08-28', 'Institutional Drill Parade Refreshments', 'PENDING']
  );
  await db.run(
    `INSERT INTO demand_items (demand_id, item_id, year_group, quantity, unit_price_snapshot) VALUES (?, ?, ?, ?, ?)`,
    [d1.lastID, itemMap['Glucose Biscuit Packet (100g)'], '1st Year', 45, 15.0]
  );
  await db.run(
    `INSERT INTO demand_items (demand_id, item_id, year_group, quantity, unit_price_snapshot) VALUES (?, ?, ?, ?, ?)`,
    [d1.lastID, itemMap['Fruit Juice Pack (200ml)'], '1st Year', 45, 25.0]
  );
  await db.run(
    `INSERT INTO demand_items (demand_id, item_id, year_group, quantity, unit_price_snapshot) VALUES (?, ?, ?, ?, ?)`,
    [d1.lastID, itemMap['Glucose Biscuit Packet (100g)'], '2nd Year', 35, 15.0]
  );
  await db.run(
    `INSERT INTO demand_items (demand_id, item_id, year_group, quantity, unit_price_snapshot) VALUES (?, ?, ?, ?, ?)`,
    [d1.lastID, itemMap['Fruit Juice Pack (200ml)'], '2nd Year', 35, 25.0]
  );

  // Demand 2: APS SHANKAR VIHAR - APPROVED
  const d2 = await db.run(
    `INSERT INTO demands (demand_number, institution_id, unit_id, raised_by, demand_date, purpose, status, reviewed_by, review_remarks, reviewed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['DEM-2026-002', inst1Id, unit1Id, inst1User.lastID, '2026-08-20', 'Combined Annual Training Camp (CATC) Day 1', 'APPROVED', unit1User.lastID, 'Verified strength and purpose. Approved for procurement.', '2026-08-21 10:30:00']
  );
  await db.run(
    `INSERT INTO demand_items (demand_id, item_id, year_group, quantity, unit_price_snapshot) VALUES (?, ?, ?, ?, ?)`,
    [d2.lastID, itemMap['Cadet Packed Refreshment Lunch Box'], '1st Year', 50, 75.0]
  );
  await db.run(
    `INSERT INTO demand_items (demand_id, item_id, year_group, quantity, unit_price_snapshot) VALUES (?, ?, ?, ?, ?)`,
    [d2.lastID, itemMap['Cadet Packed Refreshment Lunch Box'], '2nd Year', 40, 75.0]
  );
  await db.run(
    `INSERT INTO demand_items (demand_id, item_id, year_group, quantity, unit_price_snapshot) VALUES (?, ?, ?, ?, ?)`,
    [d2.lastID, itemMap['Cadet Packed Refreshment Lunch Box'], '3rd Year', 30, 75.0]
  );

  // Demand 3: APS SHANKAR VIHAR - FULFILLED
  const d3 = await db.run(
    `INSERT INTO demands (demand_number, institution_id, unit_id, raised_by, demand_date, purpose, status, reviewed_by, review_remarks, reviewed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['DEM-2026-003', inst1Id, unit1Id, inst1User.lastID, '2026-08-15', 'Independence Day Cadets Contingent Refreshments', 'FULFILLED', unit1User.lastID, 'Approved full quota.', '2026-08-16 11:00:00']
  );
  await db.run(
    `INSERT INTO demand_items (demand_id, item_id, year_group, quantity, unit_price_snapshot) VALUES (?, ?, ?, ?, ?)`,
    [d3.lastID, itemMap['Fresh Vegetable Samosa & Tea'], '1st Year', 60, 30.0]
  );
  await db.run(
    `INSERT INTO demand_items (demand_id, item_id, year_group, quantity, unit_price_snapshot) VALUES (?, ?, ?, ?, ?)`,
    [d3.lastID, itemMap['Fresh Vegetable Samosa & Tea'], '2nd Year', 50, 30.0]
  );

  // Audit Logs
  await db.run(
    `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
    ['SYSTEM', 0, 'SYSTEM_INITIALIZED', adminId, 'Database schema and demo seed data created', '2026-08-28 09:00:00']
  );
  await db.run(
    `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
    ['DEMAND', d1.lastID, 'CREATED', inst1User.lastID, 'Initiated demand DEM-2026-001', '2026-08-28 14:00:00']
  );
  await db.run(
    `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
    ['DEMAND', d2.lastID, 'APPROVED', unit1User.lastID, 'Approved demand DEM-2026-002 with remarks: Verified strength', '2026-08-21 10:30:00']
  );
  await db.run(
    `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
    ['DEMAND', d3.lastID, 'FULFILLED', adminId, 'Marked demand DEM-2026-003 as FULFILLED (delivered)', '2026-08-17 15:45:00']
  );

  console.log('Seed completed successfully!');
}

async function syncStandardPacketPrice(db) {
  try {
    const template = await db.get("SELECT * FROM packet_templates WHERE is_active = 1 ORDER BY id DESC LIMIT 1");
    if (!template) return 75.00;

    const items = await db.all(
      `SELECT pti.quantity, ri.unit_price
       FROM packet_template_items pti
       JOIN refreshment_items ri ON pti.item_id = ri.id
       WHERE pti.template_id = ?`,
      [template.id]
    );

    let subtotal = 0;
    for (const it of items) {
      subtotal += (it.unit_price || 0) * (it.quantity || 1);
    }
    const gstRate = template.gst_rate !== undefined ? template.gst_rate : 5.0;
    const gstAmount = parseFloat((subtotal * (gstRate / 100)).toFixed(2));
    let grandTotal = parseFloat((subtotal + gstAmount).toFixed(2));
    if (!grandTotal || grandTotal <= 0) {
      grandTotal = template.target_budget || 75.00;
    }

    // Ensure item exists in refreshment_items
    let packetItem = await db.get("SELECT id FROM refreshment_items WHERE item_name = 'Standard Refreshment Packet'");
    if (!packetItem) {
      const res = await db.run(
        "INSERT INTO refreshment_items (item_name, unit_price, unit_of_measure, is_active, current_stock, min_threshold) VALUES ('Standard Refreshment Packet', ?, 'Packet', 1, 9999, 100)",
        [grandTotal]
      );
      packetItem = { id: res.lastID };
    } else {
      await db.run("UPDATE refreshment_items SET unit_price = ?, is_active = 1 WHERE id = ?", [grandTotal, packetItem.id]);
    }

    // Sync all demand items for Standard Refreshment Packet
    await db.run("UPDATE demand_items SET unit_price_snapshot = ? WHERE item_id = ?", [grandTotal, packetItem.id]);

    // Also update any demand_items associated with cadet refreshment demands
    await db.run(
      `UPDATE demand_items 
       SET item_id = ?, unit_price_snapshot = ? 
       WHERE demand_id IN (SELECT id FROM demands WHERE purpose LIKE '%DEMAND%' OR purpose LIKE '%APS%' OR purpose LIKE '%CONVENT%')`,
      [packetItem.id, grandTotal]
    );

    return grandTotal;
  } catch (err) {
    console.error('Error syncing standard packet price:', err);
    return 75.00;
  }
}

module.exports = { getDB, syncStandardPacketPrice };
