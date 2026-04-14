// backend/controllers/storeController.js
import mongoose from 'mongoose';
import Store from '../models/Store.js';
import StoreSettings from '../models/StoreSettings.js';
import Product from '../models/Product.js';
import Transaction from '../models/Transaction.js';
import Customer from '../models/Customer.js';
import Transfer from '../models/Transfer.js';
import User from '../models/User.js';

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

// Helper function to format store response
const formatStoreResponse = (store) => ({
  _id: store._id,
  id: store._id,
  name: store.name,
  address: store.address,
  city: store.city,
  state: store.state,
  zip: store.zip,
  phone: store.phone,
  email: store.email,
  manager: store.manager,
  taxRate: store.taxRate,
  openTime: store.openTime,
  closeTime: store.closeTime,
  timezone: store.timezone,
  settings: store.settings,
  active: store.active,
  open: store.open !== undefined ? store.open : true,
  isDefault: store.isDefault,
  createdAt: store.createdAt,
  updatedAt: store.updatedAt,
  createdBy: store.createdBy,
  createdByName: store.createdByName,
  updatedBy: store.updatedBy,
  updatedByName: store.updatedByName,
  users: store.users || []
});

// Helper to create store settings
const createStoreSettings = async (storeId, userId, userName, storeData) => {
  try {
    const settings = new StoreSettings({
      storeId: storeId,
      store: {
        name: storeData.name,
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

    await settings.save();
    console.log('✅ Store settings created for store:', storeId);
    return settings;
  } catch (error) {
    console.error('❌ Error creating store settings:', error);
    return null;
  }
};

// ==================== CREATE STORE (ADMIN ONLY) ====================

export const createStore = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can create stores'
      });
    }

    console.log('📤 Create store request received');
    console.log('👤 Admin user:', req.user.email);
    console.log('👤 User ID:', req.user.id);

    if (!req.body.name || req.body.name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Store name is required'
      });
    }

    const storeData = {
      name: req.body.name.trim(),
      address: req.body.address || '',
      city: req.body.city || '',
      state: req.body.state || '',
      zip: req.body.zip || '',
      phone: req.body.phone || '',
      email: req.body.email || req.user.email,
      manager: req.body.manager || req.user.name,
      taxRate: req.body.taxRate || 0,
      openTime: req.body.openTime || '09:00',
      closeTime: req.body.closeTime || '21:00',
      timezone: req.body.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      open: req.body.open !== undefined ? req.body.open : true,
      settings: {
        receiptHeader: req.body.settings?.receiptHeader || 'Thank you for shopping!',
        receiptFooter: req.body.settings?.receiptFooter || 'Returns accepted within 30 days',
        currency: req.body.settings?.currency || 'USD'
      },
      active: req.body.active !== false,
      isDefault: false,
      createdBy: req.user.id,
      createdByName: req.user.name,
      users: [req.user.id]
    };

    console.log('📋 Store data to save:', {
      name: storeData.name,
      open: storeData.open,
      createdBy: storeData.createdBy,
      isDefault: storeData.isDefault
    });

    const store = new Store(storeData);
    await store.save();

    // Create store-specific settings
    await createStoreSettings(store._id, req.user.id, req.user.name, storeData);

    // If this is the user's first store, make it default
    const userStoreCount = await Store.countDocuments({
      createdBy: req.user.id
    });

    if (userStoreCount === 1) {
      store.isDefault = true;
      await store.save();
      console.log(`📌 Set ${store.name} as default store for user`);
    }

    console.log('✅ Store created successfully by admin:', {
      id: store._id,
      name: store.name,
      open: store.open,
      createdBy: store.createdBy,
      isDefault: store.isDefault
    });

    res.status(201).json({
      success: true,
      store: formatStoreResponse(store),
      message: 'Store created successfully'
    });
  } catch (error) {
    console.error('❌ Create store error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ==================== GET ALL STORES (USER SPECIFIC) ====================

export const getAllStores = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    
    console.log(`📦 Fetching stores for user: ${userEmail} (ID: ${userId})`);
    
    // ONLY stores created by this user
    const query = { createdBy: userId };
    
    console.log('Query filter:', JSON.stringify(query));
    
    const stores = await Store.find(query).sort({ createdAt: -1 });
    
    console.log(`📦 Retrieved ${stores.length} stores for user ${userEmail}`);
    
    stores.forEach(store => {
      console.log(`  - Store: ${store.name} (ID: ${store._id}, Created by: ${store.createdBy}, Open: ${store.open})`);
    });
    
    res.json({
      success: true,
      stores: stores.map(store => formatStoreResponse(store)),
      userId
    });
  } catch (error) {
    console.error('❌ Get stores error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET STORE BY ID ====================

export const getStoreById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID format'
      });
    }
    
    const store = await Store.findOne({ _id: id, createdBy: userId });
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found or you do not have access'
      });
    }
    
    console.log(`📋 Store found: ${store.name} (Open: ${store.open})`);
    
    res.json({
      success: true,
      store: formatStoreResponse(store)
    });
  } catch (error) {
    console.error('❌ Get store error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== UPDATE STORE ====================

export const updateStore = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can update stores'
      });
    }
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID format'
      });
    }
    
    const store = await Store.findOne({ _id: id, createdBy: userId });
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found or you do not have permission to edit it'
      });
    }

    const updateData = {
      name: req.body.name?.trim() || store.name,
      address: req.body.address !== undefined ? req.body.address : store.address,
      city: req.body.city !== undefined ? req.body.city : store.city,
      state: req.body.state !== undefined ? req.body.state : store.state,
      zip: req.body.zip !== undefined ? req.body.zip : store.zip,
      phone: req.body.phone !== undefined ? req.body.phone : store.phone,
      email: req.body.email !== undefined ? req.body.email : store.email,
      manager: req.body.manager !== undefined ? req.body.manager : store.manager,
      taxRate: req.body.taxRate !== undefined ? req.body.taxRate : store.taxRate,
      openTime: req.body.openTime || store.openTime,
      closeTime: req.body.closeTime || store.closeTime,
      timezone: req.body.timezone || store.timezone,
      open: req.body.open !== undefined ? req.body.open : store.open,
      settings: {
        receiptHeader: req.body.settings?.receiptHeader || store.settings?.receiptHeader || '',
        receiptFooter: req.body.settings?.receiptFooter || store.settings?.receiptFooter || '',
        currency: req.body.settings?.currency || store.settings?.currency || 'USD'
      },
      active: req.body.active !== undefined ? req.body.active : store.active,
      isDefault: req.body.isDefault !== undefined ? req.body.isDefault : store.isDefault,
      updatedBy: req.user?.id,
      updatedByName: req.user?.name,
      updatedAt: Date.now()
    };

    if (updateData.isDefault && !store.isDefault) {
      await Store.updateMany(
        { _id: { $ne: store._id }, isDefault: true, createdBy: userId },
        { $set: { isDefault: false } }
      );
    }

    Object.assign(store, updateData);
    await store.save();

    // Update store settings if country or currency changed
    if (req.body.country || req.body.currency || req.body.taxRate !== undefined) {
      let storeSettings = await StoreSettings.findOne({ storeId: store._id });
      if (!storeSettings) {
        storeSettings = new StoreSettings({
          storeId: store._id,
          createdBy: userId,
          createdByName: req.user.name
        });
      }
      
      if (req.body.country) storeSettings.store.country = req.body.country;
      if (req.body.currency) storeSettings.store.currency = req.body.currency;
      if (req.body.taxRate !== undefined) storeSettings.store.taxRate = req.body.taxRate;
      if (req.body.name) storeSettings.store.name = req.body.name;
      if (req.body.address !== undefined) storeSettings.store.address = req.body.address;
      if (req.body.phone !== undefined) storeSettings.store.phone = req.body.phone;
      if (req.body.email !== undefined) storeSettings.store.email = req.body.email;
      
      storeSettings.updatedAt = new Date();
      await storeSettings.save();
      console.log(`✅ Store settings updated for store: ${store.name}`);
    }

    console.log(`✅ Store updated: ${store.name} (Open: ${store.open})`);

    res.json({
      success: true,
      store: formatStoreResponse(store),
      message: 'Store updated successfully'
    });
  } catch (error) {
    console.error('❌ Update store error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// ==================== DELETE STORE ====================

export const deleteStore = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can delete stores'
      });
    }
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID format'
      });
    }
    
    const store = await Store.findOne({ _id: id, createdBy: userId });
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found or you do not have permission to delete it'
      });
    }

    const [productCount, transactionCount, customerCount] = await Promise.all([
      Product.countDocuments({ storeId: store._id }),
      Transaction.countDocuments({ storeId: store._id }),
      Customer.countDocuments({ storeId: store._id })
    ]);

    if (productCount > 0 || transactionCount > 0 || customerCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete store with existing data. Found: ${productCount} products, ${transactionCount} transactions, ${customerCount} customers.`,
        details: { productCount, transactionCount, customerCount }
      });
    }

    // Delete store settings
    await StoreSettings.deleteOne({ storeId: store._id });
    
    // Delete the store
    await Store.findByIdAndDelete(id);

    // If this was the default store, set another as default
    if (store.isDefault) {
      const anotherStore = await Store.findOne({ createdBy: userId, _id: { $ne: id } });
      if (anotherStore) {
        anotherStore.isDefault = true;
        await anotherStore.save();
        console.log(`📌 Set ${anotherStore.name} as new default store`);
      }
    }

    res.json({
      success: true,
      message: 'Store deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete store error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== TOGGLE STORE OPEN/CLOSE STATUS ====================

export const toggleStoreStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    console.log(`🔄 Toggling store status for ID: ${id}`);
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID format'
      });
    }
    
    const store = await Store.findOne({ _id: id, createdBy: userId });
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found or you do not have access'
      });
    }
    
    console.log(`📋 Current store status: ${store.name} is ${store.open ? 'OPEN' : 'CLOSED'}`);
    
    store.open = !store.open;
    store.updatedBy = userId;
    store.updatedByName = req.user?.name;
    store.updatedAt = new Date();
    
    await store.save();
    
    const statusText = store.open ? 'OPEN' : 'CLOSED';
    console.log(`✅ Store ${store.name} is now ${statusText} by ${req.user?.email}`);
    
    const updatedStore = formatStoreResponse(store);
    
    res.json({
      success: true,
      store: updatedStore,
      message: `Store is now ${store.open ? 'open' : 'closed'}`,
      isOpen: store.open
    });
  } catch (error) {
    console.error('❌ Toggle store status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== UPDATE STORE HOURS ====================

export const updateStoreHours = async (req, res) => {
  try {
    const { id } = req.params;
    const { openTime, closeTime } = req.body;
    const userId = req.user?.id;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID format'
      });
    }
    
    const store = await Store.findOne({ _id: id, createdBy: userId });
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found or you do not have access'
      });
    }
    
    if (openTime) store.openTime = openTime;
    if (closeTime) store.closeTime = closeTime;
    store.updatedBy = userId;
    store.updatedByName = req.user?.name;
    store.updatedAt = new Date();
    
    await store.save();
    
    console.log(`✅ Store ${store.name} hours updated: ${store.openTime} - ${store.closeTime}`);
    
    res.json({
      success: true,
      store: formatStoreResponse(store),
      message: 'Store hours updated successfully'
    });
  } catch (error) {
    console.error('❌ Update store hours error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== ASSIGN USER TO STORE ====================

export const assignUserToStore = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const currentUserId = req.user?.id;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can assign users to stores'
      });
    }
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID format'
      });
    }
    
    const store = await Store.findOne({ _id: id, createdBy: currentUserId });
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found or you do not have permission'
      });
    }
    
    const userToAssign = await User.findById(userId);
    if (!userToAssign) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (!store.users) {
      store.users = [];
    }
    
    if (store.users.includes(userId)) {
      return res.status(400).json({
        success: false,
        error: 'User is already assigned to this store'
      });
    }
    
    store.users.push(userId);
    await store.save();
    
    console.log(`✅ Admin ${req.user.email} assigned user ${userToAssign.email} to store ${store.name}`);
    
    res.json({
      success: true,
      message: `User ${userToAssign.name} assigned to store ${store.name} successfully`,
      store: formatStoreResponse(store)
    });
  } catch (error) {
    console.error('❌ Assign user to store error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== REMOVE USER FROM STORE ====================

export const removeUserFromStore = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const currentUserId = req.user?.id;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can remove users from stores'
      });
    }
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID format'
      });
    }
    
    const store = await Store.findOne({ _id: id, createdBy: currentUserId });
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found or you do not have permission'
      });
    }
    
    // Don't remove store owner
    if (store.createdBy && store.createdBy.toString() === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot remove the store owner from the store'
      });
    }
    
    if (!store.users || !store.users.includes(userId)) {
      return res.status(400).json({
        success: false,
        error: 'User is not assigned to this store'
      });
    }
    
    store.users = store.users.filter(uid => uid.toString() !== userId);
    await store.save();
    
    const user = await User.findById(userId);
    
    console.log(`✅ Admin ${req.user.email} removed user ${user?.email} from store ${store.name}`);
    
    res.json({
      success: true,
      message: `User ${user?.name || userId} removed from store ${store.name} successfully`,
      store: formatStoreResponse(store)
    });
  } catch (error) {
    console.error('❌ Remove user from store error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET STORE USERS ====================

export const getStoreUsers = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID format'
      });
    }
    
    const store = await Store.findOne({ _id: id, createdBy: userId });
    
    if (!store) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this store'
      });
    }
    
    const users = await User.find(
      { _id: { $in: store.users || [] } },
      '-password'
    );
    
    res.json({
      success: true,
      users,
      storeName: store.name,
      totalUsers: users.length
    });
  } catch (error) {
    console.error('❌ Get store users error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET ALL USERS FOR ASSIGNMENT ====================

export const getAllUsersForAssignment = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can view all users'
      });
    }
    
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    
    res.json({
      success: true,
      users: users.map(user => ({
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }))
    });
  } catch (error) {
    console.error('❌ Get all users error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET USER STORES ====================

export const getUserStores = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserRole = req.user?.role;
    
    if (requestingUserRole !== 'admin' && req.user?.id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own stores'
      });
    }
    
    const stores = await Store.find({ createdBy: userId }).sort({ name: 1 });
    
    res.json({
      success: true,
      stores: stores.map(store => formatStoreResponse(store))
    });
  } catch (error) {
    console.error('❌ Get user stores error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET DEFAULT STORE ====================

export const getDefaultStore = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    console.log(`🔍 Finding default store for user: ${req.user?.email} (ID: ${userId})`);
    
    let defaultStore = await Store.findOne({ 
      isDefault: true,
      createdBy: userId
    });
    
    if (!defaultStore) {
      defaultStore = await Store.findOne({ createdBy: userId });
      
      if (defaultStore) {
        defaultStore.isDefault = true;
        await defaultStore.save();
        console.log(`📌 Set ${defaultStore.name} as default store for user ${req.user?.email}`);
      }
    }
    
    if (!defaultStore) {
      console.log(`⚠️ No stores found for user ${req.user?.email}`);
      return res.status(404).json({
        success: false,
        error: 'No stores found for this user. Please create a store first.'
      });
    }
    
    console.log(`✅ Default store for ${req.user?.email}: ${defaultStore.name} (Open: ${defaultStore.open})`);
    
    res.json({
      success: true,
      store: formatStoreResponse(defaultStore)
    });
  } catch (error) {
    console.error('❌ Get default store error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== SET DEFAULT STORE ====================

export const setDefaultStore = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID format'
      });
    }
    
    const store = await Store.findOne({ _id: id, createdBy: userId });
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found or you do not have access'
      });
    }
    
    await Store.updateMany(
      { isDefault: true, createdBy: userId },
      { $set: { isDefault: false } }
    );
    
    store.isDefault = true;
    await store.save();
    
    res.json({
      success: true,
      message: 'Default store updated successfully',
      store: formatStoreResponse(store)
    });
  } catch (error) {
    console.error('❌ Set default store error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET STORE STATISTICS ====================

export const getStoreStats = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID format'
      });
    }
    
    const store = await Store.findOne({ _id: id, createdBy: userId });
    if (!store) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this store'
      });
    }
    
    const [productCount, transactionCount, customerCount, recentTransactions, totalRevenue] = await Promise.all([
      Product.countDocuments({ storeId: id }),
      Transaction.countDocuments({ storeId: id }),
      Customer.countDocuments({ storeId: id }),
      Transaction.find({ storeId: id })
        .sort({ createdAt: -1 })
        .limit(10),
      Transaction.aggregate([
        { $match: { storeId: new mongoose.Types.ObjectId(id), status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        productCount,
        transactionCount,
        customerCount,
        totalRevenue: totalRevenue[0]?.total || 0,
        recentTransactions
      }
    });
  } catch (error) {
    console.error('❌ Get store stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET STORE SETTINGS ====================

export const getStoreSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID format'
      });
    }
    
    const store = await Store.findOne({ _id: id, createdBy: userId });
    if (!store) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this store'
      });
    }
    
    let settings = await StoreSettings.findOne({ storeId: id });
    
    if (!settings) {
      settings = await createStoreSettings(id, userId, req.user.name, store);
    }
    
    res.json({
      success: true,
      settings: settings.store,
      receipt: settings.receipt,
      hardware: settings.hardware,
      users: settings.users,
      backup: settings.backup,
      appearance: settings.appearance
    });
  } catch (error) {
    console.error('❌ Get store settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== UPDATE STORE SETTINGS ====================

export const updateStoreSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { section, data } = req.body;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID format'
      });
    }
    
    const store = await Store.findOne({ _id: id, createdBy: userId });
    if (!store) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this store'
      });
    }
    
    let settings = await StoreSettings.findOne({ storeId: id });
    
    if (!settings) {
      settings = new StoreSettings({
        storeId: id,
        createdBy: userId,
        createdByName: req.user.name
      });
    }
    
    // Update the specific section
    if (section && data) {
      if (section === 'store') {
        settings.store = { ...settings.store, ...data };
        // Also update the main store record
        if (data.name) store.name = data.name;
        if (data.address !== undefined) store.address = data.address;
        if (data.phone !== undefined) store.phone = data.phone;
        if (data.email !== undefined) store.email = data.email;
        if (data.taxRate !== undefined) store.taxRate = data.taxRate;
        await store.save();
      } else {
        settings[section] = { ...settings[section], ...data };
      }
    } else {
      // Update all sections
      if (req.body.store) {
        settings.store = { ...settings.store, ...req.body.store };
        if (req.body.store.name) store.name = req.body.store.name;
        if (req.body.store.address !== undefined) store.address = req.body.store.address;
        if (req.body.store.phone !== undefined) store.phone = req.body.store.phone;
        if (req.body.store.email !== undefined) store.email = req.body.store.email;
        if (req.body.store.taxRate !== undefined) store.taxRate = req.body.store.taxRate;
        await store.save();
      }
      if (req.body.receipt) settings.receipt = { ...settings.receipt, ...req.body.receipt };
      if (req.body.hardware) settings.hardware = { ...settings.hardware, ...req.body.hardware };
      if (req.body.users) settings.users = { ...settings.users, ...req.body.users };
      if (req.body.backup) settings.backup = { ...settings.backup, ...req.body.backup };
      if (req.body.appearance) settings.appearance = { ...settings.appearance, ...req.body.appearance };
    }
    
    settings.updatedBy = userId;
    settings.updatedByName = req.user.name;
    settings.updatedAt = new Date();
    
    await settings.save();
    
    res.json({
      success: true,
      settings: settings.store,
      receipt: settings.receipt,
      hardware: settings.hardware,
      users: settings.users,
      backup: settings.backup,
      appearance: settings.appearance,
      message: 'Store settings updated successfully'
    });
  } catch (error) {
    console.error('❌ Update store settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET STORE INVENTORY ====================

export const getStoreInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { limit = 50, offset = 0, category } = req.query;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID format'
      });
    }
    
    const store = await Store.findOne({ _id: id, createdBy: userId });
    if (!store) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this store'
      });
    }
    
    const query = { storeId: id };
    if (category && category !== 'all') {
      query.category = category;
    }
    
    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ name: 1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit)),
      Product.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      products,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('❌ Get store inventory error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET STORE SALES ====================

export const getStoreSales = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID format'
      });
    }
    
    const store = await Store.findOne({ _id: id, createdBy: userId });
    if (!store) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this store'
      });
    }
    
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const salesData = await Transaction.aggregate([
      { $match: { storeId: new mongoose.Types.ObjectId(id), ...dateFilter } },
      {
        $group: {
          _id: {
            [groupBy === 'month' ? 'month' : 'day']: {
              $dateToString: {
                format: groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d',
                date: '$createdAt'
              }
            }
          },
          total: { $sum: '$total' },
          count: { $sum: 1 },
          average: { $avg: '$total' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    res.json({
      success: true,
      sales: salesData,
      groupBy
    });
  } catch (error) {
    console.error('❌ Get store sales error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== TRANSFER FUNCTIONS ====================

export const createTransfer = async (req, res) => {
  try {
    const transfer = new Transfer({
      fromStoreId: req.body.fromStoreId,
      fromStore: req.body.fromStore,
      toStoreId: req.body.toStoreId,
      toStore: req.body.toStore,
      productId: req.body.productId,
      product: req.body.product,
      productSku: req.body.productSku,
      quantity: req.body.quantity,
      status: 'pending',
      initiatedBy: req.user?.name || 'System',
      initiatedById: req.user?.id,
      notes: req.body.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await transfer.save();

    res.status(201).json({
      success: true,
      transfer
    });
  } catch (error) {
    console.error('❌ Create transfer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllTransfers = async (req, res) => {
  try {
    const { storeId } = req.query;
    let query = {};
    
    if (storeId) {
      query = {
        $or: [
          { fromStoreId: storeId },
          { toStoreId: storeId }
        ]
      };
    }
    
    const transfers = await Transfer.find(query).sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      transfers,
      count: transfers.length,
      filtered: !!storeId
    });
  } catch (error) {
    console.error('❌ Get transfers error:', error);
    res.status(200).json({ 
      success: true, 
      transfers: [],
      count: 0,
      error: error.message 
    });
  }
};

export const getTransfersByStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    
    if (!storeId) {
      return res.status(400).json({
        success: false,
        error: 'Store ID is required'
      });
    }
    
    const transfers = await Transfer.find({
      $or: [
        { fromStoreId: storeId },
        { toStoreId: storeId }
      ]
    }).sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      transfers,
      count: transfers.length
    });
  } catch (error) {
    console.error('❌ Get transfers by store error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTransferById = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'Transfer not found' });
    }
    res.json({ success: true, transfer });
  } catch (error) {
    console.error('❌ Get transfer by ID error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const approveTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'Transfer not found' });
    }

    transfer.status = 'in-transit';
    transfer.approvedBy = req.user?.name;
    transfer.approvedById = req.user?.id;
    transfer.approvedAt = new Date();
    transfer.updatedAt = new Date();
    await transfer.save();

    res.json({ success: true, transfer });
  } catch (error) {
    console.error('❌ Approve transfer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const completeTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'Transfer not found' });
    }

    const product = await Product.findById(transfer.productId);
    if (product) {
      if (!product.storeStock) product.storeStock = {};
      product.storeStock[transfer.fromStoreId] = (product.storeStock[transfer.fromStoreId] || 0) - transfer.quantity;
      product.storeStock[transfer.toStoreId] = (product.storeStock[transfer.toStoreId] || 0) + transfer.quantity;
      product.stock = Object.values(product.storeStock).reduce((a, b) => a + b, 0);
      await product.save();
    }

    transfer.status = 'completed';
    transfer.completedBy = req.user?.name;
    transfer.completedById = req.user?.id;
    transfer.completedAt = new Date();
    transfer.updatedAt = new Date();
    await transfer.save();

    res.json({ success: true, transfer });
  } catch (error) {
    console.error('❌ Complete transfer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const cancelTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'Transfer not found' });
    }

    transfer.status = 'cancelled';
    transfer.cancelledBy = req.user?.name;
    transfer.cancelledById = req.user?.id;
    transfer.cancelledAt = new Date();
    transfer.updatedAt = new Date();
    await transfer.save();

    res.json({ success: true, transfer });
  } catch (error) {
    console.error('❌ Cancel transfer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'Transfer not found' });
    }

    await Transfer.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Transfer deleted successfully' });
  } catch (error) {
    console.error('❌ Delete transfer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== BULK OPERATIONS ====================

export const bulkCreateStores = async (req, res) => {
  try {
    const { stores } = req.body;
    const userId = req.user?.id;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can bulk create stores'
      });
    }
    
    if (!stores || !Array.isArray(stores) || stores.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Stores array is required'
      });
    }
    
    const createdStores = [];
    for (const storeData of stores) {
      const store = new Store({
        ...storeData,
        createdBy: userId,
        createdByName: req.user?.name,
        users: [userId],
        open: storeData.open !== undefined ? storeData.open : true,
        isDefault: false
      });
      await store.save();
      
      // Create store settings for each store
      await createStoreSettings(store._id, userId, req.user.name, store);
      
      createdStores.push(store);
    }
    
    res.status(201).json({
      success: true,
      stores: createdStores.map(store => formatStoreResponse(store)),
      count: createdStores.length
    });
  } catch (error) {
    console.error('❌ Bulk create stores error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

export const bulkUpdateStatus = async (req, res) => {
  try {
    const { storeIds, active } = req.body;
    const userId = req.user?.id;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can bulk update store status'
      });
    }
    
    if (!storeIds || !Array.isArray(storeIds) || storeIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Store IDs array is required'
      });
    }
    
    const result = await Store.updateMany(
      { _id: { $in: storeIds }, createdBy: userId },
      {
        $set: {
          active,
          updatedBy: userId,
          updatedByName: req.user?.name,
          updatedAt: Date.now()
        }
      }
    );
    
    res.json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Bulk update status error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

export const bulkDeleteStores = async (req, res) => {
  try {
    const { storeIds } = req.body;
    const userId = req.user?.id;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can bulk delete stores'
      });
    }
    
    if (!storeIds || !Array.isArray(storeIds) || storeIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Store IDs array is required'
      });
    }
    
    let hasData = false;
    const storesWithData = [];
    
    for (const storeId of storeIds) {
      const [productCount, transactionCount] = await Promise.all([
        Product.countDocuments({ storeId }),
        Transaction.countDocuments({ storeId })
      ]);
      
      if (productCount > 0 || transactionCount > 0) {
        hasData = true;
        storesWithData.push({ storeId, productCount, transactionCount });
      }
    }
    
    if (hasData) {
      return res.status(400).json({
        success: false,
        error: 'Some stores have associated products or transactions. Please delete or transfer data first.',
        details: storesWithData
      });
    }
    
    // Delete store settings for all stores being deleted
    for (const storeId of storeIds) {
      await StoreSettings.deleteOne({ storeId });
    }
    
    const result = await Store.deleteMany({ _id: { $in: storeIds }, createdBy: userId });
    
    res.json({
      success: true,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('❌ Bulk delete stores error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};