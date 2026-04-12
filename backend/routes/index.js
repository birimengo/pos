// backend/routes/index.js
import express from 'express';
import healthRoutes from './health.js';
import authRoutes from './authRoutes.js';
import productRoutes from './products.js';
import customerRoutes from './customers.js';
import transactionRoutes from './transactions.js';
import syncRoutes from './sync.js';
import storeRoutes from './stores.js';
import settingsRoutes from './settings.js';

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/customers', customerRoutes);
router.use('/transactions', transactionRoutes);
router.use('/sync', syncRoutes);
router.use('/stores', storeRoutes);
router.use('/settings', settingsRoutes);

export default router;