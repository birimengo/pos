// backend/controllers/authController.js
import User from '../models/User.js';
import Store from '../models/Store.js';
import StoreSettings from '../models/StoreSettings.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Generate JWT Token
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { id: userId, email, role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// Create default store for new user (especially admins)
const createDefaultStore = async (userId, userName, userEmail) => {
  try {
    console.log('🏪 Creating default store for user:', userName);
    
    // Create default store with user assigned
    const defaultStore = new Store({
      name: `${userName}'s Store`,
      address: '123 Business Street',
      city: 'Your City',
      state: 'Your State',
      zip: '12345',
      phone: '+1 234 567 8900',
      email: userEmail,
      manager: userName,
      taxRate: 0,
      openTime: '09:00',
      closeTime: '21:00',
      timezone: 'UTC',
      settings: {
        receiptHeader: 'Thank you for shopping!',
        receiptFooter: 'Returns accepted within 30 days',
        currency: 'USD'
      },
      active: true,
      isDefault: true,
      createdBy: userId,
      createdByName: userName,
      users: [userId],  // Add user to store's users array
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await defaultStore.save();
    console.log('✅ Default store created:', defaultStore._id);

    // Create default store settings
    const defaultSettings = new StoreSettings({
      storeId: defaultStore._id,
      store: {
        name: defaultStore.name,
        address: defaultStore.address,
        phone: defaultStore.phone,
        email: defaultStore.email,
        taxRate: defaultStore.taxRate,
        country: 'US',
        currency: 'USD'
      },
      receipt: {
        header: 'THANK YOU FOR SHOPPING!',
        footer: 'Returns accepted within 30 days',
        showLogo: true,
        showTax: true,
        showDiscount: true,
        showCustomerInfo: true,
        showCashier: true,
        paperSize: '80mm'
      },
      hardware: {
        printer: 'USB',
        cashDrawer: 'COM1',
        barcodeScanner: 'USB',
        customerDisplay: true,
        scale: false
      },
      users: {
        requireLogin: true,
        sessionTimeout: 480,
        maxFailedAttempts: 3
      },
      backup: {
        autoBackup: true,
        backupFrequency: 'daily',
        backupTime: '23:00',
        cloudBackup: false
      },
      appearance: {
        theme: 'light',
        compactMode: false,
        showProductImages: true,
        defaultView: 'grid'
      },
      createdBy: userId,
      createdByName: userName,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await defaultSettings.save();
    console.log('✅ Default store settings created');

    return defaultStore;
  } catch (error) {
    console.error('❌ Error creating default store:', error);
    return null;
  }
};

// Get user's stores (not just createdBy, but also assigned stores)
const getUserStores = async (userId, userRole) => {
  try {
    // For admin users, get stores they created OR are assigned to
    // For non-admin users, only get stores they're assigned to
    const query = {
      $or: [
        { users: userId },
        ...(userRole === 'admin' ? [{ createdBy: userId }] : [])
      ]
    };
    
    const stores = await Store.find(query);
    return stores;
  } catch (error) {
    console.error('❌ Error getting user stores:', error);
    return [];
  }
};

// Get or create user's default store
const getUserDefaultStore = async (userId, userName, userEmail, userRole) => {
  try {
    // Only create store for admin users
    if (userRole !== 'admin') {
      return null;
    }

    // Check if user already has a store (either created by them or assigned)
    let userStore = await Store.findOne({
      $or: [
        { createdBy: userId },
        { users: userId },
        { isDefault: true }
      ]
    });
    
    if (!userStore) {
      userStore = await createDefaultStore(userId, userName, userEmail);
    } else if (!userStore.users.includes(userId)) {
      // Add user to store's users array if not already there
      userStore.users.push(userId);
      await userStore.save();
      console.log(`✅ User ${userId} added to store ${userStore.name}`);
    }
    
    return userStore;
  } catch (error) {
    console.error('❌ Error getting user default store:', error);
    return null;
  }
};

// @desc    Register new user
// @route   POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Set permissions based on role
    let permissions = [];
    const rolePermissions = {
      admin: ['manage_stores', 'manage_users', 'manage_inventory', 'view_reports', 'process_sales', 'manage_settings', 'approve_transfers'],
      manager: ['manage_inventory', 'view_reports', 'process_sales', 'approve_transfers'],
      inventory_manager: ['manage_inventory', 'view_reports'],
      cashier: ['process_sales']
    };
    permissions = rolePermissions[role] || rolePermissions.cashier;

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'cashier',
      permissions,
      isActive: true
    });

    await user.save();
    console.log('✅ User created:', user.email);

    // Create default store for admin users
    let defaultStore = null;
    if (role === 'admin') {
      defaultStore = await createDefaultStore(user._id, name, email);
    }

    // Generate token
    const token = generateToken(user._id, user.email, user.role);

    // Get all stores for this user
    const userStores = await getUserStores(user._id, user.role);

    // Return user data with store info
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      createdAt: user.createdAt,
      defaultStoreId: defaultStore?._id || null,
      defaultStore: defaultStore ? {
        _id: defaultStore._id,
        id: defaultStore._id,
        name: defaultStore.name,
        address: defaultStore.address,
        phone: defaultStore.phone,
        email: defaultStore.email,
        taxRate: defaultStore.taxRate,
        openTime: defaultStore.openTime,
        closeTime: defaultStore.closeTime,
        isDefault: defaultStore.isDefault
      } : null,
      stores: userStores.map(store => ({
        _id: store._id,
        id: store._id,
        name: store.name,
        address: store.address,
        phone: store.phone,
        isDefault: store.isDefault
      }))
    };

    res.status(201).json({
      success: true,
      token,
      user: userData,
      message: role === 'admin' 
        ? 'Registration successful. Default store created. Please update your store details in Settings.'
        : 'Registration successful'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Registration failed'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated. Please contact administrator.'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Get or create user's default store (for admin users)
    let userDefaultStore = null;
    if (user.role === 'admin') {
      userDefaultStore = await getUserDefaultStore(user._id, user.name, user.email, user.role);
    }

    // Get all stores for this user
    const userStores = await getUserStores(user._id, user.role);

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, user.email, user.role);

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      defaultStoreId: userDefaultStore?._id || null,
      defaultStore: userDefaultStore ? {
        _id: userDefaultStore._id,
        id: userDefaultStore._id,
        name: userDefaultStore.name,
        address: userDefaultStore.address,
        phone: userDefaultStore.phone,
        email: userDefaultStore.email,
        taxRate: userDefaultStore.taxRate,
        openTime: userDefaultStore.openTime,
        closeTime: userDefaultStore.closeTime,
        isDefault: userDefaultStore.isDefault
      } : null,
      stores: userStores.map(store => ({
        _id: store._id,
        id: store._id,
        name: store.name,
        address: store.address,
        phone: store.phone,
        isDefault: store.isDefault
      }))
    };

    res.json({
      success: true,
      token,
      user: userData,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Login failed'
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user's default store
    let userDefaultStore = null;
    if (user.role === 'admin') {
      userDefaultStore = await Store.findOne({
        $or: [
          { createdBy: user._id },
          { users: user._id },
          { isDefault: true }
        ]
      });
    } else {
      userDefaultStore = await Store.findOne({ users: user._id });
    }

    // Get all stores for this user
    const userStores = await getUserStores(user._id, user.role);

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      defaultStoreId: userDefaultStore?._id || null,
      defaultStore: userDefaultStore ? {
        _id: userDefaultStore._id,
        id: userDefaultStore._id,
        name: userDefaultStore.name,
        address: userDefaultStore.address,
        phone: userDefaultStore.phone,
        email: userDefaultStore.email,
        taxRate: userDefaultStore.taxRate,
        openTime: userDefaultStore.openTime,
        closeTime: userDefaultStore.closeTime,
        isDefault: userDefaultStore.isDefault
      } : null,
      stores: userStores.map(store => ({
        _id: store._id,
        id: store._id,
        name: store.name,
        address: store.address,
        phone: store.phone,
        isDefault: store.isDefault
      }))
    };

    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user profile'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email already in use'
        });
      }
      user.email = email;
    }

    if (name) user.name = name;

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update profile'
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to change password'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
export const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No user found with this email'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({
      success: true,
      message: 'Password reset instructions sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process forgot password request'
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reset password'
    });
  }
};

// ==================== ADMIN USER MANAGEMENT ====================

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
export const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    
    // For each user, get their assigned stores
    const usersWithStores = await Promise.all(users.map(async (user) => {
      const userStores = await Store.find({
        $or: [
          { createdBy: user._id },
          { users: user._id }
        ]
      }).select('_id name isDefault');
      
      return {
        ...user.toObject(),
        stores: userStores
      };
    }));
    
    res.json({
      success: true,
      users: usersWithStores
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get users'
    });
  }
};

// @desc    Get user by ID (Admin only)
// @route   GET /api/auth/users/:id
export const getUserById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user's assigned stores
    const userStores = await Store.find({
      $or: [
        { createdBy: user._id },
        { users: user._id }
      ]
    }).select('_id name isDefault');

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        stores: userStores
      }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user'
    });
  }
};

// @desc    Create user (Admin only)
// @route   POST /api/auth/users
export const createUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { name, email, password, role, assignedStoreIds } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email and password are required'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let permissions = [];
    const rolePermissions = {
      admin: ['manage_stores', 'manage_users', 'manage_inventory', 'view_reports', 'process_sales', 'manage_settings', 'approve_transfers'],
      manager: ['manage_inventory', 'view_reports', 'process_sales', 'approve_transfers'],
      inventory_manager: ['manage_inventory', 'view_reports'],
      cashier: ['process_sales']
    };
    permissions = rolePermissions[role] || rolePermissions.cashier;

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'cashier',
      permissions,
      isActive: true
    });

    await user.save();

    // Assign user to specified stores
    if (assignedStoreIds && assignedStoreIds.length > 0) {
      for (const storeId of assignedStoreIds) {
        const store = await Store.findById(storeId);
        if (store) {
          if (!store.users) store.users = [];
          if (!store.users.includes(user._id)) {
            store.users.push(user._id);
            await store.save();
            console.log(`✅ User ${user.email} assigned to store ${store.name}`);
          }
        }
      }
    }

    // Create store for admin users
    if (role === 'admin') {
      await createDefaultStore(user._id, name, email);
    }

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      createdAt: user.createdAt
    };

    res.status(201).json({
      success: true,
      user: userData,
      message: role === 'admin' ? 'User created with default store' : 'User created successfully'
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create user'
    });
  }
};

// @desc    Update user (Admin only)
// @route   PUT /api/auth/users/:id
export const updateUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { name, email, role, isActive, assignedStoreIds } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.id === req.user.id && isActive === false) {
      return res.status(400).json({
        success: false,
        error: 'You cannot deactivate your own account'
      });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    if (role) {
      const rolePermissions = {
        admin: ['manage_stores', 'manage_users', 'manage_inventory', 'view_reports', 'process_sales', 'manage_settings', 'approve_transfers'],
        manager: ['manage_inventory', 'view_reports', 'process_sales', 'approve_transfers'],
        inventory_manager: ['manage_inventory', 'view_reports'],
        cashier: ['process_sales']
      };
      user.permissions = rolePermissions[role] || rolePermissions.cashier;
    }

    await user.save();

    // Update store assignments
    if (assignedStoreIds) {
      // Remove user from all stores first
      await Store.updateMany(
        { users: user._id },
        { $pull: { users: user._id } }
      );
      
      // Add user to new stores
      for (const storeId of assignedStoreIds) {
        const store = await Store.findById(storeId);
        if (store) {
          if (!store.users) store.users = [];
          if (!store.users.includes(user._id)) {
            store.users.push(user._id);
            await store.save();
          }
        }
      }
    }

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive
    };

    res.json({
      success: true,
      user: userData,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update user'
    });
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/auth/users/:id
export const deleteUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account'
      });
    }

    // Remove user from all stores
    await Store.updateMany(
      { users: user._id },
      { $pull: { users: user._id } }
    );

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete user'
    });
  }
};

// @desc    Update user password (Admin only)
// @route   PUT /api/auth/users/:id/password
export const updateUserPassword = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { newPassword } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Update user password error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update password'
    });
  }
};

// ==================== USER STORE ASSIGNMENT HELPERS ====================

// @desc    Assign user to a store (Admin only)
// @route   POST /api/auth/users/:userId/stores/:storeId
export const assignUserToStore = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { userId, storeId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }
    
    if (!store.users) store.users = [];
    if (!store.users.includes(user._id)) {
      store.users.push(user._id);
      await store.save();
    }
    
    res.json({
      success: true,
      message: `User ${user.email} assigned to store ${store.name}`
    });
  } catch (error) {
    console.error('Assign user to store error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to assign user to store'
    });
  }
};

// @desc    Remove user from a store (Admin only)
// @route   DELETE /api/auth/users/:userId/stores/:storeId
export const removeUserFromStore = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { userId, storeId } = req.params;
    
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }
    
    if (store.users) {
      store.users = store.users.filter(uid => uid.toString() !== userId);
      await store.save();
    }
    
    res.json({
      success: true,
      message: 'User removed from store successfully'
    });
  } catch (error) {
    console.error('Remove user from store error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to remove user from store'
    });
  }
};