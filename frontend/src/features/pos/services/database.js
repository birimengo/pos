// src/features/pos/services/database.js
import { openDB } from 'idb';
import { opfs } from './opfsService';

class DatabaseService {
  constructor() {
    this.db = null;
    this.dbName = 'BizCorePOS';
    this.dbVersion = 5; // Increment version to ensure schema update
    this.initPromise = null;
    this.initialized = false;
  }

  async init() {
    if (this.db) return this.db;
    
    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          console.log('🔄 Initializing database v5...');
          
          this.db = await openDB(this.dbName, this.dbVersion, {
            upgrade: async (db, oldVersion, newVersion, transaction) => {
              console.log(`Upgrading database from v${oldVersion} to v${newVersion}`);
              
              // Handle existing stores
              const storeNames = Array.from(db.objectStoreNames);
              
              // Products store (if not exists)
              if (!db.objectStoreNames.contains('products')) {
                const productStore = db.createObjectStore('products', { keyPath: 'id' });
                productStore.createIndex('sku', 'sku', { unique: true });
                productStore.createIndex('barcode', 'barcode', { unique: false });
                productStore.createIndex('category', 'category', { unique: false });
                productStore.createIndex('synced', 'synced', { unique: false });
                console.log('✅ Created products store');
              }

              // Customers store - FIXED: Make email index non-unique
              if (!db.objectStoreNames.contains('customers')) {
                const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
                // IMPORTANT: Set unique: false to allow multiple customers without emails
                customerStore.createIndex('email', 'email', { unique: false });
                customerStore.createIndex('phone', 'phone', { unique: false });
                customerStore.createIndex('synced', 'synced', { unique: false });
                console.log('✅ Created customers store with non-unique email index');
              } else {
                // If store exists but we need to check if we need to recreate for index fix
                // We can't easily modify indexes, so we'll keep the existing store
                // The email index will remain as is, but we'll handle empty emails in the save method
                console.log('📝 Using existing customers store - email index may be unique');
              }

              // Transactions store
              if (!db.objectStoreNames.contains('transactions')) {
                const transactionStore = db.createObjectStore('transactions', { keyPath: 'id' });
                transactionStore.createIndex('receiptNumber', 'receiptNumber', { unique: true });
                transactionStore.createIndex('timestamp', 'timestamp', { unique: false });
                transactionStore.createIndex('customerId', 'customer.id', { unique: false });
                transactionStore.createIndex('paymentMethod', 'paymentMethod', { unique: false });
                transactionStore.createIndex('synced', 'synced', { unique: false });
                console.log('✅ Created transactions store');
              }

              // Sync Queue store
              if (!db.objectStoreNames.contains('syncQueue')) {
                db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                console.log('✅ Created syncQueue store');
              }

              // Settings store
              if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
                console.log('✅ Created settings store');
              }
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
    
    // Handle special cases for customers store
    if (storeName === 'customers') {
      // Create a clean copy to avoid modifying the original
      const customerData = { ...data };
      
      // Handle email field for unique index - if email is empty, set to undefined
      // This way it won't be indexed and won't cause unique constraint violations
      if (customerData.email === '') {
        delete customerData.email;
      }
      
      // Log for debugging
      console.log(`📝 Saving customer to ${storeName}:`, {
        id: customerData.id,
        name: customerData.name,
        email: customerData.email || 'no-email'
      });
      
      const item = { ...customerData, updatedAt: new Date().toISOString() };
      await db.put(storeName, item);
      return item.id;
    }
    
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
    // Create a clean copy to avoid modifying the original
    const customerToSave = { ...customer };
    
    // Handle email field for unique index - if empty, remove it completely
    // This way it won't be indexed and won't cause unique constraint violations
    if (!customerToSave.email || customerToSave.email === '') {
      delete customerToSave.email;
    }
    
    // Ensure required fields
    if (!customerToSave.name) {
      throw new Error('Customer name is required');
    }
    
    // Generate ID if not present
    if (!customerToSave.id) {
      customerToSave.id = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    console.log('💾 Saving customer to database:', {
      id: customerToSave.id,
      name: customerToSave.name,
      email: customerToSave.email || 'no-email'
    });
    
    return this.put('customers', customerToSave);
  }

  async getCustomers() {
    return this.getAll('customers');
  }

  async getCustomer(id) {
    return this.get('customers', id);
  }

  async getCustomerByEmail(email) {
    if (!email) return null;
    try {
      const customers = await this.query('customers', 'email', email);
      return customers[0];
    } catch (error) {
      console.warn('Error querying by email:', error);
      return null;
    }
  }

  async getCustomerByPhone(phone) {
    if (!phone) return null;
    try {
      const customers = await this.query('customers', 'phone', phone);
      return customers[0];
    } catch (error) {
      console.warn('Error querying by phone:', error);
      return null;
    }
  }

  // ==================== TRANSACTION METHODS ====================

  async saveTransaction(transaction) {
    console.log('💾 Saving transaction to database:', transaction.receiptNumber);
    
    // Ensure transaction has required fields
    const transactionToSave = { ...transaction };
    
    if (!transactionToSave.id) {
      transactionToSave.id = `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    if (!transactionToSave.createdAt) {
      transactionToSave.createdAt = new Date().toISOString();
    }
    
    return this.put('transactions', transactionToSave);
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
      const date = new Date(t.createdAt || t.timestamp);
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

  // ==================== MAINTENANCE METHODS ====================

  async fixEmailIndex() {
    console.log('🔄 Running email index fix...');
    
    try {
      await this.ensureInitialized();
      
      // Get all customers
      const customers = await this.getAll('customers');
      console.log(`📊 Found ${customers.length} customers to process`);
      
      // Process each customer to ensure email is properly formatted
      for (const customer of customers) {
        let needsUpdate = false;
        
        if (customer.email === '') {
          delete customer.email;
          needsUpdate = true;
          console.log(`📝 Removed empty email for customer: ${customer.name}`);
        }
        
        if (needsUpdate) {
          await this.put('customers', customer);
        }
      }
      
      console.log('✅ Email index fix completed');
      return { success: true, processed: customers.length };
    } catch (error) {
      console.error('❌ Email index fix failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create and export instance
const db = new DatabaseService();

export { DatabaseService, db };
export default db;