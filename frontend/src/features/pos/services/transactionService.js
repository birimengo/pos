// src/features/pos/services/transactionService.js
import { db } from './database';
import { api } from './api';
import { cloudSync } from './cloudSyncService';

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

  // ==================== LOCAL STORAGE (IndexedDB) ====================

  async saveTransactionLocally(transactionData) {
    try {
      await db.ensureInitialized();
      
      // Format customer data properly for local storage - keep all fields including ID
      const customerData = transactionData.customer ? {
        id: transactionData.customer.id || transactionData.customer._id, // Local ID
        _id: transactionData.customer._id, // Cloud ID if exists
        name: transactionData.customer.name,
        email: transactionData.customer.email || '',
        phone: transactionData.customer.phone || '',
        loyaltyPoints: transactionData.customer.loyaltyPoints || 0
      } : null;

      // Format items for local storage - keep product references
      const items = transactionData.items.map(item => ({
        productId: item.productId || item.id, // Local product reference
        _id: item._id, // Cloud product ID if exists
        name: item.name,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity
      }));

      // Calculate initial payment info
      const total = transactionData.total;
      const initialPayment = transactionData.initialPayment || transactionData.paid || total;
      const remaining = transactionData.isCredit || transactionData.isInstallment 
        ? total - initialPayment 
        : 0;

      const transaction = {
        // Core fields
        id: `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Local ID
        _id: transactionData._id, // Cloud ID if exists
        receiptNumber: transactionData.receiptNumber,
        customer: customerData,
        items: items,
        
        // Financial fields
        subtotal: transactionData.subtotal,
        discount: transactionData.discount || 0,
        tax: transactionData.tax || 0,
        total: total,
        paymentMethod: transactionData.paymentMethod || transactionData.method || 'Cash',
        change: transactionData.change || 0,
        notes: transactionData.notes || '',
        status: 'completed',
        
        // Payment tracking fields
        remaining: remaining,
        paid: initialPayment,
        dueDate: transactionData.dueDate || null,
        creditSchedule: transactionData.creditSchedule || null,
        isInstallment: transactionData.isInstallment || false,
        isCredit: transactionData.isCredit || false,
        fullyPaid: remaining <= 0,
        creditSettled: remaining <= 0,
        
        // Payment history
        paymentHistory: [{
          id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          amount: initialPayment,
          method: transactionData.paymentMethod || 'Cash',
          date: new Date().toISOString(),
          remaining: remaining,
          notes: 'Initial payment'
        }],
        
        // Sync tracking
        synced: false,
        syncRequired: true,
        cloudId: transactionData._id, // Store cloud ID if exists
        syncError: null,
        lastSyncAttempt: null,
        
        // Timestamps
        createdAt: transactionData.timestamp || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastPaymentDate: transactionData.isCredit || transactionData.isInstallment ? new Date().toISOString() : null
      };

      await db.saveTransaction(transaction);
      console.log('✅ Transaction saved locally:', {
        id: transaction.id,
        receiptNumber: transaction.receiptNumber,
        customer: transaction.customer?.name,
        total: this.formatCurrency(total),
        paid: this.formatCurrency(initialPayment),
        remaining: this.formatCurrency(remaining),
        isCredit: transaction.isCredit,
        isInstallment: transaction.isInstallment
      });

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
      const transaction = await db.get('transactions', transactionId);
      
      if (transaction) {
        // Enhance with calculated fields
        transaction.paymentProgress = ((transaction.paid || 0) / transaction.total) * 100;
        transaction.isOverdue = this.isOverdue(transaction);
        transaction.formattedDate = this.formatDate(transaction.createdAt);
        transaction.formattedTotal = this.formatCurrency(transaction.total);
        transaction.formattedRemaining = this.formatCurrency(transaction.remaining);
        transaction.formattedPaid = this.formatCurrency(transaction.paid || 0);
        
        // Sort payment history by date (newest first)
        if (transaction.paymentHistory) {
          transaction.paymentHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
      }
      
      return transaction;
    } catch (error) {
      console.error('❌ Failed to get transaction:', error);
      return null;
    }
  }

  async getAllTransactionsLocally() {
    try {
      await db.ensureInitialized();
      const transactions = await db.getAll('transactions');
      
      // Enhance each transaction with calculated fields
      return transactions.map(t => ({
        ...t,
        paymentProgress: ((t.paid || 0) / t.total) * 100,
        isOverdue: this.isOverdue(t),
        formattedDate: this.formatDate(t.createdAt),
        formattedTotal: this.formatCurrency(t.total),
        formattedRemaining: this.formatCurrency(t.remaining)
      })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
      }).map(t => ({
        ...t,
        paymentProgress: ((t.paid || 0) / t.total) * 100,
        isOverdue: this.isOverdue(t),
        formattedDate: this.formatDate(t.createdAt),
        formattedTotal: this.formatCurrency(t.total),
        formattedRemaining: this.formatCurrency(t.remaining)
      }));
    } catch (error) {
      console.error('❌ Failed to get transactions by date:', error);
      return [];
    }
  }

  async getTransactionsByCustomer(customerId) {
    try {
      await db.ensureInitialized();
      const all = await db.getAll('transactions');
      
      // Find transactions where customer.id matches OR customer._id matches
      const transactions = all.filter(t => 
        t.customer?.id === customerId || t.customer?._id === customerId
      );
      
      // Sort by date (newest first) and enhance with calculated fields
      return transactions.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      ).map(t => ({
        ...t,
        paymentProgress: ((t.paid || 0) / t.total) * 100,
        isOverdue: this.isOverdue(t),
        formattedDate: this.formatDate(t.createdAt),
        formattedTotal: this.formatCurrency(t.total),
        formattedRemaining: this.formatCurrency(t.remaining),
        formattedPaid: this.formatCurrency(t.paid || 0)
      }));
    } catch (error) {
      console.error('❌ Failed to get customer transactions:', error);
      return [];
    }
  }

  async getPendingPayments() {
    try {
      await db.ensureInitialized();
      const all = await db.getAll('transactions');
      
      // Get all unpaid credit/installment transactions
      return all.filter(t => 
        (t.isInstallment || t.isCredit) && 
        !t.fullyPaid && 
        (t.remaining || 0) > 0
      ).map(t => ({
        ...t,
        daysOverdue: this.getDaysOverdue(t),
        isOverdue: this.isOverdue(t),
        formattedRemaining: this.formatCurrency(t.remaining),
        formattedTotal: this.formatCurrency(t.total),
        formattedPaid: this.formatCurrency(t.paid || 0)
      })).sort((a, b) => {
        // Sort by overdue first, then by due date
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return new Date(a.dueDate || a.createdAt) - new Date(b.dueDate || b.createdAt);
      });
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
        if (!t.dueDate) return false;
        if (t.fullyPaid) return false;
        if ((t.remaining || 0) <= 0) return false;
        return new Date(t.dueDate) < today;
      }).map(t => ({
        ...t,
        daysOverdue: this.getDaysOverdue(t),
        formattedRemaining: this.formatCurrency(t.remaining),
        formattedTotal: this.formatCurrency(t.total),
        formattedDueDate: this.formatDate(t.dueDate)
      })).sort((a, b) => b.daysOverdue - a.daysOverdue);
    } catch (error) {
      console.error('❌ Failed to get overdue payments:', error);
      return [];
    }
  }

  // ==================== SYNC QUEUE ====================

  async addToSyncQueue(transactionId) {
    try {
      await db.ensureInitialized();
      
      // Check if already in queue
      const queue = await db.getAll('syncQueue');
      const exists = queue.some(item => 
        item.transactionId === transactionId && item.type === 'transaction'
      );
      
      if (!exists) {
        await db.addToSyncQueue({
          type: 'transaction',
          transactionId,
          timestamp: new Date().toISOString(),
          retryCount: 0,
          lastAttempt: null
        });
        console.log(`📋 Transaction ${transactionId} added to sync queue`);
      }
    } catch (error) {
      console.error('❌ Failed to add to sync queue:', error);
    }
  }

  async removeFromSyncQueue(transactionId) {
    try {
      await db.ensureInitialized();
      const queue = await db.getAll('syncQueue');
      const queueItem = queue.find(q => q.transactionId === transactionId && q.type === 'transaction');
      
      if (queueItem) {
        await db.delete('syncQueue', queueItem.id);
        console.log(`📋 Transaction ${transactionId} removed from sync queue`);
      }
    } catch (error) {
      console.error('❌ Failed to remove from sync queue:', error);
    }
  }

  // ==================== CLOUD SYNC ====================

  async syncTransactionToCloud(transactionId) {
    try {
      await db.ensureInitialized();
      
      // Get transaction from local storage
      const transaction = await db.get('transactions', transactionId);
      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      console.log('☁️ Syncing transaction to cloud:', {
        id: transaction.id,
        receiptNumber: transaction.receiptNumber,
        hasCustomer: !!transaction.customer,
        customerName: transaction.customer?.name,
        total: transaction.total,
        remaining: transaction.remaining
      });

      // ===== CLEAN CUSTOMER DATA FOR CLOUD =====
      // Remove local IDs to avoid MongoDB casting errors
      const customerData = transaction.customer ? {
        name: transaction.customer.name,
        email: transaction.customer.email || '',
        phone: transaction.customer.phone || '',
        loyaltyPoints: transaction.customer.loyaltyPoints || 0
      } : null;

      // ===== CLEAN ITEMS FOR CLOUD =====
      // IMPORTANT: Do NOT include productId to avoid ObjectId casting errors
      const items = transaction.items.map(item => ({
        name: item.name,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity
      }));

      // ===== PREPARE TRANSACTION DATA FOR CLOUD =====
      const transactionData = {
        receiptNumber: transaction.receiptNumber,
        items: items,
        subtotal: transaction.subtotal,
        discount: transaction.discount || 0,
        total: transaction.total,
        paymentMethod: transaction.paymentMethod,
        change: transaction.change || 0,
        status: 'completed',
        createdAt: transaction.createdAt || new Date().toISOString()
      };

      // Add payment tracking fields if applicable
      if (transaction.isCredit || transaction.isInstallment) {
        transactionData.isCredit = transaction.isCredit;
        transactionData.isInstallment = transaction.isInstallment;
        transactionData.remaining = transaction.remaining;
        transactionData.paid = transaction.paid;
        transactionData.dueDate = transaction.dueDate;
        transactionData.fullyPaid = transaction.fullyPaid;
      }

      // Add customer if exists
      if (customerData && Object.keys(customerData).length > 0) {
        transactionData.customer = customerData;
      }

      // Add optional fields if they exist in the transaction
      if (transaction.tax) transactionData.tax = transaction.tax;
      if (transaction.notes) transactionData.notes = transaction.notes;

      console.log('📤 Sending to cloud:', {
        receiptNumber: transactionData.receiptNumber,
        customer: transactionData.customer?.name,
        total: transactionData.total,
        remaining: transactionData.remaining,
        isCredit: transactionData.isCredit
      });

      // Send to cloud
      let result;
      const cloudId = transaction.cloudId || transaction._id;
      
      if (cloudId) {
        // Try to update existing cloud transaction
        try {
          console.log('🔄 Attempting to update existing cloud transaction:', cloudId);
          result = await api.updateTransaction(cloudId, transactionData);
        } catch (updateError) {
          console.log('⚠️ Update failed, trying to create new:', updateError.message);
          result = await api.createTransaction(transactionData);
        }
      } else {
        // Create new cloud transaction
        console.log('➕ Creating new cloud transaction');
        result = await api.createTransaction(transactionData);
      }

      if (result.success) {
        // Get cloud ID from response
        const cloudId = result.transaction?._id || result.transaction?.id || result.id || result._id;

        // ===== UPDATE LOCAL TRANSACTION WITH CLOUD DATA =====
        const updatedTransaction = {
          ...transaction, // Keep all local fields
          _id: cloudId, // Store MongoDB _id
          cloudId: cloudId,
          synced: true,
          syncRequired: false,
          syncError: null,
          lastSyncedAt: new Date().toISOString()
        };

        // Ensure local ID is preserved
        if (!updatedTransaction.id) {
          updatedTransaction.id = transaction.id;
        }

        // Save updated transaction locally
        await db.put('transactions', updatedTransaction);
        
        // Remove from sync queue
        await this.removeFromSyncQueue(transaction.id);

        console.log('✅ Transaction synced to cloud:', {
          localId: transaction.id,
          cloudId: cloudId,
          receiptNumber: transaction.receiptNumber
        });

        return { success: true, transaction: updatedTransaction };
      } else {
        throw new Error(result.error || 'Failed to sync to cloud');
      }
    } catch (error) {
      console.error('❌ Failed to sync transaction to cloud:', error);
      
      // Update transaction with sync error
      try {
        const transaction = await db.get('transactions', transactionId);
        if (transaction) {
          transaction.syncError = error.message;
          transaction.lastSyncAttempt = new Date().toISOString();
          transaction.synced = false;
          transaction.syncRequired = true;
          await db.put('transactions', transaction);
        }
      } catch (updateError) {
        console.error('Failed to update sync error:', updateError);
      }
      
      return { success: false, error: error.message };
    }
  }

  async syncAllPending() {
    if (this.syncInProgress) {
      console.log('⏳ Sync already in progress, skipping...');
      return { success: false, error: 'Sync already in progress' };
    }

    this.syncInProgress = true;
    this.notifyListeners({ type: 'sync-start', message: 'Syncing transactions...' });

    try {
      await db.ensureInitialized();
      
      // Get all unsynced transactions
      const allTransactions = await db.getAll('transactions');
      const unsyncedTransactions = allTransactions.filter(t => !t.synced && t.syncRequired);
      
      // Also check sync queue
      const queue = await db.getAll('syncQueue');
      const queueTransactionIds = queue
        .filter(item => item.type === 'transaction')
        .map(item => item.transactionId);
      
      // Combine both sources, remove duplicates
      const transactionIds = [...new Set([
        ...unsyncedTransactions.map(t => t.id),
        ...queueTransactionIds
      ])];

      if (transactionIds.length === 0) {
        this.syncInProgress = false;
        this.notifyListeners({ type: 'sync-complete', message: 'No transactions to sync' });
        return { success: true, results: [] };
      }

      console.log(`🔄 Syncing ${transactionIds.length} transactions...`);
      const results = [];
      let successCount = 0;
      
      for (const id of transactionIds) {
        try {
          const result = await this.syncTransactionToCloud(id);
          if (result.success) successCount++;
          results.push({ id, ...result });
          
          // Small delay between syncs to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Failed to sync transaction ${id}:`, error);
          results.push({ id, success: false, error: error.message });
        }
      }

      this.syncInProgress = false;
      this.notifyListeners({ 
        type: 'sync-complete', 
        message: `Synced ${successCount} of ${results.length} transactions` 
      });

      return { success: true, results, successCount };
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.syncInProgress = false;
      this.notifyListeners({ type: 'sync-error', message: error.message });
      return { success: false, error: error.message };
    }
  }

  // ==================== CREDIT/INSTALLMENT MANAGEMENT ====================

  async recordPayment(transactionId, paymentAmount, paymentMethod = 'Cash', notes = '') {
    try {
      await db.ensureInitialized();
      
      // Get transaction from local storage
      const transaction = await db.get('transactions', transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Check if transaction is already fully paid
      if (transaction.fullyPaid) {
        throw new Error('Transaction already fully paid');
      }

      // Validate payment amount
      if (paymentAmount <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }

      const currentRemaining = transaction.remaining || transaction.total || 0;
      if (paymentAmount > currentRemaining) {
        throw new Error(`Payment amount cannot exceed remaining balance of ${this.formatCurrency(currentRemaining)}`);
      }

      // Calculate new balances
      const newRemaining = currentRemaining - paymentAmount;
      const newPaid = (transaction.paid || 0) + paymentAmount;
      
      // Create payment record
      const paymentRecord = {
        id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: paymentAmount,
        method: paymentMethod,
        date: new Date().toISOString(),
        remaining: newRemaining,
        notes: notes || `Payment of ${this.formatCurrency(paymentAmount)}`
      };

      // Update transaction
      transaction.remaining = newRemaining;
      transaction.paid = newPaid;
      transaction.paymentHistory = transaction.paymentHistory || [];
      transaction.paymentHistory.push(paymentRecord);
      transaction.lastPaymentDate = new Date().toISOString();
      transaction.updatedAt = new Date().toISOString();
      transaction.syncRequired = true;
      transaction.synced = false; // Mark as unsynced

      // Check if fully paid
      if (newRemaining <= 0) {
        transaction.fullyPaid = true;
        transaction.fullyPaidAt = new Date().toISOString();
        transaction.status = 'completed';
        
        // If it was credit/installment, mark as completed but keep history
        if (transaction.isCredit || transaction.isInstallment) {
          transaction.creditSettled = true;
          transaction.settledAt = new Date().toISOString();
        }
      }

      // Save to local storage
      await db.put('transactions', transaction);
      
      // Add to sync queue
      await this.addToSyncQueue(transaction.id);

      console.log('✅ Payment recorded locally:', {
        transactionId: transaction.id,
        receiptNumber: transaction.receiptNumber,
        amount: this.formatCurrency(paymentAmount),
        newRemaining: this.formatCurrency(newRemaining),
        fullyPaid: newRemaining <= 0
      });

      // If online, try to sync immediately
      if (navigator.onLine) {
        setTimeout(() => {
          this.syncTransactionToCloud(transaction.id).catch(err => 
            console.log('Background sync queued:', err.message)
          );
        }, 500);
      }

      return { 
        success: true, 
        transaction,
        paymentRecord,
        fullyPaid: newRemaining <= 0
      };
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
      transaction.synced = false;

      await db.put('transactions', transaction);
      await this.addToSyncQueue(transaction.id);

      console.log('✅ Due date extended:', {
        transactionId,
        newDueDate: this.formatDate(newDueDate)
      });

      return { success: true, transaction };
    } catch (error) {
      console.error('❌ Failed to extend due date:', error);
      return { success: false, error: error.message };
    }
  }

  async getPaymentSchedule(transactionId) {
    try {
      await db.ensureInitialized();
      
      const transaction = await db.get('transactions', transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const paid = transaction.paid || 0;
      const remaining = transaction.remaining || transaction.total;
      const total = transaction.total;

      const schedule = {
        transactionId: transaction.id,
        receiptNumber: transaction.receiptNumber,
        total: total,
        paid: paid,
        remaining: remaining,
        dueDate: transaction.dueDate,
        isOverdue: this.isOverdue(transaction),
        daysOverdue: this.getDaysOverdue(transaction),
        paymentHistory: transaction.paymentHistory || [],
        nextPaymentDue: this.calculateNextPaymentDue(transaction),
        paymentProgress: (paid / total) * 100,
        isFullyPaid: remaining <= 0,
        isCredit: transaction.isCredit,
        isInstallment: transaction.isInstallment,
        formattedTotal: this.formatCurrency(total),
        formattedPaid: this.formatCurrency(paid),
        formattedRemaining: this.formatCurrency(remaining),
        formattedDueDate: transaction.dueDate ? this.formatDate(transaction.dueDate) : null
      };

      // Sort payment history by date
      schedule.paymentHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

      return schedule;
    } catch (error) {
      console.error('❌ Failed to get payment schedule:', error);
      return null;
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

      const completed = transactions.filter(t => !t.isInstallment && !t.isCredit || t.fullyPaid);
      const pending = transactions.filter(t => (t.isInstallment || t.isCredit) && !t.fullyPaid);
      
      const total = completed.reduce((sum, t) => sum + t.total, 0);
      const pendingTotal = pending.reduce((sum, t) => sum + (t.remaining || 0), 0);
      const collectedTotal = pending.reduce((sum, t) => sum + (t.paid || 0), 0);

      // Breakdown by payment method
      const paymentMethods = {};
      completed.forEach(t => {
        const method = t.paymentMethod || 'Cash';
        if (!paymentMethods[method]) {
          paymentMethods[method] = {
            count: 0,
            total: 0
          };
        }
        paymentMethods[method].count++;
        paymentMethods[method].total += t.total;
      });

      return {
        date: date.toISOString().split('T')[0],
        total: this.formatCurrency(total),
        pendingTotal: this.formatCurrency(pendingTotal),
        collectedTotal: this.formatCurrency(collectedTotal),
        count: transactions.length,
        completedCount: completed.length,
        pendingCount: pending.length,
        average: completed.length > 0 ? this.formatCurrency(total / completed.length) : this.formatCurrency(0),
        paymentMethods,
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

      const completed = transactions.filter(t => !t.isInstallment && !t.isCredit || t.fullyPaid);
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
            pending: 0,
            collected: 0,
            formattedDate: `${month + 1}/${day}/${year}`
          };
        }
        if (!t.isInstallment && !t.isCredit || t.fullyPaid) {
          dailyBreakdown[day].total += t.total;
          dailyBreakdown[day].count++;
        } else {
          dailyBreakdown[day].pending += t.remaining || 0;
          dailyBreakdown[day].collected += t.paid || 0;
        }
      });

      return {
        year,
        month,
        monthName: new Date(year, month).toLocaleString('default', { month: 'long' }),
        total: this.formatCurrency(total),
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
      const completed = transactions.filter(t => !t.isInstallment && !t.isCredit || t.fullyPaid);
      const productSales = {};

      completed.forEach(t => {
        t.items.forEach(item => {
          const key = item.productId || item.id;
          if (!productSales[key]) {
            productSales[key] = {
              id: key,
              name: item.name,
              sku: item.sku,
              quantity: 0,
              revenue: 0,
              transactions: 0,
              formattedRevenue: ''
            };
          }
          productSales[key].quantity += item.quantity;
          productSales[key].revenue += item.price * item.quantity;
          productSales[key].transactions += 1;
        });
      });

      return Object.values(productSales)
        .map(p => ({
          ...p,
          formattedRevenue: this.formatCurrency(p.revenue)
        }))
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
      const completed = transactions.filter(t => !t.isInstallment && !t.isCredit || t.fullyPaid);
      
      const breakdown = {};
      completed.forEach(t => {
        const method = t.paymentMethod || 'Cash';
        if (!breakdown[method]) {
          breakdown[method] = {
            method,
            count: 0,
            total: 0,
            formattedTotal: ''
          };
        }
        breakdown[method].count++;
        breakdown[method].total += t.total;
      });

      return Object.values(breakdown).map(b => ({
        ...b,
        formattedTotal: this.formatCurrency(b.total)
      }));
    } catch (error) {
      console.error('❌ Failed to get payment methods breakdown:', error);
      return [];
    }
  }

  // ==================== UTILITY METHODS ====================

  isOverdue(transaction) {
    if (!transaction.dueDate) return false;
    if (transaction.fullyPaid) return false;
    if ((transaction.remaining || 0) <= 0) return false;
    return new Date(transaction.dueDate) < new Date();
  }

  getDaysOverdue(transaction) {
    if (!this.isOverdue(transaction)) return 0;
    const dueDate = new Date(transaction.dueDate);
    const today = new Date();
    return Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
  }

  calculateNextPaymentDue(transaction) {
    if (!transaction.dueDate) return null;
    if (transaction.fullyPaid) return null;
    if ((transaction.remaining || 0) <= 0) return null;
    
    const lastPayment = transaction.paymentHistory?.slice(-1)[0];
    if (!lastPayment) return transaction.dueDate;
    
    // If it's an installment plan with regular payments
    if (transaction.installmentPlan) {
      const nextDate = new Date(lastPayment.date);
      nextDate.setMonth(nextDate.getMonth() + 1); // Monthly payments
      return nextDate.toISOString();
    }
    
    return transaction.dueDate;
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatShortDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  async getSyncStatus() {
    try {
      await db.ensureInitialized();
      
      const all = await db.getAll('transactions');
      const synced = all.filter(t => t.synced);
      const unsynced = all.filter(t => !t.synced);
      const queue = await db.getAll('syncQueue');
      const pendingPayments = all.filter(t => (t.isInstallment || t.isCredit) && !t.fullyPaid);
      const overduePayments = await this.getOverduePayments();

      return {
        total: all.length,
        synced: synced.length,
        unsynced: unsynced.length,
        queueLength: queue.length,
        isOnline: navigator.onLine,
        pendingPayments: pendingPayments.length,
        pendingPaymentsTotal: pendingPayments.reduce((sum, t) => sum + (t.remaining || 0), 0),
        formattedPendingTotal: this.formatCurrency(pendingPayments.reduce((sum, t) => sum + (t.remaining || 0), 0)),
        overduePayments: overduePayments.length,
        overdueTotal: overduePayments.reduce((sum, t) => sum + (t.remaining || 0), 0),
        formattedOverdueTotal: this.formatCurrency(overduePayments.reduce((sum, t) => sum + (t.remaining || 0), 0)),
        lastSync: all.length > 0 ? Math.max(...all.filter(t => t.lastSyncedAt).map(t => new Date(t.lastSyncedAt))) : null
      };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return {
        total: 0,
        synced: 0,
        unsynced: 0,
        queueLength: 0,
        isOnline: navigator.onLine,
        pendingPayments: 0,
        formattedPendingTotal: '$0.00',
        overduePayments: 0,
        formattedOverdueTotal: '$0.00',
        lastSync: null
      };
    }
  }

  async deleteTransaction(transactionId) {
    try {
      await db.ensureInitialized();
      
      // Get transaction before deleting
      const transaction = await db.get('transactions', transactionId);
      
      // Delete from local storage
      await db.delete('transactions', transactionId);
      
      // Remove from sync queue if present
      await this.removeFromSyncQueue(transactionId);
      
      console.log('🗑️ Transaction deleted:', {
        id: transactionId,
        receiptNumber: transaction?.receiptNumber
      });
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to delete transaction:', error);
      return { success: false, error: error.message };
    }
  }

  async getCustomerBalance(customerId) {
    try {
      const transactions = await this.getTransactionsByCustomer(customerId);
      
      const totalOutstanding = transactions
        .filter(t => !t.fullyPaid && (t.isCredit || t.isInstallment))
        .reduce((sum, t) => sum + (t.remaining || 0), 0);
      
      const totalPaid = transactions
        .reduce((sum, t) => sum + (t.paid || 0), 0);
      
      const totalTransactions = transactions.length;
      const creditCount = transactions.filter(t => t.isCredit).length;
      const installmentCount = transactions.filter(t => t.isInstallment).length;

      return {
        customerId,
        totalOutstanding: this.formatCurrency(totalOutstanding),
        totalPaid: this.formatCurrency(totalPaid),
        totalTransactions,
        creditCount,
        installmentCount,
        overdueCount: transactions.filter(t => this.isOverdue(t)).length,
        lastTransaction: transactions.length > 0 ? transactions[0] : null
      };
    } catch (error) {
      console.error('❌ Failed to get customer balance:', error);
      return null;
    }
  }
}

export const transactionService = new TransactionService();