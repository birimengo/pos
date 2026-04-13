// backend/models/Customer.js
import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Customer name is required'],
    trim: true 
  },
  email: { 
    type: String, 
    lowercase: true,
    trim: true,
    sparse: true,
    index: { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
  },
  phone: { 
    type: String, 
    trim: true,
    sparse: true,
    index: { unique: true, partialFilterExpression: { phone: { $type: 'string' } } }
  },
  address: { 
    type: String, 
    default: '' 
  },
  loyaltyPoints: { 
    type: Number, 
    default: 0 
  },
  totalSpent: { 
    type: Number, 
    default: 0 
  },
  totalPaid: { 
    type: Number, 
    default: 0 
  },
  totalOutstanding: { 
    type: Number, 
    default: 0 
  },
  joinDate: { 
    type: String, 
    default: () => new Date().toISOString().split('T')[0] 
  },
  lastVisit: { 
    type: String, 
    default: () => new Date().toISOString().split('T')[0] 
  },
  birthDate: { 
    type: String, 
    default: null 
  },
  notes: { 
    type: String, 
    default: '' 
  },
  tags: [{ 
    type: String 
  }],
  transactionCount: { 
    type: Number, 
    default: 0 
  },
  creditCount: { 
    type: Number, 
    default: 0 
  },
  installmentCount: { 
    type: Number, 
    default: 0 
  },
  storeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Store',
    required: true,
    index: true
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Indexes for better query performance
customerSchema.index({ storeId: 1, name: 1 });
customerSchema.index({ storeId: 1, createdAt: -1 });
customerSchema.index({ storeId: 1, loyaltyPoints: -1 });
customerSchema.index({ storeId: 1, totalSpent: -1 });

// Prevent model overwrite
const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

export default Customer;