const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function run() {
  const db = await open({
    filename: path.join(__dirname, 'data.sqlite'),
    driver: sqlite3.Database
  });

  try {
    await db.exec('ALTER TABLE demands ADD COLUMN delivery_receipt_url TEXT;');
    console.log('Column added successfully.');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('Column already exists.');
    } else {
      console.error(e);
    }
  }
}
run();
