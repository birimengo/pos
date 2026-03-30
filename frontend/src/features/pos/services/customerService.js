// src/features/pos/services/customerService.js

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
      
      const customerId = customerData.id ? String(customerData.id) : `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const allCustomers = await db.getAll('customers');
      
      // Check for existing customer by email (case insensitive)
      if (customerData.email) {
        const existingByEmail = allCustomers.find(c => 
          c.email && c.email.toLowerCase() === customerData.email.toLowerCase() && 
          String(c.id) !== customerId
        );
        if (existingByEmail) {
          console.log('⚠️ Customer with this email already exists:', existingByEmail.name);
          return { 
            success: true, 
            customerId: existingByEmail.id, 
            customer: existingByEmail, 
            isExisting: true,
            message: 'Customer with this email already exists'
          };
        }
      }
      
      // Check for existing customer by phone
      if (customerData.phone) {
        const existingByPhone = allCustomers.find(c => 
          c.phone && c.phone === customerData.phone && 
          String(c.id) !== customerId
        );
        if (existingByPhone) {
          console.log('⚠️ Customer with this phone already exists:', existingByPhone.name);
          return { 
            success: true, 
            customerId: existingByPhone.id, 
            customer: existingByPhone, 
            isExisting: true,
            message: 'Customer with this phone already exists'
          };
        }
      }
      
      // Check if customer already exists by ID (update case)
      let existingCustomer = null;
      if (customerData.id) {
        existingCustomer = allCustomers.find(c => String(c.id) === customerId);
      }
      
      const now = new Date().toISOString();
      const customer = {
        id: customerId,
        _id: customerData._id || existingCustomer?._id || null,
        name: customerData.name,
        email: customerData.email || '',
        phone: customerData.phone || '',
        address: customerData.address || '',
        loyaltyPoints: customerData.loyaltyPoints ?? existingCustomer?.loyaltyPoints ?? 0,
        totalSpent: customerData.totalSpent ?? existingCustomer?.totalSpent ?? 0,
        totalPaid: customerData.totalPaid ?? existingCustomer?.totalPaid ?? 0,
        totalOutstanding: customerData.totalOutstanding ?? existingCustomer?.totalOutstanding ?? 0,
        joinDate: customerData.joinDate || existingCustomer?.joinDate || now.split('T')[0],
        lastVisit: customerData.lastVisit || now.split('T')[0],
        birthDate: customerData.birthDate || existingCustomer?.birthDate || null,
        notes: customerData.notes || existingCustomer?.notes || '',
        tags: customerData.tags || existingCustomer?.tags || [],
        transactionCount: customerData.transactionCount ?? existingCustomer?.transactionCount ?? 0,
        creditCount: customerData.creditCount ?? existingCustomer?.creditCount ?? 0,
        installmentCount: customerData.installmentCount ?? existingCustomer?.installmentCount ?? 0,
        synced: existingCustomer?.synced ?? false,
        syncRequired: true,
        cloudId: customerData.cloudId || existingCustomer?.cloudId || customerData._id || null,
        createdAt: existingCustomer?.createdAt || customerData.createdAt || now,
        updatedAt: now
      };

      // Remove empty email to avoid index issues
      if (!customer.email) {
        delete customer.email;
      }

      await db.put('customers', customer);
      console.log('✅ Customer saved locally:', {
        id: customer.id,
        name: customer.name,
        email: customer.email || 'no-email',
        isUpdate: !!existingCustomer
      });

      // Add to sync queue if it's a new customer or has changes
      if (!existingCustomer || !customer.synced) {
        await this.addToSyncQueue(customer.id);
      }

      // Notify listeners about customer update
      this.notifyListeners({
        type: 'customer-saved',
        customer: customer,
        isExisting: !!existingCustomer
      });

      return { success: true, customerId: customer.id, customer, isExisting: !!existingCustomer };
    } catch (error) {
      console.error('❌ Failed to save customer locally:', error);
      return { success: false, error: error.message };
    }
  }

  async getCustomerLocally(customerId) {
    try {
      await db.ensureInitialized();
      return await db.get('customers', String(customerId));
    } catch (error) {
      console.error('❌ Failed to get customer:', error);
      return null;
    }
  }

  async getAllCustomersLocally() {
    try {
      await db.ensureInitialized();
      const customers = await db.getAll('customers');
      return customers.map(c => ({ ...c, id: String(c.id) }));
    } catch (error) {
      console.error('❌ Failed to get customers:', error);
      return [];
    }
  }

  async getCustomerByEmail(email) {
    if (!email) return null;
    try {
      const customers = await this.getAllCustomersLocally();
      return customers.find(c => c.email && c.email.toLowerCase() === email.toLowerCase()) || null;
    } catch (error) {
      console.error('❌ Failed to get customer by email:', error);
      return null;
    }
  }

  async getCustomerByPhone(phone) {
    if (!phone) return null;
    try {
      const customers = await this.getAllCustomersLocally();
      return customers.find(c => c.phone && c.phone === phone) || null;
    } catch (error) {
      console.error('❌ Failed to get customer by phone:', error);
      return null;
    }
  }

  // ==================== RECALCULATE CUSTOMER STATS ====================

  async recalculateCustomerStats(customerId) {
    try {
      await db.ensureInitialized();
      const customerIdStr = String(customerId);
      
      const customer = await db.get('customers', customerIdStr);
      if (!customer) {
        throw new Error(`Customer ${customerIdStr} not found`);
      }

      const transactions = await transactionService.getTransactionsByCustomer(customerIdStr);
      
      let totalSpent = 0;
      let totalPaid = 0;
      let totalOutstanding = 0;
      let transactionCount = transactions.length;
      let creditCount = 0;
      let installmentCount = 0;
      let lastVisit = customer.lastVisit;

      for (const trans of transactions) {
        totalSpent += trans.total || 0;
        totalPaid += (trans.paid || 0);
        totalOutstanding += (trans.remaining || 0);
        
        if (trans.isCredit) creditCount++;
        if (trans.isInstallment) installmentCount++;
        
        if (trans.createdAt && (!lastVisit || new Date(trans.createdAt) > new Date(lastVisit))) {
          lastVisit = trans.createdAt;
        }
      }

      const needsUpdate = 
        customer.totalSpent !== totalSpent ||
        customer.totalPaid !== totalPaid ||
        customer.totalOutstanding !== totalOutstanding ||
        customer.transactionCount !== transactionCount ||
        customer.creditCount !== creditCount ||
        customer.installmentCount !== installmentCount;

      if (needsUpdate) {
        customer.totalSpent = totalSpent;
        customer.totalPaid = totalPaid;
        customer.totalOutstanding = totalOutstanding;
        customer.transactionCount = transactionCount;
        customer.creditCount = creditCount;
        customer.installmentCount = installmentCount;
        customer.lastVisit = lastVisit || customer.lastVisit;
        customer.updatedAt = new Date().toISOString();
        
        await db.put('customers', customer);
        console.log(`📊 Recalculated stats for ${customer.name}:`, {
          totalSpent,
          transactionCount,
          creditCount,
          installmentCount
        });
        
        // Notify listeners about stats update
        this.notifyListeners({
          type: 'customer-stats-updated',
          customerId: customer.id,
          stats: { totalSpent, transactionCount, creditCount, installmentCount, lastVisit }
        });
      }

      return { success: true, customer, stats: { totalSpent, transactionCount, creditCount, installmentCount, lastVisit } };
    } catch (error) {
      console.error('❌ Failed to recalculate customer stats:', error);
      return { success: false, error: error.message };
    }
  }

  async recalculateAllCustomersStats() {
    try {
      await db.ensureInitialized();
      console.log('🔄 Recalculating all customer statistics...');
      
      const allCustomers = await db.getAll('customers');
      let updatedCount = 0;

      for (const customer of allCustomers) {
        const result = await this.recalculateCustomerStats(customer.id);
        if (result.success && result.stats) {
          updatedCount++;
        }
      }

      console.log(`✅ Recalculated stats for ${updatedCount} customers`);
      
      // Notify listeners about bulk update completion
      this.notifyListeners({
        type: 'all-customers-stats-updated',
        updatedCount
      });

      return { success: true, updatedCount };
    } catch (error) {
      console.error('❌ Failed to recalculate all customer stats:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== CUSTOMER WITH TRANSACTIONS ====================

  async getCustomerWithTransactions(customerId) {
    try {
      const customer = await this.getCustomerLocally(String(customerId));
      if (!customer) return null;

      const transactions = await transactionService.getTransactionsByCustomer(String(customerId));
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

      stats.totalSpent += amount;
      stats.totalPaid += paid;
      stats.totalOutstanding += remaining;

      if (t.isCredit) stats.creditCount++;
      if (t.isInstallment) stats.installmentCount++;
      if (t.fullyPaid) stats.completedCount++;
      if (transactionService.isOverdue(t)) stats.overdueCount++;

      if (!stats.firstTransaction || new Date(t.createdAt) < new Date(stats.firstTransaction)) {
        stats.firstTransaction = t.createdAt;
      }
      if (!stats.lastTransaction || new Date(t.createdAt) > new Date(stats.lastTransaction)) {
        stats.lastTransaction = t.createdAt;
      }

      const month = new Date(t.createdAt).toLocaleString('en-US', { month: 'short', year: 'numeric' });
      stats.monthlySpending[month] = (stats.monthlySpending[month] || 0) + amount;

      t.items?.forEach(item => {
        const key = item.productId || item.id;
        if (!productCount[key]) {
          productCount[key] = {
            id: key,
            name: item.name,
            sku: item.sku,
            count: 0,
            total: 0
          };
        }
        productCount[key].count += item.quantity;
        productCount[key].total += item.price * item.quantity;
      });
    });

    stats.averageTicket = stats.totalTransactions > 0 ? stats.totalSpent / stats.totalTransactions : 0;
    stats.topProducts = Object.values(productCount).sort((a, b) => b.count - a.count).slice(0, 5);
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
      
      const customer = await db.get('customers', String(customerId));
      if (!customer) {
        throw new Error(`Customer ${customerId} not found`);
      }

      console.log('☁️ Syncing customer to cloud:', {
        id: customer.id,
        name: customer.name,
        email: customer.email || 'no-email'
      });

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

      let result;
      let existingCloudCustomer = null;

      if (customer.cloudId || customer._id) {
        try {
          const checkResult = await api.getCustomer(customer.cloudId || customer._id);
          if (checkResult.success && checkResult.customer) {
            existingCloudCustomer = checkResult.customer;
          }
        } catch (error) {
          console.log('⚠️ Customer not found by ID');
        }
      }

      if (!existingCloudCustomer && customer.email) {
        try {
          const emailResult = await api.getCustomersByEmail(customer.email);
          if (emailResult.success && emailResult.customers?.length > 0) {
            existingCloudCustomer = emailResult.customers[0];
          }
        } catch (error) {
          console.log('⚠️ No customer found with this email');
        }
      }

      if (existingCloudCustomer) {
        customerData.loyaltyPoints = (existingCloudCustomer.loyaltyPoints || 0) + (customer.loyaltyPoints || 0);
        customerData.totalSpent = (existingCloudCustomer.totalSpent || 0) + (customer.totalSpent || 0);
        
        if (customer.lastVisit) {
          const newDate = new Date(customer.lastVisit);
          const existingDate = existingCloudCustomer.lastVisit ? new Date(existingCloudCustomer.lastVisit) : null;
          if (!existingDate || newDate > existingDate) {
            customerData.lastVisit = customer.lastVisit;
          }
        }
        
        result = await api.updateCustomer(existingCloudCustomer._id, customerData);
      } else {
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
      
      try {
        const customer = await db.get('customers', String(customerId));
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
      const customerIdStr = String(customerId);
      
      const queue = await db.getAll('syncQueue');
      const exists = queue.some(item => 
        String(item.customerId) === customerIdStr && item.type === 'customer'
      );
      
      if (!exists) {
        await db.addToSyncQueue({
          type: 'customer',
          customerId: customerIdStr,
          timestamp: new Date().toISOString(),
          retryCount: 0
        });
        console.log(`📋 Customer ${customerIdStr} added to sync queue`);
      }
    } catch (error) {
      console.error('❌ Failed to add to sync queue:', error);
    }
  }

  // ==================== LOYALTY POINTS ====================

  async addLoyaltyPoints(customerId, points, amount, transactionDetails = {}) {
    try {
      await db.ensureInitialized();
      const customerIdStr = String(customerId);
      
      const customer = await db.get('customers', customerIdStr);
      if (!customer) {
        throw new Error(`Customer ${customerIdStr} not found`);
      }

      const oldPoints = customer.loyaltyPoints || 0;
      
      customer.loyaltyPoints = oldPoints + points;
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
        oldTotal: oldPoints,
        newTotal: customer.loyaltyPoints
      });

      // Notify listeners about loyalty points update
      this.notifyListeners({
        type: 'loyalty-points-added',
        customerId: customer.id,
        customerName: customer.name,
        pointsAdded: points,
        newTotal: customer.loyaltyPoints
      });

      return { success: true, customer };
    } catch (error) {
      console.error('❌ Failed to add loyalty points:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== UTILITY METHODS ====================

  async getCustomerBalance(customerId) {
    try {
      const customer = await this.getCustomerLocally(String(customerId));
      if (!customer) return null;

      const transactions = await transactionService.getTransactionsByCustomer(String(customerId));
      
      const totalOutstanding = transactions
        .filter(t => !t.fullyPaid && (t.isCredit || t.isInstallment))
        .reduce((sum, t) => sum + (t.remaining || 0), 0);
      
      const totalPaid = transactions.reduce((sum, t) => sum + (t.paid || 0), 0);
      const totalSpent = transactions.reduce((sum, t) => sum + (t.total || 0), 0);
      const totalTransactions = transactions.length;
      const creditCount = transactions.filter(t => t.isCredit).length;
      const installmentCount = transactions.filter(t => t.isInstallment).length;

      return {
        customerId,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        totalSpent: transactionService.formatCurrency(totalSpent),
        totalPaid: transactionService.formatCurrency(totalPaid),
        totalOutstanding: transactionService.formatCurrency(totalOutstanding),
        totalTransactions,
        creditCount,
        installmentCount,
        overdueCount: transactions.filter(t => transactionService.isOverdue(t)).length,
        lastTransaction: transactions.length > 0 ? transactions[0] : null,
        loyaltyPoints: customer.loyaltyPoints || 0
      };
    } catch (error) {
      console.error('❌ Failed to get customer balance:', error);
      return null;
    }
  }

  // ==================== BULK OPERATIONS ====================

  async deleteAllCustomers() {
    try {
      await db.ensureInitialized();
      const customers = await db.getAll('customers');
      
      for (const customer of customers) {
        await db.delete('customers', customer.id);
      }
      
      console.log(`🗑️ Deleted ${customers.length} customers`);
      return { success: true, count: customers.length };
    } catch (error) {
      console.error('❌ Failed to delete customers:', error);
      return { success: false, error: error.message };
    }
  }

  async getCustomerCount() {
    try {
      await db.ensureInitialized();
      const customers = await db.getAll('customers');
      return customers.length;
    } catch (error) {
      console.error('❌ Failed to get customer count:', error);
      return 0;
    }
  }

  async searchCustomers(query) {
    try {
      await db.ensureInitialized();
      const allCustomers = await db.getAll('customers');
      
      const searchLower = query.toLowerCase();
      return allCustomers.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        (c.email && c.email.toLowerCase().includes(searchLower)) ||
        (c.phone && c.phone.includes(query))
      );
    } catch (error) {
      console.error('❌ Failed to search customers:', error);
      return [];
    }
  }
}

export const customerService = new CustomerService();