// controllers/syncController.js
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const Employee = require('../models/Employee');
const PurchaseOrder = require('../models/PurchaseOrder');
const cloudinary = require('../config/cloudinary');

// Sync products from frontend
exports.syncProducts = async (req, res) => {
  try {
    const { products, images } = req.body;
    const storeId = req.user.storeId;
    
    const results = [];
    
    for (const productData of products) {
      // Check if product exists
      let product = await Product.findOne({ sku: productData.sku, storeId });
      
      if (product) {
        // Update existing product
        Object.assign(product, productData);
        await product.save();
        results.push({ id: product._id, action: 'updated' });
      } else {
        // Create new product
        product = new Product({
          ...productData,
          storeId
        });
        await product.save();
        results.push({ id: product._id, action: 'created' });
      }
      
      // Handle images if any
      if (images && images[productData.sku]) {
        for (const imageData of images[productData.sku]) {
          const result = await cloudinary.uploader.upload(imageData.data, {
            folder: `stores/${storeId}/products/${product._id}`,
            public_id: imageData.name.replace(/\.[^/.]+$/, '')
          });
          
          product.images.push({
            url: result.secure_url,
            publicId: result.public_id,
            isMain: imageData.isMain
          });
        }
        await product.save();
      }
    }
    
    res.json({ success: true, results });
  } catch (error) {
    console.error('Sync products error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Sync transactions
exports.syncTransactions = async (req, res) => {
  try {
    const { transactions } = req.body;
    const storeId = req.user.storeId;
    
    const results = [];
    
    for (const transactionData of transactions) {
      let transaction = await Transaction.findOne({ 
        receiptNumber: transactionData.receiptNumber 
      });
      
      if (!transaction) {
        transaction = new Transaction({
          ...transactionData,
          storeId
        });
        await transaction.save();
        results.push({ id: transaction._id, action: 'synced' });
      }
    }
    
    res.json({ success: true, results });
  } catch (error) {
    console.error('Sync transactions error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all data for initial sync
exports.getSyncData = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const since = req.query.since || new Date(0);
    
    const [products, customers, transactions, employees, purchaseOrders] = await Promise.all([
      Product.find({ storeId, updatedAt: { $gt: since } }),
      Customer.find({ storeId, updatedAt: { $gt: since } }),
      Transaction.find({ storeId, createdAt: { $gt: since } }),
      Employee.find({ storeId, updatedAt: { $gt: since } }),
      PurchaseOrder.find({ storeId, updatedAt: { $gt: since } })
    ]);
    
    res.json({
      success: true,
      data: {
        products,
        customers,
        transactions,
        employees,
        purchaseOrders
      }
    });
  } catch (error) {
    console.error('Get sync data error:', error);
    res.status(500).json({ error: error.message });
  }
};