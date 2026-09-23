const fs = require('fs');
let db = fs.readFileSync('database.js', 'utf8');
const startMigration = db.indexOf('// Check demands table for status enum migration');
const endMigration = db.indexOf('// ----------------------------------------------------');
if (startMigration !== -1 && endMigration !== -1) {
    db = db.substring(0, startMigration) + db.substring(endMigration + 55);
}
fs.writeFileSync('database.js', db);
console.log('Removed migration block');
