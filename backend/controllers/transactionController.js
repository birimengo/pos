// backend/controllers/transactionController.js

import Transaction from '../models/Transaction.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';

// Get all transactions
export const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get transaction by ID
export const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get transaction by receipt number
export const getTransactionByReceipt = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ receiptNumber: req.params.receiptNumber });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create transaction
export const createTransaction = async (req, res) => {
  try {
    // Check if transaction with this receipt number already exists
    const existingTransaction = await Transaction.findOne({ receiptNumber: req.body.receiptNumber });
    if (existingTransaction) {
      console.log('⚠️ Transaction with receipt number already exists:', req.body.receiptNumber);
      return res.status(200).json(existingTransaction);
    }
    
    const transaction = new Transaction(req.body);
    await transaction.save();
    
    // Update customer loyalty points if customer exists
    if (transaction.customer && transaction.customer.id) {
      await Customer.findByIdAndUpdate(
        transaction.customer.id,
        {
          $inc: { 
            loyaltyPoints: Math.floor(transaction.total / 100),
            totalSpent: transaction.total 
          },
          lastVisit: new Date()
        }
      );
    }
    
    // Update product stock
    for (const item of transaction.items) {
      if (item.productId) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: -item.quantity } }
        );
      }
    }
    
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Transaction creation error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Sync transaction (for offline sync) - FIXED with duplicate check
export const syncTransaction = async (req, res) => {
  try {
    console.log('📥 Incoming transaction sync:', {
      receiptNumber: req.body.receiptNumber,
      hasCustomer: !!req.body.customer,
      customerData: req.body.customer
    });
    
    // CRITICAL FIX: Check if transaction already exists by receipt number
    const existingTransaction = await Transaction.findOne({ receiptNumber: req.body.receiptNumber });
    
    if (existingTransaction) {
      console.log('✅ Transaction already exists in cloud, returning existing:', existingTransaction.receiptNumber);
      return res.json({ 
        success: true, 
        id: existingTransaction._id, 
        transaction: existingTransaction,
        alreadyExists: true 
      });
    }
    
    // Create new transaction if it doesn't exist
    const transaction = new Transaction(req.body);
    await transaction.save();
    console.log('📦 New transaction saved:', transaction.receiptNumber);
    res.json({ success: true, id: transaction._id, transaction });
  } catch (error) {
    // Handle duplicate key error gracefully
    if (error.code === 11000) {
      console.log('⚠️ Duplicate key error, transaction may already exist');
      // Try to find and return the existing transaction
      const existingTransaction = await Transaction.findOne({ receiptNumber: req.body.receiptNumber });
      if (existingTransaction) {
        return res.json({ 
          success: true, 
          id: existingTransaction._id, 
          transaction: existingTransaction,
          alreadyExists: true 
        });
      }
    }
    console.error('❌ Transaction sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update transaction
export const updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    console.log('✅ Transaction updated:', transaction._id);
    res.json(transaction);
  } catch (error) {
    console.error('❌ Update transaction error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Update transaction status (refund/void)
export const updateTransactionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // If refunding, restore stock
    if (status === 'refunded' && transaction.status === 'completed') {
      for (const item of transaction.items) {
        if (item.productId) {
          await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: item.quantity } }
          );
        }
      }
    }
    
    transaction.status = status;
    await transaction.save();
    
    res.json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get daily sales summary
export const getDailySales = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    const transactions = await Transaction.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'completed'
    });
    
    const summary = {
      totalSales: transactions.reduce((sum, t) => sum + t.total, 0),
      transactionCount: transactions.length,
      averageTicket: transactions.length > 0 
        ? transactions.reduce((sum, t) => sum + t.total, 0) / transactions.length 
        : 0,
      paymentMethods: {}
    };
    
    transactions.forEach(t => {
      if (!summary.paymentMethods[t.paymentMethod]) {
        summary.paymentMethods[t.paymentMethod] = {
          count: 0,
          total: 0
        };
      }
      summary.paymentMethods[t.paymentMethod].count++;
      summary.paymentMethods[t.paymentMethod].total += t.total;
    });
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get transactions by date range
export const getTransactionsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const transactions = await Transaction.find({
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get sales summary for date range
export const getSalesSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const transactions = await Transaction.find({
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: 'completed'
    });
    
    const summary = {
      totalSales: transactions.reduce((sum, t) => sum + t.total, 0),
      transactionCount: transactions.length,
      averageTicket: transactions.length > 0 
        ? transactions.reduce((sum, t) => sum + t.total, 0) / transactions.length 
        : 0,
      paymentMethods: {}
    };
    
    transactions.forEach(t => {
      if (!summary.paymentMethods[t.paymentMethod]) {
        summary.paymentMethods[t.paymentMethod] = {
          count: 0,
          total: 0
        };
      }
      summary.paymentMethods[t.paymentMethod].count++;
      summary.paymentMethods[t.paymentMethod].total += t.total;
    });
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};