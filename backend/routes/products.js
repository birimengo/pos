// backend/routes/products.js
import express from 'express';
import * as productController from '../controllers/productController.js';
import { uploadProduct } from '../config/cloudinary.js';
import auth from '../middleware/auth.js';  // Use default import, not named import

const router = express.Router();

// Product CRUD routes
router.get('/', auth, productController.getAllProducts);
router.get('/:id', auth, productController.getProductById);
router.post('/', auth, productController.createProduct);
router.put('/:id', auth, productController.updateProduct);
router.patch('/:id/stock', auth, productController.updateProductStock);
router.delete('/:id', auth, productController.deleteProduct);

// Stock History routes
router.get('/:id/stock-history', auth, productController.getStockHistory);
router.post('/:id/stock-history', auth, productController.addStockHistory);

// Image upload routes
router.post('/:id/images', auth, uploadProduct.array('images', 5), productController.uploadProductImages);
router.delete('/:productId/images/:imageId', auth, productController.deleteProductImage);

export default router;