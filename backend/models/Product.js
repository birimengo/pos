// backend/models/Product.js
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true },
  barcode: String,
  price: { type: Number, required: true },
  cost: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  category: { type: String, required: true },
  supplier: String,
  location: String,
  reorderPoint: { type: Number, default: 5 },
  description: String,
  images: [String],
  cloudinaryImages: [{
    url: String,
    publicId: String,
    format: String,
    width: Number,
    height: Number,
    isMain: { type: Boolean, default: false }
  }],
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  storeSpecific: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound unique index for SKU per store
productSchema.index({ sku: 1, storeId: 1 }, { unique: true });

productSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

const Product = mongoose.model('Product', productSchema);
export default Product;