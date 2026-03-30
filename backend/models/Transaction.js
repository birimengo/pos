// backend/models/Transaction.js

import mongoose from 'mongoose';

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
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  change: { type: Number, default: 0 },
  status: { type: String, enum: ['completed', 'refunded', 'voided', 'credit', 'installment'], default: 'completed' },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  notes: String,
  receiptUrl: String,
  
  // Credit/Installment tracking fields
  isCredit: { type: Boolean, default: false },
  isInstallment: { type: Boolean, default: false },
  paid: { type: Number, default: 0 },
  remaining: { type: Number, default: 0 },
  initialPayment: { type: Number, default: 0 },
  dueDate: { type: Date, default: null },
  fullyPaid: { type: Boolean, default: false },
  paymentHistory: [{
    amount: Number,
    method: String,
    date: Date,
    remaining: Number,
    notes: String
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update updatedAt on save
transactionSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;