const fs = require('fs');
const bcrypt = require('bcryptjs');
const { getDB } = require('./database');

async function importInstitutions() {
  const db = await getDB();
  const rawData = fs.readFileSync('e:/CADETLINK/backend/migration_backup_Institutions.json', 'utf8');
  const data = JSON.parse(rawData);
  
  const unitId = 3; // 2 DAB NCC
  
  const passwordHash = await bcrypt.hash('Ano@123', 10);
  
  console.log(`Found ${data.length} institutions to import.`);
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const instName = item.row[1];
    const anoName = item.row[3] || 'Unknown ANO';
    const contact = item.row[4] || '';
    
    // Generate email
    const email = `inst${i + 1}@2dab.ncc.in`;
    
    // Generate login_id
    let baseLoginId = instName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    if (!baseLoginId) baseLoginId = `inst_${i + 1}`;
    
    let loginId = baseLoginId;
    let counter = 1;
    // ensure uniqueness
    while (true) {
      const existing = await db.get('SELECT id FROM users WHERE login_id = ?', [loginId]);
      if (!existing) break;
      loginId = `${baseLoginId}_${counter}`;
      counter++;
    }
    
    console.log(`Importing: ${instName} (Login: ${loginId})`);
    
    // Insert into institutions
    const instRes = await db.run(
      `INSERT INTO institutions (unit_id, institution_name, ano_cto_name, ano_cto_contact, strength_1st_year, strength_2nd_year, strength_3rd_year)
       VALUES (?, ?, ?, ?, 0, 0, 0)`,
      [unitId, instName, anoName, contact]
    );
    const instId = instRes.lastID;
    
    // Insert into users
    await db.run(
      `INSERT INTO users (name, email, login_id, password_hash, role, unit_id, institution_id)
       VALUES (?, ?, ?, ?, 'INSTITUTION', ?, ?)`,
      [anoName, email, loginId, passwordHash, unitId, instId]
    );
  }
  
  console.log('Import complete!');
}

importInstitutions().catch(console.error);
