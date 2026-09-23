const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function run() {
  const db = await open({
    filename: path.join(__dirname, 'data.sqlite'),
    driver: sqlite3.Database
  });

  try {
    await db.exec("ALTER TABLE units ADD COLUMN ncc_group TEXT DEFAULT 'Group B';");
    console.log('Column ncc_group added successfully.');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('Column ncc_group already exists.');
    } else {
      console.error(e);
    }
  }
}
run();
