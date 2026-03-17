// src/features/pos/services/database.js
import { openDB } from 'idb';
import { opfs } from './opfsService';

class DatabaseService {
  constructor() {
    this.db = null;
    this.dbName = 'BizCorePOS';
    this.dbVersion = 4; // Increment to add transactions store
    this.initPromise = null;
    this.initialized = false;
  }

  async init() {
    if (this.db) return this.db;
    
    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          console.log('🔄 Initializing database v4...');
          
          this.db = await openDB(this.dbName, this.dbVersion, {
            upgrade(db, oldVersion, newVersion, transaction) {
              console.log(`Upgrading database from v${oldVersion} to v${newVersion}`);
              
              // Delete existing stores to ensure clean schema
              const storeNames = Array.from(db.objectStoreNames);
              storeNames.forEach(name => {
                db.deleteObjectStore(name);
                console.log(`Deleted store: ${name}`);
              });

              // Products store
              const productStore = db.createObjectStore('products', { keyPath: 'id' });
              productStore.createIndex('sku', 'sku', { unique: true });
              productStore.createIndex('barcode', 'barcode');
              productStore.createIndex('category', 'category');
              productStore.createIndex('synced', 'synced');
              console.log('✅ Created products store');

              // Customers store
              const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
              customerStore.createIndex('email', 'email', { unique: true });
              customerStore.createIndex('phone', 'phone');
              customerStore.createIndex('synced', 'synced');
              console.log('✅ Created customers store');

              // Transactions store
              const transactionStore = db.createObjectStore('transactions', { keyPath: 'id' });
              transactionStore.createIndex('receiptNumber', 'receiptNumber', { unique: true });
              transactionStore.createIndex('timestamp', 'timestamp');
              transactionStore.createIndex('customerId', 'customer.id');
              transactionStore.createIndex('paymentMethod', 'paymentMethod');
              transactionStore.createIndex('synced', 'synced');
              console.log('✅ Created transactions store');

              // Sync Queue store
              db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
              console.log('✅ Created syncQueue store');

              // Settings store
              db.createObjectStore('settings', { keyPath: 'key' });
              console.log('✅ Created settings store');
            }
          });

          // Initialize OPFS
          await opfs.init();
          
          this.initialized = true;
          console.log('✅ Database service initialized successfully');
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

  // ==================== GENERIC CRUD ====================

  async getAll(storeName) {
    const db = await this.ensureInitialized();
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const result = await store.getAll();
      return result || [];
    } catch (error) {
      console.error(`Error getting all from ${storeName}:`, error);
      return [];
    }
  }

  async get(storeName, id) {
    const db = await this.ensureInitialized();
    return db.get(storeName, id);
  }

  async add(storeName, data) {
    const db = await this.ensureInitialized();
    const id = data.id || Date.now();
    const item = { ...data, id, createdAt: new Date().toISOString() };
    await db.add(storeName, item);
    return id;
  }

  async put(storeName, data) {
    const db = await this.ensureInitialized();
    const item = { ...data, updatedAt: new Date().toISOString() };
    await db.put(storeName, item);
    return item.id;
  }

  async delete(storeName, id) {
    const db = await this.ensureInitialized();
    await db.delete(storeName, id);
  }

  async query(storeName, indexName, value) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    if (!store.indexNames.contains(indexName)) {
      console.warn(`Index ${indexName} not found in ${storeName}`);
      return [];
    }
    
    const index = store.index(indexName);
    return index.getAll(value);
  }

  // ==================== PRODUCT METHODS ====================

  async saveProduct(product) {
    console.log('💾 Saving product to database:', product.name);
    return this.put('products', product);
  }

  async getProduct(id) {
    return this.get('products', id);
  }

  async getProducts() {
    const products = await this.getAll('products');
    console.log(`📦 Retrieved ${products.length} products from database`);
    return products;
  }

  async getProductsByCategory(category) {
    return this.query('products', 'category', category);
  }

  async getUnsyncedProducts() {
    const db = await this.ensureInitialized();
    const tx = db.transaction('products', 'readonly');
    const store = tx.objectStore('products');
    
    try {
      if (store.indexNames.contains('synced')) {
        const index = store.index('synced');
        const all = await index.getAll();
        return all.filter(item => !item.synced);
      }
    } catch (error) {
      console.warn('Error using synced index:', error);
    }
    
    const all = await store.getAll();
    return all.filter(item => !item.synced);
  }

  async markProductSynced(id, cloudId) {
    const db = await this.ensureInitialized();
    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');
    const product = await store.get(id);
    if (product) {
      product.synced = true;
      product.cloudId = cloudId;
      product.syncRequired = false;
      await store.put(product);
      console.log(`✅ Product ${id} marked as synced`);
    }
  }

  async deleteProduct(id) {
    return this.delete('products', id);
  }

  // ==================== CUSTOMER METHODS ====================

  async saveCustomer(customer) {
    return this.put('customers', customer);
  }

  async getCustomers() {
    return this.getAll('customers');
  }

  async getCustomer(id) {
    return this.get('customers', id);
  }

  async getCustomerByEmail(email) {
    const customers = await this.query('customers', 'email', email);
    return customers[0];
  }

  async getCustomerByPhone(phone) {
    const customers = await this.query('customers', 'phone', phone);
    return customers[0];
  }

  // ==================== TRANSACTION METHODS ====================

  async saveTransaction(transaction) {
    console.log('💾 Saving transaction to database:', transaction.receiptNumber);
    return this.put('transactions', transaction);
  }

  async getTransaction(id) {
    return this.get('transactions', id);
  }

  async getTransactions() {
    return this.getAll('transactions');
  }

  async getTransactionsByDateRange(startDate, endDate) {
    const db = await this.ensureInitialized();
    const tx = db.transaction('transactions', 'readonly');
    const store = tx.objectStore('transactions');
    const all = await store.getAll();
    
    return all.filter(t => {
      const date = new Date(t.timestamp);
      return date >= new Date(startDate) && date <= new Date(endDate);
    });
  }

  async getTransactionsByCustomer(customerId) {
    const db = await this.ensureInitialized();
    const tx = db.transaction('transactions', 'readonly');
    const store = tx.objectStore('transactions');
    
    if (store.indexNames.contains('customerId')) {
      const index = store.index('customerId');
      return index.getAll(customerId);
    }
    
    const all = await store.getAll();
    return all.filter(t => t.customer?.id === customerId);
  }

  async getTransactionsByPaymentMethod(paymentMethod) {
    const db = await this.ensureInitialized();
    const tx = db.transaction('transactions', 'readonly');
    const store = tx.objectStore('transactions');
    
    if (store.indexNames.contains('paymentMethod')) {
      const index = store.index('paymentMethod');
      return index.getAll(paymentMethod);
    }
    
    const all = await store.getAll();
    return all.filter(t => t.paymentMethod === paymentMethod);
  }

  async getUnsyncedTransactions() {
    const db = await this.ensureInitialized();
    const tx = db.transaction('transactions', 'readonly');
    const store = tx.objectStore('transactions');
    
    try {
      if (store.indexNames.contains('synced')) {
        const index = store.index('synced');
        const all = await index.getAll();
        return all.filter(item => !item.synced);
      }
    } catch (error) {
      console.warn('Error using synced index:', error);
    }
    
    const all = await store.getAll();
    return all.filter(item => !item.synced);
  }

  async markTransactionSynced(id, cloudId) {
    const db = await this.ensureInitialized();
    const tx = db.transaction('transactions', 'readwrite');
    const store = tx.objectStore('transactions');
    const transaction = await store.get(id);
    if (transaction) {
      transaction.synced = true;
      transaction.cloudId = cloudId;
      await store.put(transaction);
      console.log(`✅ Transaction ${id} marked as synced`);
    }
  }

  async getDailySales(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const transactions = await this.getTransactionsByDateRange(
      startOfDay.toISOString(),
      endOfDay.toISOString()
    );

    const total = transactions.reduce((sum, t) => sum + t.total, 0);
    const count = transactions.length;

    return {
      date: date.toISOString().split('T')[0],
      total,
      count,
      average: count > 0 ? total / count : 0,
      transactions
    };
  }

  // ==================== SYNC QUEUE METHODS ====================

  async addToSyncQueue(item) {
    const db = await this.ensureInitialized();
    return db.add('syncQueue', { 
      ...item, 
      timestamp: new Date().toISOString() 
    });
  }

  async getSyncQueue() {
    return this.getAll('syncQueue');
  }

  async deleteSyncQueueItem(id) {
    return this.delete('syncQueue', id);
  }

  async clearSyncQueue() {
    const db = await this.ensureInitialized();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    await store.clear();
    console.log('✅ Sync queue cleared');
  }

  // ==================== SETTINGS METHODS ====================

  async getSetting(key) {
    const db = await this.ensureInitialized();
    return db.get('settings', key);
  }

  async setSetting(key, value) {
    const db = await this.ensureInitialized();
    await db.put('settings', { key, value });
  }

  // ==================== UTILITY METHODS ====================

  async clearAllStores() {
    const db = await this.ensureInitialized();
    const stores = ['products', 'customers', 'transactions', 'syncQueue'];
    
    for (const storeName of stores) {
      if (db.objectStoreNames.contains(storeName)) {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        await store.clear();
        console.log(`✅ Cleared ${storeName} store`);
      }
    }
  }

  async getDatabaseStats() {
    const db = await this.ensureInitialized();
    const stats = {};
    
    const stores = ['products', 'customers', 'transactions', 'syncQueue'];
    
    for (const storeName of stores) {
      if (db.objectStoreNames.contains(storeName)) {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const all = await store.getAll();
        stats[storeName] = {
          count: all.length,
          size: JSON.stringify(all).length
        };
      }
    }
    
    return stats;
  }
}

// Create and export instance
const db = new DatabaseService();

export { DatabaseService, db };
export default db;