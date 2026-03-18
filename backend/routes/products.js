import express from 'express';
import * as productController from '../controllers/productController.js';
import { uploadProduct } from '../config/cloudinary.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Product CRUD routes
router.get('/', auth, productController.getAllProducts);
router.get('/:id', auth, productController.getProductById);
router.post('/', auth, productController.createProduct);
router.put('/:id', auth, productController.updateProduct);
router.delete('/:id', auth, productController.deleteProduct);

// Image upload routes
router.post('/:id/images', auth, uploadProduct.array('images', 5), productController.uploadProductImages);
router.delete('/:productId/images/:imageId', auth, productController.deleteProductImage);

export default router;