// backend/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure storage for product images
const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'pos-products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
  }
});

// Configure storage for receipts
const receiptStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'pos-receipts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    transformation: [{ width: 800 }]
  }
});

// Configure storage for employee avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'pos-avatars',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 300, height: 300, crop: 'fill' }]
  }
});

// Create multer upload instances
const uploadProduct = multer({ storage: productStorage });
const uploadReceipt = multer({ storage: receiptStorage });
const uploadAvatar = multer({ storage: avatarStorage });

module.exports = {
  cloudinary,
  uploadProduct,
  uploadReceipt,
  uploadAvatar
};