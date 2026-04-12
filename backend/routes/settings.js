// backend/routes/settings.js
import express from 'express';
import { auth, requireAdmin, requirePermission } from '../middleware/auth.js';
import * as settingsController from '../controllers/settingsController.js';

const router = express.Router();

// Get all settings - Admin only
router.get('/', auth, requireAdmin, settingsController.getSettings);

// Update settings - Admin only
router.put('/', auth, requireAdmin, settingsController.updateSettings);

// Backup routes
router.post('/backup', auth, requireAdmin, settingsController.createBackup);
router.post('/restore', auth, requireAdmin, settingsController.restoreBackup);
router.get('/backups', auth, requireAdmin, settingsController.getBackups);
router.delete('/backups/:filename', auth, requireAdmin, settingsController.deleteBackup);

// User management routes
router.get('/users', auth, requireAdmin, settingsController.getAllUsers);
router.get('/users/:id', auth, requireAdmin, settingsController.getUserById);
router.post('/users', auth, requireAdmin, settingsController.createUser);
router.put('/users/:id', auth, requireAdmin, settingsController.updateUser);
router.delete('/users/:id', auth, requireAdmin, settingsController.deleteUser);
router.put('/users/:id/password', auth, requireAdmin, settingsController.updateUserPassword);

// System routes
router.get('/system/info', auth, settingsController.getSystemInfo);
router.post('/system/clear-cache', auth, requireAdmin, settingsController.clearCache);
router.get('/system/logs', auth, requireAdmin, settingsController.getSystemLogs);

// Store settings
router.get('/store', auth, settingsController.getStoreSettings);
router.put('/store', auth, requirePermission('manage_settings'), settingsController.updateStoreSettings);

// Receipt settings
router.get('/receipt', auth, settingsController.getReceiptSettings);
router.put('/receipt', auth, requirePermission('manage_settings'), settingsController.updateReceiptSettings);

// Hardware settings
router.get('/hardware', auth, settingsController.getHardwareSettings);
router.put('/hardware', auth, requirePermission('manage_settings'), settingsController.updateHardwareSettings);

export default router;