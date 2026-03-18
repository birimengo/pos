import mongoose from 'mongoose';

const purchaseOrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  supplier: { type: String, required: true },
  items: [{
    productId: mongoose.Schema.Types.ObjectId,
    productName: String,
    sku: String,
    quantity: Number,
    cost: Number,
    total: Number
  }],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'shipped', 'received', 'cancelled'], default: 'pending' },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  orderedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  expectedDate: Date,
  receivedDate: Date,
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Fix: Remove the callback parameter
purchaseOrderSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
export default PurchaseOrder;