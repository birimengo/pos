import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Transaction from '../models/Transaction.js';
import Employee from '../models/Employee.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import { cloudinary } from '../config/cloudinary.js';

// Sync products from frontend
export const syncProducts = async (req, res) => {
  try {
    const { products, images } = req.body;
    const storeId = req.user ? req.user.storeId : null;
    
    const results = [];
    
    for (const productData of products) {
      // Check if product exists
      let product = await Product.findOne({ sku: productData.sku });
      if (storeId) {
        product = await Product.findOne({ sku: productData.sku, storeId });
      }
      
      if (product) {
        // Update existing product
        Object.assign(product, productData);
        await product.save();
        results.push({ id: product._id, action: 'updated' });
      } else {
        // Create new product
        product = new Product({
          ...productData,
          ...(storeId && { storeId })
        });
        await product.save();
        results.push({ id: product._id, action: 'created' });
      }
      
      // Handle images if any
      if (images && images[productData.sku]) {
        for (const imageData of images[productData.sku]) {
          const result = await cloudinary.uploader.upload(imageData.data, {
            folder: storeId ? `stores/${storeId}/products/${product._id}` : `pos-products/${product._id}`,
            public_id: imageData.name.replace(/\.[^/.]+$/, '')
          });
          
          if (!product.cloudinaryImages) {
            product.cloudinaryImages = [];
          }
          
          product.cloudinaryImages.push({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
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
export const syncTransactions = async (req, res) => {
  try {
    const { transactions } = req.body;
    const storeId = req.user ? req.user.storeId : null;
    
    const results = [];
    
    for (const transactionData of transactions) {
      let transaction = await Transaction.findOne({ 
        receiptNumber: transactionData.receiptNumber 
      });
      
      if (!transaction) {
        transaction = new Transaction({
          ...transactionData,
          ...(storeId && { storeId })
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
export const getSyncData = async (req, res) => {
  try {
    const storeId = req.user ? req.user.storeId : null;
    const since = req.query.since || new Date(0).toISOString();
    const sinceDate = new Date(since);
    
    let query = {};
    if (storeId) {
      query.storeId = storeId;
    }
    
    const [products, customers, transactions, employees, purchaseOrders] = await Promise.all([
      Product.find({ ...query, updatedAt: { $gt: sinceDate } }),
      Customer.find({ ...query, updatedAt: { $gt: sinceDate } }),
      Transaction.find({ ...query, createdAt: { $gt: sinceDate } }),
      storeId ? Employee.find({ ...query, updatedAt: { $gt: sinceDate } }) : [],
      storeId ? PurchaseOrder.find({ ...query, updatedAt: { $gt: sinceDate } }) : []
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