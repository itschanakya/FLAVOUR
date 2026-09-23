const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.sqlite');

db.serialize(() => {
  db.run("ALTER TABLE demands ADD COLUMN delivery_sequence INTEGER DEFAULT 0;", (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('Column delivery_sequence already exists.');
      } else {
        console.error('Error adding column:', err.message);
      }
    } else {
      console.log('Successfully added delivery_sequence column.');
    }
  });
});
db.close();
