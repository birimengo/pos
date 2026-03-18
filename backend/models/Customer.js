import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, sparse: true, unique: true },
  phone: String,
  address: String,
  loyaltyPoints: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  joinDate: { type: Date, default: Date.now },
  lastVisit: Date,
  birthDate: Date,
  notes: String,
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  tags: [String],
  updatedAt: { type: Date, default: Date.now }
}, {
  id: false,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// CORRECT FIX: Use function without parameters
// Mongoose automatically passes 'next' but we don't need to use it
customerSchema.pre('save', function() {
  this.updatedAt = Date.now();
  // No need to call any callback function
});

// Alternative if you need to use the callback:
// customerSchema.pre('save', function(next) {
//   this.updatedAt = Date.now();
//   next();
// });

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;