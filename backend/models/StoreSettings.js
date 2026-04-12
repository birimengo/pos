// backend/models/StoreSettings.js
import mongoose from 'mongoose';

const storeSettingsSchema = new mongoose.Schema({
  storeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Store', 
    default: null
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  createdByName: { 
    type: String 
  },
  store: {
    name: { 
      type: String, 
      default: 'My Store' 
    },
    address: { 
      type: String, 
      default: '' 
    },
    phone: { 
      type: String, 
      default: '' 
    },
    email: { 
      type: String, 
      default: '' 
    },
    taxRate: { 
      type: Number, 
      default: 0 
    },
    country: { 
      type: String, 
      default: 'US' 
    },
    currency: { 
      type: String, 
      default: 'USD' 
    }
  },
  receipt: {
    header: { 
      type: String, 
      default: 'THANK YOU FOR SHOPPING!' 
    },
    footer: { 
      type: String, 
      default: 'Returns accepted within 30 days' 
    },
    showLogo: { 
      type: Boolean, 
      default: true 
    },
    showTax: { 
      type: Boolean, 
      default: true 
    },
    showDiscount: { 
      type: Boolean, 
      default: true 
    },
    showCustomerInfo: { 
      type: Boolean, 
      default: true 
    },
    showCashier: { 
      type: Boolean, 
      default: true 
    },
    paperSize: { 
      type: String, 
      enum: ['80mm', '58mm', 'A4'], 
      default: '80mm' 
    }
  },
  hardware: {
    printer: { 
      type: String, 
      default: 'USB' 
    },
    cashDrawer: { 
      type: String, 
      default: 'COM1' 
    },
    barcodeScanner: { 
      type: String, 
      default: 'USB' 
    },
    customerDisplay: { 
      type: Boolean, 
      default: true 
    },
    scale: { 
      type: Boolean, 
      default: false 
    }
  },
  users: {
    requireLogin: { 
      type: Boolean, 
      default: true 
    },
    sessionTimeout: { 
      type: Number, 
      default: 480 
    },
    maxFailedAttempts: { 
      type: Number, 
      default: 3 
    }
  },
  backup: {
    autoBackup: { 
      type: Boolean, 
      default: true 
    },
    backupFrequency: { 
      type: String, 
      enum: ['daily', 'weekly', 'monthly'], 
      default: 'daily' 
    },
    backupTime: { 
      type: String, 
      default: '23:00' 
    },
    cloudBackup: { 
      type: Boolean, 
      default: false 
    },
    lastBackup: { 
      type: Date, 
      default: null 
    }
  },
  appearance: {
    theme: { 
      type: String, 
      enum: ['light', 'dark', 'ocean'], 
      default: 'light' 
    },
    compactMode: { 
      type: Boolean, 
      default: false 
    },
    showProductImages: { 
      type: Boolean, 
      default: true 
    },
    defaultView: { 
      type: String, 
      enum: ['grid', 'list'], 
      default: 'grid' 
    }
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

// Compound index for user-specific settings
storeSettingsSchema.index({ createdBy: 1, storeId: 1 }, { unique: true });

const StoreSettings = mongoose.models.StoreSettings || mongoose.model('StoreSettings', storeSettingsSchema);

export default StoreSettings;