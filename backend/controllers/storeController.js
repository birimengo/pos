// backend/controllers/storeController.js
import mongoose from 'mongoose';
import Store from '../models/Store.js';
import Product from '../models/Product.js';
import Transaction from '../models/Transaction.js';
import Customer from '../models/Customer.js';
import Transfer from '../models/Transfer.js';

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
  isDefault: store.isDefault,
  createdAt: store.createdAt,
  updatedAt: store.updatedAt,
  createdBy: store.createdBy,
  createdByName: store.createdByName,
  updatedBy: store.updatedBy,
  updatedByName: store.updatedByName
});

// ==================== CREATE STORE ====================

export const createStore = async (req, res) => {
  try {
    console.log('📤 Create store request received');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    console.log('👤 User:', req.user ? { id: req.user.id, email: req.user.email, name: req.user.name } : 'No user');

    // Validate required fields
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
      settings: {
        receiptHeader: req.body.settings?.receiptHeader || '',
        receiptFooter: req.body.settings?.receiptFooter || '',
        currency: req.body.settings?.currency || 'USD'
      },
      active: req.body.active !== false,
      isDefault: req.body.isDefault || false,
      createdBy: req.user?.id,
      createdByName: req.user?.name,
      users: [req.user?.id]  // Add current user to store's users array
    };

    // If this is the first store for this user, make it default
    const userStoreCount = await Store.countDocuments({
      $or: [
        { createdBy: req.user?.id },
        { users: req.user?.id }
      ]
    });
    
    if (userStoreCount === 0) {
      storeData.isDefault = true;
      console.log('📌 This is the first store for this user, setting as default');
    }

    const store = new Store(storeData);
    await store.save();

    console.log('✅ Store created successfully:', {
      id: store._id,
      name: store.name,
      isDefault: store.isDefault,
      createdBy: store.createdBy,
      users: store.users
    });

    res.status(201).json({
      success: true,
      store: formatStoreResponse(store)
    });
  } catch (error) {
    console.error('❌ Create store error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      details: error.errors
    });
  }
};

// ==================== GET ALL STORES (FILTERED BY CURRENT USER) ====================

export const getAllStores = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    console.log(`📦 Fetching stores for user ${req.user?.email} (role: ${userRole})`);
    
    let query = {};
    
    // Admin users can see all stores they created OR are assigned to
    if (userRole === 'admin') {
      query = {
        $or: [
          { createdBy: userId },           // Stores they created
          { users: userId }                // Stores they're assigned to
        ]
      };
    } 
    // Non-admin users (manager, cashier, inventory_manager) can only see stores they're assigned to
    else {
      query = {
        $or: [
          { users: userId },               // Stores they're assigned to
          { createdBy: userId }            // Stores they created (if any)
        ]
      };
    }
    
    console.log('Query:', JSON.stringify(query));
    
    const stores = await Store.find(query).sort({ createdAt: -1 });
    
    console.log(`📦 Retrieved ${stores.length} stores for user`);
    
    res.json({
      success: true,
      stores: stores.map(store => formatStoreResponse(store))
    });
  } catch (error) {
    console.error('❌ Get stores error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET STORE BY ID (WITH USER CHECK) ====================

export const getStoreById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID format. Expected a valid MongoDB ObjectId.'
      });
    }
    
    // Find store that belongs to this user
    const store = await Store.findOne({
      _id: id,
      $or: [
        { createdBy: userId },
        { users: userId }
      ]
    });
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found or you do not have access to this store'
      });
    }
    
    res.json({
      success: true,
      store: formatStoreResponse(store)
    });
  } catch (error) {
    console.error('❌ Get store error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== UPDATE STORE (WITH USER CHECK) ====================

export const updateStore = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID format. Expected a valid MongoDB ObjectId.'
      });
    }
    
    // Find store that belongs to this user
    const store = await Store.findOne({
      _id: id,
      $or: [
        { createdBy: userId },
        { users: userId }
      ]
    });
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found or you do not have permission to edit this store'
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

    // Handle default store changes
    if (updateData.isDefault && !store.isDefault) {
      await Store.updateMany(
        { _id: { $ne: store._id }, isDefault: true, $or: [{ createdBy: userId }, { users: userId }] },
        { $set: { isDefault: false } }
      );
      console.log(`📌 Setting ${store.name} as the new default store for user`);
    }

    Object.assign(store, updateData);
    await store.save();

    console.log('✅ Store updated:', {
      id: store._id,
      name: store.name,
      isDefault: store.isDefault
    });

    res.json({
      success: true,
      store: formatStoreResponse(store)
    });
  } catch (error) {
    console.error('❌ Update store error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// ==================== DELETE STORE (WITH USER CHECK) ====================

export const deleteStore = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID format. Expected a valid MongoDB ObjectId.'
      });
    }
    
    // Find store that belongs to this user
    const store = await Store.findOne({
      _id: id,
      $or: [
        { createdBy: userId },
        { users: userId }
      ]
    });
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found or you do not have permission to delete this store'
      });
    }

    // Check for dependent data
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

    // Prevent deletion of the only default store for this user
    if (store.isDefault) {
      const userDefaultStoreCount = await Store.countDocuments({ 
        isDefault: true,
        $or: [
          { createdBy: userId },
          { users: userId }
        ]
      });
      if (userDefaultStoreCount === 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete your only default store. Please set another store as default first.'
        });
      }
    }

    await Store.findByIdAndDelete(id);

    console.log('🗑️ Store deleted:', {
      id: store._id,
      name: store.name
    });

    res.json({
      success: true,
      message: 'Store deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete store error:', error);
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
    
    // Verify user has access to this store
    const store = await Store.findOne({
      _id: id,
      $or: [
        { createdBy: userId },
        { users: userId }
      ]
    });
    
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
    
    // Verify user has access to this store
    const store = await Store.findOne({
      _id: id,
      $or: [
        { createdBy: userId },
        { users: userId }
      ]
    });
    
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
    
    // Verify user has access to this store
    const store = await Store.findOne({
      _id: id,
      $or: [
        { createdBy: userId },
        { users: userId }
      ]
    });
    
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

// ==================== GET DEFAULT STORE FOR CURRENT USER ====================

export const getDefaultStore = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    console.log(`🔍 Finding default store for user ${req.user?.email}`);
    
    // First try to find a store marked as default that belongs to this user
    let defaultStore = await Store.findOne({ 
      isDefault: true,
      $or: [
        { createdBy: userId },
        { users: userId }
      ]
    });
    
    // If no default store, get any store belonging to this user
    if (!defaultStore) {
      defaultStore = await Store.findOne({
        $or: [
          { createdBy: userId },
          { users: userId }
        ]
      });
      
      if (defaultStore) {
        // Set as default if it's the only store for this user
        defaultStore.isDefault = true;
        await defaultStore.save();
        console.log(`📌 Set ${defaultStore.name} as default store for user ${req.user?.email}`);
      }
    }
    
    if (!defaultStore) {
      return res.status(404).json({
        success: false,
        error: 'No stores found for this user. Please create a store first.'
      });
    }
    
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
    
    // Verify user has access to this store
    const store = await Store.findOne({
      _id: id,
      $or: [
        { createdBy: userId },
        { users: userId }
      ]
    });
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found or you do not have access'
      });
    }
    
    // Remove default flag from all stores belonging to this user
    await Store.updateMany(
      { 
        isDefault: true,
        $or: [
          { createdBy: userId },
          { users: userId }
        ]
      },
      { $set: { isDefault: false } }
    );
    
    // Set new default store
    store.isDefault = true;
    await store.save();
    
    console.log(`✅ Store ${store.name} set as default for user ${req.user?.email}`);
    
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

// ==================== STORE USER ASSIGNMENT ====================

export const assignUserToStore = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user?.id;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID format'
      });
    }
    
    // Verify current user has permission to assign users to this store
    const store = await Store.findOne({
      _id: id,
      $or: [
        { createdBy: currentUserId },
        { users: currentUserId }
      ]
    });
    
    if (!store) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to assign users to this store'
      });
    }
    
    if (!store.users) {
      store.users = [];
    }
    
    if (!store.users.includes(userId)) {
      store.users.push(userId);
      await store.save();
      console.log(`✅ User ${userId} assigned to store ${store.name} by ${req.user?.email}`);
    }
    
    res.json({
      success: true,
      message: 'User assigned to store successfully'
    });
  } catch (error) {
    console.error('❌ Assign user to store error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const removeUserFromStore = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const currentUserId = req.user?.id;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID format'
      });
    }
    
    // Verify current user has permission
    const store = await Store.findOne({
      _id: id,
      $or: [
        { createdBy: currentUserId },
        { users: currentUserId }
      ]
    });
    
    if (!store) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to remove users from this store'
      });
    }
    
    if (store.users) {
      store.users = store.users.filter(uid => String(uid) !== userId);
      await store.save();
      console.log(`✅ User ${userId} removed from store ${store.name} by ${req.user?.email}`);
    }
    
    res.json({
      success: true,
      message: 'User removed from store successfully'
    });
  } catch (error) {
    console.error('❌ Remove user from store error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

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
    
    // Verify user has access to this store
    const store = await Store.findOne({
      _id: id,
      $or: [
        { createdBy: userId },
        { users: userId }
      ]
    });
    
    if (!store) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this store'
      });
    }
    
    const storeWithUsers = await Store.findById(id).populate('users', '-password');
    res.json({
      success: true,
      users: storeWithUsers?.users || []
    });
  } catch (error) {
    console.error('❌ Get store users error:', error);
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
    const transfers = await Transfer.find().sort({ createdAt: -1 });
    res.json({ success: true, transfers });
  } catch (error) {
    console.error('❌ Get transfers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTransfersByStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const transfers = await Transfer.find({
      $or: [{ fromStoreId: storeId }, { toStoreId: storeId }]
    }).sort({ createdAt: -1 });
    res.json({ success: true, transfers });
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

    // Update product stock for both stores
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
        users: [userId]  // Add current user to store
      });
      await store.save();
      createdStores.push(store);
    }
    
    console.log(`✅ Bulk created ${createdStores.length} stores for user ${req.user?.email}`);
    
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
    
    if (!storeIds || !Array.isArray(storeIds) || storeIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Store IDs array is required'
      });
    }
    
    const result = await Store.updateMany(
      { 
        _id: { $in: storeIds },
        $or: [
          { createdBy: userId },
          { users: userId }
        ]
      },
      {
        $set: {
          active,
          updatedBy: userId,
          updatedByName: req.user?.name,
          updatedAt: Date.now()
        }
      }
    );
    
    console.log(`✅ Bulk updated ${result.modifiedCount} stores status to ${active} for user ${req.user?.email}`);
    
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
    
    if (!storeIds || !Array.isArray(storeIds) || storeIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Store IDs array is required'
      });
    }
    
    // Get stores that belong to this user
    const userStores = await Store.find({
      _id: { $in: storeIds },
      $or: [
        { createdBy: userId },
        { users: userId }
      ]
    });
    
    const userStoreIds = userStores.map(s => s._id.toString());
    
    // Check for dependent data
    let hasData = false;
    const storesWithData = [];
    
    for (const storeId of userStoreIds) {
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
    
    const result = await Store.deleteMany({ _id: { $in: userStoreIds } });
    
    console.log(`✅ Bulk deleted ${result.deletedCount} stores for user ${req.user?.email}`);
    
    res.json({
      success: true,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('❌ Bulk delete stores error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};