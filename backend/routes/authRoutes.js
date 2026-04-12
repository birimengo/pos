// backend/routes/authRoutes.js
import express from 'express';
import { auth, requireAdmin } from '../middleware/auth.js';

// Import controller functions individually
import { 
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
  forgotPassword,
  resetPassword,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserPassword
} from '../controllers/authController.js';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// ==================== PROTECTED ROUTES ====================
router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);
router.put('/change-password', auth, changePassword);
router.post('/logout', auth, logout);

// ==================== ADMIN ROUTES ====================
router.get('/users', auth, requireAdmin, getAllUsers);
router.get('/users/:id', auth, requireAdmin, getUserById);
router.post('/users', auth, requireAdmin, createUser);
router.put('/users/:id', auth, requireAdmin, updateUser);
router.delete('/users/:id', auth, requireAdmin, deleteUser);
router.put('/users/:id/password', auth, requireAdmin, updateUserPassword);

export default router;