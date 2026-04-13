// backend/routes/stores.js
import express from 'express';
import { auth, requireAdmin } from '../middleware/auth.js';
import {
  createStore,
  getAllStores,
  getStoreById,
  updateStore,
  deleteStore,
  assignUserToStore,
  removeUserFromStore,
  getStoreUsers,
  getAllUsersForAssignment,
  getUserStores,
  getDefaultStore,
  setDefaultStore,
  getStoreStats,
  getStoreInventory,
  getStoreSales,
  createTransfer,
  getAllTransfers,
  getTransfersByStore,
  getTransferById,
  approveTransfer,
  completeTransfer,
  cancelTransfer,
  deleteTransfer,
  bulkCreateStores,
  bulkUpdateStatus,
  bulkDeleteStores,
  toggleStoreStatus,
  updateStoreHours
} from '../controllers/storeController.js';

const router = express.Router();

// ==================== STORE CRUD OPERATIONS ====================

// Get all stores (filtered by current user)
router.get('/', auth, getAllStores);

// Get default store for current user
router.get('/default', auth, getDefaultStore);

// Get store by ID
router.get('/:id', auth, getStoreById);

// Create new store (ADMIN ONLY)
router.post('/', auth, requireAdmin, createStore);

// Update store (ADMIN ONLY)
router.put('/:id', auth, requireAdmin, updateStore);

// Delete store (ADMIN ONLY)
router.delete('/:id', auth, requireAdmin, deleteStore);

// Set default store
router.put('/:id/default', auth, setDefaultStore);

// ==================== STORE STATUS MANAGEMENT ====================

// Toggle store open/close status
router.patch('/:id/toggle-status', auth, toggleStoreStatus);

// Update store hours
router.put('/:id/hours', auth, updateStoreHours);

// ==================== STORE USER ASSIGNMENT ====================

// Get all users for assignment (ADMIN ONLY)
router.get('/users/all', auth, requireAdmin, getAllUsersForAssignment);

// Get users assigned to a store
router.get('/:id/users', auth, getStoreUsers);

// Assign user to store (ADMIN ONLY)
router.post('/:id/users/:userId', auth, requireAdmin, assignUserToStore);

// Remove user from store (ADMIN ONLY)
router.delete('/:id/users/:userId', auth, requireAdmin, removeUserFromStore);

// Get stores for a specific user
router.get('/user/:userId/stores', auth, getUserStores);

// ==================== STORE STATISTICS & REPORTS ====================

// Get store statistics
router.get('/:id/stats', auth, getStoreStats);

// Get store inventory
router.get('/:id/inventory', auth, getStoreInventory);

// Get store sales data
router.get('/:id/sales', auth, getStoreSales);

// ==================== INVENTORY TRANSFERS ====================

// Create transfer between stores
router.post('/transfers', auth, createTransfer);

// Get all transfers
router.get('/transfers', auth, getAllTransfers);

// Get transfers by store
router.get('/stores/:storeId/transfers', auth, getTransfersByStore);

// Get transfer by ID
router.get('/transfers/:id', auth, getTransferById);

// Approve transfer
router.put('/transfers/:id/approve', auth, approveTransfer);

// Complete transfer
router.put('/transfers/:id/complete', auth, completeTransfer);

// Cancel transfer
router.put('/transfers/:id/cancel', auth, cancelTransfer);

// Delete transfer (ADMIN ONLY)
router.delete('/transfers/:id', auth, requireAdmin, deleteTransfer);

// ==================== BULK OPERATIONS (ADMIN ONLY) ====================

// Bulk create stores
router.post('/bulk', auth, requireAdmin, bulkCreateStores);

// Bulk update store status
router.put('/bulk/status', auth, requireAdmin, bulkUpdateStatus);

// Bulk delete stores
router.delete('/bulk', auth, requireAdmin, bulkDeleteStores);

export default router;