// src/features/pos/services/database.js

import { openDB } from 'idb';
import { opfs } from './opfsService';

class DatabaseService {
  constructor() {
    this.db = null;
    this.dbName = 'BizCorePOS';
    this.dbVersion = 7; // Incremented to v7 for sync queue fixes
    this.initPromise = null;
    this.initialized = false;
  }

  async init() {
    if (this.db) return this.db;
    
    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          console.log('🔄 Initializing database v7 with enhanced sync queue support...');
          
          this.db = await openDB(this.dbName, this.dbVersion, {
            upgrade: async (db, oldVersion, newVersion, transaction) => {
              console.log(`Upgrading database from v${oldVersion} to v${newVersion}`);
              
              // Delete old stores if needed for clean upgrade
              if (oldVersion < 6) {
                console.log('📦 Performing schema upgrade to v6');
              }
              
              // ==================== PRODUCTS STORE ====================
              if (!db.objectStoreNames.contains('products')) {
                const productStore = db.createObjectStore('products', { keyPath: 'id' });
                productStore.createIndex('sku', 'sku', { unique: true });
                productStore.createIndex('barcode', 'barcode', { unique: false });
                productStore.createIndex('category', 'category', { unique: false });
                productStore.createIndex('synced', 'synced', { unique: false });
                productStore.createIndex('cloudId', 'cloudId', { unique: false });
                productStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                console.log('✅ Created products store with indexes');
              } else {
                const productStore = transaction.objectStore('products');
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
                console.log('✅ Created customers store with non-unique email index');
              } else {
                const customerStore = transaction.objectStore('customers');
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
                transactionStore.createIndex('receiptNumber', 'receiptNumber', { unique: true });
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
                console.log('✅ Created enhanced transactions store');
              } else {
                const transactionStore = transaction.objectStore('transactions');
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

              // ==================== SYNC QUEUE STORE (FIXED) ====================
              if (!db.objectStoreNames.contains('syncQueue')) {
                // Use autoIncrement: true - DO NOT provide id manually
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
                console.log('✅ Created syncQueue store with auto-increment');
              } else {
                const syncQueueStore = transaction.objectStore('syncQueue');
                if (!syncQueueStore.indexNames.contains('transactionId')) {
                  syncQueueStore.createIndex('transactionId', 'transactionId', { unique: false });
                }
                if (!syncQueueStore.indexNames.contains('customerId')) {
                  syncQueueStore.createIndex('customerId', 'customerId', { unique: false });
                }
                if (!syncQueueStore.indexNames.contains('productId')) {
                  syncQueueStore.createIndex('productId', 'productId', { unique: false });
                }
              }

              // ==================== SETTINGS STORE ====================
              if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
                console.log('✅ Created settings store');
              }
            }
          });

          await opfs.init();
          
          this.initialized = true;
          console.log('✅ Database service v7 initialized successfully');
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
    // Ensure id is a string for string key paths
    const key = String(id);
    return db.get(storeName, key);
  }

  async add(storeName, data) {
    const db = await this.ensureInitialized();
    const id = data.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const item = { ...data, id: String(id), createdAt: new Date().toISOString() };
    await db.add(storeName, item);
    return id;
  }

  async put(storeName, data) {
    const db = await this.ensureInitialized();
    
    if (storeName === 'customers') {
      return this._saveCustomer(db, data);
    } else if (storeName === 'transactions') {
      return this._saveTransaction(db, data);
    } else if (storeName === 'products') {
      return this._saveProduct(db, data);
    }
    
    const item = { ...data, updatedAt: new Date().toISOString() };
    // Ensure id is a string
    if (item.id) item.id = String(item.id);
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
    // Ensure id is a string
    customerData.id = String(customerData.id);
    
    const now = new Date().toISOString();
    customerData.updatedAt = now;
    if (!customerData.createdAt) {
      customerData.createdAt = now;
    }
    
    console.log('📝 Saving customer:', {
      id: customerData.id,
      name: customerData.name,
      email: customerData.email || 'no-email',
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
    // Ensure id is a string
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
    
    const now = new Date().toISOString();
    transactionData.updatedAt = now;
    if (!transactionData.createdAt) {
      transactionData.createdAt = now;
    }
    
    console.log('📝 Saving transaction:', {
      id: transactionData.id,
      receiptNumber: transactionData.receiptNumber,
      customer: transactionData.customer?.name,
      total: transactionData.total,
      remaining: transactionData.remaining,
      isCredit: transactionData.isCredit,
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
    // Ensure id is a string
    productData.id = String(productData.id);
    
    const now = new Date().toISOString();
    productData.updatedAt = now;
    if (!productData.createdAt) {
      productData.createdAt = now;
    }
    
    console.log('📝 Saving product:', {
      id: productData.id,
      name: productData.name,
      sku: productData.sku,
      cloudId: productData.cloudId
    });
    
    await db.put('products', productData);
    return productData.id;
  }

  async delete(storeName, id) {
    const db = await this.ensureInitialized();
    await db.delete(storeName, String(id));
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

  async queryRange(storeName, indexName, lower, upper, lowerOpen = false, upperOpen = false) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    if (!store.indexNames.contains(indexName)) {
      console.warn(`Index ${indexName} not found in ${storeName}`);
      return [];
    }
    
    const index = store.index(indexName);
    const range = IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen);
    return index.getAll(range);
  }

  // ==================== PRODUCT METHODS ====================

  async saveProduct(product) {
    return this.put('products', product);
  }

  async getProduct(id) {
    return this.get('products', String(id));
  }

  async getProducts() {
    return this.getAll('products');
  }

  async getProductsByCategory(category) {
    return this.query('products', 'category', category);
  }

  async getProductBySku(sku) {
    const results = await this.query('products', 'sku', sku);
    return results[0] || null;
  }

  async getUnsyncedProducts() {
    return this.query('products', 'synced', false);
  }

  async markProductSynced(id, cloudId) {
    const product = await this.get('products', String(id));
    if (product) {
      product.synced = true;
      product.cloudId = cloudId;
      product.syncRequired = false;
      product.lastSyncedAt = new Date().toISOString();
      await this.put('products', product);
    }
  }

  async deleteProduct(id) {
    return this.delete('products', String(id));
  }

  // ==================== CUSTOMER METHODS ====================

  async saveCustomer(customer) {
    return this.put('customers', customer);
  }

  async getCustomers() {
    return this.getAll('customers');
  }

  async getCustomer(id) {
    return this.get('customers', String(id));
  }

  async getCustomerByEmail(email) {
    if (!email) return null;
    try {
      const customers = await this.query('customers', 'email', email);
      return customers[0] || null;
    } catch (error) {
      console.warn('Error querying by email:', error);
      return null;
    }
  }

  async getCustomerByPhone(phone) {
    if (!phone) return null;
    try {
      const customers = await this.query('customers', 'phone', phone);
      return customers[0] || null;
    } catch (error) {
      console.warn('Error querying by phone:', error);
      return null;
    }
  }

  async getCustomerByCloudId(cloudId) {
    if (!cloudId) return null;
    try {
      const customers = await this.query('customers', 'cloudId', cloudId);
      return customers[0] || null;
    } catch (error) {
      console.warn('Error querying by cloudId:', error);
      return null;
    }
  }

  async getUnsyncedCustomers() {
    return this.query('customers', 'synced', false);
  }

  async markCustomerSynced(id, cloudId) {
    const customer = await this.get('customers', String(id));
    if (customer) {
      customer.synced = true;
      customer.cloudId = cloudId;
      customer.syncRequired = false;
      customer.lastSyncedAt = new Date().toISOString();
      await this.put('customers', customer);
    }
  }

  // ==================== TRANSACTION METHODS ====================

  async saveTransaction(transaction) {
    return this.put('transactions', transaction);
  }

  async getTransaction(id) {
    const transaction = await this.get('transactions', String(id));
    if (transaction) {
      transaction.paymentProgress = transaction.total ? ((transaction.paid || 0) / transaction.total) * 100 : 0;
      transaction.isOverdue = this._isOverdue(transaction);
    }
    return transaction;
  }

  async getTransactions() {
    const transactions = await this.getAll('transactions');
    return transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getTransactionsByDateRange(startDate, endDate) {
    try {
      return await this.queryRange('transactions', 'createdAt', startDate, endDate);
    } catch (error) {
      console.warn('Error using date range index, falling back to filter:', error);
      const all = await this.getAll('transactions');
      return all.filter(t => {
        const date = new Date(t.createdAt || t.timestamp);
        return date >= new Date(startDate) && date <= new Date(endDate);
      });
    }
  }

  async getTransactionsByCustomer(customerId) {
    try {
      const customerIdStr = String(customerId);
      const byLocalId = await this.query('transactions', 'customerId', customerIdStr);
      const byCloudId = await this.query('transactions', 'customerCloudId', customerIdStr);
      
      const all = [...byLocalId, ...byCloudId];
      const unique = Array.from(new Map(all.map(t => [t.id, t])).values());
      
      return unique.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.warn('Error using customer index, falling back to filter:', error);
      const all = await this.getAll('transactions');
      const customerIdStr = String(customerId);
      return all.filter(t => 
        String(t.customer?.id) === customerIdStr || String(t.customer?._id) === customerIdStr
      ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }

  async getTransactionsByPaymentMethod(paymentMethod) {
    return this.query('transactions', 'paymentMethod', paymentMethod);
  }

  async getCreditTransactions() {
    return this.query('transactions', 'isCredit', true);
  }

  async getInstallmentTransactions() {
    return this.query('transactions', 'isInstallment', true);
  }

  async getPendingPayments() {
    const all = await this.getAll('transactions');
    return all.filter(t => 
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
    const all = await this.getAll('transactions');
    return all.filter(t => this._isOverdue(t));
  }

  async getUnsyncedTransactions() {
    return this.query('transactions', 'synced', false);
  }

  async markTransactionSynced(id, cloudId) {
    const transaction = await this.get('transactions', String(id));
    if (transaction) {
      transaction.synced = true;
      transaction.cloudId = cloudId;
      transaction.syncRequired = false;
      transaction.lastSyncedAt = new Date().toISOString();
      await this.put('transactions', transaction);
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

  // ==================== SYNC QUEUE METHODS (FIXED) ====================

  async addToSyncQueue(item) {
    const db = await this.ensureInitialized();
    
    // Check if already in queue using indexes
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
    }
    
    if (existing) {
      console.log(`⚠️ Item already in sync queue, updating retry count`);
      existing.retryCount = (existing.retryCount || 0) + 1;
      existing.lastAttempt = new Date().toISOString();
      existing.error = item.error || existing.error;
      existing.status = 'pending';
      await db.put('syncQueue', existing);
      return existing.id;
    }
    
    // CRITICAL FIX: Do NOT include an 'id' field - let auto-increment handle it
    const queueItem = {
      type: item.type,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
      lastAttempt: null,
      error: null
    };
    
    // Add the appropriate reference ID
    if (item.transactionId) queueItem.transactionId = String(item.transactionId);
    if (item.customerId) queueItem.customerId = String(item.customerId);
    if (item.productId) queueItem.productId = String(item.productId);
    
    // Use add() not put() for auto-increment stores
    const id = await db.add('syncQueue', queueItem);
    console.log(`📋 Added to sync queue: ${item.type} with id ${id}`);
    return id;
  }

  async getSyncQueue() {
    return this.getAll('syncQueue');
  }

  async getSyncQueueItem(type, referenceId) {
    const all = await this.getSyncQueue();
    const refIdStr = String(referenceId);
    return all.find(item => 
      item.type === type && 
      (String(item.transactionId) === refIdStr || 
       String(item.customerId) === refIdStr || 
       String(item.productId) === refIdStr)
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
    await store.clear();
    console.log('✅ Sync queue cleared');
  }

  // ==================== SETTINGS METHODS ====================

  async getSetting(key) {
    const db = await this.ensureInitialized();
    const setting = await db.get('settings', key);
    return setting ? setting.value : null;
  }

  async setSetting(key, value) {
    const db = await this.ensureInitialized();
    await db.put('settings', { key, value, updatedAt: new Date().toISOString() });
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
    const allTransactions = await this.getAll('transactions');
    const allCustomers = await this.getAll('customers');
    const allProducts = await this.getAll('products');
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
      queueLength: queue.length,
      isOnline: navigator.onLine
    };
  }

  // ==================== MAINTENANCE METHODS ====================

  async fixEmailIndex() {
    console.log('🔄 Running email index fix...');
    
    try {
      await this.ensureInitialized();
      
      const customers = await this.getAll('customers');
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
          await this.put('customers', customer);
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
      
      const [transactions, customers, products] = await Promise.all([
        this.getAll('transactions'),
        this.getAll('customers'),
        this.getAll('products')
      ]);
      
      const uniqueTransactions = Array.from(
        new Map(transactions.map(t => [t.receiptNumber, t])).values()
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