// src/features/pos/customers/CustomerDetailsModal.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Icons } from '../../../components/ui/Icons';

export default function CustomerDetailsModal({ customer, onClose, onEdit }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'credit', 'installment', 'completed'
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  useEffect(() => {
    loadTransactions();
  }, [customer]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      // Load from localStorage or IndexedDB
      const allTransactions = JSON.parse(localStorage.getItem('pos-transactions') || '[]');
      const customerTransactions = allTransactions
        .filter(t => t.customer?.id === customer.id || t.customerId === customer.id)
        .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
      
      setTransactions(customerTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'credit') return t.isCredit || t.notes?.includes('Credit sale');
    if (filter === 'installment') return t.isInstallment || t.notes?.includes('Installment');
    if (filter === 'completed') return !t.isCredit && !t.isInstallment;
    return true;
  });

  const calculateTotals = () => {
    const totals = {
      totalSpent: 0,
      totalCredit: 0,
      totalInstallment: 0,
      creditCount: 0,
      installmentCount: 0
    };

    transactions.forEach(t => {
      totals.totalSpent += t.total || 0;
      if (t.isCredit || t.notes?.includes('Credit sale')) {
        totals.totalCredit += t.total || 0;
        totals.creditCount++;
      }
      if (t.isInstallment || t.notes?.includes('Installment')) {
        totals.totalInstallment += t.total || 0;
        totals.installmentCount++;
      }
    });

    return totals;
  };

  const totals = calculateTotals();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-4xl ${currentTheme.colors.card} rounded-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${currentTheme.colors.accentLight} flex items-center justify-center`}>
              <Icons.user className={`text-xl ${currentTheme.accentText}`} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>{customer.name}</h2>
              <p className={`text-xs ${currentTheme.colors.textMuted}`}>{customer.email} • {customer.phone}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className={`p-2 rounded-lg ${currentTheme.colors.hover}`}
            >
              <Icons.edit className={`text-lg ${currentTheme.colors.textSecondary}`} />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${currentTheme.colors.hover}`}
            >
              <Icons.x className="text-lg" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className={`p-3 rounded-lg ${currentTheme.colors.accentLight}`}>
              <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Loyalty Points</p>
              <p className={`text-xl font-bold ${currentTheme.accentText}`}>{customer.loyaltyPoints}</p>
            </div>
            <div className={`p-3 rounded-lg bg-green-50 dark:bg-green-900/10`}>
              <p className={`text-xs text-green-600 dark:text-green-400`}>Total Spent</p>
              <p className={`text-xl font-bold text-green-600 dark:text-green-400`}>
                ${totals.totalSpent.toLocaleString()}
              </p>
            </div>
            <div className={`p-3 rounded-lg bg-purple-50 dark:bg-purple-900/10`}>
              <p className={`text-xs text-purple-600 dark:text-purple-400`}>Credit Sales</p>
              <p className={`text-xl font-bold text-purple-600 dark:text-purple-400`}>
                {totals.creditCount} (${totals.totalCredit.toLocaleString()})
              </p>
            </div>
            <div className={`p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10`}>
              <p className={`text-xs text-blue-600 dark:text-blue-400`}>Installments</p>
              <p className={`text-xl font-bold text-blue-600 dark:text-blue-400`}>
                {totals.installmentCount} (${totals.totalInstallment.toLocaleString()})
              </p>
            </div>
          </div>

          {/* Customer Info */}
          <div className={`mb-6 p-3 rounded-lg border ${currentTheme.colors.border}`}>
            <h3 className={`text-sm font-medium mb-2 ${currentTheme.colors.text}`}>Customer Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Joined</p>
                <p className={currentTheme.colors.text}>{customer.joinDate || 'N/A'}</p>
              </div>
              <div>
                <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Last Visit</p>
                <p className={currentTheme.colors.text}>{customer.lastVisit || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Address</p>
                <p className={currentTheme.colors.text}>{customer.address || 'No address provided'}</p>
              </div>
              <div className="col-span-2">
                <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Notes</p>
                <p className={currentTheme.colors.text}>{customer.notes || 'No notes'}</p>
              </div>
            </div>
          </div>

          {/* Transaction Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs rounded-full ${
                filter === 'all'
                  ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white`
                  : currentTheme.colors.hover
              }`}
            >
              All Transactions ({transactions.length})
            </button>
            <button
              onClick={() => setFilter('credit')}
              className={`px-3 py-1 text-xs rounded-full ${
                filter === 'credit'
                  ? 'bg-purple-500 text-white'
                  : 'bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400'
              }`}
            >
              Credit ({totals.creditCount})
            </button>
            <button
              onClick={() => setFilter('installment')}
              className={`px-3 py-1 text-xs rounded-full ${
                filter === 'installment'
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400'
              }`}
            >
              Installment ({totals.installmentCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 text-xs rounded-full ${
                filter === 'completed'
                  ? 'bg-green-500 text-white'
                  : 'bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400'
              }`}
            >
              Completed
            </button>
          </div>

          {/* Transaction History */}
          <h3 className={`text-sm font-medium mb-2 ${currentTheme.colors.text}`}>Transaction History</h3>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <Icons.refresh className={`animate-spin text-2xl ${currentTheme.colors.textMuted}`} />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Icons.receipt className="text-3xl mx-auto mb-2 text-gray-400" />
              <p className={`text-sm ${currentTheme.colors.textMuted}`}>No transactions found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((transaction, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${currentTheme.colors.border} hover:shadow-sm transition-shadow`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className={`text-xs font-medium ${currentTheme.colors.text}`}>
                        {transaction.receiptNumber}
                      </p>
                      <p className={`text-[10px] ${currentTheme.colors.textMuted}`}>
                        {new Date(transaction.timestamp || transaction.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {transaction.isCredit && (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] rounded-full">
                          Credit
                        </span>
                      )}
                      {transaction.isInstallment && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] rounded-full">
                          Installment
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className={`text-[10px] ${currentTheme.colors.textSecondary}`}>Items</p>
                      <p className={currentTheme.colors.text}>{transaction.items?.length || 0}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] ${currentTheme.colors.textSecondary}`}>Payment</p>
                      <p className={currentTheme.colors.text}>{transaction.paymentMethod}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] ${currentTheme.colors.textSecondary}`}>Total</p>
                      <p className={`font-bold ${
                        transaction.isCredit ? 'text-purple-600' :
                        transaction.isInstallment ? 'text-blue-600' :
                        'text-green-600'
                      }`}>
                        ${transaction.total?.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {transaction.notes && (
                    <p className={`mt-2 text-[10px] ${currentTheme.colors.textMuted} italic`}>
                      Note: {transaction.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}