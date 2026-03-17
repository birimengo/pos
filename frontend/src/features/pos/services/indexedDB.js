// src/features/pos/services/indexedDB.js
const DB_NAME = 'POSOfflineDB';
const DB_VERSION = 9; // Increment version to ensure schema update

const STORES = {
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  TRANSACTIONS: 'transactions',
  SYNC_QUEUE: 'syncQueue'
};

class OfflineDB {
  constructor() {
    this.db = null;
    this.initPromise = null;
  }

  async init() {
    if (this.db) return this.db;
    
    if (!this.initPromise) {
      this.initPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.error('IndexedDB error:', request.error);
          reject(request.error);
        };
        
        request.onsuccess = () => {
          this.db = request.result;
          console.log('✅ IndexedDB initialized');
          resolve(this.db);
        };

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          console.log('🔄 Creating IndexedDB schema v9...');

          // Delete existing stores to ensure clean schema
          const existingStores = Array.from(db.objectStoreNames);
          existingStores.forEach(storeName => {
            db.deleteObjectStore(storeName);
          });

          // Create products store with explicit indexes
          const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
          productStore.createIndex('sku', 'sku', { unique: true });
          productStore.createIndex('barcode', 'barcode', { unique: false });
          productStore.createIndex('synced', 'synced', { unique: false });

          // Create customers store
          const customerStore = db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
          customerStore.createIndex('email', 'email', { unique: false });
          customerStore.createIndex('phone', 'phone', { unique: false });
          customerStore.createIndex('synced', 'synced', { unique: false });

          // Create transactions store with explicit indexes
          const transactionStore = db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id', autoIncrement: true });
          transactionStore.createIndex('timestamp', 'timestamp', { unique: false });
          transactionStore.createIndex('synced', 'synced', { unique: false });

          // Create sync queue store
          db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });

          console.log('✅ IndexedDB schema created with all indexes');
        };
      });
    }
    
    return this.initPromise;
  }

  async ensureInitialized() {
    if (!this.db) {
      await this.init();
    }
    return this.db;
  }

  // ==================== PRODUCT METHODS ====================

  async saveProducts(products) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.PRODUCTS, 'readwrite');
    const store = tx.objectStore(STORES.PRODUCTS);
    
    for (const product of products) {
      await store.put({
        ...product,
        synced: product.synced ? 1 : 0 // Convert boolean to number
      });
    }
    
    return tx.complete;
  }

  async saveProduct(product) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.PRODUCTS, 'readwrite');
    const store = tx.objectStore(STORES.PRODUCTS);
    return store.put({
      ...product,
      synced: product.synced ? 1 : 0 // Convert boolean to number
    });
  }

  async getProducts() {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.PRODUCTS, 'readonly');
    const store = tx.objectStore(STORES.PRODUCTS);
    
    try {
      const result = await store.getAll();
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Failed to get products:', error);
      return [];
    }
  }

  async getProduct(id) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.PRODUCTS, 'readonly');
    const store = tx.objectStore(STORES.PRODUCTS);
    return store.get(id);
  }

  async getProductByBarcode(barcode) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.PRODUCTS, 'readonly');
    const store = tx.objectStore(STORES.PRODUCTS);
    const index = store.index('barcode');
    
    try {
      const result = await index.getAll(barcode);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Failed to get product by barcode:', error);
      return [];
    }
  }

  async getProductBySKU(sku) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.PRODUCTS, 'readonly');
    const store = tx.objectStore(STORES.PRODUCTS);
    const index = store.index('sku');
    return index.get(sku);
  }

  async deleteProduct(id) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.PRODUCTS, 'readwrite');
    const store = tx.objectStore(STORES.PRODUCTS);
    return store.delete(id);
  }

  async getUnsyncedProducts() {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.PRODUCTS, 'readonly');
    const store = tx.objectStore(STORES.PRODUCTS);
    
    try {
      const all = await store.getAll();
      const items = Array.isArray(all) ? all : [];
      
      // Filter items that are not synced (handle both boolean and number representations)
      return items.filter(item => {
        return item.synced === false || 
               item.synced === 0 || 
               item.synced === 'false' || 
               item.synced === undefined;
      });
    } catch (error) {
      console.error('Failed to get unsynced products:', error);
      return [];
    }
  }

  async markProductSynced(id) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.PRODUCTS, 'readwrite');
    const store = tx.objectStore(STORES.PRODUCTS);
    const product = await store.get(id);
    if (product) {
      product.synced = 1; // Use 1 for true (synced)
      await store.put(product);
    }
    return tx.complete;
  }

  // ==================== CUSTOMER METHODS ====================

  async saveCustomers(customers) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.CUSTOMERS, 'readwrite');
    const store = tx.objectStore(STORES.CUSTOMERS);
    
    for (const customer of customers) {
      await store.put({
        ...customer,
        synced: customer.synced ? 1 : 0 // Convert boolean to number
      });
    }
    
    return tx.complete;
  }

  async saveCustomer(customer) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.CUSTOMERS, 'readwrite');
    const store = tx.objectStore(STORES.CUSTOMERS);
    return store.put({
      ...customer,
      synced: customer.synced ? 1 : 0 // Convert boolean to number
    });
  }

  async getCustomers() {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.CUSTOMERS, 'readonly');
    const store = tx.objectStore(STORES.CUSTOMERS);
    
    try {
      const result = await store.getAll();
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Failed to get customers:', error);
      return [];
    }
  }

  async getCustomer(id) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.CUSTOMERS, 'readonly');
    const store = tx.objectStore(STORES.CUSTOMERS);
    return store.get(id);
  }

  async getUnsyncedCustomers() {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.CUSTOMERS, 'readonly');
    const store = tx.objectStore(STORES.CUSTOMERS);
    
    try {
      const all = await store.getAll();
      const items = Array.isArray(all) ? all : [];
      
      // Filter items that are not synced
      return items.filter(item => {
        return item.synced === false || 
               item.synced === 0 || 
               item.synced === 'false' || 
               item.synced === undefined;
      });
    } catch (error) {
      console.error('Failed to get unsynced customers:', error);
      return [];
    }
  }

  async markCustomerSynced(id) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.CUSTOMERS, 'readwrite');
    const store = tx.objectStore(STORES.CUSTOMERS);
    const customer = await store.get(id);
    if (customer) {
      customer.synced = 1;
      await store.put(customer);
    }
    return tx.complete;
  }

  // ==================== TRANSACTION METHODS ====================

  async saveTransaction(transaction) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.TRANSACTIONS, 'readwrite');
    const store = tx.objectStore(STORES.TRANSACTIONS);
    
    // Ensure synced is stored as a number (0 for false, 1 for true)
    return store.add({
      ...transaction,
      synced: 0, // Use 0 for false (unsynced)
      timestamp: new Date().toISOString()
    });
  }

  async getUnsyncedTransactions() {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.TRANSACTIONS, 'readonly');
    const store = tx.objectStore(STORES.TRANSACTIONS);
    
    try {
      // Try to use index first
      if (store.indexNames.contains('synced')) {
        const index = store.index('synced');
        
        try {
          // Get all items from the index
          const allResults = await index.getAll();
          
          // Filter manually to ensure we get unsynced items regardless of type
          if (Array.isArray(allResults)) {
            const unsynced = allResults.filter(item => {
              // Handle both boolean and number representations
              return item.synced === false || 
                     item.synced === 0 || 
                     item.synced === 'false';
            });
            return unsynced;
          }
        } catch (indexError) {
          console.warn('Error using synced index:', indexError);
        }
      }
    } catch (error) {
      console.warn('Error accessing synced index:', error);
    }
    
    // Fallback: get all and filter manually
    try {
      const all = await store.getAll();
      // Ensure all is an array before filtering
      const items = Array.isArray(all) ? all : [];
      
      // Filter items that are not synced
      return items.filter(item => {
        return item.synced === false || 
               item.synced === 0 || 
               item.synced === 'false' || 
               item.synced === undefined;
      });
    } catch (error) {
      console.error('Failed to get transactions:', error);
      return [];
    }
  }

  async markTransactionSynced(id) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.TRANSACTIONS, 'readwrite');
    const store = tx.objectStore(STORES.TRANSACTIONS);
    const transaction = await store.get(id);
    if (transaction) {
      transaction.synced = 1; // Use 1 for true (synced)
      await store.put(transaction);
    }
    return tx.complete;
  }

  async markAllTransactionsSynced() {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.TRANSACTIONS, 'readwrite');
    const store = tx.objectStore(STORES.TRANSACTIONS);
    
    try {
      const all = await store.getAll();
      const items = Array.isArray(all) ? all : [];
      
      for (const transaction of items) {
        transaction.synced = 1; // Use 1 for true (synced)
        await store.put(transaction);
      }
    } catch (error) {
      console.error('Failed to mark all transactions synced:', error);
    }
    
    return tx.complete;
  }

  async getTransactions() {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.TRANSACTIONS, 'readonly');
    const store = tx.objectStore(STORES.TRANSACTIONS);
    
    try {
      const result = await store.getAll();
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Failed to get transactions:', error);
      return [];
    }
  }

  async getTransactionsByDateRange(startDate, endDate) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.TRANSACTIONS, 'readonly');
    const store = tx.objectStore(STORES.TRANSACTIONS);
    
    try {
      const all = await store.getAll();
      const items = Array.isArray(all) ? all : [];
      
      return items.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= new Date(startDate) && itemDate <= new Date(endDate);
      });
    } catch (error) {
      console.error('Failed to get transactions by date range:', error);
      return [];
    }
  }

  // ==================== SYNC QUEUE METHODS ====================

  async addToSyncQueue(item) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    return store.add({
      ...item,
      timestamp: new Date().toISOString(),
      synced: 0
    });
  }

  async getSyncQueue() {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    
    try {
      const result = await store.getAll();
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Failed to get sync queue:', error);
      return [];
    }
  }

  async getUnsyncedQueueItems() {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    
    try {
      const all = await store.getAll();
      const items = Array.isArray(all) ? all : [];
      
      return items.filter(item => {
        return item.synced === false || 
               item.synced === 0 || 
               item.synced === 'false' || 
               item.synced === undefined;
      });
    } catch (error) {
      console.error('Failed to get unsynced queue items:', error);
      return [];
    }
  }

  async markQueueItemSynced(id) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const item = await store.get(id);
    if (item) {
      item.synced = 1;
      await store.put(item);
    }
    return tx.complete;
  }

  async clearSyncQueue() {
    const db = await this.ensureInitialized();
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    await store.clear();
    return tx.complete;
  }

  // ==================== UTILITY METHODS ====================

  async clearAllStores() {
    const db = await this.ensureInitialized();
    const stores = [STORES.PRODUCTS, STORES.CUSTOMERS, STORES.TRANSACTIONS, STORES.SYNC_QUEUE];
    
    for (const storeName of stores) {
      if (db.objectStoreNames.contains(storeName)) {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        await store.clear();
      }
    }
  }

  async getStoreSizes() {
    const db = await this.ensureInitialized();
    const sizes = {};
    
    for (const storeName of Object.values(STORES)) {
      if (db.objectStoreNames.contains(storeName)) {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const all = await store.getAll();
        const items = Array.isArray(all) ? all : [];
        
        sizes[storeName] = {
          count: items.length,
          size: JSON.stringify(items).length
        };
      }
    }
    
    return sizes;
  }

  async getSyncStats() {
    const db = await this.ensureInitialized();
    
    try {
      const [products, customers, transactions, queue] = await Promise.all([
        this.getProducts(),
        this.getCustomers(),
        this.getTransactions(),
        this.getSyncQueue()
      ]);

      return {
        totalProducts: products.length,
        totalCustomers: customers.length,
        totalTransactions: transactions.length,
        totalQueueItems: queue.length,
        unsyncedProducts: (await this.getUnsyncedProducts()).length,
        unsyncedCustomers: (await this.getUnsyncedCustomers()).length,
        unsyncedTransactions: (await this.getUnsyncedTransactions()).length,
        unsyncedQueueItems: (await this.getUnsyncedQueueItems()).length
      };
    } catch (error) {
      console.error('Failed to get sync stats:', error);
      return {
        totalProducts: 0,
        totalCustomers: 0,
        totalTransactions: 0,
        totalQueueItems: 0,
        unsyncedProducts: 0,
        unsyncedCustomers: 0,
        unsyncedTransactions: 0,
        unsyncedQueueItems: 0
      };
    }
  }

  async deleteDatabase() {
    return new Promise((resolve, reject) => {
      // Close the connection first
      if (this.db) {
        this.db.close();
        this.db = null;
        this.initPromise = null;
      }

      const request = indexedDB.deleteDatabase(DB_NAME);
      
      request.onsuccess = () => {
        console.log('✅ Database deleted successfully');
        resolve();
      };
      
      request.onerror = () => {
        console.error('❌ Failed to delete database:', request.error);
        reject(request.error);
      };
      
      request.onblocked = () => {
        console.warn('⚠️ Database deletion blocked');
        // Force close any lingering connections
        if (this.db) {
          this.db.close();
          this.db = null;
          this.initPromise = null;
        }
        // Try again
        indexedDB.deleteDatabase(DB_NAME);
      };
    });
  }
}

export const offlineDB = new OfflineDB();