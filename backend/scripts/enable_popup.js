require('dotenv').config();
const { getDB } = require('../database');

(async () => {
  try {
    const db = await getDB();
    await db.run(
      "INSERT INTO app_settings (setting_key, setting_value) VALUES ('ano_balance_popup_enabled_global', 'true') ON DUPLICATE KEY UPDATE setting_value = 'true'"
    );
    console.log('Successfully set ano_balance_popup_enabled_global = true');

    const rows = await db.all("SELECT * FROM app_settings WHERE setting_key LIKE '%popup%'");
    console.log('Current popup settings in DB:', rows);
  } catch (err) {
    console.error('Error enabling global popup:', err);
  }
  process.exit(0);
})();
