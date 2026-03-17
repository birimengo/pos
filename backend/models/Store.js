// models/Store.js
const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  city: String,
  state: String,
  zip: String,
  phone: String,
  email: String,
  manager: String,
  taxRate: { type: Number, default: 0 },
  openTime: String,
  closeTime: String,
  timezone: String,
  settings: {
    receiptHeader: String,
    receiptFooter: String,
    currency: { type: String, default: 'USD' }
  },
  active: { type: Boolean, default: true }
});

module.exports = mongoose.model('Store', storeSchema);