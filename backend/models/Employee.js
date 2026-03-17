// models/Employee.js
const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  pin: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['cashier', 'manager', 'admin', 'inventory_specialist'],
    default: 'cashier'
  },
  permissions: [String],
  hourlyRate: Number,
  employeeId: { type: String, required: true, unique: true },
  startDate: Date,
  active: { type: Boolean, default: true },
  address: String,
  emergencyContact: String,
  department: String,
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  image: {
    url: String,
    publicId: String
  }
});

module.exports = mongoose.model('Employee', employeeSchema);