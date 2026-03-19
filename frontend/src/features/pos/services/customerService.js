// src/features/pos/services/customerService.js (NEW FILE)
import { db } from './database';
import { api } from './api';
import { transactionService } from './transactionService';

class CustomerService {
  constructor() {
    this.listeners = [];
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  notifyListeners(data) {
    this.listeners.forEach(cb => cb(data));
  }

  // ==================== LOCAL STORAGE ====================

  async saveCustomerLocally(customerData) {
    try {
      await db.ensureInitialized();
      
      // Create clean customer object for local storage
      const customer = {
        id: customerData.id || `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        _id: customerData._id, // Cloud ID if exists
        name: customerData.name,
        email: customerData.email || '',
        phone: customerData.phone || '',
        address: customerData.address || '',
        loyaltyPoints: customerData.loyaltyPoints || 0,
        totalSpent: customerData.totalSpent || 0,
        joinDate: customerData.joinDate || new Date().toISOString(),
        lastVisit: customerData.lastVisit || new Date().toISOString(),
        birthDate: customerData.birthDate,
        notes: customerData.notes || '',
        tags: customerData.tags || [],
        
        // Statistics (will be updated from transactions)
        transactionCount: customerData.transactionCount || 0,
        creditCount: customerData.creditCount || 0,
        installmentCount: customerData.installmentCount || 0,
        
        // Sync tracking
        synced: false,
        syncRequired: true,
        cloudId: customerData._id,
        
        // Timestamps
        createdAt: customerData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Handle empty email (remove to avoid unique index issues)
      if (!customer.email) {
        delete customer.email;
      }

      await db.put('customers', customer);
      console.log('✅ Customer saved locally:', {
        id: customer.id,
        name: customer.name,
        email: customer.email || 'no-email'
      });

      // Add to sync queue
      await this.addToSyncQueue(customer.id);

      return { success: true, customerId: customer.id, customer };
    } catch (error) {
      console.error('❌ Failed to save customer locally:', error);
      return { success: false, error: error.message };
    }
  }

  async getCustomerLocally(customerId) {
    try {
      await db.ensureInitialized();
      return await db.get('customers', customerId);
    } catch (error) {
      console.error('❌ Failed to get customer:', error);
      return null;
    }
  }

  async getAllCustomersLocally() {
    try {
      await db.ensureInitialized();
      return await db.getAll('customers');
    } catch (error) {
      console.error('❌ Failed to get customers:', error);
      return [];
    }
  }

  // ==================== CUSTOMER WITH TRANSACTIONS ====================

  async getCustomerWithTransactions(customerId) {
    try {
      // Get customer data
      const customer = await this.getCustomerLocally(customerId);
      if (!customer) return null;

      // Get all transactions for this customer
      const transactions = await transactionService.getTransactionsByCustomer(customerId);

      // Calculate customer statistics
      const stats = this.calculateCustomerStats(customer, transactions);

      return {
        ...customer,
        transactions,
        stats,
        formattedJoinDate: transactionService.formatDate(customer.joinDate),
        formattedLastVisit: transactionService.formatDate(customer.lastVisit)
      };
    } catch (error) {
      console.error('❌ Failed to get customer with transactions:', error);
      return null;
    }
  }

  calculateCustomerStats(customer, transactions) {
    const stats = {
      totalTransactions: transactions.length,
      totalSpent: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      completedCount: 0,
      creditCount: 0,
      installmentCount: 0,
      overdueCount: 0,
      averageTicket: 0,
      firstTransaction: null,
      lastTransaction: null,
      monthlySpending: {},
      topProducts: []
    };

    const productCount = {};

    transactions.forEach(t => {
      const amount = t.total || 0;
      const paid = t.paid || 0;
      const remaining = t.remaining || 0;

      // Totals
      stats.totalSpent += amount;
      stats.totalPaid += paid;
      stats.totalOutstanding += remaining;

      // Counts by type
      if (t.isCredit) stats.creditCount++;
      if (t.isInstallment) stats.installmentCount++;
      if (t.fullyPaid) stats.completedCount++;
      if (transactionService.isOverdue(t)) stats.overdueCount++;

      // Track first and last transaction
      if (!stats.firstTransaction || new Date(t.createdAt) < new Date(stats.firstTransaction)) {
        stats.firstTransaction = t.createdAt;
      }
      if (!stats.lastTransaction || new Date(t.createdAt) > new Date(stats.lastTransaction)) {
        stats.lastTransaction = t.createdAt;
      }

      // Monthly spending
      const month = new Date(t.createdAt).toLocaleString('en-US', { month: 'short', year: 'numeric' });
      stats.monthlySpending[month] = (stats.monthlySpending[month] || 0) + amount;

      // Product frequency
      t.items?.forEach(item => {
        const key = item.productId || item.id;
        productCount[key] = productCount[key] || {
          id: key,
          name: item.name,
          sku: item.sku,
          count: 0,
          total: 0
        };
        productCount[key].count += item.quantity;
        productCount[key].total += item.price * item.quantity;
      });
    });

    // Averages
    stats.averageTicket = stats.totalTransactions > 0 
      ? stats.totalSpent / stats.totalTransactions 
      : 0;

    // Top products
    stats.topProducts = Object.values(productCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Format currency values
    stats.formattedTotalSpent = transactionService.formatCurrency(stats.totalSpent);
    stats.formattedTotalPaid = transactionService.formatCurrency(stats.totalPaid);
    stats.formattedTotalOutstanding = transactionService.formatCurrency(stats.totalOutstanding);
    stats.formattedAverageTicket = transactionService.formatCurrency(stats.averageTicket);

    return stats;
  }

  // ==================== CLOUD SYNC ====================

  async syncCustomerToCloud(customerId) {
    try {
      await db.ensureInitialized();
      
      // Get customer from local storage
      const customer = await db.get('customers', customerId);
      if (!customer) {
        throw new Error(`Customer ${customerId} not found`);
      }

      console.log('☁️ Syncing customer to cloud:', {
        id: customer.id,
        name: customer.name,
        email: customer.email || 'no-email'
      });

      // ===== CLEAN CUSTOMER DATA FOR CLOUD =====
      // Create a completely new object with ONLY MongoDB fields
      const customerData = {};
      
      if (customer.name) customerData.name = customer.name;
      if (customer.email) customerData.email = customer.email;
      if (customer.phone) customerData.phone = customer.phone;
      if (customer.address) customerData.address = customer.address;
      if (customer.loyaltyPoints !== undefined) customerData.loyaltyPoints = Number(customer.loyaltyPoints);
      if (customer.totalSpent !== undefined) customerData.totalSpent = Number(customer.totalSpent);
      if (customer.joinDate) customerData.joinDate = customer.joinDate;
      if (customer.lastVisit) customerData.lastVisit = customer.lastVisit;
      if (customer.birthDate) customerData.birthDate = customer.birthDate;
      if (customer.notes) customerData.notes = customer.notes;
      if (customer.tags) customerData.tags = customer.tags;

      console.log('📤 Sending to cloud:', customerData);

      // Check if customer exists in cloud
      let result;
      let existingCloudCustomer = null;

      // Try by cloud ID first
      if (customer.cloudId || customer._id) {
        try {
          const checkResult = await api.getCustomer(customer.cloudId || customer._id);
          if (checkResult.success && checkResult.customer) {
            existingCloudCustomer = checkResult.customer;
            console.log('✅ Found existing customer by ID:', existingCloudCustomer._id);
          }
        } catch (error) {
          console.log('⚠️ Customer not found by ID');
        }
      }

      // If not found by ID and we have email, try by email
      if (!existingCloudCustomer && customer.email) {
        try {
          const emailResult = await api.getCustomersByEmail(customer.email);
          if (emailResult.success && emailResult.customers?.length > 0) {
            existingCloudCustomer = emailResult.customers[0];
            console.log('✅ Found existing customer by email:', existingCloudCustomer._id);
          }
        } catch (error) {
          console.log('⚠️ No customer found with this email');
        }
      }

      if (existingCloudCustomer) {
        // UPDATE existing customer - merge data
        console.log('🔄 Updating existing customer');
        
        // Merge loyalty points
        customerData.loyaltyPoints = (existingCloudCustomer.loyaltyPoints || 0) + (customer.loyaltyPoints || 0);
        
        // Merge total spent
        customerData.totalSpent = (existingCloudCustomer.totalSpent || 0) + (customer.totalSpent || 0);
        
        // Use most recent last visit
        if (customer.lastVisit) {
          const newDate = new Date(customer.lastVisit);
          const existingDate = existingCloudCustomer.lastVisit ? new Date(existingCloudCustomer.lastVisit) : null;
          if (!existingDate || newDate > existingDate) {
            customerData.lastVisit = customer.lastVisit;
          }
        }
        
        result = await api.updateCustomer(existingCloudCustomer._id, customerData);
      } else {
        // CREATE new customer
        console.log('➕ Creating new customer');
        result = await api.createCustomer(customerData);
      }

      if (result.success) {
        // Get cloud ID from response
        const cloudId = result.customer?._id || result.customer?.id || result.id || result._id;

        // Update local customer with cloud data
        const updatedCustomer = {
          ...customer, // Keep all local fields including 'id'
          _id: cloudId, // Store MongoDB _id
          cloudId: cloudId,
          synced: true,
          syncRequired: false,
          lastSyncedAt: new Date().toISOString()
        };

        // Ensure local ID is preserved
        if (!updatedCustomer.id) {
          updatedCustomer.id = customer.id;
        }

        await db.put('customers', updatedCustomer);
        
        console.log('✅ Customer synced to cloud:', {
          localId: customer.id,
          cloudId: cloudId,
          name: customer.name
        });

        return { success: true, customer: updatedCustomer };
      } else {
        throw new Error(result.error || 'Failed to sync to cloud');
      }
    } catch (error) {
      console.error('❌ Failed to sync customer to cloud:', error);
      
      // Update customer with sync error
      try {
        const customer = await db.get('customers', customerId);
        if (customer) {
          customer.syncError = error.message;
          customer.lastSyncAttempt = new Date().toISOString();
          await db.put('customers', customer);
        }
      } catch (updateError) {
        console.error('Failed to update sync error:', updateError);
      }
      
      return { success: false, error: error.message };
    }
  }

  async addToSyncQueue(customerId) {
    try {
      await db.ensureInitialized();
      
      const queue = await db.getAll('syncQueue');
      const exists = queue.some(item => 
        item.customerId === customerId && item.type === 'customer'
      );
      
      if (!exists) {
        await db.addToSyncQueue({
          type: 'customer',
          customerId,
          timestamp: new Date().toISOString(),
          retryCount: 0
        });
        console.log(`📋 Customer ${customerId} added to sync queue`);
      }
    } catch (error) {
      console.error('❌ Failed to add to sync queue:', error);
    }
  }

  // ==================== LOYALTY POINTS ====================

  async addLoyaltyPoints(customerId, points, amount, transactionDetails = {}) {
    try {
      await db.ensureInitialized();
      
      const customer = await db.get('customers', customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Update customer
      customer.loyaltyPoints = (customer.loyaltyPoints || 0) + points;
      customer.totalSpent = (customer.totalSpent || 0) + amount;
      customer.lastVisit = new Date().toISOString();
      customer.transactionCount = (customer.transactionCount || 0) + 1;
      
      if (transactionDetails.isCredit) {
        customer.creditCount = (customer.creditCount || 0) + 1;
      }
      if (transactionDetails.isInstallment) {
        customer.installmentCount = (customer.installmentCount || 0) + 1;
      }

      customer.updatedAt = new Date().toISOString();
      customer.syncRequired = true;
      customer.synced = false;

      await db.put('customers', customer);
      await this.addToSyncQueue(customer.id);

      console.log('✅ Loyalty points added:', {
        customer: customer.name,
        points,
        newTotal: customer.loyaltyPoints
      });

      return { success: true, customer };
    } catch (error) {
      console.error('❌ Failed to add loyalty points:', error);
      return { success: false, error: error.message };
    }
  }
}

export const customerService = new CustomerService();