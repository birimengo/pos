// backend/models/StockHistory.js

import mongoose from 'mongoose';

const stockHistorySchema = new mongoose.Schema({
  // Changed to String to handle both MongoDB ObjectId and local IDs
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  productSku: { type: String, required: true },
  
  // Stock changes
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  quantityChange: { type: Number, required: true },
  
  // Adjustment details
  adjustmentType: { 
    type: String, 
    enum: ['add', 'remove', 'restock', 'sale', 'return', 'damage', 'count', 'transfer', 'transaction_delete'],
    required: true 
  },
  reason: { type: String },
  notes: { type: String },
  
  // Who made the change
  performedBy: { type: String, default: 'system' },
  userId: { type: String }, // Changed to String
  
  // Related transaction (if applicable) - Changed to String
  transactionId: { type: String },
  transactionReceipt: { type: String },
  
  // Sync status
  synced: { type: Boolean, default: false },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now }
});

// Indexes for efficient querying
stockHistorySchema.index({ productId: 1, createdAt: -1 });
stockHistorySchema.index({ createdAt: -1 });
stockHistorySchema.index({ adjustmentType: 1 });
stockHistorySchema.index({ synced: 1 });

const StockHistory = mongoose.model('StockHistory', stockHistorySchema);
export default StockHistory;