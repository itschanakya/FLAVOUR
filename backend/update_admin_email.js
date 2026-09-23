require('dotenv').config();
const { getDB } = require('./database');

async function updateAdminEmail() {
  try {
    const db = await getDB();
    const targetEmail = 'praveenkumar3871h@gmail.com';
    await db.run("UPDATE users SET email = ? WHERE role = 'ADMIN'", [targetEmail]);
    console.log(`Updated ADMIN email to: ${targetEmail}`);
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit(0);
}

updateAdminEmail();
