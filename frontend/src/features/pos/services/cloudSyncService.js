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

  // Check if user is authenticated
  isAuthenticated() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return !!token;
  }

  // ==================== PUSH TO CLOUD ====================

  async pushProducts() {
    await this.ensureInitialized();
    
    // Skip if not authenticated
    if (!this.isAuthenticated()) {
      console.log('⚠️ Not authenticated - skipping product push');
      return { success: true, count: 0, skipped: true };
    }
    
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

          // Prepare product data - clean of local-only fields
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
            images: images.length > 0 ? images : (product.cloudImages || []),
            mainImage: images.find(img => img.isMain)?.url || images[0]?.url || product.cloudMainImage
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
            product._id = result.product._id;
            product.cloudId = result.product._id;
            product.lastSyncedAt = new Date().toISOString();
            
            // Clean up local images after successful upload
            if (product.localImages?.length > 0) {
              for (const localPath of product.localImages) {
                const fileName = localPath.split('/').pop();
                await opfs.deleteFile(fileName, 'products').catch(() => {});
              }
              product.localImages = [];
            }
            
            await db.put('products', product);
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
    
    // Skip if not authenticated
    if (!this.isAuthenticated()) {
      console.log('⚠️ Not authenticated - skipping customer push');
      return { success: true, count: 0, skipped: true };
    }
    
    try {
      const allCustomers = await db.getAll('customers');
      const unsyncedCustomers = allCustomers.filter(c => !c.synced);
      let pushed = 0;
      
      for (const customer of unsyncedCustomers) {
        try {
          console.log('🔍 Raw customer from DB:', {
            id: customer.id,
            _id: customer._id,
            name: customer.name,
            email: customer.email,
            allKeys: Object.keys(customer)
          });

          const customerData = {};
          
          if (customer.name) customerData.name = customer.name;
          if (customer.email) customerData.email = customer.email;
          if (customer.phone) customerData.phone = customer.phone;
          if (customer.loyaltyPoints !== undefined && !isNaN(customer.loyaltyPoints)) {
            customerData.loyaltyPoints = Number(customer.loyaltyPoints);
          }
          if (customer.totalSpent !== undefined && !isNaN(customer.totalSpent)) {
            customerData.totalSpent = Number(customer.totalSpent);
          }
          if (customer.address) customerData.address = customer.address;
          if (customer.joinDate) customerData.joinDate = customer.joinDate;
          if (customer.lastVisit) customerData.lastVisit = customer.lastVisit;
          if (customer.notes) customerData.notes = customer.notes;

          console.log('🧹 Cleaned customer data for cloud:', customerData);

          if ('id' in customerData) delete customerData.id;
          if ('_id' in customerData) delete customerData._id;

          let existingCloudCustomer = null;
          
          if (customer._id) {
            try {
              console.log('🔍 Checking for existing customer by ID:', customer._id);
              const result = await api.getCustomer(customer._id);
              if (result.success && result.customer) {
                existingCloudCustomer = result.customer;
                console.log('✅ Found existing customer by ID:', existingCloudCustomer._id);
              }
            } catch (error) {
              console.log('⚠️ Customer not found by ID, will try email');
            }
          }
          
          if (!existingCloudCustomer && customer.email) {
            try {
              console.log('🔍 Checking for existing customer by email:', customer.email);
              const result = await api.getCustomersByEmail(customer.email);
              if (result.success && result.customers && result.customers.length > 0) {
                existingCloudCustomer = result.customers[0];
                console.log('✅ Found existing customer by email:', existingCloudCustomer._id);
              }
            } catch (error) {
              console.log('⚠️ No customer found with this email');
            }
          }

          let result;
          let operation = '';
          
          if (existingCloudCustomer) {
            operation = 'update';
            console.log('🔄 Updating existing customer with _id:', existingCloudCustomer._id);
            
            if (customerData.loyaltyPoints) {
              customerData.loyaltyPoints = (existingCloudCustomer.loyaltyPoints || 0) + customerData.loyaltyPoints;
            } else {
              customerData.loyaltyPoints = existingCloudCustomer.loyaltyPoints || 0;
            }
            
            if (customerData.totalSpent) {
              customerData.totalSpent = (existingCloudCustomer.totalSpent || 0) + customerData.totalSpent;
            } else {
              customerData.totalSpent = existingCloudCustomer.totalSpent || 0;
            }
            
            if (customerData.lastVisit) {
              const newDate = new Date(customerData.lastVisit);
              const existingDate = existingCloudCustomer.lastVisit ? new Date(existingCloudCustomer.lastVisit) : null;
              if (!existingDate || newDate > existingDate) {
                // Keep the new date
              } else {
                customerData.lastVisit = existingCloudCustomer.lastVisit;
              }
            } else {
              customerData.lastVisit = existingCloudCustomer.lastVisit;
            }
            
            result = await api.updateCustomer(existingCloudCustomer._id, customerData);
          } else if (customer._id) {
            operation = 'update-attempt';
            console.log('🔄 Attempting update with stored ID:', customer._id);
            result = await api.updateCustomer(customer._id, customerData);
          } else {
            operation = 'create';
            console.log('➕ Creating new customer');
            result = await api.createCustomer(customerData);
          }
          
          if (result.success) {
            const cloudId = result.customer?._id || result.customer?.id || result.id || result._id;
            
            const updatedCustomer = {
              ...customer,
              _id: cloudId,
              cloudId: cloudId,
              synced: true,
              syncRequired: false,
              lastSyncedAt: new Date().toISOString()
            };
            
            if (!updatedCustomer.id) {
              updatedCustomer.id = customer.id;
              console.log('⚠️ Restored missing id:', updatedCustomer.id);
            }
            
            console.log('📝 Saving updated customer locally:', {
              id: updatedCustomer.id,
              _id: updatedCustomer._id,
              name: updatedCustomer.name,
              email: updatedCustomer.email,
              operation: operation
            });
            
            await db.put('customers', updatedCustomer);
            console.log('✅ Customer synced to cloud:', customer.name, 'Cloud ID:', cloudId);
            pushed++;
          } else {
            console.error('❌ Failed to sync customer:', result.error);
          }
        } catch (error) {
          console.error('❌ Failed to push customer:', error);
          if (error.response) {
            console.error('Server response:', error.response.data);
          }
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
    
    // Skip if not authenticated
    if (!this.isAuthenticated()) {
      console.log('⚠️ Not authenticated - skipping transaction push');
      return { success: true, count: 0, skipped: true };
    }
    
    try {
      const allTransactions = await db.getAll('transactions');
      const unsyncedTransactions = allTransactions.filter(t => !t.synced);
      let pushed = 0;
      
      for (const transaction of unsyncedTransactions) {
        try {
          console.log('🔍 Raw transaction from DB:', {
            id: transaction.id,
            receiptNumber: transaction.receiptNumber,
            hasCustomer: !!transaction.customer,
            customerId: transaction.customer?.id,
            customer_id: transaction.customer?._id
          });

          const cleanTransaction = {};
          
          cleanTransaction.receiptNumber = transaction.receiptNumber;
          cleanTransaction.subtotal = transaction.subtotal;
          cleanTransaction.discount = transaction.discount || 0;
          cleanTransaction.total = transaction.total;
          cleanTransaction.paymentMethod = transaction.paymentMethod;
          cleanTransaction.change = transaction.change || 0;
          cleanTransaction.status = transaction.status || 'completed';
          cleanTransaction.createdAt = transaction.createdAt || new Date().toISOString();
          
          if (transaction.tax) cleanTransaction.tax = transaction.tax;
          if (transaction.notes) cleanTransaction.notes = transaction.notes;
          
          if (transaction.customer && transaction.customer.name) {
            const cleanCustomer = {};
            if (transaction.customer.name) cleanCustomer.name = transaction.customer.name;
            if (transaction.customer.email) cleanCustomer.email = transaction.customer.email;
            if (transaction.customer.loyaltyPoints) cleanCustomer.loyaltyPoints = transaction.customer.loyaltyPoints;
            
            if (Object.keys(cleanCustomer).length > 0) {
              cleanTransaction.customer = cleanCustomer;
              console.log('🧹 Cleaned transaction customer:', cleanCustomer);
            }
          }
          
          if (transaction.items && Array.isArray(transaction.items)) {
            cleanTransaction.items = transaction.items.map(item => {
              const cleanItem = {
                name: item.name,
                sku: item.sku,
                price: item.price,
                quantity: item.quantity,
                total: item.price * item.quantity
              };
              return cleanItem;
            });
            
            console.log(`🧹 Cleaned ${cleanTransaction.items.length} items`);
          }

          console.log('☁️ Syncing transaction to cloud:', {
            receiptNumber: cleanTransaction.receiptNumber,
            hasCustomer: !!cleanTransaction.customer,
            customerName: cleanTransaction.customer?.name,
            itemsCount: cleanTransaction.items?.length
          });

          const result = await api.syncTransaction(cleanTransaction);
          
          if (result.success) {
            const updatedTransaction = {
              ...transaction,
              synced: true,
              cloudId: result.id,
              _id: result.id,
              lastSyncedAt: new Date().toISOString()
            };
            
            if (!updatedTransaction.id) {
              updatedTransaction.id = transaction.id;
              console.log('⚠️ Restored missing transaction id:', updatedTransaction.id);
            }
            
            await db.put('transactions', updatedTransaction);
            console.log('✅ Transaction synced to cloud:', transaction.receiptNumber, 'Cloud ID:', result.id);
            pushed++;
          } else {
            console.error('❌ Failed to sync transaction:', result.error);
          }
        } catch (error) {
          console.error('❌ Failed to push transaction:', error);
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
    console.log('🚀 Starting push to cloud...');
    
    try {
      const [products, customers, transactions] = await Promise.all([
        this.pushProducts(),
        this.pushCustomers(),
        this.pushTransactions()
      ]);
      
      const total = (products.count || 0) + (customers.count || 0) + (transactions.count || 0);
      
      console.log('📊 Push results:', { products, customers, transactions });
      
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
      console.error('❌ Push to cloud failed:', error);
      this.notifyListeners({ type: 'sync-error', message: error.message });
      return { success: false, error: error.message };
    }
  }

  // ==================== PULL FROM CLOUD ====================

  async pullProducts() {
    await this.ensureInitialized();
    
    if (!this.isAuthenticated()) {
      console.log('⚠️ Not authenticated - skipping product pull');
      return { success: true, count: 0, skipped: true };
    }
    
    try {
      const result = await api.getAllProducts();
      let pulled = 0;
      
      if (result.success && result.products) {
        console.log(`📥 Pulling ${result.products.length} products from cloud`);
        
        for (const cloudProduct of result.products) {
          try {
            const allProducts = await db.getAll('products');
            const existingProduct = allProducts.find(p => 
              p.sku === cloudProduct.sku || p._id === cloudProduct._id
            );
            
            const localProduct = {
              ...cloudProduct,
              id: existingProduct?.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              _id: cloudProduct._id,
              synced: true,
              syncRequired: false,
              lastSyncedAt: new Date().toISOString(),
              cloudImages: cloudProduct.images || cloudProduct.cloudinaryImages || [],
              cloudMainImage: cloudProduct.mainImage || cloudProduct.cloudMainImage
            };
            
            delete localProduct.__v;
            
            if (existingProduct) {
              await db.put('products', {
                ...existingProduct,
                ...localProduct,
                localImages: existingProduct.localImages || []
              });
            } else {
              await db.put('products', localProduct);
            }
            pulled++;
          } catch (error) {
            console.error('Failed to save pulled product:', error);
          }
        }
        
        console.log(`✅ Pulled ${pulled} products`);
      }
      
      return { success: true, count: pulled };
    } catch (error) {
      console.error('Pull products failed:', error);
      return { success: false, error: error.message };
    }
  }

  async pullCustomers() {
    await this.ensureInitialized();
    
    if (!this.isAuthenticated()) {
      console.log('⚠️ Not authenticated - skipping customer pull');
      return { success: true, count: 0, skipped: true };
    }
    
    try {
      const result = await api.getAllCustomers();
      let pulled = 0;
      
      if (result.success && result.customers) {
        console.log(`📥 Pulling ${result.customers.length} customers from cloud`);
        
        for (const cloudCustomer of result.customers) {
          try {
            const allCustomers = await db.getAll('customers');
            const existingCustomer = allCustomers.find(c => 
              c.email === cloudCustomer.email || c._id === cloudCustomer._id
            );
            
            const localCustomer = {
              ...cloudCustomer,
              _id: cloudCustomer._id,
              id: existingCustomer?.id || `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              synced: true,
              syncRequired: false,
              lastSyncedAt: new Date().toISOString()
            };
            
            delete localCustomer.__v;
            
            if (existingCustomer) {
              await db.put('customers', {
                ...existingCustomer,
                ...localCustomer,
                id: existingCustomer.id
              });
            } else {
              await db.put('customers', localCustomer);
            }
            pulled++;
          } catch (error) {
            console.error('Failed to save pulled customer:', error);
          }
        }
        
        console.log(`✅ Pulled ${pulled} customers`);
      }
      
      return { success: true, count: pulled };
    } catch (error) {
      console.error('Pull customers failed:', error);
      return { success: false, error: error.message };
    }
  }

  async pullTransactions() {
    await this.ensureInitialized();
    
    if (!this.isAuthenticated()) {
      console.log('⚠️ Not authenticated - skipping transaction pull');
      return { success: true, count: 0, skipped: true };
    }
    
    try {
      // Check if we have a store selected before pulling
      const currentStore = await db.getCurrentStoreObject();
      if (!currentStore) {
        console.log('⚠️ No store selected - skipping transaction pull');
        return { success: true, count: 0, skipped: true };
      }
      
      const result = await api.getAllTransactions();
      let pulled = 0;
      
      if (result.success && result.transactions) {
        console.log(`📥 Pulling ${result.transactions.length} transactions from cloud`);
        
        for (const cloudTransaction of result.transactions) {
          try {
            const allTransactions = await db.getAll('transactions');
            const existingTransaction = allTransactions.find(t => 
              t.receiptNumber === cloudTransaction.receiptNumber
            );
            
            if (!existingTransaction) {
              const localTransaction = {
                ...cloudTransaction,
                id: `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                _id: cloudTransaction._id,
                synced: true,
                syncRequired: false,
                lastSyncedAt: new Date().toISOString(),
                createdAt: cloudTransaction.createdAt || new Date().toISOString()
              };
              
              delete localTransaction.__v;
              
              await db.put('transactions', localTransaction);
              pulled++;
            }
          } catch (error) {
            console.error('Failed to save pulled transaction:', error);
          }
        }
        
        console.log(`✅ Pulled ${pulled} transactions`);
      }
      
      return { success: true, count: pulled };
    } catch (error) {
      console.error('Pull transactions failed:', error);
      return { success: false, error: error.message };
    }
  }

  async pullFromCloud() {
    this.notifyListeners({ type: 'sync-start', message: 'Pulling from cloud...' });
    console.log('🚀 Starting pull from cloud...');
    
    try {
      const [products, customers, transactions] = await Promise.all([
        this.pullProducts(),
        this.pullCustomers(),
        this.pullTransactions()
      ]);
      
      const total = (products.count || 0) + (customers.count || 0) + (transactions.count || 0);
      
      console.log('📊 Pull results:', { products, customers, transactions });
      
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
      console.error('❌ Pull from cloud failed:', error);
      this.notifyListeners({ type: 'sync-error', message: error.message });
      return { success: false, error: error.message };
    }
  }

  // ==================== FULL SYNC ====================

  async fullSync() {
    if (!this.isAuthenticated()) {
      console.log('⚠️ User not authenticated - skipping sync');
      return { success: false, error: 'Authentication required', skipped: true };
    }

    if (this.syncInProgress) {
      console.log('⏳ Sync already in progress, skipping...');
      return { success: false, error: 'Sync already in progress' };
    }

    // Check if we have a store selected
    const currentStore = await db.getCurrentStoreObject();
    if (!currentStore) {
      console.log('⚠️ No store selected - skipping sync');
      return { success: false, error: 'No store selected', skipped: true };
    }

    this.syncInProgress = true;
    this.notifyListeners({ type: 'sync-start', message: 'Full sync in progress...' });
    console.log('🔄 Starting full sync...');

    try {
      console.log('📤 Pushing local changes to cloud...');
      const pushResult = await this.pushToCloud();
      
      console.log('📥 Pulling cloud changes...');
      const pullResult = await this.pullFromCloud();
      
      const totalPushed = pushResult.count || 0;
      const totalPulled = pullResult.count || 0;
      
      this.lastSyncTime = new Date().toISOString();
      localStorage.setItem('lastCloudSync', this.lastSyncTime);
      
      console.log(`✅ Full sync complete: ${totalPushed} pushed, ${totalPulled} pulled`);
      
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
      console.error('❌ Full sync failed:', error);
      this.syncInProgress = false;
      this.notifyListeners({ type: 'sync-error', message: error.message });
      return { success: false, error: error.message };
    }
  }

  // ==================== RESTORE FROM CLOUD ====================

  async restoreFromCloud(options = { clearLocal: true }) {
    this.notifyListeners({ type: 'sync-start', message: 'Restoring from cloud...' });
    console.log('🔄 Starting restore from cloud...');

    try {
      await this.ensureInitialized();
      
      if (options.clearLocal) {
        console.log('🗑️ Clearing all local data...');
        await db.clearAllStores();
        
        const productImages = await opfs.listFiles('products');
        for (const image of productImages) {
          await opfs.deleteFile(image.name, 'products');
        }
        console.log(`✅ Cleared ${productImages.length} local images`);
      }

      console.log('📥 Pulling all data from cloud...');
      const [products, customers, transactions] = await Promise.all([
        api.getAllProducts(),
        api.getAllCustomers(),
        api.getAllTransactions()
      ]);

      let restored = 0;

      if (products.success && products.products) {
        console.log(`📦 Restoring ${products.products.length} products...`);
        for (const product of products.products) {
          await db.put('products', {
            ...product,
            id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            _id: product._id,
            synced: true,
            syncRequired: false,
            cloudImages: product.images || product.cloudinaryImages || [],
            cloudMainImage: product.mainImage || product.cloudMainImage
          });
          restored++;
        }
      }

      if (customers.success && customers.customers) {
        console.log(`👥 Restoring ${customers.customers.length} customers...`);
        for (const customer of customers.customers) {
          await db.put('customers', {
            ...customer,
            id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            _id: customer._id,
            synced: true,
            syncRequired: false,
            lastSyncedAt: new Date().toISOString()
          });
          restored++;
        }
      }

      if (transactions.success && transactions.transactions) {
        console.log(`🧾 Restoring ${transactions.transactions.length} transactions...`);
        for (const transaction of transactions.transactions) {
          await db.put('transactions', {
            ...transaction,
            id: `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            _id: transaction._id,
            synced: true,
            syncRequired: false,
            lastSyncedAt: new Date().toISOString()
          });
          restored++;
        }
      }

      this.lastSyncTime = new Date().toISOString();
      localStorage.setItem('lastCloudSync', this.lastSyncTime);

      console.log(`✅ Restored ${restored} items from cloud`);
      this.notifyListeners({ 
        type: 'sync-complete', 
        message: `Restored ${restored} items from cloud` 
      });

      return { success: true, count: restored };
    } catch (error) {
      console.error('❌ Restore from cloud failed:', error);
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
      
      const status = {
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
      
      console.log('📊 Sync status:', status);
      
      return status;
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

      const stats = {
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
      
      return stats;
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