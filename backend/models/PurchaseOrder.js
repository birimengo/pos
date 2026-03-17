// models/PurchaseOrder.js
const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: { type: String, required: true, unique: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  orderDate: { type: Date, default: Date.now },
  expectedDate: Date,
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'shipped', 'received', 'cancelled'],
    default: 'pending'
  },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    sku: String,
    quantity: Number,
    price: Number,
    total: Number
  }],
  subtotal: Number,
  tax: Number,
  total: Number,
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  receivedDate: Date,
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' }
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);