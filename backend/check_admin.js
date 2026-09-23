require('dotenv').config();
const { getDB } = require('./database');

async function checkAdminEmail() {
  try {
    const db = await getDB();
    const adminUser = await db.get("SELECT email, login_id FROM users WHERE role = 'ADMIN'");
    console.log('--- ADMIN USER DETAILS ---');
    if (adminUser) {
      console.log('Login ID:', adminUser.login_id);
      console.log('Email registered for OTP:', adminUser.email);
    } else {
      console.log('Admin user not found!');
    }
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit(0);
}

checkAdminEmail();
