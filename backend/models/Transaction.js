// models/Transaction.js
const mongoose = require('mongoose');

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
  status: { type: String, enum: ['completed', 'refunded', 'voided'], default: 'completed' },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  notes: String,
  receiptUrl: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);