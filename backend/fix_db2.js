const fs = require('fs');
let db = fs.readFileSync('database.js', 'utf8');
db = db.replace(/month TEXT NOT NULL/g, 'month VARCHAR(255) NOT NULL');
fs.writeFileSync('database.js', db);
console.log('Fixed month column for UNIQUE index');
