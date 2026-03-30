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
    const existingTransaction = await Transaction.findOne({ receiptNumber: req.body.receiptNumber });
    if (existingTransaction) {
      console.log('⚠️ Transaction with receipt number already exists:', req.body.receiptNumber);
      return res.status(200).json(existingTransaction);
    }
    
    const transactionData = {
      receiptNumber: req.body.receiptNumber,
      customer: req.body.customer,
      items: req.body.items,
      subtotal: req.body.subtotal,
      discount: req.body.discount || 0,
      tax: req.body.tax || 0,
      total: req.body.total,
      paymentMethod: req.body.paymentMethod,
      change: req.body.change || 0,
      notes: req.body.notes || '',
      createdAt: req.body.createdAt || new Date(),
      
      // Credit/Installment fields
      isCredit: req.body.isCredit || false,
      isInstallment: req.body.isInstallment || false,
      paid: req.body.paid || 0,
      remaining: req.body.remaining || 0,
      initialPayment: req.body.initialPayment || 0,
      dueDate: req.body.dueDate || null,
      fullyPaid: req.body.remaining <= 0,
      paymentHistory: req.body.paymentHistory || []
    };
    
    const transaction = new Transaction(transactionData);
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

// Sync transaction (for offline sync) - FIXED with credit/installment fields
export const syncTransaction = async (req, res) => {
  try {
    console.log('📥 Incoming transaction sync:', {
      receiptNumber: req.body.receiptNumber,
      hasCustomer: !!req.body.customer,
      isCredit: req.body.isCredit,
      isInstallment: req.body.isInstallment,
      paid: req.body.paid,
      remaining: req.body.remaining
    });
    
    // Check if transaction already exists by receipt number
    let existingTransaction = await Transaction.findOne({ receiptNumber: req.body.receiptNumber });
    
    if (existingTransaction) {
      // Update existing transaction with new payment info if needed
      if (req.body.paid !== undefined || req.body.remaining !== undefined) {
        if (req.body.paid !== undefined) existingTransaction.paid = req.body.paid;
        if (req.body.remaining !== undefined) existingTransaction.remaining = req.body.remaining;
        existingTransaction.fullyPaid = existingTransaction.remaining <= 0;
        if (req.body.paymentHistory) {
          existingTransaction.paymentHistory = req.body.paymentHistory;
        }
        await existingTransaction.save();
        console.log('✅ Transaction updated:', existingTransaction.receiptNumber);
      }
      return res.json({ 
        success: true, 
        id: existingTransaction._id, 
        transaction: existingTransaction,
        alreadyExists: true 
      });
    }
    
    // Create new transaction with all fields including credit/installment data
    const transactionData = {
      receiptNumber: req.body.receiptNumber,
      customer: req.body.customer,
      items: req.body.items,
      subtotal: req.body.subtotal,
      discount: req.body.discount || 0,
      tax: req.body.tax || 0,
      total: req.body.total,
      paymentMethod: req.body.paymentMethod,
      change: req.body.change || 0,
      notes: req.body.notes || '',
      createdAt: req.body.createdAt || new Date(),
      
      // Credit/Installment fields
      isCredit: req.body.isCredit || false,
      isInstallment: req.body.isInstallment || false,
      paid: req.body.paid || 0,
      remaining: req.body.remaining || 0,
      initialPayment: req.body.initialPayment || 0,
      dueDate: req.body.dueDate || null,
      fullyPaid: req.body.remaining <= 0,
      paymentHistory: req.body.paymentHistory || []
    };
    
    const transaction = new Transaction(transactionData);
    await transaction.save();
    console.log('📦 New transaction saved:', transaction.receiptNumber, {
      isCredit: transaction.isCredit,
      isInstallment: transaction.isInstallment,
      paid: transaction.paid,
      remaining: transaction.remaining
    });
    
    res.json({ success: true, id: transaction._id, transaction });
  } catch (error) {
    if (error.code === 11000) {
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