// backend/routes/sync.js
import express from 'express';
import * as syncController from '../controllers/syncController.js';
import auth from '../middleware/auth.js';  // Use default import

const router = express.Router();

// Sync routes
router.post('/products', auth, syncController.syncProducts);
router.post('/transactions', auth, syncController.syncTransactions);
router.get('/data', auth, syncController.getSyncData);

export default router;