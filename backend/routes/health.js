import express from 'express';
import * as healthController from '../controllers/healthController.js';

const router = express.Router();

// Health check routes
router.get('/', healthController.healthCheck);
router.get('/cloudinary', healthController.cloudinaryTest);

export default router;