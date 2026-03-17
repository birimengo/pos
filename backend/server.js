// C:\Users\ham\Desktop\pos\backend\server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'do2bbokxv',
  api_key: process.env.CLOUDINARY_API_KEY || '885838516326599',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'PpaVX7vV4TSjyO39AOBzeRLDaxE'
});

// MongoDB Atlas Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://birimengo:ham%402020@cluster0.7nms33p.mongodb.net/bizcore_pos?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    console.log('📁 Database: bizcore_pos');
    console.log('🌍 Cluster: cluster0.7nms33p.mongodb.net');
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

// ==================== SCHEMAS ====================

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  barcode: String,
  price: { type: Number, required: true },
  cost: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  category: { type: String, required: true },
  supplier: String,
  location: String,
  reorderPoint: { type: Number, default: 5 },
  description: String,
  images: [String],
  cloudinaryImages: [{
    url: String,
    publicId: String,
    format: String,
    width: Number,
    height: Number,
    isMain: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Customer Schema
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: String,
  phone: String,
  address: String,
  loyaltyPoints: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  joinDate: { type: Date, default: Date.now },
  lastVisit: Date,
  notes: String
});

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  receiptNumber: { type: String, required: true, unique: true },
  customer: {
    id: mongoose.Schema.Types.ObjectId,
    name: String,
    email: String,
    loyaltyPoints: Number
  },
  items: [{
    productId: mongoose.Schema.Types.ObjectId,
    name: String,
    sku: String,
    price: Number,
    quantity: Number,
    total: Number
  }],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  change: { type: Number, default: 0 },
  status: { type: String, default: 'completed' },
  synced: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);
const Customer = mongoose.model('Customer', customerSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

// ==================== ROUTES ====================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'bizcore_pos',
    cloudinary: 'connected',
    mongodb: 'atlas'
  });
});

// Cloudinary test
app.get('/api/cloudinary-test', (req, res) => {
  res.json({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'do2bbokxv',
    configured: true,
    upload_preset: 'bizcore_pos'
  });
});

// ==================== PRODUCT ROUTES ====================

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TRANSACTION ROUTES ====================

// Sync transaction
app.post('/api/transactions/sync', async (req, res) => {
  try {
    const transaction = new Transaction(req.body);
    await transaction.save();
    console.log('📦 Transaction saved:', transaction.receiptNumber);
    res.json({ success: true, id: transaction._id });
  } catch (error) {
    console.error('Transaction sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SYNC ROUTES ====================

// Get sync data
app.get('/api/sync/data', async (req, res) => {
  try {
    const since = req.query.since || new Date(0).toISOString();
    const sinceDate = new Date(since);

    const [products, customers, transactions] = await Promise.all([
      Product.find({ updatedAt: { $gt: sinceDate } }),
      Customer.find({ updatedAt: { $gt: sinceDate } }),
      Transaction.find({ createdAt: { $gt: sinceDate } })
    ]);

    res.json({
      success: true,
      data: {
        products,
        customers,
        transactions
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CUSTOMER ROUTES ====================

// Get all customers
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create customer
app.post('/api/customers', async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update customer loyalty points
app.patch('/api/customers/:id/loyalty', async (req, res) => {
  try {
    const { points, amount } = req.body;
    const customer = await Customer.findById(req.params.id);
    
    if (customer) {
      customer.loyaltyPoints += points;
      customer.totalSpent += amount;
      customer.lastVisit = new Date();
      await customer.save();
      res.json(customer);
    } else {
      res.status(404).json({ error: 'Customer not found' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📁 Database: bizcore_pos (MongoDB Atlas)`);
  console.log(`☁️  Cloudinary: do2bbokxv`);
  console.log(`📦 Ready for connections`);
});