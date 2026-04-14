// src/features/pos/services/database.js
import { openDB } from 'idb';
import { opfs } from './opfsService';

class DatabaseService {
  constructor() {
    this.db = null;
    this.dbName = 'BizCorePOS';
    this.dbVersion = 14; // Incremented version for schema changes
    this.initPromise = null;
    this.initialized = false;
    this.currentStoreId = null;
    this.currentStoreMongoId = null;
    this.currentUserId = null;
  }

  async init() {
    if (this.db) return this.db;
    
    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          console.log('🔄 Initializing database v14 with enhanced user-store isolation...');
          
          this.db = await openDB(this.dbName, this.dbVersion, {
            upgrade: async (db, oldVersion, newVersion, transaction) => {
              console.log(`Upgrading database from v${oldVersion} to v${newVersion}`);
              
              // ==================== PRODUCTS STORE ====================
              if (!db.objectStoreNames.contains('products')) {
                const productStore = db.createObjectStore('products', { keyPath: 'id' });
                productStore.createIndex('sku', 'sku', { unique: false });
                productStore.createIndex('barcode', 'barcode', { unique: false });
                productStore.createIndex('category', 'category', { unique: false });
                productStore.createIndex('synced', 'synced', { unique: false });
                productStore.createIndex('cloudId', 'cloudId', { unique: false });
                productStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                productStore.createIndex('storeId', 'storeId', { unique: false });
                productStore.createIndex('storeMongoId', 'storeMongoId', { unique: false });
                productStore.createIndex('userId', 'userId', { unique: false });
                productStore.createIndex('sku_storeId', ['sku', 'storeId'], { unique: true });
                console.log('✅ Created products store with store isolation indexes');
              } else {
                const productStore = transaction.objectStore('products');
                if (!productStore.indexNames.contains('storeId')) {
                  productStore.createIndex('storeId', 'storeId', { unique: false });
                }
                if (!productStore.indexNames.contains('storeMongoId')) {
                  productStore.createIndex('storeMongoId', 'storeMongoId', { unique: false });
                }
                if (!productStore.indexNames.contains('userId')) {
                  productStore.createIndex('userId', 'userId', { unique: false });
                }
                if (!productStore.indexNames.contains('sku_storeId')) {
                  productStore.createIndex('sku_storeId', ['sku', 'storeId'], { unique: true });
                }
                if (!productStore.indexNames.contains('cloudId')) {
                  productStore.createIndex('cloudId', 'cloudId', { unique: false });
                }
                if (!productStore.indexNames.contains('updatedAt')) {
                  productStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                }
              }

              // ==================== CUSTOMERS STORE ====================
              if (!db.objectStoreNames.contains('customers')) {
                const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
                customerStore.createIndex('email', 'email', { unique: false });
                customerStore.createIndex('phone', 'phone', { unique: false });
                customerStore.createIndex('synced', 'synced', { unique: false });
                customerStore.createIndex('cloudId', 'cloudId', { unique: false });
                customerStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                customerStore.createIndex('storeId', 'storeId', { unique: false });
                customerStore.createIndex('storeMongoId', 'storeMongoId', { unique: false });
                customerStore.createIndex('userId', 'userId', { unique: false });
                console.log('✅ Created customers store with store isolation indexes');
              } else {
                const customerStore = transaction.objectStore('customers');
                if (!customerStore.indexNames.contains('storeId')) {
                  customerStore.createIndex('storeId', 'storeId', { unique: false });
                }
                if (!customerStore.indexNames.contains('storeMongoId')) {
                  customerStore.createIndex('storeMongoId', 'storeMongoId', { unique: false });
                }
                if (!customerStore.indexNames.contains('userId')) {
                  customerStore.createIndex('userId', 'userId', { unique: false });
                }
                if (!customerStore.indexNames.contains('cloudId')) {
                  customerStore.createIndex('cloudId', 'cloudId', { unique: false });
                }
                if (!customerStore.indexNames.contains('updatedAt')) {
                  customerStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                }
              }

              // ==================== TRANSACTIONS STORE ====================
              if (!db.objectStoreNames.contains('transactions')) {
                const transactionStore = db.createObjectStore('transactions', { keyPath: 'id' });
                transactionStore.createIndex('receiptNumber', 'receiptNumber', { unique: false });
                transactionStore.createIndex('createdAt', 'createdAt', { unique: false });
                transactionStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                transactionStore.createIndex('synced', 'synced', { unique: false });
                transactionStore.createIndex('cloudId', 'cloudId', { unique: false });
                transactionStore.createIndex('customerId', 'customer.id', { unique: false });
                transactionStore.createIndex('customerCloudId', 'customer._id', { unique: false });
                transactionStore.createIndex('customerEmail', 'customer.email', { unique: false });
                transactionStore.createIndex('paymentMethod', 'paymentMethod', { unique: false });
                transactionStore.createIndex('isCredit', 'isCredit', { unique: false });
                transactionStore.createIndex('isInstallment', 'isInstallment', { unique: false });
                transactionStore.createIndex('fullyPaid', 'fullyPaid', { unique: false });
                transactionStore.createIndex('dueDate', 'dueDate', { unique: false });
                transactionStore.createIndex('remaining', 'remaining', { unique: false });
                transactionStore.createIndex('storeId', 'storeId', { unique: false });
                transactionStore.createIndex('storeMongoId', 'storeMongoId', { unique: false });
                transactionStore.createIndex('userId', 'userId', { unique: false });
                transactionStore.createIndex('receiptNumber_storeId', ['receiptNumber', 'storeId'], { unique: true });
                console.log('✅ Created transactions store with store isolation indexes');
              } else {
                const transactionStore = transaction.objectStore('transactions');
                if (!transactionStore.indexNames.contains('storeId')) {
                  transactionStore.createIndex('storeId', 'storeId', { unique: false });
                }
                if (!transactionStore.indexNames.contains('storeMongoId')) {
                  transactionStore.createIndex('storeMongoId', 'storeMongoId', { unique: false });
                }
                if (!transactionStore.indexNames.contains('userId')) {
                  transactionStore.createIndex('userId', 'userId', { unique: false });
                }
                if (!transactionStore.indexNames.contains('receiptNumber_storeId')) {
                  transactionStore.createIndex('receiptNumber_storeId', ['receiptNumber', 'storeId'], { unique: true });
                }
                const requiredIndexes = [
                  'receiptNumber', 'createdAt', 'updatedAt', 'synced', 'cloudId',
                  'customerId', 'customerCloudId', 'customerEmail', 'paymentMethod',
                  'isCredit', 'isInstallment', 'fullyPaid', 'dueDate', 'remaining'
                ];
                
                for (const indexName of requiredIndexes) {
                  if (!transactionStore.indexNames.contains(indexName)) {
                    try {
                      if (indexName === 'customerId') {
                        transactionStore.createIndex(indexName, 'customer.id', { unique: false });
                      } else if (indexName === 'customerCloudId') {
                        transactionStore.createIndex(indexName, 'customer._id', { unique: false });
                      } else if (indexName === 'customerEmail') {
                        transactionStore.createIndex(indexName, 'customer.email', { unique: false });
                      } else {
                        transactionStore.createIndex(indexName, indexName, { unique: indexName === 'receiptNumber' });
                      }
                      console.log(`✅ Added missing index: ${indexName}`);
                    } catch (e) {
                      console.warn(`Could not create index ${indexName}:`, e.message);
                    }
                  }
                }
              }

              // ==================== SYNC QUEUE STORE ====================
              if (!db.objectStoreNames.contains('syncQueue')) {
                const syncQueueStore = db.createObjectStore('syncQueue', { 
                  keyPath: 'id', 
                  autoIncrement: true 
                });
                syncQueueStore.createIndex('type', 'type', { unique: false });
                syncQueueStore.createIndex('timestamp', 'timestamp', { unique: false });
                syncQueueStore.createIndex('retryCount', 'retryCount', { unique: false });
                syncQueueStore.createIndex('status', 'status', { unique: false });
                syncQueueStore.createIndex('transactionId', 'transactionId', { unique: false });
                syncQueueStore.createIndex('customerId', 'customerId', { unique: false });
                syncQueueStore.createIndex('productId', 'productId', { unique: false });
                syncQueueStore.createIndex('returnId', 'returnId', { unique: false });
                syncQueueStore.createIndex('storeId', 'storeId', { unique: false });
                syncQueueStore.createIndex('storeMongoId', 'storeMongoId', { unique: false });
                syncQueueStore.createIndex('userId', 'userId', { unique: false });
                console.log('✅ Created syncQueue store with store isolation indexes');
              } else {
                const syncQueueStore = transaction.objectStore('syncQueue');
                if (!syncQueueStore.indexNames.contains('storeId')) {
                  syncQueueStore.createIndex('storeId', 'storeId', { unique: false });
                }
                if (!syncQueueStore.indexNames.contains('storeMongoId')) {
                  syncQueueStore.createIndex('storeMongoId', 'storeMongoId', { unique: false });
                }
                if (!syncQueueStore.indexNames.contains('userId')) {
                  syncQueueStore.createIndex('userId', 'userId', { unique: false });
                }
                if (!syncQueueStore.indexNames.contains('transactionId')) {
                  syncQueueStore.createIndex('transactionId', 'transactionId', { unique: false });
                }
                if (!syncQueueStore.indexNames.contains('customerId')) {
                  syncQueueStore.createIndex('customerId', 'customerId', { unique: false });
                }
                if (!syncQueueStore.indexNames.contains('productId')) {
                  syncQueueStore.createIndex('productId', 'productId', { unique: false });
                }
                if (!syncQueueStore.indexNames.contains('returnId')) {
                  syncQueueStore.createIndex('returnId', 'returnId', { unique: false });
                }
              }

              // ==================== STOCK HISTORY STORE ====================
              if (!db.objectStoreNames.contains('stockHistory')) {
                const stockHistoryStore = db.createObjectStore('stockHistory', { keyPath: 'id' });
                stockHistoryStore.createIndex('productId', 'productId', { unique: false });
                stockHistoryStore.createIndex('productName', 'productName', { unique: false });
                stockHistoryStore.createIndex('adjustmentType', 'adjustmentType', { unique: false });
                stockHistoryStore.createIndex('createdAt', 'createdAt', { unique: false });
                stockHistoryStore.createIndex('transactionId', 'transactionId', { unique: false });
                stockHistoryStore.createIndex('synced', 'synced', { unique: false });
                stockHistoryStore.createIndex('storeId', 'storeId', { unique: false });
                stockHistoryStore.createIndex('storeMongoId', 'storeMongoId', { unique: false });
                stockHistoryStore.createIndex('userId', 'userId', { unique: false });
                console.log('✅ Created stockHistory store with store isolation indexes');
              } else {
                const stockHistoryStore = transaction.objectStore('stockHistory');
                if (!stockHistoryStore.indexNames.contains('storeId')) {
                  stockHistoryStore.createIndex('storeId', 'storeId', { unique: false });
                }
                if (!stockHistoryStore.indexNames.contains('storeMongoId')) {
                  stockHistoryStore.createIndex('storeMongoId', 'storeMongoId', { unique: false });
                }
                if (!stockHistoryStore.indexNames.contains('userId')) {
                  stockHistoryStore.createIndex('userId', 'userId', { unique: false });
                }
                if (!stockHistoryStore.indexNames.contains('productId')) {
                  stockHistoryStore.createIndex('productId', 'productId', { unique: false });
                }
                if (!stockHistoryStore.indexNames.contains('adjustmentType')) {
                  stockHistoryStore.createIndex('adjustmentType', 'adjustmentType', { unique: false });
                }
                if (!stockHistoryStore.indexNames.contains('synced')) {
                  stockHistoryStore.createIndex('synced', 'synced', { unique: false });
                }
              }

              // ==================== RETURNS STORE ====================
              if (!db.objectStoreNames.contains('returns')) {
                const returnsStore = db.createObjectStore('returns', { keyPath: 'id' });
                returnsStore.createIndex('originalTransactionId', 'originalTransactionId', { unique: false });
                returnsStore.createIndex('originalReceiptNumber', 'originalReceiptNumber', { unique: false });
                returnsStore.createIndex('createdAt', 'createdAt', { unique: false });
                returnsStore.createIndex('returnType', 'returnType', { unique: false });
                returnsStore.createIndex('condition', 'condition', { unique: false });
                returnsStore.createIndex('customerId', 'customer.id', { unique: false });
                returnsStore.createIndex('customerEmail', 'customer.email', { unique: false });
                returnsStore.createIndex('synced', 'synced', { unique: false });
                returnsStore.createIndex('cloudId', 'cloudId', { unique: false });
                returnsStore.createIndex('storeId', 'storeId', { unique: false });
                returnsStore.createIndex('storeMongoId', 'storeMongoId', { unique: false });
                returnsStore.createIndex('userId', 'userId', { unique: false });
                console.log('✅ Created returns store with store isolation indexes');
              } else {
                const returnsStore = transaction.objectStore('returns');
                if (!returnsStore.indexNames.contains('storeId')) {
                  returnsStore.createIndex('storeId', 'storeId', { unique: false });
                }
                if (!returnsStore.indexNames.contains('storeMongoId')) {
                  returnsStore.createIndex('storeMongoId', 'storeMongoId', { unique: false });
                }
                if (!returnsStore.indexNames.contains('userId')) {
                  returnsStore.createIndex('userId', 'userId', { unique: false });
                }
                if (!returnsStore.indexNames.contains('originalTransactionId')) {
                  returnsStore.createIndex('originalTransactionId', 'originalTransactionId', { unique: false });
                }
                if (!returnsStore.indexNames.contains('originalReceiptNumber')) {
                  returnsStore.createIndex('originalReceiptNumber', 'originalReceiptNumber', { unique: false });
                }
                if (!returnsStore.indexNames.contains('returnType')) {
                  returnsStore.createIndex('returnType', 'returnType', { unique: false });
                }
                if (!returnsStore.indexNames.contains('condition')) {
                  returnsStore.createIndex('condition', 'condition', { unique: false });
                }
                if (!returnsStore.indexNames.contains('customerId')) {
                  returnsStore.createIndex('customerId', 'customer.id', { unique: false });
                }
                if (!returnsStore.indexNames.contains('customerEmail')) {
                  returnsStore.createIndex('customerEmail', 'customer.email', { unique: false });
                }
                if (!returnsStore.indexNames.contains('synced')) {
                  returnsStore.createIndex('synced', 'synced', { unique: false });
                }
                if (!returnsStore.indexNames.contains('cloudId')) {
                  returnsStore.createIndex('cloudId', 'cloudId', { unique: false });
                }
              }

              // ==================== STORES STORE ====================
              if (!db.objectStoreNames.contains('stores')) {
                const storesStore = db.createObjectStore('stores', { keyPath: 'id' });
                storesStore.createIndex('name', 'name', { unique: false });
                storesStore.createIndex('city', 'city', { unique: false });
                storesStore.createIndex('state', 'state', { unique: false });
                storesStore.createIndex('open', 'open', { unique: false });
                storesStore.createIndex('createdAt', 'createdAt', { unique: false });
                storesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                storesStore.createIndex('isDefault', 'isDefault', { unique: false });
                storesStore.createIndex('cloudId', 'cloudId', { unique: false });
                storesStore.createIndex('_id', '_id', { unique: false });
                storesStore.createIndex('userId', 'userId', { unique: false });
                storesStore.createIndex('mongoId', 'mongoId', { unique: false });
                console.log('✅ Created stores store with store isolation indexes');
              } else {
                const storesStore = transaction.objectStore('stores');
                if (!storesStore.indexNames.contains('isDefault')) {
                  storesStore.createIndex('isDefault', 'isDefault', { unique: false });
                }
                if (!storesStore.indexNames.contains('userId')) {
                  storesStore.createIndex('userId', 'userId', { unique: false });
                }
                if (!storesStore.indexNames.contains('cloudId')) {
                  storesStore.createIndex('cloudId', 'cloudId', { unique: false });
                }
                if (!storesStore.indexNames.contains('mongoId')) {
                  storesStore.createIndex('mongoId', 'mongoId', { unique: false });
                }
                if (!storesStore.indexNames.contains('_id')) {
                  storesStore.createIndex('_id', '_id', { unique: false });
                }
                if (!storesStore.indexNames.contains('name')) {
                  storesStore.createIndex('name', 'name', { unique: false });
                }
                if (!storesStore.indexNames.contains('city')) {
                  storesStore.createIndex('city', 'city', { unique: false });
                }
                if (!storesStore.indexNames.contains('open')) {
                  storesStore.createIndex('open', 'open', { unique: false });
                }
              }

              // ==================== TRANSFERS STORE ====================
              if (!db.objectStoreNames.contains('transfers')) {
                const transfersStore = db.createObjectStore('transfers', { keyPath: 'id' });
                transfersStore.createIndex('fromStoreId', 'fromStoreId', { unique: false });
                transfersStore.createIndex('toStoreId', 'toStoreId', { unique: false });
                transfersStore.createIndex('productId', 'productId', { unique: false });
                transfersStore.createIndex('status', 'status', { unique: false });
                transfersStore.createIndex('createdAt', 'createdAt', { unique: false });
                transfersStore.createIndex('completedAt', 'completedAt', { unique: false });
                transfersStore.createIndex('fromStore', 'fromStore', { unique: false });
                transfersStore.createIndex('toStore', 'toStore', { unique: false });
                transfersStore.createIndex('storeId', 'storeId', { unique: false });
                transfersStore.createIndex('storeMongoId', 'storeMongoId', { unique: false });
                transfersStore.createIndex('userId', 'userId', { unique: false });
                console.log('✅ Created transfers store with store isolation indexes');
              } else {
                const transfersStore = transaction.objectStore('transfers');
                if (!transfersStore.indexNames.contains('storeId')) {
                  transfersStore.createIndex('storeId', 'storeId', { unique: false });
                }
                if (!transfersStore.indexNames.contains('storeMongoId')) {
                  transfersStore.createIndex('storeMongoId', 'storeMongoId', { unique: false });
                }
                if (!transfersStore.indexNames.contains('userId')) {
                  transfersStore.createIndex('userId', 'userId', { unique: false });
                }
                if (!transfersStore.indexNames.contains('fromStoreId')) {
                  transfersStore.createIndex('fromStoreId', 'fromStoreId', { unique: false });
                }
                if (!transfersStore.indexNames.contains('toStoreId')) {
                  transfersStore.createIndex('toStoreId', 'toStoreId', { unique: false });
                }
                if (!transfersStore.indexNames.contains('status')) {
                  transfersStore.createIndex('status', 'status', { unique: false });
                }
                if (!transfersStore.indexNames.contains('fromStore')) {
                  transfersStore.createIndex('fromStore', 'fromStore', { unique: false });
                }
                if (!transfersStore.indexNames.contains('toStore')) {
                  transfersStore.createIndex('toStore', 'toStore', { unique: false });
                }
              }

              // ==================== SETTINGS STORE ====================
              if (!db.objectStoreNames.contains('settings')) {
                const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
                settingsStore.createIndex('userId', 'userId', { unique: false });
                settingsStore.createIndex('storeId', 'storeId', { unique: false });
                console.log('✅ Created settings store with store isolation indexes');
              } else {
                const settingsStore = transaction.objectStore('settings');
                if (!settingsStore.indexNames.contains('userId')) {
                  settingsStore.createIndex('userId', 'userId', { unique: false });
                }
                if (!settingsStore.indexNames.contains('storeId')) {
                  settingsStore.createIndex('storeId', 'storeId', { unique: false });
                }
              }
            }
          });

          await opfs.init();
          
          this.initialized = true;
          console.log('✅ Database service v14 initialized successfully with store isolation');
          return this.db;
        } catch (error) {
          console.error('❌ Failed to initialize database:', error);
          throw error;
        }
      })();
    }
    
    return this.initPromise;
  }

  async ensureInitialized() {
    if (!this.initialized || !this.db) {
      await this.init();
    }
    return this.db;
  }

  setCurrentUser(userId) {
    this.currentUserId = userId;
    console.log(`👤 Current user set to: ${userId}`);
  }

  getCurrentUser() {
    return this.currentUserId;
  }

  setCurrentStore(storeId) {
    this.currentStoreId = storeId;
    localStorage.setItem('currentStoreId', storeId);
    console.log(`📌 Current store set to: ${storeId}`);
  }

  getCurrentStore() {
    return this.currentStoreId || localStorage.getItem('currentStoreId');
  }

  setCurrentStoreMongoId(mongoId) {
    this.currentStoreMongoId = mongoId;
    console.log(`📌 Current store MongoDB ID set to: ${mongoId}`);
  }

  getCurrentStoreMongoId() {
    return this.currentStoreMongoId;
  }

  async getCurrentStoreObject() {
    const storeId = this.getCurrentStore();
    if (!storeId) return null;
    
    let store = await this.get('stores', storeId);
    
    if (!store) {
      const allStores = await this.getAll('stores');
      store = allStores.find(s => 
        String(s._id) === storeId || 
        String(s.cloudId) === storeId ||
        String(s.id) === storeId ||
        String(s.mongoId) === storeId
      );
    }
    
    // Store the MongoDB ID for future use
    if (store) {
      const mongoId = store._id || store.cloudId || store.mongoId;
      if (mongoId) {
        this.setCurrentStoreMongoId(mongoId);
      }
    }
    
    return store;
  }

  async getValidStoreIdForApi() {
    const store = await this.getCurrentStoreObject();
    if (!store) return null;
    
    // Priority: MongoDB _id > cloudId > mongoId > id
    if (store._id && /^[0-9a-fA-F]{24}$/.test(store._id)) {
      return store._id;
    }
    if (store.cloudId && /^[0-9a-fA-F]{24}$/.test(store.cloudId)) {
      return store.cloudId;
    }
    if (store.mongoId && /^[0-9a-fA-F]{24}$/.test(store.mongoId)) {
      return store.mongoId;
    }
    return store.id;
  }

  // Helper to check if an item belongs to the current store
  itemBelongsToCurrentStore(item) {
    if (!item) return false;
    if (!this.currentStoreId && !this.currentStoreMongoId) return true; // No store filter
    
    const itemStoreId = String(item.storeId || item.storeMongoId || '');
    const currentStoreId = String(this.currentStoreId || '');
    const currentMongoId = String(this.currentStoreMongoId || '');
    
    return itemStoreId === currentStoreId || itemStoreId === currentMongoId;
  }

  // ==================== USER DATA MANAGEMENT ====================

  async clearUserData(userId) {
    const db = await this.ensureInitialized();
    const stores = ['products', 'customers', 'transactions', 'syncQueue', 'stockHistory', 'returns', 'stores', 'transfers', 'settings'];
    
    console.log(`🧹 Clearing all data for user: ${userId}`);
    
    for (const storeName of stores) {
      if (db.objectStoreNames.contains(storeName)) {
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          
          if (store.indexNames.contains('userId')) {
            const index = store.index('userId');
            const userItems = await index.getAll(userId);
            
            for (const item of userItems) {
              await store.delete(item.id || item.key);
            }
            console.log(`✅ Cleared ${userItems.length} items from ${storeName} for user ${userId}`);
          } else {
            await store.clear();
            console.log(`✅ Cleared all items from ${storeName}`);
          }
        } catch (error) {
          console.warn(`Failed to clear ${storeName}:`, error);
        }
      }
    }
    
    // Clear localStorage items
    localStorage.removeItem('currentStoreId');
    localStorage.removeItem('currentStoreMongoId');
    localStorage.removeItem('pos-settings');
    localStorage.removeItem('pos-customers');
    localStorage.removeItem('lastCloudSync');
    localStorage.removeItem('activeStoreId');
    
    // Reset current store tracking
    this.currentStoreId = null;
    this.currentStoreMongoId = null;
    
    console.log(`✅ User ${userId} data cleared`);
  }

  async clearAllStores() {
    const db = await this.ensureInitialized();
    const stores = ['products', 'customers', 'transactions', 'syncQueue', 'stockHistory', 'returns', 'stores', 'transfers', 'settings'];
    
    for (const storeName of stores) {
      if (db.objectStoreNames.contains(storeName)) {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        await store.clear();
        console.log(`✅ Cleared ${storeName} store`);
      }
    }
    
    localStorage.removeItem('currentStoreId');
    localStorage.removeItem('currentStoreMongoId');
    localStorage.removeItem('pos-settings');
    localStorage.removeItem('pos-customers');
    localStorage.removeItem('lastCloudSync');
    localStorage.removeItem('activeStoreId');
    
    this.currentStoreId = null;
    this.currentStoreMongoId = null;
  }

  // ==================== GENERIC CRUD WITH USER AND STORE FILTERING ====================

  async getAll(storeName) {
    const db = await this.ensureInitialized();
    try {
      if (!db.objectStoreNames.contains(storeName)) {
        console.warn(`Store ${storeName} does not exist, returning empty array`);
        return [];
      }
      
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      
      let results = [];
      
      // First filter by current user
      if (this.currentUserId && store.indexNames.contains('userId')) {
        const index = store.index('userId');
        results = await index.getAll(this.currentUserId);
      } else {
        results = await store.getAll();
      }
      
      // Then filter by current store if applicable
      if (this.currentStoreId && store.indexNames.contains('storeId')) {
        results = results.filter(item => {
          const itemStoreId = String(item.storeId || item.storeMongoId || '');
          return itemStoreId === String(this.currentStoreId) || 
                 itemStoreId === String(this.currentStoreMongoId);
        });
      }
      
      return results || [];
    } catch (error) {
      console.error(`Error getting all from ${storeName}:`, error);
      return [];
    }
  }

  async getAllByStore(storeName, storeId) {
    const db = await this.ensureInitialized();
    try {
      if (!db.objectStoreNames.contains(storeName)) {
        console.warn(`Store ${storeName} does not exist`);
        return [];
      }
      
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      
      let results = [];
      
      if (store.indexNames.contains('storeId')) {
        const index = store.index('storeId');
        results = await index.getAll(storeId);
      } else {
        const all = await store.getAll();
        results = all.filter(item => String(item.storeId) === String(storeId));
      }
      
      // Filter by current user if userId index exists
      if (this.currentUserId && store.indexNames.contains('userId')) {
        results = results.filter(item => String(item.userId) === String(this.currentUserId));
      }
      
      return results || [];
    } catch (error) {
      console.error(`Error getting all from ${storeName} by store:`, error);
      return [];
    }
  }

  async get(storeName, id) {
    const db = await this.ensureInitialized();
    if (!db.objectStoreNames.contains(storeName)) {
      console.warn(`Store ${storeName} does not exist`);
      return null;
    }
    
    const key = String(id);
    const item = await db.get(storeName, key);
    
    // Verify user ownership
    if (item && this.currentUserId && item.userId && String(item.userId) !== String(this.currentUserId)) {
      console.warn(`Access denied: ${storeName} item ${id} belongs to different user`);
      return null;
    }
    
    // Verify store ownership
    if (item && this.currentStoreId && !this.itemBelongsToCurrentStore(item)) {
      console.warn(`Access denied: ${storeName} item ${id} belongs to different store`);
      return null;
    }
    
    return item;
  }

  async add(storeName, data) {
    const db = await this.ensureInitialized();
    const id = data.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const item = { 
      ...data, 
      id: String(id), 
      createdAt: new Date().toISOString(),
      storeId: data.storeId || this.currentStoreId,
      storeMongoId: data.storeMongoId || this.currentStoreMongoId,
      userId: data.userId || this.currentUserId
    };
    await db.add(storeName, item);
    return id;
  }

  async put(storeName, data) {
    const db = await this.ensureInitialized();
    
    // Ensure userId and storeId are set
    if (!data.userId && this.currentUserId) {
      data.userId = this.currentUserId;
    }
    if (!data.storeId && this.currentStoreId) {
      data.storeId = this.currentStoreId;
    }
    if (!data.storeMongoId && this.currentStoreMongoId) {
      data.storeMongoId = this.currentStoreMongoId;
    }
    
    if (storeName === 'customers') {
      return this._saveCustomer(db, data);
    } else if (storeName === 'transactions') {
      return this._saveTransaction(db, data);
    } else if (storeName === 'products') {
      return this._saveProduct(db, data);
    } else if (storeName === 'stockHistory') {
      return this._saveStockHistory(db, data);
    } else if (storeName === 'returns') {
      return this._saveReturn(db, data);
    } else if (storeName === 'stores') {
      return this._saveStore(db, data);
    } else if (storeName === 'transfers') {
      return this._saveTransfer(db, data);
    }
    
    const item = { ...data, updatedAt: new Date().toISOString() };
    if (item.id) item.id = String(item.id);
    if (!item.storeId && this.currentStoreId) {
      item.storeId = this.currentStoreId;
    }
    if (!item.storeMongoId && this.currentStoreMongoId) {
      item.storeMongoId = this.currentStoreMongoId;
    }
    if (!item.userId && this.currentUserId) {
      item.userId = this.currentUserId;
    }
    await db.put(storeName, item);
    return item.id;
  }

  async _saveCustomer(db, data) {
    const customerData = { ...data };
    
    if (!customerData.email || customerData.email === '') {
      delete customerData.email;
    }
    
    if (!customerData.name) {
      throw new Error('Customer name is required');
    }
    
    if (!customerData.id) {
      customerData.id = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    customerData.id = String(customerData.id);
    
    const now = new Date().toISOString();
    customerData.updatedAt = now;
    if (!customerData.createdAt) {
      customerData.createdAt = now;
    }
    if (!customerData.storeId && this.currentStoreId) {
      customerData.storeId = this.currentStoreId;
    }
    if (!customerData.storeMongoId && this.currentStoreMongoId) {
      customerData.storeMongoId = this.currentStoreMongoId;
    }
    if (!customerData.userId && this.currentUserId) {
      customerData.userId = this.currentUserId;
    }
    
    console.log('📝 Saving customer with store isolation:', {
      id: customerData.id,
      name: customerData.name,
      email: customerData.email || 'no-email',
      storeId: customerData.storeId,
      storeMongoId: customerData.storeMongoId,
      userId: customerData.userId,
      cloudId: customerData.cloudId || customerData._id
    });
    
    await db.put('customers', customerData);
    return customerData.id;
  }

  async _saveTransaction(db, data) {
    const transactionData = { ...data };
    
    if (!transactionData.receiptNumber) {
      throw new Error('Receipt number is required');
    }
    
    if (!transactionData.id) {
      transactionData.id = `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    transactionData.id = String(transactionData.id);
    
    if (transactionData.isCredit || transactionData.isInstallment) {
      transactionData.remaining = transactionData.remaining || transactionData.total;
      transactionData.paid = transactionData.paid || 0;
      transactionData.fullyPaid = transactionData.remaining <= 0;
      
      if (!transactionData.paymentHistory && transactionData.paid > 0) {
        transactionData.paymentHistory = [{
          id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          amount: transactionData.paid,
          method: transactionData.paymentMethod || 'Cash',
          date: transactionData.createdAt || new Date().toISOString(),
          remaining: transactionData.remaining,
          notes: 'Initial payment'
        }];
      }
    } else {
      transactionData.remaining = 0;
      transactionData.paid = transactionData.total;
      transactionData.fullyPaid = true;
    }
    
    if (!transactionData.returnedItems) {
      transactionData.returnedItems = [];
    }
    
    if (!transactionData.storeId && this.currentStoreId) {
      transactionData.storeId = this.currentStoreId;
    }
    if (!transactionData.storeMongoId && this.currentStoreMongoId) {
      transactionData.storeMongoId = this.currentStoreMongoId;
    }
    if (!transactionData.userId && this.currentUserId) {
      transactionData.userId = this.currentUserId;
    }
    
    const now = new Date().toISOString();
    transactionData.updatedAt = now;
    if (!transactionData.createdAt) {
      transactionData.createdAt = now;
    }
    
    console.log('📝 Saving transaction with store isolation:', {
      id: transactionData.id,
      receiptNumber: transactionData.receiptNumber,
      customer: transactionData.customer?.name,
      total: transactionData.total,
      remaining: transactionData.remaining,
      storeId: transactionData.storeId,
      storeMongoId: transactionData.storeMongoId,
      userId: transactionData.userId,
      isCredit: transactionData.isCredit,
      isInstallment: transactionData.isInstallment,
      returnedItemsCount: transactionData.returnedItems?.length || 0,
      cloudId: transactionData.cloudId
    });
    
    await db.put('transactions', transactionData);
    return transactionData.id;
  }

  async _saveProduct(db, data) {
    const productData = { ...data };
    
    if (!productData.id) {
      productData.id = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    productData.id = String(productData.id);
    
    if (!productData.storeId && this.currentStoreId) {
      productData.storeId = this.currentStoreId;
    }
    if (!productData.storeMongoId && this.currentStoreMongoId) {
      productData.storeMongoId = this.currentStoreMongoId;
    }
    if (!productData.userId && this.currentUserId) {
      productData.userId = this.currentUserId;
    }
    
    const now = new Date().toISOString();
    productData.updatedAt = now;
    if (!productData.createdAt) {
      productData.createdAt = now;
    }
    
    console.log('📝 Saving product with store isolation:', {
      id: productData.id,
      name: productData.name,
      sku: productData.sku,
      storeId: productData.storeId,
      storeMongoId: productData.storeMongoId,
      userId: productData.userId,
      cloudId: productData.cloudId
    });
    
    await db.put('products', productData);
    return productData.id;
  }

  async _saveStockHistory(db, data) {
    const historyData = { ...data };
    
    if (!historyData.id) {
      historyData.id = `sh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    historyData.id = String(historyData.id);
    
    if (!historyData.createdAt) {
      historyData.createdAt = new Date().toISOString();
    }
    if (!historyData.storeId && this.currentStoreId) {
      historyData.storeId = this.currentStoreId;
    }
    if (!historyData.storeMongoId && this.currentStoreMongoId) {
      historyData.storeMongoId = this.currentStoreMongoId;
    }
    if (!historyData.userId && this.currentUserId) {
      historyData.userId = this.currentUserId;
    }
    
    console.log('📝 Saving stock history with store isolation:', {
      id: historyData.id,
      productName: historyData.productName,
      adjustmentType: historyData.adjustmentType,
      quantityChange: historyData.quantityChange,
      storeId: historyData.storeId,
      storeMongoId: historyData.storeMongoId,
      userId: historyData.userId
    });
    
    await db.put('stockHistory', historyData);
    return historyData.id;
  }

  async _saveReturn(db, data) {
    const returnData = { ...data };
    
    if (!returnData.id) {
      returnData.id = `ret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    returnData.id = String(returnData.id);
    
    if (!returnData.createdAt) {
      returnData.createdAt = new Date().toISOString();
    }
    
    if (!returnData.synced) {
      returnData.synced = false;
    }
    
    if (!returnData.returnType && returnData.type) {
      returnData.returnType = returnData.type;
    }
    
    if (!returnData.storeId && this.currentStoreId) {
      returnData.storeId = this.currentStoreId;
    }
    if (!returnData.storeMongoId && this.currentStoreMongoId) {
      returnData.storeMongoId = this.currentStoreMongoId;
    }
    if (!returnData.userId && this.currentUserId) {
      returnData.userId = this.currentUserId;
    }
    
    console.log('📝 Saving return record with store isolation:', {
      id: returnData.id,
      originalTransactionId: returnData.originalTransactionId,
      originalReceiptNumber: returnData.originalReceiptNumber,
      returnType: returnData.returnType,
      condition: returnData.condition,
      totalRefund: returnData.totalRefund,
      storeId: returnData.storeId,
      storeMongoId: returnData.storeMongoId,
      userId: returnData.userId
    });
    
    await db.put('returns', returnData);
    return returnData.id;
  }

  async _saveStore(db, data) {
    const storeData = { ...data };
    
    // Determine the MongoDB ID for cloud sync
    if (data._id && /^[0-9a-fA-F]{24}$/.test(data._id)) {
      storeData.id = data._id;
      storeData._id = data._id;
      storeData.cloudId = data._id;
      storeData.mongoId = data._id;
      console.log('📌 Using MongoDB _id as store ID:', data._id);
    } else if (data.cloudId && /^[0-9a-fA-F]{24}$/.test(data.cloudId)) {
      storeData.id = data.cloudId;
      storeData._id = data.cloudId;
      storeData.cloudId = data.cloudId;
      storeData.mongoId = data.cloudId;
      console.log('📌 Using cloudId as store ID:', data.cloudId);
    } else if (data.mongoId && /^[0-9a-fA-F]{24}$/.test(data.mongoId)) {
      storeData.id = data.mongoId;
      storeData._id = data.mongoId;
      storeData.cloudId = data.mongoId;
      storeData.mongoId = data.mongoId;
      console.log('📌 Using mongoId as store ID:', data.mongoId);
    } else if (!storeData.id) {
      storeData.id = `store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('⚠️ Creating temporary local store ID:', storeData.id);
    }
    
    storeData.id = String(storeData.id);
    
    if (!storeData.createdAt) {
      storeData.createdAt = new Date().toISOString();
    }
    storeData.updatedAt = new Date().toISOString();
    
    if (!storeData.userId && this.currentUserId) {
      storeData.userId = this.currentUserId;
    }
    
    if (data._id) {
      storeData._id = data._id;
    }
    if (data.cloudId) {
      storeData.cloudId = data.cloudId;
    }
    if (data.mongoId) {
      storeData.mongoId = data.mongoId;
    }
    
    console.log('📝 Saving store with isolation:', {
      id: storeData.id,
      _id: storeData._id,
      mongoId: storeData.mongoId,
      name: storeData.name,
      isDefault: storeData.isDefault,
      userId: storeData.userId
    });
    
    await db.put('stores', storeData);
    return storeData.id;
  }

  async _saveTransfer(db, data) {
    const transferData = { ...data };
    
    if (!transferData.id) {
      transferData.id = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    transferData.id = String(transferData.id);
    
    if (!transferData.createdAt) {
      transferData.createdAt = new Date().toISOString();
    }
    if (!transferData.storeId && this.currentStoreId) {
      transferData.storeId = this.currentStoreId;
    }
    if (!transferData.storeMongoId && this.currentStoreMongoId) {
      transferData.storeMongoId = this.currentStoreMongoId;
    }
    if (!transferData.userId && this.currentUserId) {
      transferData.userId = this.currentUserId;
    }
    
    console.log('📝 Saving transfer with store isolation:', {
      id: transferData.id,
      fromStore: transferData.fromStore,
      toStore: transferData.toStore,
      product: transferData.product,
      quantity: transferData.quantity,
      status: transferData.status,
      storeId: transferData.storeId,
      storeMongoId: transferData.storeMongoId,
      userId: transferData.userId
    });
    
    await db.put('transfers', transferData);
    return transferData.id;
  }

  async delete(storeName, id) {
    const db = await this.ensureInitialized();
    if (!db.objectStoreNames.contains(storeName)) {
      console.warn(`Store ${storeName} does not exist`);
      return;
    }
    
    const item = await this.get(storeName, id);
    if (item && this.currentUserId && item.userId && String(item.userId) !== String(this.currentUserId)) {
      console.warn(`Cannot delete ${storeName} item ${id}: belongs to different user`);
      return;
    }
    
    await db.delete(storeName, String(id));
  }

  async query(storeName, indexName, value) {
    const db = await this.ensureInitialized();
    if (!db.objectStoreNames.contains(storeName)) {
      console.warn(`Store ${storeName} does not exist`);
      return [];
    }
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    if (!store.indexNames.contains(indexName)) {
      console.warn(`Index ${indexName} not found in ${storeName}`);
      return [];
    }
    
    const index = store.index(indexName);
    let results = await index.getAll(value);
    
    // Filter by user and store
    if (this.currentUserId && store.indexNames.contains('userId')) {
      results = results.filter(item => String(item.userId) === String(this.currentUserId));
    }
    if (this.currentStoreId && store.indexNames.contains('storeId')) {
      results = results.filter(item => this.itemBelongsToCurrentStore(item));
    }
    
    return results;
  }

  async queryRange(storeName, indexName, lower, upper, lowerOpen = false, upperOpen = false) {
    const db = await this.ensureInitialized();
    if (!db.objectStoreNames.contains(storeName)) {
      console.warn(`Store ${storeName} does not exist`);
      return [];
    }
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    if (!store.indexNames.contains(indexName)) {
      console.warn(`Index ${indexName} not found in ${storeName}`);
      return [];
    }
    
    const index = store.index(indexName);
    const range = IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen);
    let results = await index.getAll(range);
    
    // Filter by user and store
    if (this.currentUserId && store.indexNames.contains('userId')) {
      results = results.filter(item => String(item.userId) === String(this.currentUserId));
    }
    if (this.currentStoreId && store.indexNames.contains('storeId')) {
      results = results.filter(item => this.itemBelongsToCurrentStore(item));
    }
    
    return results;
  }

  // ==================== PRODUCT METHODS ====================

  async saveProduct(product) {
    if (!product.userId && this.currentUserId) {
      product.userId = this.currentUserId;
    }
    if (!product.storeId && this.currentStoreId) {
      product.storeId = this.currentStoreId;
    }
    if (!product.storeMongoId && this.currentStoreMongoId) {
      product.storeMongoId = this.currentStoreMongoId;
    }
    return this.put('products', product);
  }

  async getProduct(id) {
    const product = await this.get('products', String(id));
    if (product && !this.itemBelongsToCurrentStore(product)) {
      console.warn(`Product ${id} belongs to different store, access denied`);
      return null;
    }
    return product;
  }

  async getProducts() {
    if (this.currentStoreId || this.currentStoreMongoId) {
      const allProducts = await this.getAll('products');
      return allProducts.filter(p => this.itemBelongsToCurrentStore(p));
    }
    return this.getAll('products');
  }

  async getProductsByCategory(category) {
    const products = await this.getProducts();
    return products.filter(p => p.category === category);
  }

  async getProductBySku(sku) {
    const products = await this.getProducts();
    return products.find(p => p.sku === sku) || null;
  }

  async getUnsyncedProducts() {
    const products = await this.getProducts();
    return products.filter(p => !p.synced);
  }

  async markProductSynced(id, cloudId) {
    const product = await this.getProduct(id);
    if (product) {
      product.synced = true;
      product.cloudId = cloudId;
      product.syncRequired = false;
      product.lastSyncedAt = new Date().toISOString();
      await this.saveProduct(product);
    }
  }

  async deleteProduct(id) {
    return this.delete('products', String(id));
  }

  // ==================== CUSTOMER METHODS ====================

  async saveCustomer(customer) {
    if (!customer.userId && this.currentUserId) {
      customer.userId = this.currentUserId;
    }
    if (!customer.storeId && this.currentStoreId) {
      customer.storeId = this.currentStoreId;
    }
    if (!customer.storeMongoId && this.currentStoreMongoId) {
      customer.storeMongoId = this.currentStoreMongoId;
    }
    return this.put('customers', customer);
  }

  async getCustomers() {
    if (this.currentStoreId || this.currentStoreMongoId) {
      const allCustomers = await this.getAll('customers');
      return allCustomers.filter(c => this.itemBelongsToCurrentStore(c));
    }
    return this.getAll('customers');
  }

  async getCustomer(id) {
    const customer = await this.get('customers', String(id));
    if (customer && !this.itemBelongsToCurrentStore(customer)) {
      console.warn(`Customer ${id} belongs to different store, access denied`);
      return null;
    }
    return customer;
  }

  async getCustomerByEmail(email) {
    if (!email) return null;
    const customers = await this.getCustomers();
    return customers.find(c => c.email === email) || null;
  }

  async getCustomerByPhone(phone) {
    if (!phone) return null;
    const customers = await this.getCustomers();
    return customers.find(c => c.phone === phone) || null;
  }

  async getCustomerByCloudId(cloudId) {
    if (!cloudId) return null;
    const customers = await this.getCustomers();
    return customers.find(c => c.cloudId === cloudId || c._id === cloudId) || null;
  }

  async getUnsyncedCustomers() {
    const customers = await this.getCustomers();
    return customers.filter(c => !c.synced);
  }

  async markCustomerSynced(id, cloudId) {
    const customer = await this.getCustomer(id);
    if (customer) {
      customer.synced = true;
      customer.cloudId = cloudId;
      customer.syncRequired = false;
      customer.lastSyncedAt = new Date().toISOString();
      await this.saveCustomer(customer);
    }
  }

  // ==================== TRANSACTION METHODS ====================

  async saveTransaction(transaction) {
    if (!transaction.userId && this.currentUserId) {
      transaction.userId = this.currentUserId;
    }
    if (!transaction.storeId && this.currentStoreId) {
      transaction.storeId = this.currentStoreId;
    }
    if (!transaction.storeMongoId && this.currentStoreMongoId) {
      transaction.storeMongoId = this.currentStoreMongoId;
    }
    return this.put('transactions', transaction);
  }

  async getTransaction(id) {
    const transaction = await this.get('transactions', String(id));
    if (transaction && !this.itemBelongsToCurrentStore(transaction)) {
      console.warn(`Transaction ${id} belongs to different store, access denied`);
      return null;
    }
    if (transaction) {
      transaction.paymentProgress = transaction.total ? ((transaction.paid || 0) / transaction.total) * 100 : 0;
      transaction.isOverdue = this._isOverdue(transaction);
    }
    return transaction;
  }

  async getTransactions() {
    if (this.currentStoreId || this.currentStoreMongoId) {
      const allTransactions = await this.getAll('transactions');
      return allTransactions.filter(t => this.itemBelongsToCurrentStore(t));
    }
    return this.getAll('transactions');
  }

  async getTransactionsByDateRange(startDate, endDate) {
    const transactions = await this.getTransactions();
    return transactions.filter(t => {
      const date = new Date(t.createdAt || t.timestamp);
      return date >= new Date(startDate) && date <= new Date(endDate);
    });
  }

  async getTransactionsByCustomer(customerId) {
    const transactions = await this.getTransactions();
    const customerIdStr = String(customerId);
    return transactions.filter(t => 
      String(t.customer?.id) === customerIdStr || String(t.customer?._id) === customerIdStr
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getTransactionsByPaymentMethod(paymentMethod) {
    const transactions = await this.getTransactions();
    return transactions.filter(t => t.paymentMethod === paymentMethod);
  }

  async getCreditTransactions() {
    const transactions = await this.getTransactions();
    return transactions.filter(t => t.isCredit);
  }

  async getInstallmentTransactions() {
    const transactions = await this.getTransactions();
    return transactions.filter(t => t.isInstallment);
  }

  async getPendingPayments() {
    const transactions = await this.getTransactions();
    return transactions.filter(t => 
      (t.isCredit || t.isInstallment) && 
      !t.fullyPaid && 
      (t.remaining || 0) > 0
    ).sort((a, b) => {
      if (this._isOverdue(a) && !this._isOverdue(b)) return -1;
      if (!this._isOverdue(a) && this._isOverdue(b)) return 1;
      return new Date(a.dueDate || a.createdAt) - new Date(b.dueDate || b.createdAt);
    });
  }

  async getOverdueTransactions() {
    const transactions = await this.getTransactions();
    return transactions.filter(t => this._isOverdue(t));
  }

  async getUnsyncedTransactions() {
    const transactions = await this.getTransactions();
    return transactions.filter(t => !t.synced);
  }

  async markTransactionSynced(id, cloudId) {
    const transaction = await this.getTransaction(id);
    if (transaction) {
      transaction.synced = true;
      transaction.cloudId = cloudId;
      transaction.syncRequired = false;
      transaction.lastSyncedAt = new Date().toISOString();
      await this.saveTransaction(transaction);
      console.log(`✅ Transaction ${id} marked as synced with cloud ID: ${cloudId}`);
    }
  }

  async getDailySales(date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const transactions = await this.getTransactionsByDateRange(
      startOfDay.toISOString(),
      endOfDay.toISOString()
    );

    const completed = transactions.filter(t => !t.isCredit && !t.isInstallment || t.fullyPaid);
    const pending = transactions.filter(t => (t.isCredit || t.isInstallment) && !t.fullyPaid);
    
    const total = completed.reduce((sum, t) => sum + t.total, 0);
    const pendingTotal = pending.reduce((sum, t) => sum + (t.remaining || 0), 0);
    const collectedTotal = pending.reduce((sum, t) => sum + (t.paid || 0), 0);

    return {
      date: date.toISOString().split('T')[0],
      total,
      pendingTotal,
      collectedTotal,
      count: transactions.length,
      completedCount: completed.length,
      pendingCount: pending.length,
      average: completed.length > 0 ? total / completed.length : 0,
      transactions
    };
  }

  _isOverdue(transaction) {
    if (!transaction.dueDate) return false;
    if (transaction.fullyPaid) return false;
    if ((transaction.remaining || 0) <= 0) return false;
    return new Date(transaction.dueDate) < new Date();
  }

  // ==================== STOCK HISTORY METHODS ====================

  async addToStockHistory(historyData) {
    if (!historyData.userId && this.currentUserId) {
      historyData.userId = this.currentUserId;
    }
    if (!historyData.storeId && this.currentStoreId) {
      historyData.storeId = this.currentStoreId;
    }
    if (!historyData.storeMongoId && this.currentStoreMongoId) {
      historyData.storeMongoId = this.currentStoreMongoId;
    }
    return this.put('stockHistory', historyData);
  }

  async getStockHistory(productId) {
    const history = await this.getStockHistoryByStore();
    const productIdStr = String(productId);
    return history.filter(h => 
      String(h.productId) === productIdStr || h.productId === productIdStr
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getStockHistoryByStore() {
    if (this.currentStoreId || this.currentStoreMongoId) {
      const allHistory = await this.getAll('stockHistory');
      return allHistory.filter(h => this.itemBelongsToCurrentStore(h));
    }
    return this.getAll('stockHistory');
  }

  async getStockHistoryByType(productId, adjustmentType) {
    const history = await this.getStockHistory(productId);
    return history.filter(h => h.adjustmentType === adjustmentType);
  }

  async updateStockHistory(id, updates) {
    const db = await this.ensureInitialized();
    const history = await db.get('stockHistory', String(id));
    if (history) {
      if (this.currentUserId && history.userId !== this.currentUserId) {
        console.warn(`Cannot update stock history ${id}: belongs to different user`);
        return false;
      }
      Object.assign(history, updates);
      await db.put('stockHistory', history);
      return true;
    }
    return false;
  }

  async deleteStockHistory(id) {
    return this.delete('stockHistory', String(id));
  }

  async clearStockHistory() {
    const db = await this.ensureInitialized();
    const tx = db.transaction('stockHistory', 'readwrite');
    const store = tx.objectStore('stockHistory');
    
    if (this.currentUserId && store.indexNames.contains('userId')) {
      const index = store.index('userId');
      const userItems = await index.getAll(this.currentUserId);
      for (const item of userItems) {
        await store.delete(item.id);
      }
      console.log(`✅ Cleared ${userItems.length} stock history items for user ${this.currentUserId}`);
    } else {
      await store.clear();
      console.log('✅ Stock history cleared');
    }
  }

  async getStockHistoryStats() {
    const all = await this.getStockHistoryByStore();
    const stats = {
      total: all.length,
      byType: {},
      byProduct: {},
      totalAdded: 0,
      totalRemoved: 0
    };
    
    for (const record of all) {
      stats.byType[record.adjustmentType] = (stats.byType[record.adjustmentType] || 0) + 1;
      stats.byProduct[record.productName] = (stats.byProduct[record.productName] || 0) + 1;
      
      if (record.quantityChange > 0) {
        stats.totalAdded += record.quantityChange;
      } else {
        stats.totalRemoved += Math.abs(record.quantityChange);
      }
    }
    
    return stats;
  }

  // ==================== RETURNS METHODS ====================

  async saveReturn(returnData) {
    if (!returnData.userId && this.currentUserId) {
      returnData.userId = this.currentUserId;
    }
    if (!returnData.storeId && this.currentStoreId) {
      returnData.storeId = this.currentStoreId;
    }
    if (!returnData.storeMongoId && this.currentStoreMongoId) {
      returnData.storeMongoId = this.currentStoreMongoId;
    }
    return this.put('returns', returnData);
  }

  async getReturn(id) {
    const returnRecord = await this.get('returns', String(id));
    if (returnRecord && !this.itemBelongsToCurrentStore(returnRecord)) {
      console.warn(`Return ${id} belongs to different store, access denied`);
      return null;
    }
    return returnRecord;
  }

  async getAllReturns() {
    if (this.currentStoreId || this.currentStoreMongoId) {
      const allReturns = await this.getAll('returns');
      return allReturns.filter(r => this.itemBelongsToCurrentStore(r));
    }
    return this.getAll('returns');
  }

  async getReturnsByOriginalTransaction(transactionId) {
    const returns = await this.getAllReturns();
    return returns.filter(r => String(r.originalTransactionId) === String(transactionId));
  }

  async getReturnsByOriginalReceipt(receiptNumber) {
    const returns = await this.getAllReturns();
    return returns.filter(r => r.originalReceiptNumber === receiptNumber);
  }

  async getReturnsByType(returnType) {
    const returns = await this.getAllReturns();
    return returns.filter(r => r.returnType === returnType);
  }

  async getReturnsByCondition(condition) {
    const returns = await this.getAllReturns();
    return returns.filter(r => r.condition === condition);
  }

  async getReturnsByCustomer(customerId) {
    const returns = await this.getAllReturns();
    return returns.filter(r => String(r.customer?.id) === String(customerId));
  }

  async getUnsyncedReturns() {
    const returns = await this.getAllReturns();
    return returns.filter(r => !r.synced);
  }

  async markReturnSynced(id, cloudId) {
    const returnRecord = await this.getReturn(id);
    if (returnRecord) {
      returnRecord.synced = true;
      returnRecord.cloudId = cloudId;
      returnRecord.lastSyncedAt = new Date().toISOString();
      await this.saveReturn(returnRecord);
      console.log(`✅ Return ${id} marked as synced with cloud ID: ${cloudId}`);
    }
  }

  async deleteReturn(id) {
    return this.delete('returns', String(id));
  }

  async clearReturns() {
    const db = await this.ensureInitialized();
    const tx = db.transaction('returns', 'readwrite');
    const store = tx.objectStore('returns');
    
    if (this.currentUserId && store.indexNames.contains('userId')) {
      const index = store.index('userId');
      const userItems = await index.getAll(this.currentUserId);
      for (const item of userItems) {
        await store.delete(item.id);
      }
      console.log(`✅ Cleared ${userItems.length} returns for user ${this.currentUserId}`);
    } else {
      await store.clear();
      console.log('✅ Returns store cleared');
    }
  }

  async getReturnsStats() {
    const all = await this.getAllReturns();
    const stats = {
      total: all.length,
      byType: {},
      byCondition: {},
      totalRefundAmount: 0,
      totalItemsReturned: 0
    };
    
    for (const returnRecord of all) {
      stats.byType[returnRecord.returnType] = (stats.byType[returnRecord.returnType] || 0) + 1;
      stats.byCondition[returnRecord.condition] = (stats.byCondition[returnRecord.condition] || 0) + 1;
      stats.totalRefundAmount += returnRecord.totalRefund || 0;
      
      if (returnRecord.items) {
        stats.totalItemsReturned += returnRecord.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      }
    }
    
    return stats;
  }

  // ==================== STORES METHODS ====================

  async saveStore(store) {
    if (!store.userId && this.currentUserId) {
      store.userId = this.currentUserId;
    }
    return this.put('stores', store);
  }

  async getStore(id) {
    const store = await this.get('stores', String(id));
    if (store && this.currentUserId && store.userId !== this.currentUserId) {
      console.warn(`Store ${id} belongs to different user, access denied`);
      return null;
    }
    return store;
  }

  async getAllStores() {
    const stores = await this.getAll('stores');
    // Filter by current user if userId exists
    if (this.currentUserId) {
      return stores.filter(s => String(s.userId) === String(this.currentUserId));
    }
    return stores;
  }

  async getStoresByCity(city) {
    const stores = await this.getAllStores();
    return stores.filter(s => s.city === city);
  }

  async getStoresByState(state) {
    const stores = await this.getAllStores();
    return stores.filter(s => s.state === state);
  }

  async getOpenStores() {
    const stores = await this.getAllStores();
    return stores.filter(s => s.open === true);
  }

  async getDefaultStore() {
    const stores = await this.getAllStores();
    return stores.find(s => s.isDefault === true) || stores[0] || null;
  }

  async deleteStore(id) {
    return this.delete('stores', String(id));
  }

  async clearStores() {
    const db = await this.ensureInitialized();
    const tx = db.transaction('stores', 'readwrite');
    const store = tx.objectStore('stores');
    
    if (this.currentUserId && store.indexNames.contains('userId')) {
      const index = store.index('userId');
      const userItems = await index.getAll(this.currentUserId);
      for (const item of userItems) {
        await store.delete(item.id);
      }
      console.log(`✅ Cleared ${userItems.length} stores for user ${this.currentUserId}`);
    } else {
      await store.clear();
      console.log('✅ Stores store cleared');
    }
  }

  // ==================== TRANSFERS METHODS ====================

  async saveTransfer(transfer) {
    if (!transfer.userId && this.currentUserId) {
      transfer.userId = this.currentUserId;
    }
    if (!transfer.storeId && this.currentStoreId) {
      transfer.storeId = this.currentStoreId;
    }
    if (!transfer.storeMongoId && this.currentStoreMongoId) {
      transfer.storeMongoId = this.currentStoreMongoId;
    }
    return this.put('transfers', transfer);
  }

  async getTransfer(id) {
    const transfer = await this.get('transfers', String(id));
    if (transfer && !this.itemBelongsToCurrentStore(transfer)) {
      console.warn(`Transfer ${id} belongs to different store, access denied`);
      return null;
    }
    return transfer;
  }

  async getAllTransfers() {
    if (this.currentStoreId || this.currentStoreMongoId) {
      const allTransfers = await this.getAll('transfers');
      return allTransfers.filter(t => this.itemBelongsToCurrentStore(t));
    }
    return this.getAll('transfers');
  }

  async getTransfersByFromStore(storeId) {
    const transfers = await this.getAllTransfers();
    return transfers.filter(t => String(t.fromStoreId) === String(storeId));
  }

  async getTransfersByToStore(storeId) {
    const transfers = await this.getAllTransfers();
    return transfers.filter(t => String(t.toStoreId) === String(storeId));
  }

  async getTransfersByProduct(productId) {
    const transfers = await this.getAllTransfers();
    return transfers.filter(t => String(t.productId) === String(productId));
  }

  async getTransfersByStatus(status) {
    const transfers = await this.getAllTransfers();
    return transfers.filter(t => t.status === status);
  }

  async getPendingTransfers() {
    return this.getTransfersByStatus('pending');
  }

  async getInTransitTransfers() {
    return this.getTransfersByStatus('in-transit');
  }

  async getCompletedTransfers() {
    return this.getTransfersByStatus('completed');
  }

  async deleteTransfer(id) {
    return this.delete('transfers', String(id));
  }

  async clearTransfers() {
    const db = await this.ensureInitialized();
    const tx = db.transaction('transfers', 'readwrite');
    const store = tx.objectStore('transfers');
    
    if (this.currentUserId && store.indexNames.contains('userId')) {
      const index = store.index('userId');
      const userItems = await index.getAll(this.currentUserId);
      for (const item of userItems) {
        await store.delete(item.id);
      }
      console.log(`✅ Cleared ${userItems.length} transfers for user ${this.currentUserId}`);
    } else {
      await store.clear();
      console.log('✅ Transfers store cleared');
    }
  }

  async getTransfersStats() {
    const all = await this.getAllTransfers();
    const stats = {
      total: all.length,
      byStatus: {},
      totalItemsTransferred: 0,
      pendingCount: 0,
      inTransitCount: 0,
      completedCount: 0,
      cancelledCount: 0
    };
    
    for (const transfer of all) {
      stats.byStatus[transfer.status] = (stats.byStatus[transfer.status] || 0) + 1;
      stats.totalItemsTransferred += transfer.quantity || 0;
      
      switch(transfer.status) {
        case 'pending': stats.pendingCount++; break;
        case 'in-transit': stats.inTransitCount++; break;
        case 'completed': stats.completedCount++; break;
        case 'cancelled': stats.cancelledCount++; break;
      }
    }
    
    return stats;
  }

  // ==================== SYNC QUEUE METHODS ====================

  async addToSyncQueue(item) {
    const db = await this.ensureInitialized();
    
    // Add userId and storeId to queue item
    if (this.currentUserId && !item.userId) {
      item.userId = this.currentUserId;
    }
    if (this.currentStoreId && !item.storeId) {
      item.storeId = this.currentStoreId;
    }
    if (this.currentStoreMongoId && !item.storeMongoId) {
      item.storeMongoId = this.currentStoreMongoId;
    }
    
    let existing = null;
    if (item.transactionId) {
      const existingItems = await this.query('syncQueue', 'transactionId', item.transactionId);
      existing = existingItems.find(i => i.type === item.type);
    } else if (item.customerId) {
      const existingItems = await this.query('syncQueue', 'customerId', item.customerId);
      existing = existingItems.find(i => i.type === item.type);
    } else if (item.productId) {
      const existingItems = await this.query('syncQueue', 'productId', item.productId);
      existing = existingItems.find(i => i.type === item.type);
    } else if (item.returnId) {
      const existingItems = await this.query('syncQueue', 'returnId', item.returnId);
      existing = existingItems.find(i => i.type === item.type);
    }
    
    const queueItem = {
      type: item.type,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
      lastAttempt: null,
      error: null,
      storeId: this.currentStoreId,
      storeMongoId: this.currentStoreMongoId,
      userId: this.currentUserId
    };
    
    if (item.transactionId) queueItem.transactionId = String(item.transactionId);
    if (item.customerId) queueItem.customerId = String(item.customerId);
    if (item.productId) queueItem.productId = String(item.productId);
    if (item.returnId) queueItem.returnId = String(item.returnId);
    
    if (existing) {
      console.log(`⚠️ Item already in sync queue, updating retry count`);
      existing.retryCount = (existing.retryCount || 0) + 1;
      existing.lastAttempt = new Date().toISOString();
      existing.error = item.error || existing.error;
      existing.status = 'pending';
      await db.put('syncQueue', existing);
      return existing.id;
    }
    
    const id = await db.add('syncQueue', queueItem);
    console.log(`📋 Added to sync queue: ${item.type} with id ${id}`);
    return id;
  }

  async getSyncQueue() {
    if (this.currentStoreId || this.currentStoreMongoId) {
      const allQueue = await this.getAll('syncQueue');
      return allQueue.filter(q => this.itemBelongsToCurrentStore(q));
    }
    return this.getAll('syncQueue');
  }

  async getSyncQueueItem(type, referenceId) {
    const all = await this.getSyncQueue();
    const refIdStr = String(referenceId);
    return all.find(item => 
      item.type === type && 
      (String(item.transactionId) === refIdStr || 
       String(item.customerId) === refIdStr || 
       String(item.productId) === refIdStr ||
       String(item.returnId) === refIdStr)
    );
  }

  async getPendingSyncItems() {
    const all = await this.getSyncQueue();
    return all.filter(item => item.status === 'pending' || !item.status);
  }

  async updateSyncQueueItem(id, updates) {
    const db = await this.ensureInitialized();
    const item = await db.get('syncQueue', id);
    if (item) {
      if (this.currentUserId && item.userId !== this.currentUserId) {
        console.warn(`Cannot update sync queue item ${id}: belongs to different user`);
        return;
      }
      Object.assign(item, updates);
      await db.put('syncQueue', item);
    }
  }

  async deleteSyncQueueItem(id) {
    return this.delete('syncQueue', id);
  }

  async clearSyncQueue() {
    const db = await this.ensureInitialized();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    
    if (this.currentUserId && store.indexNames.contains('userId')) {
      const index = store.index('userId');
      const userItems = await index.getAll(this.currentUserId);
      for (const item of userItems) {
        await store.delete(item.id);
      }
      console.log(`✅ Cleared ${userItems.length} sync queue items for user ${this.currentUserId}`);
    } else {
      await store.clear();
      console.log('✅ Sync queue cleared');
    }
  }

  // ==================== SETTINGS METHODS ====================

  async getSetting(key) {
    const db = await this.ensureInitialized();
    let setting;
    
    if (this.currentUserId) {
      const index = db.transaction('settings').objectStore('settings').index('userId');
      const settings = await index.getAll(this.currentUserId);
      setting = settings.find(s => s.key === key);
    } else {
      setting = await db.get('settings', key);
    }
    
    return setting ? setting.value : null;
  }

  async setSetting(key, value) {
    const db = await this.ensureInitialized();
    await db.put('settings', { 
      key, 
      value, 
      userId: this.currentUserId,
      storeId: this.currentStoreId,
      storeMongoId: this.currentStoreMongoId,
      updatedAt: new Date().toISOString() 
    });
  }

  // ==================== UTILITY METHODS ====================

  async getDatabaseStats() {
    const db = await this.ensureInitialized();
    const stats = {};
    
    const stores = ['products', 'customers', 'transactions', 'syncQueue', 'stockHistory', 'returns', 'stores', 'transfers'];
    
    for (const storeName of stores) {
      if (db.objectStoreNames.contains(storeName)) {
        const all = await this.getAllByStore(storeName, this.currentStoreId) || [];
        
        if (storeName === 'transactions') {
          const creditCount = all.filter(t => t.isCredit).length;
          const installmentCount = all.filter(t => t.isInstallment).length;
          const pendingCount = all.filter(t => !t.fullyPaid && (t.isCredit || t.isInstallment)).length;
          const overdueCount = all.filter(t => this._isOverdue(t)).length;
          
          stats[storeName] = {
            count: all.length,
            size: JSON.stringify(all).length,
            creditCount,
            installmentCount,
            pendingCount,
            overdueCount,
            totalRevenue: all.reduce((sum, t) => sum + t.total, 0),
            totalOutstanding: all.filter(t => !t.fullyPaid).reduce((sum, t) => sum + (t.remaining || 0), 0)
          };
        } else if (storeName === 'stockHistory') {
          stats[storeName] = {
            count: all.length,
            size: JSON.stringify(all).length,
            byType: all.reduce((acc, h) => {
              acc[h.adjustmentType] = (acc[h.adjustmentType] || 0) + 1;
              return acc;
            }, {})
          };
        } else if (storeName === 'returns') {
          stats[storeName] = {
            count: all.length,
            size: JSON.stringify(all).length,
            byType: all.reduce((acc, r) => {
              acc[r.returnType] = (acc[r.returnType] || 0) + 1;
              return acc;
            }, {}),
            byCondition: all.reduce((acc, r) => {
              acc[r.condition] = (acc[r.condition] || 0) + 1;
              return acc;
            }, {}),
            totalRefundAmount: all.reduce((sum, r) => sum + (r.totalRefund || 0), 0)
          };
        } else if (storeName === 'stores') {
          stats[storeName] = {
            count: all.length,
            size: JSON.stringify(all).length,
            openCount: all.filter(s => s.open).length,
            closedCount: all.filter(s => !s.open).length
          };
        } else if (storeName === 'transfers') {
          stats[storeName] = {
            count: all.length,
            size: JSON.stringify(all).length,
            pendingCount: all.filter(t => t.status === 'pending').length,
            inTransitCount: all.filter(t => t.status === 'in-transit').length,
            completedCount: all.filter(t => t.status === 'completed').length,
            cancelledCount: all.filter(t => t.status === 'cancelled').length
          };
        } else {
          stats[storeName] = {
            count: all.length,
            size: JSON.stringify(all).length
          };
        }
      }
    }
    
    return stats;
  }

  async getSyncStats() {
    const allTransactions = await this.getTransactions();
    const allCustomers = await this.getCustomers();
    const allProducts = await this.getProducts();
    const allReturns = await this.getAllReturns();
    const allStores = await this.getAllStores();
    const allTransfers = await this.getAllTransfers();
    const queue = await this.getSyncQueue();
    
    return {
      transactions: {
        total: allTransactions.length,
        synced: allTransactions.filter(t => t.synced).length,
        unsynced: allTransactions.filter(t => !t.synced).length
      },
      customers: {
        total: allCustomers.length,
        synced: allCustomers.filter(c => c.synced).length,
        unsynced: allCustomers.filter(c => !c.synced).length
      },
      products: {
        total: allProducts.length,
        synced: allProducts.filter(p => p.synced).length,
        unsynced: allProducts.filter(p => !p.synced).length
      },
      returns: {
        total: allReturns.length,
        synced: allReturns.filter(r => r.synced).length,
        unsynced: allReturns.filter(r => !r.synced).length
      },
      stores: {
        total: allStores.length,
        synced: allStores.filter(s => s.synced).length,
        unsynced: allStores.filter(s => !s.synced).length
      },
      transfers: {
        total: allTransfers.length,
        synced: allTransfers.filter(t => t.synced).length,
        unsynced: allTransfers.filter(t => !t.synced).length
      },
      queueLength: queue.length,
      isOnline: navigator.onLine,
      currentStoreId: this.currentStoreId,
      currentStoreMongoId: this.currentStoreMongoId
    };
  }

  // ==================== MAINTENANCE METHODS ====================

  async fixEmailIndex() {
    console.log('🔄 Running email index fix...');
    
    try {
      await this.ensureInitialized();
      
      const customers = await this.getCustomers();
      console.log(`📊 Found ${customers.length} customers to process`);
      
      let fixed = 0;
      
      for (const customer of customers) {
        let needsUpdate = false;
        
        if (customer.email === '') {
          delete customer.email;
          needsUpdate = true;
          console.log(`📝 Removed empty email for customer: ${customer.name}`);
          fixed++;
        }
        
        if (customer.email && typeof customer.email !== 'string') {
          customer.email = String(customer.email);
          needsUpdate = true;
          fixed++;
        }
        
        if (needsUpdate) {
          await this.saveCustomer(customer);
        }
      }
      
      console.log(`✅ Email index fix completed, fixed ${fixed} customers`);
      return { success: true, processed: customers.length, fixed };
    } catch (error) {
      console.error('❌ Email index fix failed:', error);
      return { success: false, error: error.message };
    }
  }

  async vacuum() {
    console.log('🔄 Running database vacuum...');
    
    try {
      await this.ensureInitialized();
      
      const [transactions, customers, products, returns, stores, transfers] = await Promise.all([
        this.getTransactions(),
        this.getCustomers(),
        this.getProducts(),
        this.getAllReturns(),
        this.getAllStores(),
        this.getAllTransfers()
      ]);
      
      const uniqueTransactions = Array.from(
        new Map(transactions.map(t => [`${t.receiptNumber}_${t.storeId}_${t.userId}`, t])).values()
      );
      
      if (uniqueTransactions.length < transactions.length) {
        console.log(`🧹 Removing ${transactions.length - uniqueTransactions.length} duplicate transactions`);
        
        const db = await this.ensureInitialized();
        const tx = db.transaction('transactions', 'readwrite');
        const store = tx.objectStore('transactions');
        await store.clear();
        
        for (const t of uniqueTransactions) {
          await store.put(t);
        }
      }
      
      const uniqueCustomers = Array.from(
        new Map(customers.map(c => [c.id, c])).values()
      );
      
      if (uniqueCustomers.length < customers.length) {
        console.log(`🧹 Removing ${customers.length - uniqueCustomers.length} duplicate customers`);
        
        const db = await this.ensureInitialized();
        const tx = db.transaction('customers', 'readwrite');
        const store = tx.objectStore('customers');
        await store.clear();
        
        for (const c of uniqueCustomers) {
          await store.put(c);
        }
      }
      
      const uniqueReturns = Array.from(
        new Map(returns.map(r => [r.id, r])).values()
      );
      
      if (uniqueReturns.length < returns.length) {
        console.log(`🧹 Removing ${returns.length - uniqueReturns.length} duplicate returns`);
        
        const db = await this.ensureInitialized();
        const tx = db.transaction('returns', 'readwrite');
        const store = tx.objectStore('returns');
        await store.clear();
        
        for (const r of uniqueReturns) {
          await store.put(r);
        }
      }
      
      const uniqueStores = Array.from(
        new Map(stores.map(s => [s.id, s])).values()
      );
      
      if (uniqueStores.length < stores.length) {
        console.log(`🧹 Removing ${stores.length - uniqueStores.length} duplicate stores`);
        
        const db = await this.ensureInitialized();
        const tx = db.transaction('stores', 'readwrite');
        const store = tx.objectStore('stores');
        await store.clear();
        
        for (const s of uniqueStores) {
          await store.put(s);
        }
      }
      
      console.log('✅ Database vacuum completed');
      return { success: true };
    } catch (error) {
      console.error('❌ Database vacuum failed:', error);
      return { success: false, error: error.message };
    }
  }
}

const db = new DatabaseService();

export { DatabaseService, db };
export default db;