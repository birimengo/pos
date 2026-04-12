// backend/controllers/transactionController.js
import Transaction from '../models/Transaction.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';

// Get all transactions (filtered by store)
export const getAllTransactions = async (req, res) => {
  try {
    const storeId = req.query.storeId || req.user?.storeId;
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required' });
    }
    
    const transactions = await Transaction.find({ storeId }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get transaction by ID (with store check)
export const getTransactionById = async (req, res) => {
  try {
    const storeId = req.query.storeId || req.user?.storeId;
    const transaction = await Transaction.findOne({ 
      _id: req.params.id, 
      storeId 
    });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get transaction by receipt number (with store check)
export const getTransactionByReceipt = async (req, res) => {
  try {
    const storeId = req.query.storeId || req.user?.storeId;
    const transaction = await Transaction.findOne({ 
      receiptNumber: req.params.receiptNumber,
      storeId 
    });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create transaction (with storeId)
export const createTransaction = async (req, res) => {
  try {
    const storeId = req.body.storeId || req.user?.storeId;
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required' });
    }
    
    const existingTransaction = await Transaction.findOne({ 
      receiptNumber: req.body.receiptNumber,
      storeId 
    });
    
    if (existingTransaction) {
      console.log('⚠️ Transaction with receipt number already exists:', req.body.receiptNumber);
      return res.status(200).json(existingTransaction);
    }
    
    const transactionData = {
      ...req.body,
      storeId
    };
    
    const transaction = new Transaction(transactionData);
    await transaction.save();
    
    if (transaction.customer && transaction.customer.id) {
      await Customer.findByIdAndUpdate(
        transaction.customer.id,
        {
          $inc: { loyaltyPoints: Math.floor(transaction.total / 100), totalSpent: transaction.total },
          lastVisit: new Date()
        }
      );
    }
    
    for (const item of transaction.items) {
      if (item.productId) {
        await Product.findOneAndUpdate(
          { _id: item.productId, storeId },
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

// Sync transaction (with storeId)
export const syncTransaction = async (req, res) => {
  try {
    const storeId = req.body.storeId || req.user?.storeId;
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required' });
    }
    
    console.log('📥 Incoming transaction sync:', {
      receiptNumber: req.body.receiptNumber,
      storeId,
      hasCustomer: !!req.body.customer,
      isCredit: req.body.isCredit,
      isInstallment: req.body.isInstallment,
      paid: req.body.paid,
      remaining: req.body.remaining
    });
    
    let existingTransaction = await Transaction.findOne({ 
      receiptNumber: req.body.receiptNumber,
      storeId 
    });
    
    if (existingTransaction) {
      if (req.body.paid !== undefined || req.body.remaining !== undefined) {
        if (req.body.paid !== undefined) existingTransaction.paid = req.body.paid;
        if (req.body.remaining !== undefined) existingTransaction.remaining = req.body.remaining;
        existingTransaction.fullyPaid = existingTransaction.remaining <= 0;
        if (req.body.paymentHistory) existingTransaction.paymentHistory = req.body.paymentHistory;
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
      storeId,
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
    console.log('📦 New transaction saved:', transaction.receiptNumber);
    
    res.json({ success: true, id: transaction._id, transaction });
  } catch (error) {
    if (error.code === 11000) {
      const existingTransaction = await Transaction.findOne({ 
        receiptNumber: req.body.receiptNumber,
        storeId 
      });
      if (existingTransaction) {
        return res.json({ success: true, id: existingTransaction._id, transaction: existingTransaction, alreadyExists: true });
      }
    }
    console.error('❌ Transaction sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update transaction (with store check)
export const updateTransaction = async (req, res) => {
  try {
    const storeId = req.body.storeId || req.user?.storeId;
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, storeId },
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

// Delete transaction (with store check and stock restoration)
export const deleteTransaction = async (req, res) => {
  try {
    const storeId = req.query.storeId || req.user?.storeId;
    const transaction = await Transaction.findOne({ 
      _id: req.params.id, 
      storeId 
    });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    console.log('🔄 Restoring product stock for deleted transaction:', transaction.receiptNumber);
    let restoredCount = 0;
    const restoredProducts = [];
    
    for (const item of transaction.items) {
      if (item.productId) {
        try {
          const product = await Product.findOne({ _id: item.productId, storeId });
          if (product) {
            const oldStock = product.stock;
            product.stock = (product.stock || 0) + item.quantity;
            product.updatedAt = Date.now();
            await product.save();
            restoredCount++;
            restoredProducts.push({
              name: product.name,
              oldStock,
              newStock: product.stock,
              quantityRestored: item.quantity
            });
            console.log(`✅ Stock restored for ${product.name}: ${oldStock} → ${product.stock} (+${item.quantity})`);
          } else {
            console.warn(`⚠️ Product not found for stock restoration: ${item.productId}`);
          }
        } catch (stockError) {
          console.error(`❌ Failed to restore stock for product ${item.productId}:`, stockError);
        }
      }
    }
    
    await Transaction.findOneAndDelete({ _id: req.params.id, storeId });
    
    console.log('🗑️ Transaction deleted from cloud:', {
      receiptNumber: transaction.receiptNumber,
      storeId,
      itemsRestored: restoredCount,
      totalItems: transaction.items.length
    });
    
    res.json({ 
      success: true, 
      message: 'Transaction deleted successfully',
      restoredCount,
      restoredProducts,
      receiptNumber: transaction.receiptNumber
    });
  } catch (error) {
    console.error('❌ Delete transaction error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update transaction status (refund/void)
export const updateTransactionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const storeId = req.body.storeId || req.user?.storeId;
    const transaction = await Transaction.findOne({ _id: req.params.id, storeId });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    if (status === 'refunded' && transaction.status === 'completed') {
      for (const item of transaction.items) {
        if (item.productId) {
          await Product.findOneAndUpdate(
            { _id: item.productId, storeId },
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

// Get daily sales summary (with store filter)
export const getDailySales = async (req, res) => {
  try {
    const storeId = req.query.storeId || req.user?.storeId;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    const transactions = await Transaction.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'completed',
      storeId
    });
    
    const summary = {
      totalSales: transactions.reduce((sum, t) => sum + t.total, 0),
      transactionCount: transactions.length,
      averageTicket: transactions.length > 0 ? transactions.reduce((sum, t) => sum + t.total, 0) / transactions.length : 0,
      paymentMethods: {}
    };
    
    transactions.forEach(t => {
      if (!summary.paymentMethods[t.paymentMethod]) {
        summary.paymentMethods[t.paymentMethod] = { count: 0, total: 0 };
      }
      summary.paymentMethods[t.paymentMethod].count++;
      summary.paymentMethods[t.paymentMethod].total += t.total;
    });
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get transactions by date range (with store filter)
export const getTransactionsByDateRange = async (req, res) => {
  try {
    const storeId = req.query.storeId || req.user?.storeId;
    const { startDate, endDate } = req.query;
    const transactions = await Transaction.find({
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
      storeId
    }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get sales summary for date range (with store filter)
export const getSalesSummary = async (req, res) => {
  try {
    const storeId = req.query.storeId || req.user?.storeId;
    const { startDate, endDate } = req.query;
    const transactions = await Transaction.find({
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: 'completed',
      storeId
    });
    
    const summary = {
      totalSales: transactions.reduce((sum, t) => sum + t.total, 0),
      transactionCount: transactions.length,
      averageTicket: transactions.length > 0 ? transactions.reduce((sum, t) => sum + t.total, 0) / transactions.length : 0,
      paymentMethods: {}
    };
    
    transactions.forEach(t => {
      if (!summary.paymentMethods[t.paymentMethod]) {
        summary.paymentMethods[t.paymentMethod] = { count: 0, total: 0 };
      }
      summary.paymentMethods[t.paymentMethod].count++;
      summary.paymentMethods[t.paymentMethod].total += t.total;
    });
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};