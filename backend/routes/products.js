// backend/routes/products.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { uploadProduct } = require('../config/cloudinary');
const auth = require('../middleware/auth');

// Upload product images
router.post('/:id/images', auth, uploadProduct.array('images', 5), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const images = req.files.map((file, index) => ({
      url: file.path,
      publicId: file.filename,
      isMain: req.body.isMain === index.toString() || index === 0
    }));

    product.images.push(...images);
    await product.save();

    res.json({ success: true, images });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete product image
router.delete('/:productId/images/:imageId', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const image = product.images.id(req.params.imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(image.publicId);

    // Remove from database
    image.remove();
    await product.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;