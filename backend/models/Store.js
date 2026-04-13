// backend/models/Store.js
import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Store name is required'],
    trim: true 
  },
  address: { 
    type: String, 
    default: '' 
  },
  city: { 
    type: String, 
    default: '' 
  },
  state: { 
    type: String, 
    default: '' 
  },
  zip: { 
    type: String, 
    default: '' 
  },
  phone: { 
    type: String, 
    default: '' 
  },
  email: { 
    type: String, 
    default: '',
    lowercase: true,
    trim: true
  },
  manager: { 
    type: String, 
    default: '' 
  },
  taxRate: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 100
  },
  openTime: { 
    type: String, 
    default: '09:00' 
  },
  closeTime: { 
    type: String, 
    default: '21:00' 
  },
  timezone: { 
    type: String, 
    default: 'UTC' 
  },
  open: { 
    type: Boolean, 
    default: true 
  },
  settings: {
    receiptHeader: { 
      type: String, 
      default: 'Thank you for shopping!' 
    },
    receiptFooter: { 
      type: String, 
      default: 'Returns accepted within 30 days' 
    },
    currency: { 
      type: String, 
      default: 'USD' 
    }
  },
  active: { 
    type: Boolean, 
    default: true 
  },
  isDefault: { 
    type: Boolean, 
    default: false 
  },
  users: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  createdByName: { 
    type: String 
  },
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  updatedByName: { 
    type: String 
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
storeSchema.index({ name: 1 });
storeSchema.index({ createdBy: 1 });
storeSchema.index({ isDefault: 1 });
storeSchema.index({ active: 1 });
storeSchema.index({ open: 1 });

// Prevent model overwrite
const Store = mongoose.models.Store || mongoose.model('Store', storeSchema);

export default Store;