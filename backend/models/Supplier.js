// models/Supplier.js
const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactName: String,
  email: String,
  phone: String,
  address: String,
  leadTime: Number, // days
  paymentTerms: String,
  notes: String,
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
});

module.exports = mongoose.model('Supplier', supplierSchema);