// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  barcode: { type: String },
  price: { type: Number, required: true },
  cost: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  category: { type: String, required: true },
  supplier: { type: String },
  location: { type: String },
  reorderPoint: { type: Number, default: 5 },
  description: { type: String },
  images: [{
    url: String,
    publicId: String,
    isMain: { type: Boolean, default: false }
  }],
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);