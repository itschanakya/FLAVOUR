require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
const api_key = process.env.CLOUDINARY_API_KEY;
const api_secret = process.env.CLOUDINARY_API_SECRET;

if (!cloud_name || !api_key || !api_secret) {
  console.error('ERROR: Cloudinary ki API keys missing hain!');
  console.error('Kripya apni backend/.env file mein CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, aur CLOUDINARY_API_SECRET add karein.');
  process.exit(1);
}

cloudinary.config({ cloud_name, api_key, api_secret });

async function uploadFolder(folderName, table, urlColumn) {
  const uploadDir = path.join(__dirname, 'uploads', folderName);
  if (!fs.existsSync(uploadDir)) {
    console.log(`${folderName} folder nahi mila. Skip kar rahe hain.`);
    return;
  }

  const files = fs.readdirSync(uploadDir);
  console.log(`\n📂 Found ${files.length} files in ${folderName}...`);

  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  for (const file of files) {
    const filePath = path.join(uploadDir, file);
    try {
      console.log(`📤 Uploading ${file} to Cloudinary...`);
      const result = await cloudinary.uploader.upload(filePath, {
        folder: `ncc_refreshment/${folderName}`,
        use_filename: true,
        unique_filename: false
      });
      
      const cloudinaryUrl = result.secure_url;
      const oldUrl = `/uploads/${folderName}/${file}`;

      console.log(`✅ Upload success! Updating Database...`);
      await connection.execute(`UPDATE ${table} SET ${urlColumn} = ? WHERE ${urlColumn} = ?`, [cloudinaryUrl, oldUrl]);
      
      // Delivery receipt ki baat hai toh invoice column bhi check karna zaroori hai
      if (folderName === 'receipts') {
         await connection.execute(`UPDATE demands SET invoice_url = ? WHERE invoice_url = ?`, [cloudinaryUrl, oldUrl]);
      }
      
    } catch (err) {
      console.error(`❌ Failed to migrate ${file}:`, err.message || err);
    }
  }
  await connection.end();
}

async function run() {
  console.log('🚀 Starting Cloudinary Migration for Local Files...');
  await uploadFolder('catalog', 'catalog_items', 'photo_url');
  await uploadFolder('receipts', 'demands', 'delivery_receipt_url');
  console.log('\n🎉 Sab kuch Cloudinary par migrate ho gaya hai!');
}

run();
