// src/features/pos/services/transactionService.js
import { db } from './database';
import { api } from './api';

class TransactionService {
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

  // ==================== LOCAL STORAGE ====================

  async saveTransactionLocally(transactionData) {
    try {
      await db.ensureInitialized();
      
      // Format customer data properly
      const customerData = transactionData.customer ? {
        id: transactionData.customer.id || transactionData.customer._id,
        name: transactionData.customer.name,
        email: transactionData.customer.email || '',
        phone: transactionData.customer.phone || '',
        loyaltyPoints: transactionData.customer.loyaltyPoints || 0
      } : null;

      const transaction = {
        ...transactionData,
        customer: customerData,
        id: `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        synced: false,
        syncRequired: true,
        createdAt: new Date().toISOString(),
        // Ensure payment status fields are included
        status: transactionData.status || 'completed',
        remaining: transactionData.remaining || 0,
        dueDate: transactionData.dueDate || null,
        creditSchedule: transactionData.creditSchedule || null,
        paymentMethod: transactionData.paymentMethod || transactionData.method || 'Cash'
      };

      await db.saveTransaction(transaction);
      console.log('✅ Transaction saved locally:', transaction.id);

      // Add to sync queue
      await this.addToSyncQueue(transaction.id);

      return { success: true, transactionId: transaction.id, transaction };
    } catch (error) {
      console.error('❌ Failed to save transaction locally:', error);
      return { success: false, error: error.message };
    }
  }

  async getTransactionLocally(transactionId) {
    try {
      await db.ensureInitialized();
      return await db.get('transactions', transactionId);
    } catch (error) {
      console.error('❌ Failed to get transaction:', error);
      return null;
    }
  }

  async getAllTransactionsLocally() {
    try {
      await db.ensureInitialized();
      return await db.getAll('transactions');
    } catch (error) {
      console.error('❌ Failed to get transactions:', error);
      return [];
    }
  }

  async getTransactionsByDateRange(startDate, endDate) {
    try {
      await db.ensureInitialized();
      const all = await db.getAll('transactions');
      return all.filter(t => {
        const date = new Date(t.createdAt);
        return date >= new Date(startDate) && date <= new Date(endDate);
      });
    } catch (error) {
      console.error('❌ Failed to get transactions by date:', error);
      return [];
    }
  }

  async getTransactionsByCustomer(customerId) {
    try {
      await db.ensureInitialized();
      const all = await db.getAll('transactions');
      return all.filter(t => t.customer?.id === customerId || t.customer?._id === customerId);
    } catch (error) {
      console.error('❌ Failed to get customer transactions:', error);
      return [];
    }
  }

  async getPendingPayments() {
    try {
      await db.ensureInitialized();
      const all = await db.getAll('transactions');
      return all.filter(t => t.status === 'installment' || t.status === 'credit');
    } catch (error) {
      console.error('❌ Failed to get pending payments:', error);
      return [];
    }
  }

  async getOverduePayments() {
    try {
      await db.ensureInitialized();
      const all = await db.getAll('transactions');
      const today = new Date();
      return all.filter(t => {
        if (t.status === 'completed') return false;
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < today;
      });
    } catch (error) {
      console.error('❌ Failed to get overdue payments:', error);
      return [];
    }
  }

  // ==================== SYNC QUEUE ====================

  async addToSyncQueue(transactionId) {
    try {
      await db.ensureInitialized();
      await db.addToSyncQueue({
        type: 'transaction',
        transactionId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to add to sync queue:', error);
    }
  }

  // ==================== CLOUD SYNC ====================

  async syncTransactionToCloud(transactionId) {
    try {
      await db.ensureInitialized();
      
      const transaction = await db.get('transactions', transactionId);
      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      console.log('☁️ Syncing transaction to cloud:', transaction.id);

      // IMPORTANT: Completely remove the customer.id field to avoid MongoDB ObjectId casting errors
      // Only include customer name and email, no ID
      const customerData = transaction.customer ? {
        name: transaction.customer.name,
        email: transaction.customer.email || '',
        // loyaltyPoints is optional as it might not be in the schema
      } : null;

      // Format items - don't include productId at all
      const items = transaction.items.map(item => ({
        name: item.name,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity
        // productId intentionally omitted to avoid casting errors
      }));

      // Prepare transaction data for cloud - only include fields that exist in the schema
      const transactionData = {
        receiptNumber: transaction.receiptNumber,
        // Only include customer if it has data
        ...(customerData && { customer: customerData }),
        items: items,
        subtotal: transaction.subtotal,
        discount: transaction.discount || 0,
        total: transaction.total,
        paymentMethod: transaction.paymentMethod || transaction.method || 'Cash',
        change: transaction.change || 0,
        status: transaction.status || 'completed',
        // Add tax field if it exists in your schema
        ...(transaction.tax && { tax: transaction.tax }),
        // Add notes if they exist
        ...(transaction.notes && { notes: transaction.notes }),
        // Add timestamp
        createdAt: transaction.createdAt || new Date().toISOString()
      };

      console.log('📤 Sending transaction data to cloud:', {
        receiptNumber: transactionData.receiptNumber,
        hasCustomer: !!transactionData.customer,
        itemsCount: transactionData.items.length,
        data: transactionData
      });

      // Send to cloud
      const result = await api.syncTransaction(transactionData);

      if (result.success) {
        // Mark as synced locally
        transaction.synced = true;
        transaction.syncRequired = false;
        transaction.cloudId = result.id;
        transaction.cloudSyncedAt = new Date().toISOString();
        await db.put('transactions', transaction);

        console.log('✅ Transaction synced to cloud:', transaction.id, 'Cloud ID:', result.id);
        
        // Remove from sync queue
        const queue = await db.getSyncQueue();
        const queueItem = queue.find(q => q.transactionId === transactionId && q.type === 'transaction');
        if (queueItem) {
          await db.delete('syncQueue', queueItem.id);
        }

        return { success: true, transaction };
      } else {
        throw new Error(result.error || 'Failed to sync to cloud');
      }
    } catch (error) {
      console.error('❌ Failed to sync transaction to cloud:', error);
      return { success: false, error: error.message };
    }
  }

  async syncAllPending() {
    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.syncInProgress = true;
    this.notifyListeners({ type: 'sync-start', message: 'Syncing transactions...' });

    try {
      await db.ensureInitialized();
      
      const queue = await db.getSyncQueue();
      const transactionIds = queue
        .filter(item => item.type === 'transaction')
        .map(item => item.transactionId);

      if (transactionIds.length === 0) {
        this.syncInProgress = false;
        this.notifyListeners({ type: 'sync-complete', message: 'No transactions to sync' });
        return { success: true, results: [] };
      }

      console.log(`🔄 Syncing ${transactionIds.length} transactions...`);
      const results = [];
      
      for (const id of transactionIds) {
        const result = await this.syncTransactionToCloud(id);
        results.push({ id, ...result });
        
        // Small delay between syncs to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      this.syncInProgress = false;
      const successCount = results.filter(r => r.success).length;
      this.notifyListeners({ 
        type: 'sync-complete', 
        message: `Synced ${successCount} of ${results.length} transactions` 
      });

      return { success: true, results };
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.syncInProgress = false;
      this.notifyListeners({ type: 'sync-error', message: error.message });
      return { success: false, error: error.message };
    }
  }

  // ==================== REPORTS ====================

  async getDailySales(date = new Date()) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const transactions = await this.getTransactionsByDateRange(
        startOfDay.toISOString(),
        endOfDay.toISOString()
      );

      const completed = transactions.filter(t => t.status === 'completed');
      const pending = transactions.filter(t => t.status === 'credit' || t.status === 'installment');
      
      const total = completed.reduce((sum, t) => sum + t.total, 0);
      const pendingTotal = pending.reduce((sum, t) => sum + (t.remaining || 0), 0);

      return {
        date: date.toISOString().split('T')[0],
        total,
        pendingTotal,
        count: transactions.length,
        completedCount: completed.length,
        pendingCount: pending.length,
        average: completed.length > 0 ? total / completed.length : 0,
        transactions
      };
    } catch (error) {
      console.error('❌ Failed to get daily sales:', error);
      return null;
    }
  }

  async getMonthlySales(year, month) {
    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const transactions = await this.getTransactionsByDateRange(
        startDate.toISOString(),
        endDate.toISOString()
      );

      const completed = transactions.filter(t => t.status === 'completed');
      const total = completed.reduce((sum, t) => sum + t.total, 0);

      // Group by day
      const dailyBreakdown = {};
      transactions.forEach(t => {
        const day = new Date(t.createdAt).getDate();
        if (!dailyBreakdown[day]) {
          dailyBreakdown[day] = {
            date: day,
            total: 0,
            count: 0,
            pending: 0
          };
        }
        if (t.status === 'completed') {
          dailyBreakdown[day].total += t.total;
          dailyBreakdown[day].count++;
        } else {
          dailyBreakdown[day].pending += t.remaining || 0;
        }
      });

      return {
        year,
        month,
        total,
        count: completed.length,
        dailyBreakdown: Object.values(dailyBreakdown).sort((a, b) => a.date - b.date)
      };
    } catch (error) {
      console.error('❌ Failed to get monthly sales:', error);
      return null;
    }
  }

  async getTopProducts(limit = 10) {
    try {
      const transactions = await this.getAllTransactionsLocally();
      const completed = transactions.filter(t => t.status === 'completed');
      const productSales = {};

      completed.forEach(t => {
        t.items.forEach(item => {
          if (!productSales[item.id]) {
            productSales[item.id] = {
              id: item.id,
              name: item.name,
              sku: item.sku,
              quantity: 0,
              revenue: 0,
              transactions: 0
            };
          }
          productSales[item.id].quantity += item.quantity;
          productSales[item.id].revenue += item.price * item.quantity;
          productSales[item.id].transactions += 1;
        });
      });

      return Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
    } catch (error) {
      console.error('❌ Failed to get top products:', error);
      return [];
    }
  }

  async getPaymentMethodsBreakdown(startDate, endDate) {
    try {
      const transactions = await this.getTransactionsByDateRange(startDate, endDate);
      const completed = transactions.filter(t => t.status === 'completed');
      
      const breakdown = {};
      completed.forEach(t => {
        const method = t.paymentMethod || 'Cash';
        if (!breakdown[method]) {
          breakdown[method] = {
            method,
            count: 0,
            total: 0
          };
        }
        breakdown[method].count++;
        breakdown[method].total += t.total;
      });

      return Object.values(breakdown);
    } catch (error) {
      console.error('❌ Failed to get payment methods breakdown:', error);
      return [];
    }
  }

  // ==================== CREDIT/INSTALLMENT MANAGEMENT ====================

  async recordPayment(transactionId, paymentAmount) {
    try {
      await db.ensureInitialized();
      
      const transaction = await db.get('transactions', transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status === 'completed') {
        throw new Error('Transaction already completed');
      }

      const newRemaining = (transaction.remaining || 0) - paymentAmount;
      
      // Update transaction
      transaction.remaining = Math.max(0, newRemaining);
      transaction.paymentHistory = transaction.paymentHistory || [];
      transaction.paymentHistory.push({
        amount: paymentAmount,
        date: new Date().toISOString(),
        remaining: transaction.remaining
      });

      if (transaction.remaining <= 0) {
        transaction.status = 'completed';
        transaction.completedAt = new Date().toISOString();
      }

      transaction.updatedAt = new Date().toISOString();
      transaction.syncRequired = true;

      await db.put('transactions', transaction);
      
      // Add to sync queue
      await this.addToSyncQueue(transaction.id);

      return { success: true, transaction };
    } catch (error) {
      console.error('❌ Failed to record payment:', error);
      return { success: false, error: error.message };
    }
  }

  async extendDueDate(transactionId, newDueDate) {
    try {
      await db.ensureInitialized();
      
      const transaction = await db.get('transactions', transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      transaction.dueDate = newDueDate;
      transaction.extendedAt = new Date().toISOString();
      transaction.syncRequired = true;

      await db.put('transactions', transaction);
      await this.addToSyncQueue(transaction.id);

      return { success: true, transaction };
    } catch (error) {
      console.error('❌ Failed to extend due date:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== UTILITY ====================

  async getSyncStatus() {
    try {
      await db.ensureInitialized();
      
      const all = await db.getAll('transactions');
      const synced = all.filter(t => t.synced);
      const pending = all.filter(t => !t.synced);
      const queue = await db.getSyncQueue();

      return {
        total: all.length,
        synced: synced.length,
        pending: pending.length,
        queueLength: queue.length,
        isOnline: navigator.onLine,
        pendingPayments: all.filter(t => t.status === 'credit' || t.status === 'installment').length,
        overduePayments: (await this.getOverduePayments()).length
      };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return {
        total: 0,
        synced: 0,
        pending: 0,
        queueLength: 0,
        isOnline: navigator.onLine,
        pendingPayments: 0,
        overduePayments: 0
      };
    }
  }

  async deleteTransaction(transactionId) {
    try {
      await db.ensureInitialized();
      await db.delete('transactions', transactionId);
      
      // Remove from sync queue if present
      const queue = await db.getSyncQueue();
      const queueItem = queue.find(q => q.transactionId === transactionId);
      if (queueItem) {
        await db.delete('syncQueue', queueItem.id);
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to delete transaction:', error);
      return { success: false, error: error.message };
    }
  }
}

export const transactionService = new TransactionService();