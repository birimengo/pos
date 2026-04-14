import Product from '../models/Product.js';
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
    console.error('Get all products error:', error);
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
    console.error('Get product by ID error:', error);
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
    
    // Validate required fields
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ error: 'Product name is required' });
    }
    if (!req.body.sku || !req.body.sku.trim()) {
      return res.status(400).json({ error: 'SKU is required' });
    }
    if (!req.body.price || isNaN(parseFloat(req.body.price))) {
      return res.status(400).json({ error: 'Valid price is required' });
    }
    if (!req.body.cost || isNaN(parseFloat(req.body.cost))) {
      return res.status(400).json({ error: 'Valid cost is required' });
    }
    if (!req.body.category || !req.body.category.trim()) {
      return res.status(400).json({ error: 'Category is required' });
    }
    
    // Check if SKU already exists in this store
    const existingProduct = await Product.findOne({ 
      sku: req.body.sku.trim(), 
      storeId 
    });
    if (existingProduct) {
      return res.status(400).json({ error: 'SKU already exists in this store' });
    }
    
    // CRITICAL FIX: Ensure images is an array of strings, not objects
    let cleanImages = [];
    if (req.body.images && Array.isArray(req.body.images)) {
      cleanImages = req.body.images.filter(img => typeof img === 'string' && img.length > 0);
    }
    
    // Ensure cloudinaryImages is an array of objects
    let cleanCloudinaryImages = [];
    if (req.body.cloudinaryImages && Array.isArray(req.body.cloudinaryImages)) {
      cleanCloudinaryImages = req.body.cloudinaryImages.filter(img => img && img.url);
    }
    
    // Prepare product data
    const productData = {
      name: req.body.name.trim(),
      sku: req.body.sku.trim(),
      barcode: req.body.barcode || '',
      price: parseFloat(req.body.price),
      cost: parseFloat(req.body.cost),
      stock: parseInt(req.body.stock) || 0,
      category: req.body.category.trim(),
      supplier: req.body.supplier || '',
      location: req.body.location || '',
      reorderPoint: req.body.reorderPoint || 5,
      description: req.body.description || '',
      images: cleanImages,
      cloudinaryImages: cleanCloudinaryImages,
      storeId: storeId
    };
    
    const product = new Product(productData);
    await product.save();
    
    console.log(`✅ Product created: ${product.name} (${product._id}) for store: ${storeId}`);
    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const storeId = req.body.storeId || req.user?.storeId;
    
    // Find the product first
    const existingProduct = await Product.findOne({ 
      _id: req.params.id, 
      storeId 
    });
    
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Prepare update data
    const updateData = {};
    
    if (req.body.name !== undefined) updateData.name = req.body.name.trim();
    if (req.body.sku !== undefined) updateData.sku = req.body.sku.trim();
    if (req.body.barcode !== undefined) updateData.barcode = req.body.barcode;
    if (req.body.price !== undefined) updateData.price = parseFloat(req.body.price);
    if (req.body.cost !== undefined) updateData.cost = parseFloat(req.body.cost);
    if (req.body.stock !== undefined) updateData.stock = parseInt(req.body.stock);
    if (req.body.category !== undefined) updateData.category = req.body.category.trim();
    if (req.body.supplier !== undefined) updateData.supplier = req.body.supplier;
    if (req.body.location !== undefined) updateData.location = req.body.location;
    if (req.body.reorderPoint !== undefined) updateData.reorderPoint = req.body.reorderPoint;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    
    // CRITICAL FIX: Clean images array - must be array of strings
    if (req.body.images !== undefined) {
      if (Array.isArray(req.body.images)) {
        updateData.images = req.body.images.filter(img => typeof img === 'string' && img.length > 0);
      } else {
        updateData.images = [];
      }
    }
    
    // Handle cloudinaryImages - must be array of objects
    if (req.body.cloudinaryImages !== undefined) {
      if (Array.isArray(req.body.cloudinaryImages)) {
        updateData.cloudinaryImages = req.body.cloudinaryImages.filter(img => img && img.url);
      } else {
        updateData.cloudinaryImages = [];
      }
    }
    
    updateData.updatedAt = Date.now();
    
    // Update the product
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, storeId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    console.log(`✅ Product updated: ${product.name} (${product._id}) for store: ${storeId}`);
    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const storeId = req.query.storeId || req.user?.storeId;
    const product = await Product.findOneAndDelete({ _id: req.params.id, storeId });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    // Delete images from Cloudinary
    if (product.cloudinaryImages && product.cloudinaryImages.length > 0) {
      for (const image of product.cloudinaryImages) {
        if (image.publicId) {
          try {
            await cloudinary.uploader.destroy(image.publicId);
            console.log(`🗑️ Deleted Cloudinary image: ${image.publicId}`);
          } catch (err) {
            console.warn('Failed to delete image from cloudinary:', err.message);
          }
        }
      }
    }
    
    console.log(`✅ Product deleted: ${product.name} (${product._id})`);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
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

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
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
    // Also add URLs to simple images array for compatibility
    images.forEach(img => {
      if (img.url && !product.images.includes(img.url)) {
        product.images.push(img.url);
      }
    });
    product.updatedAt = Date.now();
    await product.save();

    console.log(`✅ Uploaded ${images.length} images for product: ${product.name}`);
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

    try {
      await cloudinary.uploader.destroy(image.publicId);
      console.log(`🗑️ Deleted Cloudinary image: ${image.publicId}`);
    } catch (err) {
      console.warn('Failed to delete image from cloudinary:', err.message);
    }
    
    product.cloudinaryImages = product.cloudinaryImages.filter(img => img._id.toString() !== req.params.imageId);
    if (image.url) {
      product.images = product.images.filter(url => url !== image.url);
    }
    product.updatedAt = Date.now();
    await product.save();

    console.log(`✅ Deleted image for product: ${product.name}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete product image error:', error);
    res.status(500).json({ error: error.message });
  }
};