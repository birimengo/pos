// src/features/pos/Transactions/Transactions.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { Icons } from '../../../components/ui/Icons';
import { transactionService } from '../services/transactionService';
import { db } from '../services/database';
import EditTransactionModal from './EditTransactionModal';
import ReturnModal from './ReturnModal';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  
  const { theme, getTheme } = useTheme();
  const { formatPrice, currency, getCurrencySymbol } = useCurrency();
  const currentTheme = getTheme(theme);

  // Format currency using platform settings
  const formatCurrency = (amount) => {
    return formatPrice(amount, { showSymbol: true, showCode: false });
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      await db.ensureInitialized();
      const allTransactions = await transactionService.getAllTransactionsLocally();
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return;
    
    try {
      const result = await transactionService.deleteTransaction(transactionToDelete.id);
      if (result.success) {
        await loadTransactions();
        setShowDeleteConfirm(false);
        setShowDetails(false);
        setTransactionToDelete(null);
        alert('Transaction deleted successfully');
      } else {
        alert('Failed to delete transaction: ' + result.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Error deleting transaction');
    }
  };

  const handleEditTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setShowEditModal(true);
    setShowDetails(false);
  };

  const handleReturnTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setShowReturnModal(true);
    setShowDetails(false);
  };

  const handleUpdateTransaction = async (updatedTransaction) => {
    try {
      await db.ensureInitialized();
      await db.put('transactions', updatedTransaction);
      await loadTransactions();
      setShowEditModal(false);
      setSelectedTransaction(null);
      alert('Transaction updated successfully');
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update transaction');
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'credit' && !t.isCredit) return false;
    if (filter === 'installment' && !t.isInstallment) return false;
    if (filter === 'pending' && (t.fullyPaid || t.remaining <= 0)) return false;
    if (filter === 'completed' && (!t.fullyPaid && t.remaining > 0)) return false;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return t.receiptNumber.toLowerCase().includes(searchLower) ||
             t.customer?.name?.toLowerCase().includes(searchLower) ||
             t.paymentMethod?.toLowerCase().includes(searchLower);
    }
    
    return true;
  });

  const getStatusBadge = (transaction) => {
    if (transaction.isCredit && !transaction.fullyPaid && transaction.remaining > 0) {
      return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">Credit ({formatCurrency(transaction.remaining)} due)</span>;
    }
    if (transaction.isInstallment && !transaction.fullyPaid && transaction.remaining > 0) {
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">Installment ({formatCurrency(transaction.remaining)} remaining)</span>;
    }
    if (transaction.fullyPaid && (transaction.isCredit || transaction.isInstallment)) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Paid ({formatCurrency(transaction.paid)})</span>;
    }
    if (transaction.fullyPaid) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Paid</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">Completed</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totals = {
    count: filteredTransactions.length,
    total: filteredTransactions.reduce((sum, t) => sum + t.total, 0),
    pending: filteredTransactions.filter(t => !t.fullyPaid && t.remaining > 0).reduce((sum, t) => sum + (t.remaining || 0), 0)
  };

  // Check if transaction has any items that can be returned
  const canReturn = (transaction) => {
    if (!transaction.items || transaction.items.length === 0) return false;
    const returnedCount = transaction.returnedItems?.length || 0;
    return returnedCount < transaction.items.length;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className={`text-xl font-bold ${currentTheme.colors.text}`}>Transactions</h1>
        <div className="flex gap-2">
          {/* Currency Indicator */}
          <div className={`px-3 py-1.5 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex items-center gap-2`}>
            <Icons.creditCard className="text-sm" />
            <span className="text-xs">{currency.code} ({getCurrencySymbol()})</span>
          </div>
          <button
            onClick={loadTransactions}
            className={`px-3 py-1.5 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex items-center gap-2`}
          >
            <Icons.refresh className="text-sm" />
            Refresh
          </button>
        </div>
      </div>

      {/* Currency Info Bar */}
      <div className={`${currentTheme.colors.accentLight} rounded-lg p-2 text-center border ${currentTheme.colors.border}`}>
        <p className={`text-xs ${currentTheme.colors.textSecondary} flex items-center justify-center gap-2 flex-wrap`}>
          <span>💰 All amounts in: {currency.code}</span>
          <span>💱 Symbol: {getCurrencySymbol()}</span>
          <span>📊 Format: {currency.position === 'after' ? 'X' + getCurrencySymbol() : getCurrencySymbol() + 'X'}</span>
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`p-4 rounded-lg ${currentTheme.colors.card} border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total Transactions</p>
          <p className={`text-2xl font-bold ${currentTheme.accentText}`}>{totals.count}</p>
        </div>
        <div className={`p-4 rounded-lg ${currentTheme.colors.card} border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total Revenue</p>
          <p className={`text-2xl font-bold ${currentTheme.accentText}`}>{formatCurrency(totals.total)}</p>
        </div>
        <div className={`p-4 rounded-lg ${currentTheme.colors.card} border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Pending Balance</p>
          <p className={`text-2xl font-bold ${currentTheme.accentText}`}>{formatCurrency(totals.pending)}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icons.search className={`absolute left-3 top-2.5 ${currentTheme.colors.textMuted} text-sm`} />
          <input
            type="text"
            placeholder="Search by receipt number, customer, or payment method..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              filter === 'all' 
                ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white` 
                : `${currentTheme.colors.hover} ${currentTheme.colors.textSecondary}`
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('credit')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              filter === 'credit' 
                ? 'bg-purple-500 text-white' 
                : `${currentTheme.colors.hover} text-purple-600`
            }`}
          >
            Credit
          </button>
          <button
            onClick={() => setFilter('installment')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              filter === 'installment' 
                ? 'bg-blue-500 text-white' 
                : `${currentTheme.colors.hover} text-blue-600`
            }`}
          >
            Installment
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              filter === 'pending' 
                ? 'bg-yellow-500 text-white' 
                : `${currentTheme.colors.hover} text-yellow-600`
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              filter === 'completed' 
                ? 'bg-green-500 text-white' 
                : `${currentTheme.colors.hover} text-green-600`
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Icons.refresh className={`animate-spin text-2xl ${currentTheme.colors.textMuted}`} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`border-b ${currentTheme.colors.border}`}>
              <tr className="text-left">
                <th className="pb-2 text-xs font-medium">Receipt #</th>
                <th className="pb-2 text-xs font-medium">Customer</th>
                <th className="pb-2 text-xs font-medium">Date</th>
                <th className="pb-2 text-xs font-medium">Total</th>
                <th className="pb-2 text-xs font-medium">Paid</th>
                <th className="pb-2 text-xs font-medium">Remaining</th>
                <th className="pb-2 text-xs font-medium">Method</th>
                <th className="pb-2 text-xs font-medium">Status</th>
                <th className="pb-2 text-xs font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className={`border-b ${currentTheme.colors.border} hover:bg-opacity-50 ${currentTheme.colors.hover} transition-colors`}
                >
                  <td 
                    className="py-3 text-xs font-mono cursor-pointer"
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setShowDetails(true);
                    }}
                  >
                    {transaction.receiptNumber}
                  </td>
                  <td 
                    className="py-3 text-xs cursor-pointer"
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setShowDetails(true);
                    }}
                  >
                    {transaction.customer?.name || 'Guest'}
                  </td>
                  <td 
                    className="py-3 text-xs cursor-pointer"
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setShowDetails(true);
                    }}
                  >
                    {formatDate(transaction.createdAt)}
                  </td>
                  <td 
                    className="py-3 text-xs font-semibold cursor-pointer"
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setShowDetails(true);
                    }}
                  >
                    {formatCurrency(transaction.total)}
                  </td>
                  <td 
                    className="py-3 text-xs text-green-600 cursor-pointer"
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setShowDetails(true);
                    }}
                  >
                    {formatCurrency(transaction.paid)}
                  </td>
                  <td 
                    className="py-3 text-xs text-yellow-600 cursor-pointer"
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setShowDetails(true);
                    }}
                  >
                    {formatCurrency(transaction.remaining)}
                  </td>
                  <td 
                    className="py-3 text-xs cursor-pointer"
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setShowDetails(true);
                    }}
                  >
                    {transaction.paymentMethod}
                  </td>
                  <td 
                    className="py-3 text-xs cursor-pointer"
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setShowDetails(true);
                    }}
                  >
                    {getStatusBadge(transaction)}
                  </td>
                  <td className="py-3 text-xs">
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTransaction(transaction);
                        }}
                        className={`p-1 rounded ${currentTheme.colors.hover} text-blue-500`}
                        title="Edit"
                      >
                        <Icons.edit className="text-sm" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTransactionToDelete(transaction);
                          setShowDeleteConfirm(true);
                        }}
                        className={`p-1 rounded ${currentTheme.colors.hover} text-red-500`}
                        title="Delete"
                      >
                        <Icons.trash className="text-sm" />
                      </button>
                      {canReturn(transaction) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReturnTransaction(transaction);
                          }}
                          className={`p-1 rounded ${currentTheme.colors.hover} text-green-500`}
                          title="Process Return"
                        >
                          <Icons.refresh className="text-sm" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <Icons.receipt className="text-4xl mx-auto mb-2 text-gray-400" />
              <p className={`text-sm ${currentTheme.colors.textMuted}`}>No transactions found</p>
            </div>
          )}
        </div>
      )}

      {/* Transaction Details Modal */}
      {showDetails && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col`}>
            <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center`}>
              <div>
                <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Transaction Details</h2>
                <p className={`text-xs ${currentTheme.colors.textMuted}`}>{currency.code} ({getCurrencySymbol()})</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditTransaction(selectedTransaction)}
                  className={`p-1 rounded-lg ${currentTheme.colors.hover} text-blue-500`}
                  title="Edit"
                >
                  <Icons.edit className="text-lg" />
                </button>
                {canReturn(selectedTransaction) && (
                  <button
                    onClick={() => {
                      handleReturnTransaction(selectedTransaction);
                      setShowDetails(false);
                    }}
                    className={`p-1 rounded-lg ${currentTheme.colors.hover} text-green-500`}
                    title="Process Return"
                  >
                    <Icons.refresh className="text-lg" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setTransactionToDelete(selectedTransaction);
                    setShowDeleteConfirm(true);
                    setShowDetails(false);
                  }}
                  className={`p-1 rounded-lg ${currentTheme.colors.hover} text-red-500`}
                  title="Delete"
                >
                  <Icons.trash className="text-lg" />
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className={`p-1 rounded-lg ${currentTheme.colors.hover}`}
                >
                  <Icons.x className="text-lg" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={`text-xs ${currentTheme.colors.textSecondary}`}>Receipt Number:</span>
                  <span className={`text-xs font-mono ${currentTheme.colors.text}`}>{selectedTransaction.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-xs ${currentTheme.colors.textSecondary}`}>Customer:</span>
                  <span className={`text-xs ${currentTheme.colors.text}`}>{selectedTransaction.customer?.name || 'Guest'}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-xs ${currentTheme.colors.textSecondary}`}>Date:</span>
                  <span className={`text-xs ${currentTheme.colors.text}`}>{new Date(selectedTransaction.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-xs ${currentTheme.colors.textSecondary}`}>Payment Method:</span>
                  <span className={`text-xs ${currentTheme.colors.text}`}>{selectedTransaction.paymentMethod}</span>
                </div>
                {(selectedTransaction.isCredit || selectedTransaction.isInstallment) && selectedTransaction.dueDate && (
                  <div className="flex justify-between">
                    <span className={`text-xs ${currentTheme.colors.textSecondary}`}>Due Date:</span>
                    <span className={`text-xs font-medium text-amber-600`}>{new Date(selectedTransaction.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              
              <div className={`border-t ${currentTheme.colors.border} pt-3`}>
                <h3 className={`text-sm font-medium mb-2 ${currentTheme.colors.text}`}>Items</h3>
                <div className="space-y-2">
                  {selectedTransaction.items?.map((item, idx) => {
                    const isReturned = selectedTransaction.returnedItems?.some(r => r.productId === item.productId);
                    return (
                      <div key={idx} className={`flex justify-between text-xs ${isReturned ? 'opacity-50 line-through' : ''}`}>
                        <span>{item.name} x{item.quantity}</span>
                        <span>{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Returned Items Section */}
              {selectedTransaction.returnedItems && selectedTransaction.returnedItems.length > 0 && (
                <div className={`border-t ${currentTheme.colors.border} pt-3`}>
                  <h3 className={`text-sm font-medium mb-2 text-green-600`}>Returned Items</h3>
                  <div className="space-y-2">
                    {selectedTransaction.returnedItems.map((item, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="flex justify-between">
                          <span>{item.productName} x{item.quantity}</span>
                          <span>{formatCurrency(item.total)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500">
                          <span>Condition: {item.condition === 'good' ? '✅ Good' : '⚠️ Bad'}</span>
                          <span>Type: {item.type === 'return' ? 'Return' : 'Damage'}</span>
                        </div>
                        {item.reason && (
                          <p className="text-[10px] text-gray-500 mt-1">Reason: {item.reason}</p>
                        )}
                        <p className="text-[10px] text-gray-400">Returned: {new Date(item.returnedAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className={`border-t ${currentTheme.colors.border} pt-3 space-y-1`}>
                <div className="flex justify-between text-xs">
                  <span className={currentTheme.colors.textSecondary}>Subtotal:</span>
                  <span className={currentTheme.colors.text}>{formatCurrency(selectedTransaction.subtotal)}</span>
                </div>
                {selectedTransaction.discount > 0 && (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(selectedTransaction.discount)}</span>
                  </div>
                )}
                {selectedTransaction.tax > 0 && (
                  <div className="flex justify-between text-xs">
                    <span>Tax:</span>
                    <span>{formatCurrency(selectedTransaction.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-1">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedTransaction.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-green-600">
                  <span>Paid:</span>
                  <span>{formatCurrency(selectedTransaction.paid)}</span>
                </div>
                {selectedTransaction.remaining > 0 && (
                  <div className="flex justify-between text-xs text-yellow-600">
                    <span>Remaining:</span>
                    <span>{formatCurrency(selectedTransaction.remaining)}</span>
                  </div>
                )}
              </div>
              
              {selectedTransaction.paymentHistory && selectedTransaction.paymentHistory.length > 0 && (
                <div className={`border-t ${currentTheme.colors.border} pt-3`}>
                  <h3 className={`text-xs font-medium mb-2 ${currentTheme.colors.text}`}>Payment History</h3>
                  <div className="space-y-2">
                    {selectedTransaction.paymentHistory.map((payment, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className={currentTheme.colors.textMuted}>{new Date(payment.date).toLocaleDateString()}</span>
                        <span className="text-green-600">{formatCurrency(payment.amount)}</span>
                        <span className={currentTheme.colors.textMuted}>{payment.method}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedTransaction.notes && (
                <div className={`border-t ${currentTheme.colors.border} pt-3`}>
                  <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Notes:</p>
                  <p className={`text-xs ${currentTheme.colors.text} mt-1`}>{selectedTransaction.notes}</p>
                </div>
              )}
            </div>
            <div className={`p-4 border-t ${currentTheme.colors.border}`}>
              <button
                onClick={() => setShowDetails(false)}
                className={`w-full px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {showEditModal && selectedTransaction && (
        <EditTransactionModal
          transaction={selectedTransaction}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTransaction(null);
          }}
          onSave={handleUpdateTransaction}
        />
      )}

      {/* Return Modal */}
      {showReturnModal && selectedTransaction && (
        <ReturnModal
          transaction={selectedTransaction}
          onClose={() => {
            setShowReturnModal(false);
            setSelectedTransaction(null);
          }}
          onComplete={() => {
            loadTransactions();
            setShowReturnModal(false);
            setSelectedTransaction(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && transactionToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl`}>
            <div className={`p-4 border-b ${currentTheme.colors.border}`}>
              <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Confirm Delete</h2>
            </div>
            <div className="p-4">
              <p className={`text-sm ${currentTheme.colors.text}`}>
                Are you sure you want to delete this transaction?
              </p>
              <p className={`text-xs ${currentTheme.colors.textMuted} mt-2`}>
                Receipt: {transactionToDelete.receiptNumber}<br />
                Customer: {transactionToDelete.customer?.name || 'Guest'}<br />
                Total: {formatCurrency(transactionToDelete.total)}
              </p>
              <p className={`text-xs text-red-500 mt-2`}>
                Warning: This action cannot be undone!
              </p>
            </div>
            <div className={`p-4 border-t ${currentTheme.colors.border} flex gap-3`}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setTransactionToDelete(null);
                }}
                className={`flex-1 px-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text}`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTransaction}
                className={`flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}