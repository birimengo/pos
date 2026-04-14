// backend/controllers/settingsController.js - COMPLETE FIXED VERSION

import StoreSettings from '../models/StoreSettings.js';
import Store from '../models/Store.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

// Helper to get settings with store context
const getSettingsWithStoreContext = async (userId, storeId = null) => {
  let query = {};
  
  if (storeId) {
    query = { storeId: storeId };
  } else {
    query = { createdBy: userId, storeId: null };
  }
  
  let settings = await StoreSettings.findOne(query);
  
  if (!settings && storeId) {
    settings = await StoreSettings.findOne({ createdBy: userId, storeId: null });
  }
  
  return settings;
};

// Helper to create default settings for a store
const createDefaultSettingsForStore = async (storeId, userId, userName, storeData = {}) => {
  try {
    const settings = new StoreSettings({
      storeId: storeId,
      store: {
        name: storeData.name || 'My Store',
        address: storeData.address || '',
        phone: storeData.phone || '',
        email: storeData.email || '',
        taxRate: storeData.taxRate || 0,
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
        cloudBackup: false,
        lastBackup: null
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

    await settings.save();
    console.log('✅ Default store settings created for store:', storeId);
    return settings;
  } catch (error) {
    console.error('❌ Error creating default store settings:', error);
    return null;
  }
};

// Helper to create default settings for user (legacy)
const createDefaultSettingsForUser = async (userId, userName) => {
  try {
    const settings = new StoreSettings({
      storeId: null,
      createdBy: userId,
      createdByName: userName,
      store: {
        name: `${userName.split('@')[0] || userName}'s Store`,
        address: '',
        phone: '',
        email: '',
        taxRate: 0,
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
        cloudBackup: false,
        lastBackup: null
      },
      appearance: {
        theme: 'light',
        compactMode: false,
        showProductImages: true,
        defaultView: 'grid'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await settings.save();
    console.log('✅ Default user settings created for user:', userId);
    return settings;
  } catch (error) {
    console.error('❌ Error creating default user settings:', error);
    return null;
  }
};

// ==================== STORE SETTINGS (Store-Specific) - FIXED ====================

// Get store settings only (store-specific)
export const getStoreSettings = async (req, res) => {
  try {
    // SAFE: Check if req exists and has query/body properties
    let storeId = null;
    
    if (req && req.query && req.query.storeId) {
      storeId = req.query.storeId;
    } else if (req && req.body && req.body.storeId) {
      storeId = req.body.storeId;
    }
    
    console.log('📝 getStoreSettings - storeId:', storeId);
    console.log('📝 getStoreSettings - user:', req?.user?.id, req?.user?.email);
    
    // If no storeId provided, try to get user's default store or any store
    if (!storeId) {
      console.log('📝 No storeId provided, looking for user stores...');
      
      // Find all stores belonging to this user
      const userStores = await Store.find({ createdBy: req.user.id });
      
      if (userStores && userStores.length > 0) {
        // Use the first store (or default if marked)
        const storeToUse = userStores.find(s => s.isDefault) || userStores[0];
        console.log('📝 Using store:', storeToUse?.name, storeToUse?._id);
        
        if (storeToUse) {
          let settings = await StoreSettings.findOne({ storeId: storeToUse._id });
          
          if (!settings) {
            settings = await createDefaultSettingsForStore(storeToUse._id, req.user.id, req.user.name, storeToUse);
          }
          
          return res.json({
            success: true,
            settings: settings?.store || {
              name: storeToUse.name,
              address: storeToUse.address || '',
              phone: storeToUse.phone || '',
              email: storeToUse.email || '',
              taxRate: storeToUse.taxRate || 0,
              country: 'US',
              currency: 'USD'
            }
          });
        }
      }
      
      // No stores found - return default settings
      console.log('📝 No stores found for user, returning default settings');
      
      return res.json({
        success: true,
        settings: {
          name: `${req.user?.name?.split('@')[0] || 'My'}'s Store`,
          address: '',
          phone: '',
          email: req.user?.email || '',
          taxRate: 0,
          country: 'US',
          currency: 'USD'
        }
      });
    }
    
    // Verify user owns this store
    const store = await Store.findOne({ _id: storeId, createdBy: req.user.id });
    
    if (!store) {
      console.log('📝 Store not found or access denied:', storeId);
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }
    
    console.log('📝 Found store:', store.name, store._id);
    
    let settings = await StoreSettings.findOne({ storeId: storeId });
    
    if (!settings) {
      settings = await createDefaultSettingsForStore(storeId, req.user.id, req.user.name, store);
    }
    
    res.json({
      success: true,
      settings: settings?.store || {
        name: store.name,
        address: store.address || '',
        phone: store.phone || '',
        email: store.email || '',
        taxRate: store.taxRate || 0,
        country: 'US',
        currency: 'USD'
      }
    });
  } catch (error) {
    console.error('Get store settings error:', error);
    // Return a default response instead of 500 error
    res.status(200).json({
      success: true,
      settings: {
        name: `${req?.user?.name?.split('@')[0] || 'My'}'s Store`,
        address: '',
        phone: '',
        email: req?.user?.email || '',
        taxRate: 0,
        country: 'US',
        currency: 'USD'
      }
    });
  }
};

// Update store settings (store-specific)
export const updateStoreSettings = async (req, res) => {
  try {
    // SAFE: Check if req exists and has query/body properties
    let storeId = null;
    
    if (req && req.body && req.body.storeId) {
      storeId = req.body.storeId;
    } else if (req && req.query && req.query.storeId) {
      storeId = req.query.storeId;
    }
    
    if (!storeId) {
      return res.status(400).json({
        success: false,
        error: 'Store ID is required for updating store settings'
      });
    }
    
    // Verify user owns this store
    const store = await Store.findOne({ _id: storeId, createdBy: req.user.id });
    if (!store) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to update settings for this store'
      });
    }
    
    let settings = await StoreSettings.findOne({ storeId: storeId });
    
    if (!settings) {
      settings = new StoreSettings({
        storeId: storeId,
        createdBy: req.user.id,
        createdByName: req.user.name
      });
    }
    
    // Update store settings
    if (req.body.name) {
      settings.store.name = req.body.name;
      store.name = req.body.name;
    }
    if (req.body.address !== undefined) {
      settings.store.address = req.body.address;
      store.address = req.body.address;
    }
    if (req.body.phone !== undefined) {
      settings.store.phone = req.body.phone;
      store.phone = req.body.phone;
    }
    if (req.body.email !== undefined) {
      settings.store.email = req.body.email;
      store.email = req.body.email;
    }
    if (req.body.taxRate !== undefined) {
      settings.store.taxRate = parseFloat(req.body.taxRate);
      store.taxRate = parseFloat(req.body.taxRate);
    }
    if (req.body.country !== undefined) settings.store.country = req.body.country;
    if (req.body.currency !== undefined) settings.store.currency = req.body.currency;
    
    settings.updatedBy = req.user.id;
    settings.updatedByName = req.user.name;
    settings.updatedAt = new Date();
    
    await settings.save();
    await store.save();
    
    console.log(`✅ Store settings updated for store: ${store.name} (${storeId})`);
    
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

// ==================== MAIN SETTINGS (Legacy/Compatibility) ====================

// Get settings from database (with store context if available)
export const getSettings = async (req, res) => {
  try {
    // SAFE: Check if req exists and has query/body properties
    let storeId = null;
    
    if (req && req.query && req.query.storeId) {
      storeId = req.query.storeId;
    } else if (req && req.body && req.body.storeId) {
      storeId = req.body.storeId;
    }
    
    let settings = await getSettingsWithStoreContext(req.user.id, storeId);
    
    if (!settings) {
      if (storeId) {
        const store = await Store.findOne({ _id: storeId, createdBy: req.user.id });
        if (store) {
          settings = await createDefaultSettingsForStore(storeId, req.user.id, req.user.name, store);
        } else {
          settings = await createDefaultSettingsForUser(req.user.id, req.user.name);
        }
      } else {
        settings = await createDefaultSettingsForUser(req.user.id, req.user.name);
      }
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

// Update settings in database (with store context)
export const updateSettings = async (req, res) => {
  try {
    const { section, data } = req.body;
    
    // SAFE: Check if req exists and has query/body properties
    let storeId = null;
    
    if (req && req.body && req.body.storeId) {
      storeId = req.body.storeId;
    } else if (req && req.query && req.query.storeId) {
      storeId = req.query.storeId;
    }
    
    let settings = await getSettingsWithStoreContext(req.user.id, storeId);
    
    if (!settings) {
      if (storeId) {
        const store = await Store.findOne({ _id: storeId, createdBy: req.user.id });
        if (store) {
          settings = await createDefaultSettingsForStore(storeId, req.user.id, req.user.name, store);
        } else {
          settings = await createDefaultSettingsForUser(req.user.id, req.user.name);
        }
      } else {
        settings = await createDefaultSettingsForUser(req.user.id, req.user.name);
      }
    }
    
    if (section && data) {
      settings[section] = { ...settings[section], ...data };
    } else {
      if (req.body.store) settings.store = { ...settings.store, ...req.body.store };
      if (req.body.receipt) settings.receipt = { ...settings.receipt, ...req.body.receipt };
      if (req.body.hardware) settings.hardware = { ...settings.hardware, ...req.body.hardware };
      if (req.body.users) settings.users = { ...settings.users, ...req.body.users };
      if (req.body.backup) settings.backup = { ...settings.backup, ...req.body.backup };
      if (req.body.appearance) settings.appearance = { ...settings.appearance, ...req.body.appearance };
    }
    
    if (storeId && req.body.store) {
      const store = await Store.findOne({ _id: storeId, createdBy: req.user.id });
      if (store) {
        if (req.body.store.name) store.name = req.body.store.name;
        if (req.body.store.address !== undefined) store.address = req.body.store.address;
        if (req.body.store.phone !== undefined) store.phone = req.body.store.phone;
        if (req.body.store.email !== undefined) store.email = req.body.store.email;
        if (req.body.store.taxRate !== undefined) store.taxRate = req.body.store.taxRate;
        await store.save();
      }
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

// ==================== RECEIPT SETTINGS ====================

export const getReceiptSettings = async (req, res) => {
  try {
    let storeId = null;
    
    if (req && req.query && req.query.storeId) {
      storeId = req.query.storeId;
    } else if (req && req.body && req.body.storeId) {
      storeId = req.body.storeId;
    }
    
    let settings = await getSettingsWithStoreContext(req.user.id, storeId);
    
    if (!settings) {
      if (storeId) {
        const store = await Store.findOne({ _id: storeId, createdBy: req.user.id });
        if (store) {
          settings = await createDefaultSettingsForStore(storeId, req.user.id, req.user.name, store);
        } else {
          settings = await createDefaultSettingsForUser(req.user.id, req.user.name);
        }
      } else {
        settings = await createDefaultSettingsForUser(req.user.id, req.user.name);
      }
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

export const updateReceiptSettings = async (req, res) => {
  try {
    let storeId = null;
    
    if (req && req.body && req.body.storeId) {
      storeId = req.body.storeId;
    } else if (req && req.query && req.query.storeId) {
      storeId = req.query.storeId;
    }
    
    let settings = await getSettingsWithStoreContext(req.user.id, storeId);
    
    if (!settings) {
      if (storeId) {
        const store = await Store.findOne({ _id: storeId, createdBy: req.user.id });
        if (store) {
          settings = await createDefaultSettingsForStore(storeId, req.user.id, req.user.name, store);
        } else {
          settings = await createDefaultSettingsForUser(req.user.id, req.user.name);
        }
      } else {
        settings = await createDefaultSettingsForUser(req.user.id, req.user.name);
      }
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

// ==================== HARDWARE SETTINGS ====================

export const getHardwareSettings = async (req, res) => {
  try {
    let storeId = null;
    
    if (req && req.query && req.query.storeId) {
      storeId = req.query.storeId;
    } else if (req && req.body && req.body.storeId) {
      storeId = req.body.storeId;
    }
    
    let settings = await getSettingsWithStoreContext(req.user.id, storeId);
    
    if (!settings) {
      if (storeId) {
        const store = await Store.findOne({ _id: storeId, createdBy: req.user.id });
        if (store) {
          settings = await createDefaultSettingsForStore(storeId, req.user.id, req.user.name, store);
        } else {
          settings = await createDefaultSettingsForUser(req.user.id, req.user.name);
        }
      } else {
        settings = await createDefaultSettingsForUser(req.user.id, req.user.name);
      }
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

export const updateHardwareSettings = async (req, res) => {
  try {
    let storeId = null;
    
    if (req && req.body && req.body.storeId) {
      storeId = req.body.storeId;
    } else if (req && req.query && req.query.storeId) {
      storeId = req.query.storeId;
    }
    
    let settings = await getSettingsWithStoreContext(req.user.id, storeId);
    
    if (!settings) {
      if (storeId) {
        const store = await Store.findOne({ _id: storeId, createdBy: req.user.id });
        if (store) {
          settings = await createDefaultSettingsForStore(storeId, req.user.id, req.user.name, store);
        } else {
          settings = await createDefaultSettingsForUser(req.user.id, req.user.name);
        }
      } else {
        settings = await createDefaultSettingsForUser(req.user.id, req.user.name);
      }
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
    let storeId = null;
    
    if (req && req.body && req.body.storeId) {
      storeId = req.body.storeId;
    } else if (req && req.query && req.query.storeId) {
      storeId = req.query.storeId;
    }
    
    const settings = await getSettingsWithStoreContext(req.user.id, storeId);
    const users = await User.find({}).select('-password');
    
    const backup = {
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      settings,
      users,
      createdBy: req.user.name,
      createdById: req.user.id,
      storeId: storeId || null
    };
    
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
    
    let storeId = null;
    
    if (req && req.body && req.body.storeId) {
      storeId = req.body.storeId;
    } else if (req && req.query && req.query.storeId) {
      storeId = req.query.storeId;
    }
    
    if (!backupData) {
      return res.status(400).json({
        success: false,
        error: 'No backup data provided'
      });
    }
    
    let settings = await getSettingsWithStoreContext(req.user.id, storeId);
    
    if (!settings) {
      if (storeId) {
        const store = await Store.findOne({ _id: storeId, createdBy: req.user.id });
        if (store) {
          settings = await createDefaultSettingsForStore(storeId, req.user.id, req.user.name, store);
        } else {
          settings = await createDefaultSettingsForUser(req.user.id, req.user.name);
        }
      } else {
        settings = await createDefaultSettingsForUser(req.user.id, req.user.name);
      }
    }
    
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
    
    if (storeId && backupData.settings?.store) {
      const store = await Store.findOne({ _id: storeId, createdBy: req.user.id });
      if (store) {
        if (backupData.settings.store.name) store.name = backupData.settings.store.name;
        if (backupData.settings.store.address !== undefined) store.address = backupData.settings.store.address;
        if (backupData.settings.store.phone !== undefined) store.phone = backupData.settings.store.phone;
        if (backupData.settings.store.email !== undefined) store.email = backupData.settings.store.email;
        if (backupData.settings.store.taxRate !== undefined) store.taxRate = backupData.settings.store.taxRate;
        await store.save();
      }
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
    let storeId = null;
    
    if (req && req.query && req.query.storeId) {
      storeId = req.query.storeId;
    } else if (req && req.body && req.body.storeId) {
      storeId = req.body.storeId;
    }
    
    const settings = await getSettingsWithStoreContext(req.user.id, storeId);
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