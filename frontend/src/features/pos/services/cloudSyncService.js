// src/features/pos/services/cloudSyncService.js
import { offlineDB } from './indexedDB';
import { opfs } from './opfsService';
import { api } from './api';
import { db } from './database';

class CloudSyncService {
  constructor() {
    this.syncInProgress = false;
    this.listeners = [];
    this.lastSyncTime = null;
    this.initialized = false;
    this.syncQueue = [];
    this.autoSyncInterval = null;
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await offlineDB.init();
      await opfs.init();
      await db.ensureInitialized();
      this.initialized = true;
      
      // Start auto-sync if enabled
      this.startAutoSync();
    }
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

  startAutoSync() {
    // Check every 30 minutes if online and auto-sync enabled
    this.autoSyncInterval = setInterval(async () => {
      const autoSync = localStorage.getItem('autoSync') !== 'false';
      if (autoSync && navigator.onLine && !this.syncInProgress) {
        await this.fullSync();
      }
    }, 30 * 60 * 1000);
  }

  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }
  }

  // ==================== PUSH TO CLOUD ====================

  async pushProducts() {
    await this.ensureInitialized();
    
    try {
      // Get unsynced products from database
      const allProducts = await db.getAll('products');
      const unsyncedProducts = allProducts.filter(p => !p.synced);
      let pushed = 0;
      
      for (const product of unsyncedProducts) {
        try {
          // Upload images first
          const images = [];
          if (product.localImages?.length > 0) {
            for (const localPath of product.localImages) {
              const fileName = localPath.split('/').pop();
              const file = await opfs.readFile(fileName, 'products');
              if (file && file.size > 100) {
                const result = await api.uploadImageToCloudinary(file, 'products');
                images.push({
                  url: result.secure_url,
                  publicId: result.public_id,
                  isMain: localPath === product.localMainImage
                });
              }
            }
          }

          // Prepare product data
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
            images,
            mainImage: images.find(img => img.isMain)?.url || images[0]?.url
          };

          // Send to cloud
          let result;
          if (product._id) {
            result = await api.updateProduct(product._id, productData);
          } else {
            result = await api.createProduct(productData);
          }

          if (result.success) {
            // Mark as synced locally
            product.synced = true;
            product.cloudId = result.product._id;
            await db.put('products', product);
            
            // Clean up local images
            for (const localPath of product.localImages || []) {
              const fileName = localPath.split('/').pop();
              await opfs.deleteFile(fileName, 'products').catch(() => {});
            }
            
            pushed++;
          }
        } catch (error) {
          console.error('Failed to push product:', error);
        }
      }
      
      return { success: true, count: pushed };
    } catch (error) {
      console.error('Push products failed:', error);
      return { success: false, error: error.message };
    }
  }

  async pushCustomers() {
    await this.ensureInitialized();
    
    try {
      // Get unsynced customers from database
      const allCustomers = await db.getAll('customers');
      const unsyncedCustomers = allCustomers.filter(c => !c.synced);
      let pushed = 0;
      
      for (const customer of unsyncedCustomers) {
        try {
          let result;
          if (customer._id) {
            result = await api.updateCustomer(customer._id, customer);
          } else {
            result = await api.createCustomer(customer);
          }
          
          if (result.success) {
            // Mark as synced locally
            customer.synced = true;
            customer.cloudId = result.customer._id;
            await db.put('customers', customer);
            pushed++;
          }
        } catch (error) {
          console.error('Failed to push customer:', error);
        }
      }
      
      return { success: true, count: pushed };
    } catch (error) {
      console.error('Push customers failed:', error);
      return { success: false, error: error.message };
    }
  }

  async pushTransactions() {
    await this.ensureInitialized();
    
    try {
      // Get unsynced transactions from database
      const allTransactions = await db.getAll('transactions');
      const unsyncedTransactions = allTransactions.filter(t => !t.synced);
      let pushed = 0;
      
      for (const transaction of unsyncedTransactions) {
        try {
          const result = await api.syncTransaction(transaction);
          
          if (result.success) {
            // Mark as synced locally
            transaction.synced = true;
            transaction.cloudId = result.id;
            await db.put('transactions', transaction);
            pushed++;
          }
        } catch (error) {
          console.error('Failed to push transaction:', error);
        }
      }
      
      return { success: true, count: pushed };
    } catch (error) {
      console.error('Push transactions failed:', error);
      return { success: false, error: error.message };
    }
  }

  async pushToCloud() {
    this.notifyListeners({ type: 'sync-start', message: 'Pushing to cloud...' });
    
    try {
      const [products, customers, transactions] = await Promise.all([
        this.pushProducts(),
        this.pushCustomers(),
        this.pushTransactions()
      ]);
      
      const total = (products.count || 0) + (customers.count || 0) + (transactions.count || 0);
      
      this.notifyListeners({ 
        type: 'sync-complete', 
        message: `Pushed ${total} items to cloud` 
      });
      
      return { 
        success: true, 
        count: total,
        details: { products, customers, transactions }
      };
    } catch (error) {
      this.notifyListeners({ type: 'sync-error', message: error.message });
      return { success: false, error: error.message };
    }
  }

  // ==================== PULL FROM CLOUD ====================

  async pullProducts() {
    await this.ensureInitialized();
    
    try {
      const result = await api.getAllProducts();
      let pulled = 0;
      
      if (result.success && result.products) {
        for (const cloudProduct of result.products) {
          try {
            // Check if product exists locally by SKU
            const allProducts = await db.getAll('products');
            const existingProduct = allProducts.find(p => p.sku === cloudProduct.sku);
            
            if (existingProduct) {
              // Update existing
              await db.put('products', {
                ...existingProduct,
                ...cloudProduct,
                _id: cloudProduct._id,
                synced: true,
                syncRequired: false
              });
            } else {
              // Create new
              await db.put('products', {
                ...cloudProduct,
                id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                _id: cloudProduct._id,
                synced: true,
                syncRequired: false
              });
            }
            pulled++;
          } catch (error) {
            console.error('Failed to save pulled product:', error);
          }
        }
      }
      
      return { success: true, count: pulled };
    } catch (error) {
      console.error('Pull products failed:', error);
      return { success: false, error: error.message };
    }
  }

  async pullCustomers() {
    await this.ensureInitialized();
    
    try {
      const result = await api.getAllCustomers();
      let pulled = 0;
      
      if (result.success && result.customers) {
        for (const cloudCustomer of result.customers) {
          try {
            // Check if customer exists locally by email
            const allCustomers = await db.getAll('customers');
            const existingCustomer = allCustomers.find(c => c.email === cloudCustomer.email);
            
            if (existingCustomer) {
              await db.put('customers', {
                ...existingCustomer,
                ...cloudCustomer,
                _id: cloudCustomer._id,
                synced: true
              });
            } else {
              await db.put('customers', {
                ...cloudCustomer,
                id: cloudCustomer.id || `cust_${Date.now()}`,
                _id: cloudCustomer._id,
                synced: true
              });
            }
            pulled++;
          } catch (error) {
            console.error('Failed to save pulled customer:', error);
          }
        }
      }
      
      return { success: true, count: pulled };
    } catch (error) {
      console.error('Pull customers failed:', error);
      return { success: false, error: error.message };
    }
  }

  async pullTransactions() {
    await this.ensureInitialized();
    
    try {
      const result = await api.getAllTransactions();
      let pulled = 0;
      
      if (result.success && result.transactions) {
        for (const cloudTransaction of result.transactions) {
          try {
            // Check if transaction exists locally by receipt number
            const allTransactions = await db.getAll('transactions');
            const existingTransaction = allTransactions.find(t => t.receiptNumber === cloudTransaction.receiptNumber);
            
            if (!existingTransaction) {
              await db.put('transactions', {
                ...cloudTransaction,
                id: `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                _id: cloudTransaction._id,
                synced: true
              });
              pulled++;
            }
          } catch (error) {
            console.error('Failed to save pulled transaction:', error);
          }
        }
      }
      
      return { success: true, count: pulled };
    } catch (error) {
      console.error('Pull transactions failed:', error);
      return { success: false, error: error.message };
    }
  }

  async pullFromCloud() {
    this.notifyListeners({ type: 'sync-start', message: 'Pulling from cloud...' });
    
    try {
      const [products, customers, transactions] = await Promise.all([
        this.pullProducts(),
        this.pullCustomers(),
        this.pullTransactions()
      ]);
      
      const total = (products.count || 0) + (customers.count || 0) + (transactions.count || 0);
      
      this.notifyListeners({ 
        type: 'sync-complete', 
        message: `Pulled ${total} items from cloud` 
      });
      
      return { 
        success: true, 
        count: total,
        details: { products, customers, transactions }
      };
    } catch (error) {
      this.notifyListeners({ type: 'sync-error', message: error.message });
      return { success: false, error: error.message };
    }
  }

  // ==================== FULL SYNC ====================

  async fullSync() {
    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.syncInProgress = true;
    this.notifyListeners({ type: 'sync-start', message: 'Full sync in progress...' });

    try {
      // First push local changes
      const pushResult = await this.pushToCloud();
      
      // Then pull cloud changes
      const pullResult = await this.pullFromCloud();
      
      const totalPushed = pushResult.count || 0;
      const totalPulled = pullResult.count || 0;
      
      this.lastSyncTime = new Date().toISOString();
      localStorage.setItem('lastCloudSync', this.lastSyncTime);
      
      this.notifyListeners({ 
        type: 'sync-complete', 
        message: `Sync complete: ${totalPushed} pushed, ${totalPulled} pulled` 
      });
      
      this.syncInProgress = false;
      
      return { 
        success: true, 
        stats: {
          pushed: totalPushed,
          pulled: totalPulled
        }
      };
    } catch (error) {
      this.syncInProgress = false;
      this.notifyListeners({ type: 'sync-error', message: error.message });
      return { success: false, error: error.message };
    }
  }

  // ==================== RESTORE FROM CLOUD ====================

  async restoreFromCloud(options = { clearLocal: true }) {
    this.notifyListeners({ type: 'sync-start', message: 'Restoring from cloud...' });

    try {
      await this.ensureInitialized();
      
      if (options.clearLocal) {
        // Clear all local data
        await db.clearAllStores();
        
        // Clear OPFS images
        const productImages = await opfs.listFiles('products');
        for (const image of productImages) {
          await opfs.deleteFile(image.name, 'products');
        }
      }

      // Pull all data from cloud
      const [products, customers, transactions] = await Promise.all([
        api.getAllProducts(),
        api.getAllCustomers(),
        api.getAllTransactions()
      ]);

      let restored = 0;

      // Restore products
      if (products.success && products.products) {
        for (const product of products.products) {
          await db.put('products', {
            ...product,
            id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            _id: product._id,
            synced: true,
            syncRequired: false,
            cloudImages: product.images || []
          });
          restored++;
        }
      }

      // Restore customers
      if (customers.success && customers.customers) {
        for (const customer of customers.customers) {
          await db.put('customers', {
            ...customer,
            id: customer.id || `cust_${Date.now()}`,
            _id: customer._id,
            synced: true
          });
          restored++;
        }
      }

      // Restore transactions
      if (transactions.success && transactions.transactions) {
        for (const transaction of transactions.transactions) {
          await db.put('transactions', {
            ...transaction,
            id: `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            _id: transaction._id,
            synced: true
          });
          restored++;
        }
      }

      this.lastSyncTime = new Date().toISOString();
      localStorage.setItem('lastCloudSync', this.lastSyncTime);

      this.notifyListeners({ 
        type: 'sync-complete', 
        message: `Restored ${restored} items from cloud` 
      });

      return { success: true, count: restored };
    } catch (error) {
      this.notifyListeners({ type: 'sync-error', message: error.message });
      return { success: false, error: error.message };
    }
  }

  // ==================== SYNC STATUS ====================

  async getSyncStatus() {
    await this.ensureInitialized();
    
    try {
      const [allProducts, allCustomers, allTransactions] = await Promise.all([
        db.getAll('products'),
        db.getAll('customers'),
        db.getAll('transactions')
      ]);
      
      const unsyncedProducts = allProducts.filter(p => !p.synced);
      const unsyncedCustomers = allCustomers.filter(c => !c.synced);
      const unsyncedTransactions = allTransactions.filter(t => !t.synced);
      
      const queue = await db.getAll('syncQueue');
      
      return {
        isOnline: navigator.onLine,
        lastSync: this.getLastSyncTime(),
        unsynced: {
          products: unsyncedProducts.length,
          customers: unsyncedCustomers.length,
          transactions: unsyncedTransactions.length,
          total: unsyncedProducts.length + unsyncedCustomers.length + unsyncedTransactions.length
        },
        queueLength: queue.length
      };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return {
        isOnline: navigator.onLine,
        lastSync: this.getLastSyncTime(),
        unsynced: { products: 0, customers: 0, transactions: 0, total: 0 },
        queueLength: 0
      };
    }
  }

  async getSyncStats() {
    await this.ensureInitialized();
    
    try {
      const [allProducts, allCustomers, allTransactions] = await Promise.all([
        db.getAll('products'),
        db.getAll('customers'),
        db.getAll('transactions')
      ]);

      const unsyncedProducts = allProducts.filter(p => !p.synced);
      const unsyncedCustomers = allCustomers.filter(c => !c.synced);
      const unsyncedTransactions = allTransactions.filter(t => !t.synced);
      
      const queue = await db.getAll('syncQueue');

      return {
        products: {
          total: allProducts.length,
          unsynced: unsyncedProducts.length
        },
        customers: {
          total: allCustomers.length,
          unsynced: unsyncedCustomers.length
        },
        transactions: {
          total: allTransactions.length,
          unsynced: unsyncedTransactions.length
        },
        queue: queue.length
      };
    } catch (error) {
      console.error('Failed to get sync stats:', error);
      return {
        products: { total: 0, unsynced: 0 },
        customers: { total: 0, unsynced: 0 },
        transactions: { total: 0, unsynced: 0 },
        queue: 0
      };
    }
  }

  getLastSyncTime() {
    return this.lastSyncTime || localStorage.getItem('lastCloudSync');
  }
}

export const cloudSync = new CloudSyncService();