// backend/routes/customerRoutes.js
import express from 'express';
import * as customerController from '../controllers/customerController.js';
import auth from '../middleware/auth.js';  // Use default import

const router = express.Router();

// Customer routes
router.get('/', auth, customerController.getAllCustomers);
router.get('/search', auth, customerController.searchCustomers);
router.get('/:id', auth, customerController.getCustomerById);
router.get('/email/:email', auth, customerController.getCustomerByEmail);
router.get('/:id/transactions', auth, customerController.getCustomerTransactions);
router.post('/', auth, customerController.createCustomer);
router.put('/:id', auth, customerController.updateCustomer);
router.patch('/:id/loyalty', auth, customerController.updateLoyaltyPoints);
router.delete('/:id', auth, customerController.deleteCustomer);

export default router;