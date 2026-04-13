// backend/controllers/storeController.js
import mongoose from 'mongoose';
import Store from '../models/Store.js';
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
      email: req.body.email || '',
      manager: req.body.manager || '',
      taxRate: req.body.taxRate || 0,
      openTime: req.body.openTime || '09:00',
      closeTime: req.body.closeTime || '21:00',
      timezone: req.body.timezone || 'UTC',
      open: req.body.open !== undefined ? req.body.open : true,
      settings: {
        receiptHeader: req.body.settings?.receiptHeader || '',
        receiptFooter: req.body.settings?.receiptFooter || '',
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

    await Store.findByIdAndDelete(id);

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