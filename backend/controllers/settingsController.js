// backend/controllers/settingsController.js
import StoreSettings from '../models/StoreSettings.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

// Helper to get user-specific store settings
const getUserStoreSettings = async (userId, storeId = null) => {
  let query = { createdBy: userId };
  if (storeId) {
    query.storeId = storeId;
  }
  return await StoreSettings.findOne(query);
};

// Get settings from database (user-specific)
export const getSettings = async (req, res) => {
  try {
    const userId = req.user?.id;
    const storeId = req.query.storeId || req.body.storeId;
    
    let query = { createdBy: userId };
    if (storeId) {
      query.storeId = storeId;
    }
    
    let settings = await StoreSettings.findOne(query);
    
    if (!settings) {
      // Create default settings for this user
      settings = new StoreSettings({
        storeId: storeId || null,
        createdBy: userId,
        createdByName: req.user?.name,
        createdAt: new Date(),
        store: {
          name: `${req.user?.name?.split('@')[0] || 'My'}'s Store`,
          address: '',
          phone: '',
          email: req.user?.email || '',
          taxRate: 0,
          country: 'US',
          currency: 'USD'
        }
      });
      await settings.save();
      console.log(`✅ Created default settings for user: ${req.user?.email}`);
    }
    
    res.json({
      success: true,
      settings: {
        store: settings.store,
        receipt: settings.receipt,
        hardware: settings.hardware,
        users: settings.users,
        backup: settings.backup,
        appearance: settings.appearance
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update settings in database (user-specific)
export const updateSettings = async (req, res) => {
  try {
    const { section, data } = req.body;
    const userId = req.user?.id;
    const storeId = req.body.storeId;
    
    let query = { createdBy: userId };
    if (storeId) {
      query.storeId = storeId;
    }
    
    let settings = await StoreSettings.findOne(query);
    
    if (!settings) {
      settings = new StoreSettings({
        createdBy: userId,
        createdByName: req.user?.name,
        storeId: storeId || null
      });
    }
    
    // Update the specific section
    if (section && data) {
      settings[section] = { ...settings[section], ...data };
    } else {
      // Update all sections
      if (req.body.store) settings.store = { ...settings.store, ...req.body.store };
      if (req.body.receipt) settings.receipt = { ...settings.receipt, ...req.body.receipt };
      if (req.body.hardware) settings.hardware = { ...settings.hardware, ...req.body.hardware };
      if (req.body.users) settings.users = { ...settings.users, ...req.body.users };
      if (req.body.backup) settings.backup = { ...settings.backup, ...req.body.backup };
      if (req.body.appearance) settings.appearance = { ...settings.appearance, ...req.body.appearance };
    }
    
    settings.updatedBy = req.user.id;
    settings.updatedByName = req.user.name;
    settings.updatedAt = new Date();
    
    await settings.save();
    
    res.json({
      success: true,
      settings: {
        store: settings.store,
        receipt: settings.receipt,
        hardware: settings.hardware,
        users: settings.users,
        backup: settings.backup,
        appearance: settings.appearance
      },
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get store settings only (user-specific)
export const getStoreSettings = async (req, res) => {
  try {
    const userId = req.user?.id;
    const storeId = req.query.storeId || req.body.storeId;
    
    let query = { createdBy: userId };
    if (storeId) {
      query.storeId = storeId;
    }
    
    let settings = await StoreSettings.findOne(query);
    
    if (!settings) {
      // Create default settings for this user
      settings = new StoreSettings({
        storeId: storeId || null,
        createdBy: userId,
        createdByName: req.user?.name,
        createdAt: new Date(),
        store: {
          name: `${req.user?.name?.split('@')[0] || 'My'}'s Store`,
          address: '',
          phone: '',
          email: req.user?.email || '',
          taxRate: 0,
          country: 'US',
          currency: 'USD'
        }
      });
      await settings.save();
      console.log(`✅ Created default store settings for user: ${req.user?.email}`);
    }
    
    res.json({
      success: true,
      settings: settings.store
    });
  } catch (error) {
    console.error('Get store settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update store settings (user-specific)
export const updateStoreSettings = async (req, res) => {
  try {
    const userId = req.user?.id;
    const storeId = req.body.storeId;
    
    let query = { createdBy: userId };
    if (storeId) {
      query.storeId = storeId;
    }
    
    let settings = await StoreSettings.findOne(query);
    
    if (!settings) {
      settings = new StoreSettings({
        createdBy: userId,
        createdByName: req.user?.name,
        storeId: storeId || null
      });
    }
    
    settings.store = { ...settings.store, ...req.body };
    settings.updatedBy = req.user.id;
    settings.updatedByName = req.user.name;
    settings.updatedAt = new Date();
    await settings.save();
    
    res.json({
      success: true,
      settings: settings.store,
      message: 'Store settings updated successfully'
    });
  } catch (error) {
    console.error('Update store settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get receipt settings (user-specific)
export const getReceiptSettings = async (req, res) => {
  try {
    const userId = req.user?.id;
    let settings = await StoreSettings.findOne({ createdBy: userId });
    if (!settings) {
      settings = new StoreSettings({ createdBy: userId, createdByName: req.user?.name });
      await settings.save();
    }
    
    res.json({
      success: true,
      settings: settings.receipt
    });
  } catch (error) {
    console.error('Get receipt settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update receipt settings (user-specific)
export const updateReceiptSettings = async (req, res) => {
  try {
    const userId = req.user?.id;
    let settings = await StoreSettings.findOne({ createdBy: userId });
    if (!settings) {
      settings = new StoreSettings({ createdBy: userId, createdByName: req.user?.name });
    }
    
    settings.receipt = { ...settings.receipt, ...req.body };
    settings.updatedBy = req.user.id;
    settings.updatedByName = req.user.name;
    settings.updatedAt = new Date();
    await settings.save();
    
    res.json({
      success: true,
      settings: settings.receipt,
      message: 'Receipt settings updated successfully'
    });
  } catch (error) {
    console.error('Update receipt settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get hardware settings (user-specific)
export const getHardwareSettings = async (req, res) => {
  try {
    const userId = req.user?.id;
    let settings = await StoreSettings.findOne({ createdBy: userId });
    if (!settings) {
      settings = new StoreSettings({ createdBy: userId, createdByName: req.user?.name });
      await settings.save();
    }
    
    res.json({
      success: true,
      settings: settings.hardware
    });
  } catch (error) {
    console.error('Get hardware settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update hardware settings (user-specific)
export const updateHardwareSettings = async (req, res) => {
  try {
    const userId = req.user?.id;
    let settings = await StoreSettings.findOne({ createdBy: userId });
    if (!settings) {
      settings = new StoreSettings({ createdBy: userId, createdByName: req.user?.name });
    }
    
    settings.hardware = { ...settings.hardware, ...req.body };
    settings.updatedBy = req.user.id;
    settings.updatedByName = req.user.name;
    settings.updatedAt = new Date();
    await settings.save();
    
    res.json({
      success: true,
      settings: settings.hardware,
      message: 'Hardware settings updated successfully'
    });
  } catch (error) {
    console.error('Update hardware settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== BACKUP & RESTORE (User-specific) ====================

export const createBackup = async (req, res) => {
  try {
    const userId = req.user?.id;
    const settings = await StoreSettings.findOne({ createdBy: userId });
    const users = await User.find({}).select('-password');
    
    const backup = {
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      userId: userId,
      settings,
      users,
      createdBy: req.user.name,
      createdById: req.user.id
    };
    
    if (settings) {
      settings.backup.lastBackup = new Date();
      await settings.save();
    }
    
    res.json({
      success: true,
      backupId: `backup_${userId}_${Date.now()}`,
      data: backup,
      message: 'Backup created successfully'
    });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const restoreBackup = async (req, res) => {
  try {
    const { backupData } = req.body;
    const userId = req.user?.id;
    
    if (!backupData) {
      return res.status(400).json({
        success: false,
        error: 'No backup data provided'
      });
    }
    
    // Verify backup belongs to this user
    if (backupData.userId && backupData.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'This backup belongs to a different user'
      });
    }
    
    // Restore settings
    if (backupData.settings) {
      let settings = await StoreSettings.findOne({ createdBy: userId });
      if (!settings) settings = new StoreSettings({ createdBy: userId, createdByName: req.user?.name });
      
      if (backupData.settings.store) settings.store = backupData.settings.store;
      if (backupData.settings.receipt) settings.receipt = backupData.settings.receipt;
      if (backupData.settings.hardware) settings.hardware = backupData.settings.hardware;
      if (backupData.settings.users) settings.users = backupData.settings.users;
      if (backupData.settings.backup) settings.backup = backupData.settings.backup;
      if (backupData.settings.appearance) settings.appearance = backupData.settings.appearance;
      
      settings.updatedBy = req.user.id;
      settings.updatedByName = req.user.name;
      settings.updatedAt = new Date();
      await settings.save();
    }
    
    res.json({
      success: true,
      message: 'Backup restored successfully'
    });
  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getBackups = async (req, res) => {
  try {
    res.json({
      success: true,
      backups: []
    });
  } catch (error) {
    console.error('Get backups error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== USER MANAGEMENT ====================

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
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
    
    // Create default settings for this user
    const defaultSettings = new StoreSettings({
      createdBy: user._id,
      createdByName: name,
      store: {
        name: `${name.split('@')[0]}'s Store`,
        address: '',
        phone: '',
        email: email,
        taxRate: 0,
        country: 'US',
        currency: 'USD'
      }
    });
    await defaultSettings.save();
    console.log(`✅ Created default settings for new user: ${email}`);
    
    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
        createdAt: user.createdAt
      },
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
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
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive
      },
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account'
      });
    }
    
    // Delete user's settings
    await StoreSettings.deleteOne({ createdBy: user._id });
    
    await User.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
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
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== SYSTEM ====================

export const getSystemInfo = async (req, res) => {
  try {
    const userId = req.user?.id;
    const settings = await StoreSettings.findOne({ createdBy: userId });
    const userCount = await User.countDocuments();
    
    res.json({
      success: true,
      info: {
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        database: 'MongoDB Atlas',
        lastBackup: settings?.backup?.lastBackup || null,
        userCount,
        uptime: process.uptime()
      }
    });
  } catch (error) {
    console.error('Get system info error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const clearCache = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getSystemLogs = async (req, res) => {
  try {
    res.json({
      success: true,
      logs: []
    });
  } catch (error) {
    console.error('Get system logs error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};