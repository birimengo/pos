import mongoose from 'mongoose';

const transferSchema = new mongoose.Schema({
  fromStoreId: { type: String, required: true },
  fromStore: { type: String, required: true },
  toStoreId: { type: String, required: true },
  toStore: { type: String, required: true },
  productId: { type: String, required: true },
  product: { type: String, required: true },
  productSku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ['pending', 'in-transit', 'completed', 'cancelled'],
    default: 'pending'
  },
  initiatedBy: { type: String, required: true },
  initiatedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: String },
  approvedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  completedBy: { type: String },
  completedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: { type: Date },
  cancelledBy: { type: String },
  cancelledById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: { type: Date },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Transfer = mongoose.model('Transfer', transferSchema);
export default Transfer;