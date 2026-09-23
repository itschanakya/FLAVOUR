// One-time cleanup of orphaned tables from failed migrations
require('dotenv').config();
const mysql = require('mysql2/promise');

async function cleanup() {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  const conn = await pool.getConnection();
  try {
    await conn.execute("SET FOREIGN_KEY_CHECKS = 0");
    await conn.execute("DROP TABLE IF EXISTS demands_old_notnull");
    console.log("Dropped demands_old_notnull");
    await conn.execute("DROP TABLE IF EXISTS demands_new");
    console.log("Dropped demands_new");
    await conn.execute("SET FOREIGN_KEY_CHECKS = 1");
    console.log("Done!");
  } catch (e) {
    console.error("Error:", e.message);
  }
  conn.release();
  await pool.end();
  process.exit(0);
}

cleanup();

cleanup();
