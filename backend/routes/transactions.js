// backend/routes/transactionRoutes.js
import express from 'express';
import * as transactionController from '../controllers/transactionController.js';
import auth from '../middleware/auth.js';  // Use default import

const router = express.Router();

// Transaction routes
router.get('/', auth, transactionController.getAllTransactions);
router.get('/daily', auth, transactionController.getDailySales);
router.get('/receipt/:receiptNumber', auth, transactionController.getTransactionByReceipt);
router.get('/:id', auth, transactionController.getTransactionById);
router.post('/', auth, transactionController.createTransaction);
router.post('/sync', auth, transactionController.syncTransaction);
router.put('/:id', auth, transactionController.updateTransaction);
router.delete('/:id', auth, transactionController.deleteTransaction);
router.patch('/:id/status', auth, transactionController.updateTransactionStatus);

export default router;