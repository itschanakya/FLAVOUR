const fs = require('fs');
let db = fs.readFileSync('database.js', 'utf8');
db = db.replace(/as sql FROM information_schema/g, 'as `sql` FROM information_schema');
fs.writeFileSync('database.js', db);
console.log('Fixed sql alias syntax error');
