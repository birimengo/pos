// src/features/pos/services/customerTransactionService.js
import { db } from './database';
import { transactionService } from './transactionService';

class CustomerTransactionService {
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

  // Get all transactions for a customer with detailed product info
  async getCustomerTransactionsWithDetails(customerId) {
    try {
      await db.ensureInitialized();
      
      // Get all transactions
      const allTransactions = await db.getAll('transactions') || [];
      
      // Filter for this customer
      const customerTransactions = allTransactions.filter(t => 
        t.customer?.id === customerId || t.customer?._id === customerId
      );

      // Get all products for reference
      const allProducts = await db.getAll('products') || [];
      const productMap = new Map(allProducts.map(p => [p.id, p]));

      // Enhance transactions with product details
      const enhancedTransactions = await Promise.all(
        customerTransactions.map(async (transaction) => {
          // Enhance items with current product data
          const enhancedItems = await Promise.all(
            (transaction.items || []).map(async (item) => {
              const product = productMap.get(item.productId) || 
                             await this.getProductDetails(item.productId);
              
              return {
                ...item,
                productDetails: product || null,
                total: item.price * item.quantity,
                hasImage: !!(product?.localImages?.length || product?.cloudImages?.length)
              };
            })
          );

          // Calculate payment status
          const paymentStatus = this.calculatePaymentStatus(transaction);
          
          // Get payment history
          const paymentHistory = transaction.paymentHistory || [];

          return {
            ...transaction,
            items: enhancedItems,
            paymentStatus,
            paymentHistory,
            isOverdue: this.isOverdue(transaction),
            daysSinceTransaction: this.getDaysSince(transaction.createdAt),
            formattedDate: this.formatDate(transaction.createdAt),
            formattedTotal: this.formatCurrency(transaction.total),
            formattedRemaining: this.formatCurrency(transaction.remaining || 0)
          };
        })
      );

      // Sort by date (newest first)
      return enhancedTransactions.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
    } catch (error) {
      console.error('❌ Failed to get customer transactions:', error);
      return [];
    }
  }

  // Get product details
  async getProductDetails(productId) {
    try {
      return await db.get('products', productId);
    } catch {
      return null;
    }
  }

  // Calculate payment status
  calculatePaymentStatus(transaction) {
    if (transaction.status === 'completed' && !transaction.isCredit && !transaction.isInstallment) {
      return 'completed';
    }
    
    if (transaction.remaining <= 0) {
      return 'paid';
    }
    
    if (this.isOverdue(transaction)) {
      return 'overdue';
    }
    
    if (transaction.isInstallment) {
      return 'installment';
    }
    
    if (transaction.isCredit) {
      return 'credit';
    }
    
    return 'pending';
  }

  // Check if payment is overdue
  isOverdue(transaction) {
    if (!transaction.dueDate) return false;
    if (transaction.remaining <= 0) return false;
    return new Date(transaction.dueDate) < new Date();
  }

  // Get days since transaction
  getDaysSince(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // Format date
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

  // Format currency
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  }

  // Get customer summary statistics
  async getCustomerSummary(customerId) {
    try {
      const transactions = await this.getCustomerTransactionsWithDetails(customerId);
      
      const summary = {
        totalTransactions: transactions.length,
        totalSpent: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        totalCredit: 0,
        totalInstallment: 0,
        completedCount: 0,
        creditCount: 0,
        installmentCount: 0,
        overdueCount: 0,
        averageTicket: 0,
        firstTransaction: null,
        lastTransaction: null,
        paymentMethods: {},
        monthlySpending: {},
        topProducts: []
      };

      const productCount = {};

      transactions.forEach(t => {
        const status = this.calculatePaymentStatus(t);
        const amount = t.total || 0;
        const paid = (t.total || 0) - (t.remaining || 0);
        
        // Totals
        summary.totalSpent += amount;
        summary.totalPaid += paid;
        summary.totalOutstanding += (t.remaining || 0);
        
        // Counts by type
        if (t.isCredit) {
          summary.totalCredit += amount;
          summary.creditCount++;
        }
        if (t.isInstallment) {
          summary.totalInstallment += amount;
          summary.installmentCount++;
        }
        if (status === 'completed' || status === 'paid') {
          summary.completedCount++;
        }
        if (status === 'overdue') {
          summary.overdueCount++;
        }

        // Payment methods
        const method = t.paymentMethod || 'Cash';
        summary.paymentMethods[method] = (summary.paymentMethods[method] || 0) + 1;

        // Monthly spending
        const month = new Date(t.createdAt).toLocaleString('en-US', { month: 'short', year: 'numeric' });
        summary.monthlySpending[month] = (summary.monthlySpending[month] || 0) + amount;

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

        // First and last transaction
        if (!summary.firstTransaction || new Date(t.createdAt) < new Date(summary.firstTransaction)) {
          summary.firstTransaction = t.createdAt;
        }
        if (!summary.lastTransaction || new Date(t.createdAt) > new Date(summary.lastTransaction)) {
          summary.lastTransaction = t.createdAt;
        }
      });

      // Averages
      summary.averageTicket = summary.totalTransactions > 0 
        ? summary.totalSpent / summary.totalTransactions 
        : 0;

      // Top products
      summary.topProducts = Object.values(productCount)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Format values
      summary.formattedTotalSpent = this.formatCurrency(summary.totalSpent);
      summary.formattedTotalPaid = this.formatCurrency(summary.totalPaid);
      summary.formattedTotalOutstanding = this.formatCurrency(summary.totalOutstanding);
      summary.formattedAverageTicket = this.formatCurrency(summary.averageTicket);
      summary.formattedTotalCredit = this.formatCurrency(summary.totalCredit);
      summary.formattedTotalInstallment = this.formatCurrency(summary.totalInstallment);

      return summary;
    } catch (error) {
      console.error('❌ Failed to get customer summary:', error);
      return null;
    }
  }

  // Get payment schedule for credit/installment transactions
  async getPaymentSchedule(customerId) {
    try {
      const transactions = await this.getCustomerTransactionsWithDetails(customerId);
      
      const schedule = transactions
        .filter(t => (t.isCredit || t.isInstallment) && (t.remaining || 0) > 0)
        .map(t => ({
          transactionId: t.id,
          receiptNumber: t.receiptNumber,
          date: t.createdAt,
          dueDate: t.dueDate,
          total: t.total,
          remaining: t.remaining,
          paid: t.total - (t.remaining || 0),
          paymentMethod: t.paymentMethod,
          isOverdue: this.isOverdue(t),
          daysOverdue: this.isOverdue(t) ? this.getDaysSince(t.dueDate) : 0,
          items: t.items,
          paymentHistory: t.paymentHistory || [],
          nextPaymentDate: this.calculateNextPaymentDate(t)
        }))
        .sort((a, b) => {
          // Sort by overdue first, then by due date
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;
          return new Date(a.dueDate || a.date) - new Date(b.dueDate || b.date);
        });

      return schedule;
    } catch (error) {
      console.error('❌ Failed to get payment schedule:', error);
      return [];
    }
  }

  // Calculate next payment date for installment plans
  calculateNextPaymentDate(transaction) {
    if (!transaction.creditSchedule || !transaction.dueDate) return null;
    
    const lastPayment = transaction.paymentHistory?.slice(-1)[0];
    if (!lastPayment) return transaction.dueDate;
    
    const nextDate = new Date(lastPayment.date);
    nextDate.setMonth(nextDate.getMonth() + 1); // Assuming monthly payments
    return nextDate.toISOString();
  }

  // Record a payment for a credit/installment transaction
  async recordCustomerPayment(transactionId, amount, paymentMethod = 'Cash') {
    try {
      const result = await transactionService.recordPayment(transactionId, amount);
      
      if (result.success) {
        // Notify listeners
        this.notifyListeners({
          type: 'payment-recorded',
          transactionId,
          amount,
          timestamp: new Date().toISOString()
        });
        
        return result;
      }
      
      return { success: false, error: 'Failed to record payment' };
    } catch (error) {
      console.error('❌ Failed to record customer payment:', error);
      return { success: false, error: error.message };
    }
  }

  // Get customer loyalty stats
  async getCustomerLoyaltyStats(customerId) {
    try {
      const summary = await this.getCustomerSummary(customerId);
      const transactions = await this.getCustomerTransactionsWithDetails(customerId);
      
      // Calculate points earned (1 point per $10 spent)
      const pointsEarned = Math.floor((summary?.totalSpent || 0) / 10);
      
      // Get redemption history
      const redemptions = transactions
        .filter(t => t.notes?.toLowerCase().includes('points redemption'))
        .map(t => ({
          date: t.createdAt,
          amount: t.discount || 0,
          points: Math.floor((t.discount || 0) * 10) // Points used
        }));

      return {
        currentPoints: summary?.totalSpent ? Math.floor(summary.totalSpent / 10) : 0,
        totalEarned: pointsEarned,
        totalRedeemed: redemptions.reduce((sum, r) => sum + r.points, 0),
        redemptions,
        pointsPerDollar: 0.1, // 10 points per dollar
        nextReward: pointsEarned >= 1000 ? 'Available' : `${1000 - pointsEarned} points to next reward`
      };
    } catch (error) {
      console.error('❌ Failed to get loyalty stats:', error);
      return null;
    }
  }
}

export const customerTransactionService = new CustomerTransactionService();