// src/features/pos/services/productService.js
import { db } from './database';
import { opfs } from './opfsService';
import { api } from './api';

class ProductService {
  constructor() {
    this.syncInProgress = false;
    this.listeners = [];
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  notifyListeners(status) {
    this.listeners.forEach(cb => cb(status));
  }

  // ==================== IMAGE VALIDATION ====================

  async validateImageFile(file) {
    if (!file) return { valid: false, error: 'No file provided' };
    
    if (file.size === 0) return { valid: false, error: 'File is empty' };
    if (file.size < 100) return { valid: false, error: `File is too small/corrupted (${file.size} bytes)` };
    if (file.size > 10 * 1024 * 1024) return { valid: false, error: 'File too large (max 10MB)' };
    
    if (!file.type || !file.type.startsWith('image/')) {
      return { valid: false, error: `File is not an image (${file.type || 'unknown'})` };
    }

    try {
      const arrayBuffer = await file.slice(0, Math.min(100, file.size)).arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const header = Array.from(uint8).map(b => b.toString(16).padStart(2, '0')).join('');
      
      const isValidJPEG = header.startsWith('ffd8');
      const isValidPNG = header.startsWith('89504e47');
      const isValidGIF = header.startsWith('474946');
      const isValidWEBP = header.startsWith('52494646');
      
      if (!isValidJPEG && !isValidPNG && !isValidGIF && !isValidWEBP) {
        return { valid: false, error: 'File is not a valid image (invalid signature)' };
      }
      
      return { valid: true, file };
    } catch (error) {
      return { valid: false, error: `Failed to validate image: ${error.message}` };
    }
  }

  // ==================== STORE SYNC HELPER ====================

  async ensureStoreSynced() {
    const currentStore = await db.getCurrentStoreObject();
    if (!currentStore) {
      console.error('❌ No store selected');
      return { success: false, error: 'No store selected. Please select a store first.' };
    }
    
    // Get the store's MongoDB ID for proper isolation
    let storeMongoId = currentStore._id || currentStore.cloudId;
    const isValidObjectId = storeMongoId && /^[0-9a-fA-F]{24}$/.test(storeMongoId);
    
    if (!storeMongoId || !isValidObjectId) {
      console.log('⚠️ Store has no valid MongoDB ID. Product will be synced later.');
      console.log('Store object:', { _id: currentStore._id, cloudId: currentStore.cloudId, id: currentStore.id });
      return { 
        success: false, 
        error: 'Store not synced to cloud yet.',
        skip: true
      };
    }
    
    console.log(`✅ Store synced: ${currentStore.name} (ID: ${storeMongoId})`);
    return { success: true, storeMongoId, store: currentStore };
  }

  async getStoreMongoId() {
    const result = await this.ensureStoreSynced();
    if (!result.success) return null;
    return result.storeMongoId;
  }

  // Get the current user ID for ownership tracking
  async getCurrentUserId() {
    try {
      const currentUser = await db.getCurrentUser();
      return currentUser;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  // ==================== CREATE ====================

  async saveProductLocally(productData, imageFile = null) {
    try {
      console.log('💾 Saving product locally:', productData.name);
      
      await db.ensureInitialized();
      
      const productId = productData.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const currentStoreId = db.getCurrentStore();
      const currentUserId = await this.getCurrentUserId();
      
      // CRITICAL: Ensure storeId is properly set for isolation
      const storeIdToUse = productData.storeId || productData.storeMongoId || currentStoreId;
      
      const product = {
        ...productData,
        id: productId,
        localImages: productData.localImages || [],
        cloudImages: productData.cloudImages || [],
        localMainImage: productData.localMainImage || null,
        cloudMainImage: productData.cloudMainImage || null,
        failedImages: productData.failedImages || [],
        storeId: storeIdToUse,
        storeMongoId: storeIdToUse,
        userId: productData.userId || currentUserId,
        synced: false,
        syncRequired: true,
        createdAt: productData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('📦 Product store isolation:', {
        productName: product.name,
        storeId: product.storeId,
        storeMongoId: product.storeMongoId,
        userId: product.userId
      });

      if (imageFile) {
        const validation = await this.validateImageFile(imageFile);
        if (validation.valid) {
          const imagePath = await this.saveProductImageLocally(productId, imageFile);
          product.localImages.push(imagePath);
          product.localMainImage = imagePath;
        } else {
          console.warn('⚠️ Skipping invalid image:', validation.error);
          product.failedImages.push({
            fileName: imageFile.name,
            error: validation.error,
            timestamp: new Date().toISOString()
          });
        }
      }

      await db.saveProduct(product);
      console.log(`✅ Product saved locally: ${product.name} (${productId}) for store: ${product.storeId}`);
      
      await this.addToSyncQueue(productId);
      
      return { success: true, productId, product };
    } catch (error) {
      console.error('❌ Failed to save product locally:', error);
      return { success: false, error: error.message };
    }
  }

  async saveProductImageLocally(productId, imageFile) {
    try {
      const extension = imageFile.type?.split('/')[1] || 'jpg';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 6);
      const fileName = `${productId}_${timestamp}_${random}.${extension}`;
      const path = `products/${fileName}`;
      
      const validation = await this.validateImageFile(imageFile);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      await opfs.saveFile(fileName, imageFile, 'products');
      console.log('✅ Image saved locally:', path);
      return path;
    } catch (error) {
      console.error('❌ Failed to save image locally:', error);
      throw error;
    }
  }

  // ==================== READ ====================

  async getProductLocally(productId) {
    try {
      await db.ensureInitialized();
      const product = await db.getProduct(productId);
      
      // Verify product belongs to current store
      const currentStoreId = await this.getStoreMongoId();
      if (product && currentStoreId && product.storeId !== currentStoreId) {
        console.warn(`⚠️ Product ${productId} belongs to different store, access denied`);
        return null;
      }
      
      return product || null;
    } catch (error) {
      console.error('❌ Failed to get product locally:', error);
      return null;
    }
  }

  async getAllProductsLocally() {
    try {
      await db.ensureInitialized();
      const allProducts = await db.getProducts();
      const currentStoreId = await this.getStoreMongoId();
      
      // Filter products by current store for isolation
      let filteredProducts = allProducts;
      if (currentStoreId) {
        filteredProducts = allProducts.filter(p => p.storeId === currentStoreId);
        console.log(`📦 Retrieved ${filteredProducts.length} products for store ${currentStoreId} (${allProducts.length} total)`);
      } else {
        console.log(`📦 Retrieved ${allProducts.length} products from database (no store filter)`);
      }
      
      return filteredProducts || [];
    } catch (error) {
      console.error('❌ Failed to get all products:', error);
      return [];
    }
  }

  // ==================== UPDATE ====================

  async updateProductLocally(productId, updates, newImageFile = null) {
    try {
      console.log('🔄 Updating product locally:', productId);
      
      await db.ensureInitialized();
      
      const existingProduct = await db.getProduct(productId);
      if (!existingProduct) {
        throw new Error(`Product ${productId} not found`);
      }

      // Verify product belongs to current store
      const currentStoreId = await this.getStoreMongoId();
      if (currentStoreId && existingProduct.storeId !== currentStoreId) {
        throw new Error(`Cannot update product: belongs to different store`);
      }

      if (newImageFile) {
        const validation = await this.validateImageFile(newImageFile);
        if (validation.valid) {
          const imagePath = await this.saveProductImageLocally(productId, newImageFile);
          existingProduct.localImages = existingProduct.localImages || [];
          existingProduct.localImages.push(imagePath);
          existingProduct.localMainImage = imagePath;
          existingProduct.cloudMainImage = null;
        } else {
          console.warn('⚠️ Skipping invalid image for update:', validation.error);
          existingProduct.failedImages = existingProduct.failedImages || [];
          existingProduct.failedImages.push({
            fileName: newImageFile.name,
            error: validation.error,
            timestamp: new Date().toISOString()
          });
        }
      }

      const updatedProduct = {
        ...existingProduct,
        ...updates,
        updatedAt: new Date().toISOString(),
        synced: false,
        syncRequired: true
      };

      await db.saveProduct(updatedProduct);
      console.log(`✅ Product updated locally: ${updatedProduct.name}`);
      
      await this.addToSyncQueue(productId);
      
      return { success: true, product: updatedProduct };
    } catch (error) {
      console.error('❌ Failed to update product locally:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== UPDATE PRODUCT STOCK ====================

  async updateProductStock(productId, quantityChange) {
    try {
      await db.ensureInitialized();
      
      const product = await db.getProduct(String(productId));
      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }

      // Verify product belongs to current store
      const currentStoreId = await this.getStoreMongoId();
      if (currentStoreId && product.storeId !== currentStoreId) {
        throw new Error(`Cannot update stock: product belongs to different store`);
      }
      
      const oldStock = product.stock;
      product.stock = (product.stock || 0) + quantityChange;
      product.updatedAt = new Date().toISOString();
      product.synced = false;
      product.syncRequired = true;
      
      await db.saveProduct(product);
      
      console.log(`📦 Stock updated for ${product.name}: ${oldStock} → ${product.stock} (${quantityChange >= 0 ? '+' : ''}${quantityChange}) for store ${product.storeId}`);
      
      await this.addToSyncQueue(product.id);
      
      return { success: true, product, oldStock, newStock: product.stock };
    } catch (error) {
      console.error('❌ Failed to update product stock:', error);
      return { success: false, error: error.message };
    }
  }

  async restoreProductStock(transactionItems) {
    try {
      await db.ensureInitialized();
      const results = [];
      
      for (const item of transactionItems) {
        const result = await this.updateProductStock(item.productId, item.quantity);
        results.push(result);
      }
      
      const successCount = results.filter(r => r.success).length;
      console.log(`✅ Restored stock for ${successCount} of ${results.length} products`);
      
      return { success: true, results, successCount };
    } catch (error) {
      console.error('❌ Failed to restore product stock:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== RECORD LOCAL STOCK HISTORY ====================

  async recordLocalStockHistory(historyData) {
    try {
      await db.ensureInitialized();
      
      const stockHistory = {
        id: `sh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: String(historyData.productId),
        productName: historyData.productName,
        productSku: historyData.productSku,
        previousStock: historyData.previousStock,
        newStock: historyData.newStock,
        quantityChange: historyData.quantityChange,
        adjustmentType: historyData.adjustmentType,
        reason: historyData.reason,
        notes: historyData.notes,
        performedBy: historyData.performedBy || 'system',
        storeId: db.getCurrentStore(),
        createdAt: historyData.createdAt || new Date().toISOString(),
        synced: false
      };
      
      await db.addToStockHistory(stockHistory);
      console.log(`📝 Local stock history recorded: ${historyData.productName} - ${historyData.quantityChange > 0 ? '+' : ''}${historyData.quantityChange} (${historyData.adjustmentType})`);
      
      return { success: true, history: stockHistory };
    } catch (error) {
      console.error('Failed to record local stock history:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== DELETE ====================

  async deleteProduct(productId, deleteFromCloud = true) {
    try {
      console.log('🗑️ Deleting product:', productId);
      
      await db.ensureInitialized();
      
      const product = await db.getProduct(productId);
      
      if (product) {
        // Verify product belongs to current store
        const currentStoreId = await this.getStoreMongoId();
        if (currentStoreId && product.storeId !== currentStoreId) {
          console.warn(`⚠️ Cannot delete product: belongs to different store`);
          return { success: false, error: 'Product belongs to different store' };
        }
        
        if (product.localImages?.length > 0) {
          for (const localPath of product.localImages) {
            try {
              const fileName = localPath.split('/').pop();
              await opfs.deleteFile(fileName, 'products');
              console.log('🗑️ Deleted local image:', fileName);
            } catch (imgError) {
              console.warn('Failed to delete local image:', imgError);
            }
          }
        }
        
        await db.deleteProduct(productId);
        console.log('✅ Product deleted from local database');
        
        if (deleteFromCloud && product._id && navigator.onLine) {
          try {
            const result = await api.deleteProduct(product._id);
            if (result.success) {
              console.log('✅ Product deleted from cloud');
            } else {
              await this.addToDeleteQueue(productId, product._id);
            }
          } catch (cloudError) {
            console.warn('Cloud delete failed, adding to queue:', cloudError);
            await this.addToDeleteQueue(productId, product._id);
          }
        } else if (product._id) {
          await this.addToDeleteQueue(productId, product._id);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to delete product:', error);
      return { success: false, error: error.message };
    }
  }

  async addToDeleteQueue(productId, cloudId) {
    try {
      await db.ensureInitialized();
      await db.addToSyncQueue({
        type: 'delete',
        productId,
        cloudId,
        timestamp: new Date().toISOString()
      });
      console.log(`📋 Product ${productId} added to delete queue`);
    } catch (error) {
      console.error('❌ Failed to add to delete queue:', error);
    }
  }

  // ==================== SYNC QUEUE MANAGEMENT ====================

  async addToSyncQueue(productId) {
    try {
      await db.ensureInitialized();
      await db.addToSyncQueue({
        type: 'product',
        productId: String(productId),
        timestamp: new Date().toISOString()
      });
      console.log(`📋 Product ${productId} added to sync queue`);
    } catch (error) {
      console.error('❌ Failed to add to sync queue:', error);
    }
  }

  async getSyncQueue() {
    try {
      await db.ensureInitialized();
      return await db.getSyncQueue();
    } catch (error) {
      console.error('❌ Failed to get sync queue:', error);
      return [];
    }
  }

  // ==================== CLOUD SYNC ====================

  async syncProductToCloud(productId) {
    try {
      await db.ensureInitialized();
      
      const product = await db.getProduct(String(productId));
      if (!product) {
        throw new Error(`Product ${productId} not found locally`);
      }

      const storeSyncResult = await this.ensureStoreSynced();
      if (!storeSyncResult.success) {
        console.log('⏳ Store not synced yet, keeping product in queue for later sync');
        return { 
          success: false, 
          error: storeSyncResult.error,
          skip: true,
          keepInQueue: true
        };
      }

      const storeMongoId = storeSyncResult.storeMongoId;
      if (!storeMongoId || !/^[0-9a-fA-F]{24}$/.test(storeMongoId)) {
        console.error('❌ Invalid store MongoDB ID:', storeMongoId);
        return { 
          success: false, 
          error: 'Invalid store MongoDB ID.',
          skip: true,
          keepInQueue: true
        };
      }

      console.log(`☁️ Syncing product ${product.name} to cloud for store: ${storeMongoId}`);
      console.log(`📦 Product storeId: ${product.storeId}, Target store: ${storeMongoId}`);

      // Ensure product.storeId matches current store
      if (product.storeId !== storeMongoId) {
        console.warn(`⚠️ Product storeId mismatch! Updating from ${product.storeId} to ${storeMongoId}`);
        product.storeId = storeMongoId;
        await db.saveProduct(product);
      }

      const cloudImages = [...(product.cloudImages || [])];
      const uploadedImages = [];
      const failedImages = [...(product.failedImages || [])];
      
      // Upload local images to cloudinary
      if (product.localImages?.length > 0) {
        console.log(`📸 Found ${product.localImages.length} local images to upload`);
        
        for (let i = 0; i < product.localImages.length; i++) {
          const localPath = product.localImages[i];
          const fileName = localPath.split('/').pop();
          
          try {
            const imageFile = await opfs.readFile(fileName, 'products');
            
            if (!imageFile) {
              console.warn(`⚠️ Image file not found: ${fileName}, skipping`);
              failedImages.push({
                path: localPath,
                error: 'File not found',
                timestamp: new Date().toISOString()
              });
              continue;
            }

            const validation = await this.validateImageFile(imageFile);
            if (!validation.valid) {
              console.warn(`⚠️ Invalid image file: ${fileName} - ${validation.error}`);
              failedImages.push({
                path: localPath,
                error: validation.error,
                timestamp: new Date().toISOString()
              });
              
              try {
                await opfs.deleteFile(fileName, 'products');
                console.log(`🗑️ Deleted corrupted image: ${fileName}`);
              } catch (deleteError) {
                console.warn('Failed to delete corrupted image:', deleteError);
              }
              
              continue;
            }

            console.log(`☁️ Uploading image ${i+1}/${product.localImages.length}...`);
            
            const uniqueFile = new File(
              [imageFile], 
              `${Date.now()}_${fileName}`,
              { type: imageFile.type || 'image/jpeg' }
            );
            
            const cloudinaryResult = await api.uploadImageToCloudinary(uniqueFile, 'products');
            
            const imageData = {
              url: cloudinaryResult.secure_url,
              publicId: cloudinaryResult.public_id,
              format: cloudinaryResult.format,
              width: cloudinaryResult.width,
              height: cloudinaryResult.height,
              bytes: cloudinaryResult.bytes,
              isMain: localPath === product.localMainImage
            };
            
            cloudImages.push(imageData);
            uploadedImages.push({
              localPath,
              cloudData: imageData
            });
            
            console.log(`✅ Image ${i+1} uploaded successfully (${cloudinaryResult.bytes} bytes)`);
            
            try {
              await opfs.deleteFile(fileName, 'products');
              console.log(`🗑️ Deleted local image: ${fileName}`);
            } catch (deleteError) {
              console.warn(`Failed to delete local image: ${fileName}`, deleteError);
            }
            
          } catch (imgError) {
            console.error(`❌ Image upload failed for ${fileName}:`, imgError);
            failedImages.push({
              path: localPath,
              error: imgError.message,
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      // CRITICAL FIX: Separate images into URL strings array and cloudinaryImages objects array
      const imageUrls = cloudImages.map(img => img.url);
      
      const productData = {
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        category: product.category,
        supplier: product.supplier,
        location: product.location,
        reorderPoint: product.reorderPoint,
        description: product.description,
        images: imageUrls,  // Array of URL strings (for simple image URLs)
        cloudinaryImages: cloudImages,  // Array of objects (for detailed Cloudinary data)
        cloudMainImage: cloudImages.find(img => img.isMain)?.url || cloudImages[0]?.url,
        storeId: storeMongoId,  // CRITICAL: Use store's MongoDB ID for isolation
        updatedAt: new Date().toISOString()
      };

      console.log('📤 Sending to MongoDB with storeId:', storeMongoId);
      console.log('📸 Images data:', { imageUrlsCount: imageUrls.length, cloudImagesCount: cloudImages.length });

      let mongoResult;
      let isNewProduct = false;
      
      // FIRST: Try to find existing product by SKU within the same store
      try {
        console.log(`🔍 Checking if product exists in cloud by SKU: ${product.sku}`);
        const allProductsResult = await api.getAllProducts();
        if (allProductsResult.success && allProductsResult.products) {
          // Only find products from the same store
          const existingProduct = allProductsResult.products.find(p => p.sku === product.sku && p.storeId === storeMongoId);
          if (existingProduct && existingProduct._id) {
            console.log(`✅ Found existing product in cloud by SKU: ${existingProduct._id}`);
            mongoResult = await api.updateProduct(existingProduct._id, productData);
          }
        }
      } catch (error) {
        console.log('⚠️ Could not check existing product by SKU:', error.message);
      }
      
      // SECOND: If not found by SKU, try by cloud ID
      if (!mongoResult && product._id) {
        try {
          console.log(`🔍 Checking if product exists in cloud by ID: ${product._id}`);
          const checkResult = await api.getProduct(product._id);
          if (checkResult.success && checkResult.product && checkResult.product.storeId === storeMongoId) {
            console.log(`✅ Found existing product in cloud by ID: ${product._id}`);
            mongoResult = await api.updateProduct(product._id, productData);
          }
        } catch (error) {
          console.log(`⚠️ Product not found by ID: ${product._id}, will create new`);
        }
      }
      
      // THIRD: Create new product
      if (!mongoResult) {
        console.log(`➕ Creating new product in cloud: ${product.name}`);
        mongoResult = await api.createProduct(productData);
        isNewProduct = true;
      }

      if (mongoResult.success) {
        const cloudProduct = mongoResult.product;
        const updatedProduct = {
          ...product,
          _id: cloudProduct._id,
          cloudId: cloudProduct._id,
          cloudImages,
          cloudMainImage: cloudImages.find(img => img.isMain)?.url || cloudImages[0]?.url,
          localImages: [],
          localMainImage: null,
          failedImages: failedImages.length > 0 ? failedImages : [],
          storeId: storeMongoId,
          synced: true,
          syncRequired: false,
          lastSyncedAt: new Date().toISOString()
        };
        
        await db.saveProduct(updatedProduct);
        
        console.log(`✅ Product ${product.name} ${isNewProduct ? 'created' : 'updated'} in cloud with ${cloudImages.length} images for store ${storeMongoId}`);
        if (failedImages.length > 0) {
          console.log(`⚠️ ${failedImages.length} images failed to upload`);
        }
        
        return { 
          success: true, 
          product: updatedProduct,
          uploadedCount: cloudImages.length - (product.cloudImages?.length || 0),
          failedCount: failedImages.length,
          isNew: isNewProduct
        };
      } else {
        throw new Error(mongoResult.error || 'Failed to save to MongoDB');
      }
    } catch (error) {
      console.error('❌ Failed to sync product to cloud:', error);
      
      try {
        const product = await db.getProduct(String(productId));
        if (product) {
          product.syncError = error.message;
          product.lastSyncAttempt = new Date().toISOString();
          await db.saveProduct(product);
        }
      } catch (updateError) {
        console.error('Failed to update sync error:', updateError);
      }
      
      return { success: false, error: error.message };
    }
  }

  async syncDeleteFromCloud(queueItem) {
    try {
      console.log('🗑️ Syncing delete to cloud:', queueItem.cloudId);
      
      const result = await api.deleteProduct(queueItem.cloudId);
      
      if (result.success) {
        console.log('✅ Product deleted from cloud');
        return { success: true };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Failed to sync delete:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== SYNC ALL PENDING ====================

  async syncAllPending() {
    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.syncInProgress = true;
    this.notifyListeners({ type: 'sync-start', message: 'Syncing...' });
    
    try {
      await db.ensureInitialized();
      
      const queue = await db.getSyncQueue();
      console.log(`🔄 Processing ${queue.length} sync queue items`);
      
      const results = [];
      let uploadedTotal = 0;
      let failedTotal = 0;
      const itemsToKeep = [];
      
      for (const item of queue) {
        try {
          if (item.type === 'delete') {
            const result = await this.syncDeleteFromCloud(item);
            if (result.success) {
              await db.delete('syncQueue', item.id);
            }
            results.push({ item, ...result });
          } 
          else if (item.type === 'product') {
            if (!item.productId) {
              console.warn(`⚠️ Invalid queue item: missing productId, removing`);
              await db.delete('syncQueue', item.id);
              results.push({ item, success: false, error: 'Missing productId', removed: true });
              continue;
            }
            
            const product = await db.getProduct(String(item.productId));
            if (!product) {
              console.warn(`⚠️ Product ${item.productId} not found, removing from queue`);
              await db.delete('syncQueue', item.id);
              results.push({ item, success: false, error: 'Product not found', removed: true });
              continue;
            }
            
            const result = await this.syncProductToCloud(item.productId);
            if (result.success) {
              await db.delete('syncQueue', item.id);
              uploadedTotal += result.uploadedCount || 0;
              failedTotal += result.failedCount || 0;
            } else if (result.keepInQueue) {
              itemsToKeep.push(item);
            }
            results.push({ item, ...result });
          }
          else if (item.type === 'transaction') {
            if (!item.transactionId) {
              console.warn(`⚠️ Invalid queue item: missing transactionId, removing`);
              await db.delete('syncQueue', item.id);
              results.push({ item, success: false, error: 'Missing transactionId', removed: true });
              continue;
            }
            
            try {
              const { transactionService } = await import('./transactionService');
              const result = await transactionService.syncTransactionToCloud(item.transactionId);
              
              if (result.success) {
                await db.delete('syncQueue', item.id);
                console.log(`✅ Transaction ${item.transactionId} synced successfully`);
              } else {
                console.warn(`⚠️ Transaction sync failed: ${result.error}`);
              }
              results.push({ item, ...result });
            } catch (txError) {
              console.error(`Failed to sync transaction ${item.transactionId}:`, txError);
              results.push({ item, success: false, error: txError.message });
            }
          }
          else if (item.type === 'customer') {
            if (!item.customerId) {
              console.warn(`⚠️ Invalid queue item: missing customerId, removing`);
              await db.delete('syncQueue', item.id);
              results.push({ item, success: false, error: 'Missing customerId', removed: true });
              continue;
            }
            
            try {
              const { customerService } = await import('./customerService');
              const result = await customerService.syncCustomerToCloud(item.customerId);
              
              if (result.success) {
                await db.delete('syncQueue', item.id);
                console.log(`✅ Customer ${item.customerId} synced successfully`);
              } else {
                console.warn(`⚠️ Customer sync failed: ${result.error}`);
              }
              results.push({ item, ...result });
            } catch (custError) {
              console.error(`Failed to sync customer ${item.customerId}:`, custError);
              results.push({ item, success: false, error: custError.message });
            }
          }
          else if (item.type === 'return') {
            if (!item.returnId) {
              console.warn(`⚠️ Invalid queue item: missing returnId, removing`);
              await db.delete('syncQueue', item.id);
              results.push({ item, success: false, error: 'Missing returnId', removed: true });
              continue;
            }
            
            try {
              const returnRecord = await db.get('returns', String(item.returnId));
              if (!returnRecord) {
                console.warn(`⚠️ Return ${item.returnId} not found, removing from queue`);
                await db.delete('syncQueue', item.id);
                results.push({ item, success: false, error: 'Return not found', removed: true });
                continue;
              }
              
              returnRecord.synced = true;
              returnRecord.lastSyncedAt = new Date().toISOString();
              await db.put('returns', returnRecord);
              await db.delete('syncQueue', item.id);
              
              console.log(`✅ Return ${item.returnId} marked as synced`);
              results.push({ item, success: true, message: 'Return synced' });
            } catch (returnError) {
              console.error(`Failed to sync return ${item.returnId}:`, returnError);
              results.push({ item, success: false, error: returnError.message });
            }
          }
          else {
            console.warn(`⚠️ Unknown queue item type: ${item.type}, removing`);
            await db.delete('syncQueue', item.id);
            results.push({ item, success: false, error: 'Unknown type', removed: true });
          }
        } catch (itemError) {
          console.error(`Failed to process queue item ${item.id}:`, itemError);
          if (itemError.message?.includes('not found') || itemError.message?.includes('undefined')) {
            await db.delete('syncQueue', item.id);
          } else {
            itemsToKeep.push(item);
          }
          results.push({ item, success: false, error: itemError.message });
        }
      }
      
      this.syncInProgress = false;
      const successCount = results.filter(r => r.success).length;
      
      let message = `Synced ${successCount} of ${results.length} items`;
      if (uploadedTotal > 0) message += `, ${uploadedTotal} images uploaded`;
      if (failedTotal > 0) message += `, ${failedTotal} images failed`;
      
      this.notifyListeners({ 
        type: 'sync-complete', 
        message
      });
      
      return { success: true, results, uploadedTotal, failedTotal };
    } catch (error) {
      console.error('❌ Sync all failed:', error);
      this.syncInProgress = false;
      this.notifyListeners({ type: 'sync-error', message: error.message });
      return { success: false, error: error.message };
    }
  }

  // ==================== IMAGE CLEANUP ====================

  async cleanupCorruptedImages() {
    try {
      await db.ensureInitialized();
      
      const products = await db.getProducts();
      let cleanedCount = 0;
      
      for (const product of products) {
        if (product.localImages?.length > 0) {
          const validImages = [];
          
          for (const localPath of product.localImages) {
            const fileName = localPath.split('/').pop();
            try {
              const file = await opfs.readFile(fileName, 'products');
              const validation = await this.validateImageFile(file);
              
              if (validation.valid) {
                validImages.push(localPath);
              } else {
                console.log(`🗑️ Cleaning up corrupted image: ${fileName}`);
                await opfs.deleteFile(fileName, 'products').catch(() => {});
                cleanedCount++;
              }
            } catch (error) {
              console.log(`🗑️ Cleaning up missing image: ${fileName}`);
              cleanedCount++;
            }
          }
          
          if (validImages.length !== product.localImages.length) {
            product.localImages = validImages;
            if (product.localMainImage && !validImages.includes(product.localMainImage)) {
              product.localMainImage = validImages[0] || null;
            }
            await db.saveProduct(product);
          }
        }
      }
      
      console.log(`✅ Cleaned up ${cleanedCount} corrupted images`);
      return { success: true, cleanedCount };
    } catch (error) {
      console.error('❌ Failed to cleanup images:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== UTILITY ====================

  async getSyncStatus() {
    try {
      await db.ensureInitialized();
      
      const allProducts = await db.getProducts();
      const currentStoreId = await this.getStoreMongoId();
      
      // Only count products from current store
      let storeProducts = allProducts;
      if (currentStoreId) {
        storeProducts = allProducts.filter(p => p.storeId === currentStoreId);
      }
      
      const syncedProducts = storeProducts.filter(p => p.synced);
      const pendingProducts = storeProducts.filter(p => !p.synced);
      const queue = await db.getSyncQueue();
      
      const totalLocalImages = storeProducts.reduce((sum, p) => sum + (p.localImages?.length || 0), 0);
      const totalCloudImages = storeProducts.reduce((sum, p) => sum + (p.cloudImages?.length || 0), 0);
      
      return {
        totalProducts: storeProducts.length,
        syncedProducts: syncedProducts.length,
        pendingProducts: pendingProducts.length,
        queueLength: queue.length,
        totalLocalImages,
        totalCloudImages,
        isOnline: navigator.onLine,
        currentStoreId
      };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return {
        totalProducts: 0,
        syncedProducts: 0,
        pendingProducts: 0,
        queueLength: 0,
        totalLocalImages: 0,
        totalCloudImages: 0,
        isOnline: navigator.onLine,
        currentStoreId: null
      };
    }
  }

  async clearAllData() {
    try {
      await db.ensureInitialized();
      await db.clearAllStores();
      console.log('✅ All data cleared');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to clear data:', error);
      return { success: false, error: error.message };
    }
  }
}

export const productService = new ProductService();