// models/Customer.js
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String },
  address: String,
  loyaltyPoints: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  joinDate: { type: Date, default: Date.now },
  lastVisit: Date,
  birthDate: Date,
  notes: String,
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  tags: [String]
});

module.exports = mongoose.model('Customer', customerSchema);