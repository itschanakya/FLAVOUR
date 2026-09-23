const { getDB } = require('./database');

async function migrate() {
  try {
    const db = await getDB();
    
    // Add login_id column
    try {
      await db.run('ALTER TABLE users ADD COLUMN login_id TEXT UNIQUE');
      console.log('Added login_id column with UNIQUE constraint.');
    } catch (e) {
      console.log('Could not add login_id as UNIQUE directly, or it already exists.', e.message);
      try {
        await db.run('ALTER TABLE users ADD COLUMN login_id TEXT');
        console.log('Added login_id column without UNIQUE constraint.');
      } catch (e2) {
        console.log('Column login_id probably already exists.', e2.message);
      }
    }

    // Populate login_id with email for existing users
    const result = await db.run('UPDATE users SET login_id = email WHERE login_id IS NULL');
    console.log(`Updated ${result.changes} users to have login_id = email.`);
    
    console.log('Migration complete');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
