const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function migrateSchedule() {
  const dbPath = path.join(__dirname, 'data.sqlite');
  console.log(`Connecting to database at: ${dbPath}`);
  
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log('Adding schedule columns to institutions table...');
    
    // Add columns one by one, ignoring errors if they already exist
    const columns = [
      'first_demand_day TEXT',
      'first_demand_time TEXT',
      'second_demand_day TEXT',
      'second_demand_time TEXT'
    ];

    for (const col of columns) {
      try {
        await db.run(`ALTER TABLE institutions ADD COLUMN ${col}`);
        console.log(`Successfully added column: ${col}`);
      } catch (err) {
        if (err.message.includes('duplicate column name')) {
          console.log(`Column already exists: ${col}`);
        } else {
          console.error(`Error adding column ${col}:`, err.message);
        }
      }
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateSchedule();
