// backend/controllers/customerController.js
import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Transaction from '../models/Transaction.js';

// Helper to build customer query with isolation
const buildCustomerQuery = (req, additionalFilters = {}) => {
  const storeId = req.query.storeId || req.body.storeId || req.user?.storeId;
  const userId = req.user?.id;
  
  return {
    storeId: storeId,
    createdBy: userId,
    ...additionalFilters
  };
};

// Get all customers (filtered by store AND user)
export const getAllCustomers = async (req, res, next) => {
  try {
    const storeId = req.query.storeId || req.user?.storeId;
    const userId = req.user?.id;
    
    if (!storeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Store ID is required' 
      });
    }
    
    console.log(`📦 Fetching customers for store: ${storeId}, user: ${userId}`);
    
    const customers = await Customer.find({ 
      storeId: storeId,
      createdBy: userId 
    }).sort({ createdAt: -1 });
    
    console.log(`✅ Found ${customers.length} customers for this store and user`);
    
    res.json({
      success: true,
      customers: customers,
      count: customers.length
    });
  } catch (error) {
    console.error('❌ Get customers error:', error);
    next(error);
  }
};

// Search customers (scoped to store and user)
export const searchCustomers = async (req, res, next) => {
  try {
    const { q, email, phone } = req.query;
    const storeId = req.query.storeId || req.user?.storeId;
    const userId = req.user?.id;
    
    if (!storeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Store ID is required' 
      });
    }
    
    let query = { storeId: storeId, createdBy: userId };
    
    if (email) {
      query.email = email;
    } else if (phone) {
      query.phone = phone;
    } else if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } }
      ];
    }
    
    console.log('🔍 Searching customers with query:', JSON.stringify(query));
    const customers = await Customer.find(query).limit(50).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      customers: customers,
      count: customers.length
    });
  } catch (error) {
    console.error('❌ Search customers error:', error);
    next(error);
  }
};

// Get customer by ID (with isolation)
export const getCustomerById = async (req, res, next) => {
  try {
    const storeId = req.query.storeId || req.user?.storeId;
    const userId = req.user?.id;
    
    const customer = await Customer.findOne({ 
      _id: req.params.id,
      storeId: storeId,
      createdBy: userId
    });
    
    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found or access denied' 
      });
    }
    
    res.json({
      success: true,
      customer: customer
    });
  } catch (error) {
    console.error('❌ Get customer by ID error:', error);
    next(error);
  }
};

// Get customer by email (with isolation)
export const getCustomerByEmail = async (req, res, next) => {
  try {
    const storeId = req.query.storeId || req.user?.storeId;
    const userId = req.user?.id;
    
    const customer = await Customer.findOne({ 
      email: req.params.email,
      storeId: storeId,
      createdBy: userId
    });
    
    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found' 
      });
    }
    
    res.json({
      success: true,
      customer: customer
    });
  } catch (error) {
    console.error('❌ Get customer by email error:', error);
    next(error);
  }
};

// Get all transactions for a specific customer (with isolation)
export const getCustomerTransactions = async (req, res, next) => {
  try {
    const customerId = req.params.id;
    const storeId = req.query.storeId || req.user?.storeId;
    const userId = req.user?.id;
    
    console.log(`🔍 Fetching transactions for customer ID: ${customerId}, store: ${storeId}, user: ${userId}`);
    
    // First verify customer belongs to this store and user
    const customer = await Customer.findOne({ 
      _id: customerId,
      storeId: storeId,
      createdBy: userId
    });
    
    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found or access denied' 
      });
    }
    
    const transactions = await Transaction.find({
      $or: [
        { 'customer.id': customerId },
        { 'customer._id': customerId }
      ],
      storeId: storeId
    }).sort({ createdAt: -1 });
    
    console.log(`✅ Found ${transactions.length} transactions for customer ${customer.name}`);
    
    res.json({
      success: true,
      transactions: transactions,
      count: transactions.length
    });
  } catch (error) {
    console.error('❌ Get customer transactions error:', error);
    next(error);
  }
};

// Create customer (with store and user isolation)
export const createCustomer = async (req, res, next) => {
  try {
    const storeId = req.body.storeId || req.user?.storeId;
    const userId = req.user?.id;
    
    if (!storeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Store ID is required' 
      });
    }
    
    // Check for existing customer with same email in this store and user
    if (req.body.email) {
      const existingEmail = await Customer.findOne({
        email: req.body.email,
        storeId: storeId,
        createdBy: userId
      });
      
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          error: 'Customer with this email already exists in your store',
          field: 'email'
        });
      }
    }
    
    // Check for existing customer with same phone in this store and user
    if (req.body.phone) {
      const existingPhone = await Customer.findOne({
        phone: req.body.phone,
        storeId: storeId,
        createdBy: userId
      });
      
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          error: 'Customer with this phone already exists in your store',
          field: 'phone'
        });
      }
    }
    
    const customerData = {
      name: req.body.name,
      email: req.body.email || undefined,
      phone: req.body.phone || undefined,
      address: req.body.address || '',
      loyaltyPoints: req.body.loyaltyPoints || 0,
      totalSpent: req.body.totalSpent || 0,
      totalPaid: req.body.totalPaid || 0,
      totalOutstanding: req.body.totalOutstanding || 0,
      joinDate: req.body.joinDate || new Date().toISOString().split('T')[0],
      lastVisit: req.body.lastVisit || new Date().toISOString().split('T')[0],
      birthDate: req.body.birthDate || null,
      notes: req.body.notes || '',
      tags: req.body.tags || [],
      transactionCount: req.body.transactionCount || 0,
      creditCount: req.body.creditCount || 0,
      installmentCount: req.body.installmentCount || 0,
      storeId: storeId,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Remove empty email/phone to avoid unique index issues
    if (!customerData.email) delete customerData.email;
    if (!customerData.phone) delete customerData.phone;
    
    console.log('📥 Creating customer for store:', storeId, 'user:', userId);
    console.log('📥 Customer data:', customerData);
    
    const customer = new Customer(customerData);
    await customer.save();
    
    console.log('✅ Customer created:', customer._id);
    
    res.status(201).json({
      success: true,
      customer: customer,
      message: 'Customer created successfully'
    });
  } catch (error) {
    console.error('❌ Create customer error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        success: false,
        error: `${field} already exists in your store`,
        field: field
      });
    }
    
    next(error);
  }
};

// Update customer (with isolation)
export const updateCustomer = async (req, res, next) => {
  try {
    const storeId = req.body.storeId || req.user?.storeId;
    const userId = req.user?.id;
    
    // Check if customer exists and belongs to this store/user
    const existingCustomer = await Customer.findOne({
      _id: req.params.id,
      storeId: storeId,
      createdBy: userId
    });
    
    if (!existingCustomer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found or access denied' 
      });
    }
    
    // Check email uniqueness within store and user
    if (req.body.email && req.body.email !== existingCustomer.email) {
      const emailExists = await Customer.findOne({
        email: req.body.email,
        storeId: storeId,
        createdBy: userId,
        _id: { $ne: req.params.id }
      });
      
      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Customer with this email already exists in your store',
          field: 'email'
        });
      }
    }
    
    // Check phone uniqueness within store and user
    if (req.body.phone && req.body.phone !== existingCustomer.phone) {
      const phoneExists = await Customer.findOne({
        phone: req.body.phone,
        storeId: storeId,
        createdBy: userId,
        _id: { $ne: req.params.id }
      });
      
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          error: 'Customer with this phone already exists in your store',
          field: 'phone'
        });
      }
    }
    
    const customerData = {
      name: req.body.name,
      email: req.body.email || undefined,
      phone: req.body.phone || undefined,
      address: req.body.address,
      loyaltyPoints: req.body.loyaltyPoints,
      totalSpent: req.body.totalSpent,
      totalPaid: req.body.totalPaid,
      totalOutstanding: req.body.totalOutstanding,
      birthDate: req.body.birthDate,
      notes: req.body.notes,
      tags: req.body.tags,
      updatedAt: new Date()
    };
    
    // Remove undefined fields
    Object.keys(customerData).forEach(key => 
      customerData[key] === undefined && delete customerData[key]
    );
    
    // Remove empty email/phone
    if (customerData.email === '') delete customerData.email;
    if (customerData.phone === '') delete customerData.phone;
    
    console.log('📥 Updating customer:', req.params.id);
    
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, storeId: storeId, createdBy: userId },
      customerData,
      { new: true, runValidators: true }
    );
    
    console.log('✅ Customer updated:', customer._id);
    
    res.json({
      success: true,
      customer: customer,
      message: 'Customer updated successfully'
    });
  } catch (error) {
    console.error('❌ Update customer error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        success: false,
        error: `${field} already exists in your store`,
        field: field
      });
    }
    
    next(error);
  }
};

// Update customer loyalty points (with isolation)
export const updateLoyaltyPoints = async (req, res, next) => {
  try {
    const { points, amount } = req.body;
    const storeId = req.body.storeId || req.user?.storeId;
    const userId = req.user?.id;
    
    const customer = await Customer.findOne({ 
      _id: req.params.id,
      storeId: storeId,
      createdBy: userId
    });
    
    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found or access denied' 
      });
    }
    
    customer.loyaltyPoints = (customer.loyaltyPoints || 0) + (points || 0);
    customer.totalSpent = (customer.totalSpent || 0) + (amount || 0);
    customer.lastVisit = new Date().toISOString().split('T')[0];
    customer.updatedAt = new Date();
    
    await customer.save();
    
    res.json({
      success: true,
      customer: customer,
      message: 'Loyalty points updated successfully'
    });
  } catch (error) {
    console.error('❌ Update loyalty points error:', error);
    next(error);
  }
};

// Delete customer (with isolation)
export const deleteCustomer = async (req, res, next) => {
  try {
    const storeId = req.query.storeId || req.user?.storeId;
    const userId = req.user?.id;
    
    const customer = await Customer.findOneAndDelete({ 
      _id: req.params.id,
      storeId: storeId,
      createdBy: userId
    });
    
    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found or access denied' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Customer deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Delete customer error:', error);
    next(error);
  }
};

// Get customer statistics for dashboard (with isolation)
export const getCustomerStats = async (req, res, next) => {
  try {
    const storeId = req.query.storeId || req.user?.storeId;
    const userId = req.user?.id;
    
    if (!storeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Store ID is required' 
      });
    }
    
    console.log(`📊 Fetching customer stats for store: ${storeId}, user: ${userId}`);
    
    const stats = await Customer.aggregate([
      { 
        $match: { 
          storeId: new mongoose.Types.ObjectId(storeId), 
          createdBy: new mongoose.Types.ObjectId(userId) 
        } 
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          totalLoyaltyPoints: { $sum: '$loyaltyPoints' },
          totalSpent: { $sum: '$totalSpent' },
          averageSpent: { $avg: '$totalSpent' },
          customersWithCredit: { $sum: { $cond: [{ $gt: ['$creditCount', 0] }, 1, 0] } },
          customersWithInstallment: { $sum: { $cond: [{ $gt: ['$installmentCount', 0] }, 1, 0] } }
        }
      }
    ]);
    
    const result = stats[0] || {
      totalCustomers: 0,
      totalLoyaltyPoints: 0,
      totalSpent: 0,
      averageSpent: 0,
      customersWithCredit: 0,
      customersWithInstallment: 0
    };
    
    res.json({
      success: true,
      stats: result
    });
  } catch (error) {
    console.error('❌ Get customer stats error:', error);
    next(error);
  }
};