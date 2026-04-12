// backend/routes/stores.js
import express from 'express';
import * as storeController from '../controllers/storeController.js';
import { auth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// ==================== PUBLIC TEST ENDPOINTS (Development only) ====================
// Remove these in production
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'ok', 
    message: 'Store routes are working',
    timestamp: new Date().toISOString()
  });
});

// ==================== STORE CRUD OPERATIONS ====================
// All routes below require authentication

// Get all stores
router.get('/', auth, async (req, res, next) => {
  try {
    await storeController.getAllStores(req, res);
  } catch (error) {
    next(error);
  }
});

// Get default store
router.get('/default', auth, async (req, res, next) => {
  try {
    await storeController.getDefaultStore(req, res);
  } catch (error) {
    next(error);
  }
});

// Get store by ID
router.get('/:id', auth, async (req, res, next) => {
  try {
    await storeController.getStoreById(req, res);
  } catch (error) {
    next(error);
  }
});

// Create new store
router.post('/', auth, async (req, res, next) => {
  try {
    await storeController.createStore(req, res);
  } catch (error) {
    next(error);
  }
});

// Update store
router.put('/:id', auth, async (req, res, next) => {
  try {
    await storeController.updateStore(req, res);
  } catch (error) {
    next(error);
  }
});

// Delete store (admin only)
router.delete('/:id', auth, requireAdmin, async (req, res, next) => {
  try {
    await storeController.deleteStore(req, res);
  } catch (error) {
    next(error);
  }
});

// Set default store (admin only)
router.put('/:id/default', auth, requireAdmin, async (req, res, next) => {
  try {
    await storeController.setDefaultStore(req, res);
  } catch (error) {
    next(error);
  }
});

// ==================== STORE STATISTICS & REPORTS ====================

// Get store statistics
router.get('/:id/stats', auth, async (req, res, next) => {
  try {
    await storeController.getStoreStats(req, res);
  } catch (error) {
    next(error);
  }
});

// Get store inventory
router.get('/:id/inventory', auth, async (req, res, next) => {
  try {
    await storeController.getStoreInventory(req, res);
  } catch (error) {
    next(error);
  }
});

// Get store sales data
router.get('/:id/sales', auth, async (req, res, next) => {
  try {
    await storeController.getStoreSales(req, res);
  } catch (error) {
    next(error);
  }
});

// ==================== INVENTORY TRANSFERS ====================

// Create transfer between stores
router.post('/transfers', auth, async (req, res, next) => {
  try {
    await storeController.createTransfer(req, res);
  } catch (error) {
    next(error);
  }
});

// Get all transfers
router.get('/transfers', auth, async (req, res, next) => {
  try {
    await storeController.getAllTransfers(req, res);
  } catch (error) {
    next(error);
  }
});

// Get transfers by store
router.get('/stores/:storeId/transfers', auth, async (req, res, next) => {
  try {
    await storeController.getTransfersByStore(req, res);
  } catch (error) {
    next(error);
  }
});

// Get transfer by ID
router.get('/transfers/:id', auth, async (req, res, next) => {
  try {
    await storeController.getTransferById(req, res);
  } catch (error) {
    next(error);
  }
});

// Approve transfer
router.put('/transfers/:id/approve', auth, async (req, res, next) => {
  try {
    await storeController.approveTransfer(req, res);
  } catch (error) {
    next(error);
  }
});

// Complete transfer
router.put('/transfers/:id/complete', auth, async (req, res, next) => {
  try {
    await storeController.completeTransfer(req, res);
  } catch (error) {
    next(error);
  }
});

// Cancel transfer
router.put('/transfers/:id/cancel', auth, async (req, res, next) => {
  try {
    await storeController.cancelTransfer(req, res);
  } catch (error) {
    next(error);
  }
});

// Delete transfer (admin only)
router.delete('/transfers/:id', auth, requireAdmin, async (req, res, next) => {
  try {
    await storeController.deleteTransfer(req, res);
  } catch (error) {
    next(error);
  }
});

// ==================== BULK OPERATIONS (Admin only) ====================

// Bulk create stores
router.post('/bulk', auth, requireAdmin, async (req, res, next) => {
  try {
    await storeController.bulkCreateStores(req, res);
  } catch (error) {
    next(error);
  }
});

// Bulk update store status
router.put('/bulk/status', auth, requireAdmin, async (req, res, next) => {
  try {
    await storeController.bulkUpdateStatus(req, res);
  } catch (error) {
    next(error);
  }
});

// Bulk delete stores
router.delete('/bulk', auth, requireAdmin, async (req, res, next) => {
  try {
    await storeController.bulkDeleteStores(req, res);
  } catch (error) {
    next(error);
  }
});

// ==================== STORE USER MANAGEMENT ====================

// Assign user to store (admin only)
router.post('/:id/users', auth, requireAdmin, async (req, res, next) => {
  try {
    await storeController.assignUserToStore(req, res);
  } catch (error) {
    next(error);
  }
});

// Remove user from store (admin only)
router.delete('/:id/users/:userId', auth, requireAdmin, async (req, res, next) => {
  try {
    await storeController.removeUserFromStore(req, res);
  } catch (error) {
    next(error);
  }
});

// Get users assigned to store
router.get('/:id/users', auth, async (req, res, next) => {
  try {
    await storeController.getStoreUsers(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;