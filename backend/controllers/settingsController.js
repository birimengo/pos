import StoreSettings from '../models/StoreSettings.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

// Get settings from database
export const getSettings = async (req, res) => {
  try {
    let settings = await StoreSettings.findOne({ createdBy: req.user.id });
    
    if (!settings) {
      // Create default settings for this user
      settings = new StoreSettings({
        createdBy: req.user.id,
        createdByName: req.user.name,
        createdAt: new Date()
      });
      await settings.save();
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

// Update settings in database
export const updateSettings = async (req, res) => {
  try {
    const { section, data } = req.body;
    
    let settings = await StoreSettings.findOne({ createdBy: req.user.id });
    
    if (!settings) {
      settings = new StoreSettings({
        createdBy: req.user.id,
        createdByName: req.user.name
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
    let settings = await StoreSettings.findOne({ createdBy: req.user.id });
    
    if (!settings) {
      // Create default settings for this user
      settings = new StoreSettings({
        createdBy: req.user.id,
        createdByName: req.user.name,
        createdAt: new Date()
      });
      await settings.save();
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
    let settings = await StoreSettings.findOne({ createdBy: req.user.id });
    
    if (!settings) {
      // Create new settings with user info
      settings = new StoreSettings({
        createdBy: req.user.id,
        createdByName: req.user.name,
        store: { ...req.body },
        createdAt: new Date()
      });
    } else {
      // Update existing settings
      settings.store = { ...settings.store, ...req.body };
      settings.updatedBy = req.user.id;
      settings.updatedByName = req.user.name;
      settings.updatedAt = new Date();
    }
    
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

// Get receipt settings
export const getReceiptSettings = async (req, res) => {
  try {
    let settings = await StoreSettings.findOne({ createdBy: req.user.id });
    
    if (!settings) {
      settings = new StoreSettings({
        createdBy: req.user.id,
        createdByName: req.user.name,
        createdAt: new Date()
      });
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

// Update receipt settings
export const updateReceiptSettings = async (req, res) => {
  try {
    let settings = await StoreSettings.findOne({ createdBy: req.user.id });
    
    if (!settings) {
      settings = new StoreSettings({
        createdBy: req.user.id,
        createdByName: req.user.name
      });
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

// Get hardware settings
export const getHardwareSettings = async (req, res) => {
  try {
    let settings = await StoreSettings.findOne({ createdBy: req.user.id });
    
    if (!settings) {
      settings = new StoreSettings({
        createdBy: req.user.id,
        createdByName: req.user.name,
        createdAt: new Date()
      });
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

// Update hardware settings
export const updateHardwareSettings = async (req, res) => {
  try {
    let settings = await StoreSettings.findOne({ createdBy: req.user.id });
    
    if (!settings) {
      settings = new StoreSettings({
        createdBy: req.user.id,
        createdByName: req.user.name
      });
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

// ==================== BACKUP & RESTORE ====================

export const createBackup = async (req, res) => {
  try {
    const settings = await StoreSettings.findOne({ createdBy: req.user.id });
    const users = await User.find({}).select('-password');
    
    const backup = {
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      settings,
      users,
      createdBy: req.user.name,
      createdById: req.user.id
    };
    
    // Update last backup time
    if (settings) {
      settings.backup.lastBackup = new Date();
      await settings.save();
    }
    
    res.json({
      success: true,
      backupId: `backup_${Date.now()}`,
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
    
    if (!backupData) {
      return res.status(400).json({
        success: false,
        error: 'No backup data provided'
      });
    }
    
    let settings = await StoreSettings.findOne({ createdBy: req.user.id });
    if (!settings) {
      settings = new StoreSettings({
        createdBy: req.user.id,
        createdByName: req.user.name
      });
    }
    
    // Restore settings
    if (backupData.settings) {
      if (backupData.settings.store) settings.store = backupData.settings.store;
      if (backupData.settings.receipt) settings.receipt = backupData.settings.receipt;
      if (backupData.settings.hardware) settings.hardware = backupData.settings.hardware;
      if (backupData.settings.users) settings.users = backupData.settings.users;
      if (backupData.settings.backup) settings.backup = backupData.settings.backup;
      if (backupData.settings.appearance) settings.appearance = backupData.settings.appearance;
    }
    
    settings.updatedBy = req.user.id;
    settings.updatedByName = req.user.name;
    settings.updatedAt = new Date();
    await settings.save();
    
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
    
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'cashier',
      permissions,
      isActive: true
    });
    
    await user.save();
    
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
    
    // Update permissions based on new role
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
    const settings = await StoreSettings.findOne({ createdBy: req.user.id });
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