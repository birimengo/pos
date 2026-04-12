// backend/controllers/productController.js
import Product from '../models/Product.js';
import StockHistory from '../models/StockHistory.js';
import { cloudinary } from '../config/cloudinary.js';

// Get all products (filtered by store)
export const getAllProducts = async (req, res) => {
  try {
    const storeId = req.query.storeId || req.user?.storeId;
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required' });
    }
    
    const products = await Product.find({ storeId }).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single product (with store check)
export const getProductById = async (req, res) => {
  try {
    const storeId = req.query.storeId || req.user?.storeId;
    const product = await Product.findOne({ 
      _id: req.params.id, 
      storeId 
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create product (with storeId)
export const createProduct = async (req, res) => {
  try {
    const storeId = req.body.storeId || req.user?.storeId;
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required' });
    }
    
    // Check if SKU already exists in this store
    const existingProduct = await Product.findOne({ 
      sku: req.body.sku, 
      storeId 
    });
    if (existingProduct) {
      return res.status(400).json({ error: 'SKU already exists in this store' });
    }
    
    const product = new Product({
      ...req.body,
      storeId
    });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const storeId = req.body.storeId || req.user?.storeId;
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, storeId },
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update product stock (for transaction deletions/refunds)
export const updateProductStock = async (req, res) => {
  try {
    const { quantityChange } = req.body;
    const storeId = req.body.storeId || req.user?.storeId;
    const product = await Product.findOne({ _id: req.params.id, storeId });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const oldStock = product.stock;
    product.stock = (product.stock || 0) + quantityChange;
    product.updatedAt = Date.now();
    await product.save();
    
    console.log(`📦 Stock updated for ${product.name} (Store: ${storeId}): ${oldStock} → ${product.stock} (${quantityChange >= 0 ? '+' : ''}${quantityChange})`);
    
    res.json({ 
      success: true, 
      product,
      oldStock,
      newStock: product.stock,
      quantityChange
    });
  } catch (error) {
    console.error('❌ Update product stock error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get stock history for a product (with store filter)
export const getStockHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.query.storeId || req.user?.storeId;
    const { limit = 50, offset = 0, type } = req.query;
    
    let query = { productId: String(id), storeId };
    if (type && type !== 'all') {
      query.adjustmentType = type;
    }
    
    const history = await StockHistory.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));
    
    const total = await StockHistory.countDocuments(query);
    
    res.json({
      success: true,
      history,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get stock history error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Add stock history record
export const addStockHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.body.storeId || req.user?.storeId;
    const { previousStock, newStock, quantityChange, adjustmentType, reason, notes, transactionId, transactionReceipt, productName, productSku } = req.body;
    
    let productNameValue = productName || 'Unknown Product';
    let productSkuValue = productSku || 'Unknown SKU';
    
    try {
      const product = await Product.findOne({ _id: id, storeId });
      if (product) {
        productNameValue = product.name;
        productSkuValue = product.sku;
      }
    } catch (err) {
      console.log('Product not found in database, using provided values');
    }
    
    const historyRecord = new StockHistory({
      productId: String(id),
      productName: productNameValue,
      productSku: productSkuValue,
      previousStock: previousStock || 0,
      newStock: newStock || 0,
      quantityChange: quantityChange || 0,
      adjustmentType: adjustmentType || 'adjustment',
      reason: reason || '',
      notes: notes || '',
      transactionId: transactionId ? String(transactionId) : null,
      transactionReceipt: transactionReceipt || null,
      performedBy: req.user?.name || 'system',
      userId: req.user?.id ? String(req.user.id) : null,
      storeId: storeId,
      synced: true,
      createdAt: new Date()
    });
    
    await historyRecord.save();
    
    console.log(`📝 Stock history recorded: ${productNameValue} - ${quantityChange > 0 ? '+' : ''}${quantityChange} (${adjustmentType})`);
    
    res.json({ success: true, history: historyRecord });
  } catch (error) {
    console.error('Add stock history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get stock summary for dashboard
export const getStockSummary = async (req, res) => {
  try {
    const storeId = req.query.storeId || req.user?.storeId;
    const stats = await StockHistory.aggregate([
      { $match: { storeId: storeId ? String(storeId) : null } },
      {
        $group: {
          _id: null,
          totalAdjustments: { $sum: 1 },
          totalAdded: {
            $sum: {
              $cond: [{ $gt: ['$quantityChange', 0] }, '$quantityChange', 0]
            }
          },
          totalRemoved: {
            $sum: {
              $cond: [{ $lt: ['$quantityChange', 0] }, { $multiply: ['$quantityChange', -1] }, 0]
            }
          }
        }
      }
    ]);
    
    const recentChanges = await StockHistory.find(storeId ? { storeId: String(storeId) } : {})
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json({
      success: true,
      stats: stats[0] || { totalAdjustments: 0, totalAdded: 0, totalRemoved: 0 },
      recentChanges
    });
  } catch (error) {
    console.error('Get stock summary error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const storeId = req.query.storeId || req.user?.storeId;
    const product = await Product.findOneAndDelete({ _id: req.params.id, storeId });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    if (product.cloudinaryImages && product.cloudinaryImages.length > 0) {
      for (const image of product.cloudinaryImages) {
        await cloudinary.uploader.destroy(image.publicId);
      }
    }
    
    await StockHistory.deleteMany({ productId: String(req.params.id), storeId: String(storeId) });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upload product images
export const uploadProductImages = async (req, res) => {
  try {
    const storeId = req.body.storeId || req.user?.storeId;
    const product = await Product.findOne({ _id: req.params.id, storeId });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const images = req.files.map((file, index) => ({
      url: file.path,
      publicId: file.filename,
      format: file.format,
      width: file.width,
      height: file.height,
      isMain: req.body.isMain === index.toString() || index === 0
    }));

    product.cloudinaryImages.push(...images);
    await product.save();

    res.json({ success: true, images });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete product image
export const deleteProductImage = async (req, res) => {
  try {
    const storeId = req.query.storeId || req.user?.storeId;
    const product = await Product.findOne({ _id: req.params.productId, storeId });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const image = product.cloudinaryImages.id(req.params.imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    await cloudinary.uploader.destroy(image.publicId);
    image.remove();
    await product.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};