const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const useCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✅ Cloudinary Storage Enabled for File Uploads');
} else {
  console.log('⚠️ Cloudinary not configured. Using Local Storage (Files will be lost on Render sleep)');
}

const getStorage = (folderName) => {
  if (useCloudinary) {
    return new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: `ncc_refreshment/${folderName}`,
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
        resource_type: 'auto'
      }
    });
  } else {
    // Local storage fallback
    const uploadDir = path.join(__dirname, `../uploads/${folderName}/`);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    return multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadDir),
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${folderName}-${uniqueSuffix}${path.extname(file.originalname)}`);
      }
    });
  }
};

const getFileUrl = (reqFile, folderName) => {
  if (!reqFile) return null;
  if (useCloudinary && reqFile.path) {
    return reqFile.path; // Cloudinary returns the full URL in path
  }
  return `/uploads/${folderName}/${reqFile.filename}`;
};

const uploadCatalogPhoto = multer({ storage: getStorage('catalog'), limits: { fileSize: 5 * 1024 * 1024 } });
const uploadReceipt = multer({ storage: getStorage('receipts'), limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = {
  uploadCatalogPhoto,
  uploadReceipt,
  getFileUrl,
  useCloudinary
};
