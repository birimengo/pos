import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  role: { type: String, enum: ['admin', 'manager', 'cashier', 'inventory_manager'], default: 'cashier' },
  pin: { type: String, required: true },
  avatar: {
    url: String,
    publicId: String
  },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Fix: Remove the callback parameter
employeeSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;