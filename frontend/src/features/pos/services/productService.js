// src/features/pos/services/productService.js (Complete CRUD with Enhanced Image Handling)
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
    
    // Check file exists
    if (!file) return { valid: false, error: 'File is null or undefined' };
    
    // Check file size
    if (file.size === 0) return { valid: false, error: 'File is empty' };
    if (file.size < 100) return { valid: false, error: `File is too small/corrupted (${file.size} bytes)` };
    if (file.size > 10 * 1024 * 1024) return { valid: false, error: 'File too large (max 10MB)' };
    
    // Check file type
    if (!file.type || !file.type.startsWith('image/')) {
      return { valid: false, error: `File is not an image (${file.type || 'unknown'})` };
    }

    // Verify image signature
    try {
      const arrayBuffer = await file.slice(0, Math.min(100, file.size)).arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const header = Array.from(uint8).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Check for common image signatures
      const isValidJPEG = header.startsWith('ffd8');
      const isValidPNG = header.startsWith('89504e47');
      const isValidGIF = header.startsWith('474946');
      const isValidWEBP = header.startsWith('52494646'); // RIFF header for WEBP
      
      if (!isValidJPEG && !isValidPNG && !isValidGIF && !isValidWEBP) {
        return { valid: false, error: 'File is not a valid image (invalid signature)' };
      }
      
      return { valid: true, file };
    } catch (error) {
      return { valid: false, error: `Failed to validate image: ${error.message}` };
    }
  }

  // ==================== CREATE ====================

  async saveProductLocally(productData, imageFile = null) {
    try {
      console.log('💾 Saving product locally:', productData.name);
      
      await db.ensureInitialized();
      
      const productId = productData.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const product = {
        ...productData,
        id: productId,
        localImages: productData.localImages || [],
        cloudImages: productData.cloudImages || [],
        localMainImage: productData.localMainImage || null,
        cloudMainImage: productData.cloudMainImage || null,
        failedImages: productData.failedImages || [],
        synced: false,
        syncRequired: true,
        createdAt: productData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

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
      console.log(`✅ Product saved locally: ${product.name} (${productId})`);
      
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
      
      // Validate before saving
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
      return await db.getProduct(productId) || null;
    } catch (error) {
      console.error('❌ Failed to get product locally:', error);
      return null;
    }
  }

  async getAllProductsLocally() {
    try {
      await db.ensureInitialized();
      const products = await db.getProducts();
      console.log(`📦 Retrieved ${products.length} products from database`);
      return products || [];
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

      // Handle new image if provided
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

      // Update product data
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

  // ==================== DELETE ====================

  async deleteProduct(productId, deleteFromCloud = true) {
    try {
      console.log('🗑️ Deleting product:', productId);
      
      await db.ensureInitialized();
      
      const product = await db.getProduct(productId);
      
      if (product) {
        // Delete local images from OPFS
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
        
        // Delete from IndexedDB
        await db.deleteProduct(productId);
        console.log('✅ Product deleted from local database');
        
        // Delete from cloud if requested and online
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
        productId,
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
      
      const product = await db.getProduct(productId);
      if (!product) {
        throw new Error(`Product ${productId} not found locally`);
      }

      console.log(`☁️ Syncing product ${product.name} to cloud...`);

      // Upload images to Cloudinary
      const cloudImages = [...(product.cloudImages || [])];
      const uploadedImages = [];
      const failedImages = [...(product.failedImages || [])];
      
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

            // Validate image before upload
            const validation = await this.validateImageFile(imageFile);
            if (!validation.valid) {
              console.warn(`⚠️ Invalid image file: ${fileName} - ${validation.error}`);
              failedImages.push({
                path: localPath,
                error: validation.error,
                timestamp: new Date().toISOString()
              });
              
              // Delete corrupted file
              try {
                await opfs.deleteFile(fileName, 'products');
                console.log(`🗑️ Deleted corrupted image: ${fileName}`);
              } catch (deleteError) {
                console.warn('Failed to delete corrupted image:', deleteError);
              }
              
              continue;
            }

            console.log(`☁️ Uploading image ${i+1}/${product.localImages.length}...`);
            
            // Create a unique file to avoid Cloudinary duplicate detection
            const uniqueFile = new File(
              [imageFile], 
              `${Date.now()}_${fileName}`,
              { type: imageFile.type || 'image/jpeg' }
            );
            
            const cloudinaryResult = await api.uploadImageToCloudinary(
              uniqueFile, 
              'products'
            );
            
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
            
            // Delete local image after successful upload
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

      // Prepare product data for MongoDB
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
        cloudinaryImages: cloudImages,
        cloudMainImage: cloudImages.find(img => img.isMain)?.url || cloudImages[0]?.url,
        uploadedImages: uploadedImages.map(img => img.cloudData.url),
        updatedAt: new Date().toISOString()
      };

      console.log('📤 Sending to MongoDB...');

      // Send to MongoDB
      let mongoResult;
      if (product._id) {
        mongoResult = await api.updateProduct(product._id, productData);
      } else {
        mongoResult = await api.createProduct(productData);
      }

      if (mongoResult.success) {
        // Update local product with cloud data
        const updatedProduct = {
          ...product,
          _id: mongoResult.product._id,
          cloudImages,
          cloudMainImage: cloudImages.find(img => img.isMain)?.url || cloudImages[0]?.url,
          localImages: [], // Clear local images after successful upload
          localMainImage: null,
          failedImages: failedImages.length > 0 ? failedImages : [],
          synced: true,
          syncRequired: false,
          lastSyncedAt: new Date().toISOString()
        };
        
        await db.saveProduct(updatedProduct);
        
        console.log(`✅ Product ${product.name} synced to cloud with ${cloudImages.length} images`);
        if (failedImages.length > 0) {
          console.log(`⚠️ ${failedImages.length} images failed to upload`);
        }
        
        return { 
          success: true, 
          product: updatedProduct,
          uploadedCount: cloudImages.length - (product.cloudImages?.length || 0),
          failedCount: failedImages.length
        };
      } else {
        throw new Error(mongoResult.error || 'Failed to save to MongoDB');
      }
    } catch (error) {
      console.error('❌ Failed to sync product to cloud:', error);
      
      // Update product with sync error
      try {
        const product = await db.getProduct(productId);
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
      
      for (const item of queue) {
        if (item.type === 'delete') {
          const result = await this.syncDeleteFromCloud(item);
          if (result.success) {
            await db.delete('syncQueue', item.id);
          }
          results.push({ item, ...result });
        } else {
          const result = await this.syncProductToCloud(item.productId);
          if (result.success) {
            await db.delete('syncQueue', item.id);
            uploadedTotal += result.uploadedCount || 0;
            failedTotal += result.failedCount || 0;
          }
          results.push({ item, ...result });
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
      const syncedProducts = allProducts.filter(p => p.synced);
      const pendingProducts = allProducts.filter(p => !p.synced);
      const queue = await db.getSyncQueue();
      
      // Count images
      const totalLocalImages = allProducts.reduce((sum, p) => sum + (p.localImages?.length || 0), 0);
      const totalCloudImages = allProducts.reduce((sum, p) => sum + (p.cloudImages?.length || 0), 0);
      
      return {
        totalProducts: allProducts.length,
        syncedProducts: syncedProducts.length,
        pendingProducts: pendingProducts.length,
        queueLength: queue.length,
        totalLocalImages,
        totalCloudImages,
        isOnline: navigator.onLine
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
        isOnline: navigator.onLine
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