const fs = require('fs');
let db = fs.readFileSync('database.js', 'utf8');
db = db.replace(/TEXT DEFAULT/g, 'VARCHAR(255) DEFAULT');
db = db.replace(/TEXT NOT NULL DEFAULT/g, 'VARCHAR(255) NOT NULL DEFAULT');
db = db.replace(/TEXT CHECK/g, 'VARCHAR(255) CHECK');
db = db.replace(/TEXT NOT NULL CHECK/g, 'VARCHAR(255) NOT NULL CHECK');
fs.writeFileSync('database.js', db);
console.log('Fixed database.js');
