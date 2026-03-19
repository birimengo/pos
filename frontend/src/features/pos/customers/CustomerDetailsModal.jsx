// src/features/pos/customers/CustomerDetailsModal.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Icons } from '../../../components/ui/Icons';
import { customerTransactionService } from '../services/customerTransactionService';
import PaymentScheduleModal from './PaymentScheduleModal';
import TransactionDetailsModal from './TransactionDetailsModal';

export default function CustomerDetailsModal({ customer, onClose, onEdit }) {
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions', 'summary', 'schedule', 'loyalty'
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [paymentSchedule, setPaymentSchedule] = useState([]);
  const [loyaltyStats, setLoyaltyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'completed', 'credit', 'installment', 'overdue'
  
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  useEffect(() => {
    loadCustomerData();
  }, [customer]);

  const loadCustomerData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel
      const [transactionsData, summaryData, scheduleData, loyaltyData] = await Promise.all([
        customerTransactionService.getCustomerTransactionsWithDetails(customer.id),
        customerTransactionService.getCustomerSummary(customer.id),
        customerTransactionService.getPaymentSchedule(customer.id),
        customerTransactionService.getCustomerLoyaltyStats(customer.id)
      ]);

      setTransactions(transactionsData);
      setSummary(summaryData);
      setPaymentSchedule(scheduleData);
      setLoyaltyStats(loyaltyData);
    } catch (error) {
      console.error('Failed to load customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'all') return true;
    if (filterType === 'completed') return t.paymentStatus === 'completed' || t.paymentStatus === 'paid';
    if (filterType === 'credit') return t.isCredit;
    if (filterType === 'installment') return t.isInstallment;
    if (filterType === 'overdue') return t.isOverdue;
    return true;
  });

  const handleRecordPayment = async (transactionId, amount, paymentMethod) => {
    const result = await customerTransactionService.recordCustomerPayment(transactionId, amount, paymentMethod);
    if (result.success) {
      // Reload data
      loadCustomerData();
    }
    return result;
  };

  const TabButton = ({ tab, label, icon: Icon, count }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 ${
        activeTab === tab
          ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white`
          : `${currentTheme.colors.hover} ${currentTheme.colors.textSecondary}`
      }`}
    >
      <Icon className="text-sm" />
      {label}
      {count !== undefined && count > 0 && (
        <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
          activeTab === tab
            ? 'bg-white/20'
            : currentTheme.colors.accentLight
        }`}>
          {count}
        </span>
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className={`w-full max-w-4xl ${currentTheme.colors.card} rounded-xl shadow-2xl p-8`}>
          <div className="flex justify-center items-center">
            <Icons.refresh className={`animate-spin text-2xl ${currentTheme.colors.textMuted}`} />
            <span className={`ml-2 ${currentTheme.colors.text}`}>Loading customer data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-6xl ${currentTheme.colors.card} rounded-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${currentTheme.colors.accentLight} flex items-center justify-center`}>
              <Icons.user className={`text-2xl ${currentTheme.accentText}`} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>{customer.name}</h2>
              <p className={`text-xs ${currentTheme.colors.textMuted}`}>
                {customer.email} • {customer.phone} • Member since {new Date(customer.joinDate).toLocaleDateString()}
              </p>
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

        {/* Quick Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b">
            <div className={`p-3 rounded-lg ${currentTheme.colors.accentLight}`}>
              <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Lifetime Value</p>
              <p className={`text-lg font-bold ${currentTheme.accentText}`}>{summary.formattedTotalSpent}</p>
              <p className={`text-[10px] ${currentTheme.colors.textMuted}`}>{summary.totalTransactions} transactions</p>
            </div>
            <div className={`p-3 rounded-lg ${
              summary.overdueCount > 0 ? 'bg-red-50 dark:bg-red-900/10' : 'bg-green-50 dark:bg-green-900/10'
            }`}>
              <p className={`text-xs ${
                summary.overdueCount > 0 ? 'text-red-600' : 'text-green-600'
              }`}>Outstanding</p>
              <p className={`text-lg font-bold ${
                summary.overdueCount > 0 ? 'text-red-600' : 'text-green-600'
              }`}>{summary.formattedTotalOutstanding}</p>
              <p className={`text-[10px] ${
                summary.overdueCount > 0 ? 'text-red-500' : 'text-green-500'
              }`}>{summary.overdueCount} overdue</p>
            </div>
            <div className={`p-3 rounded-lg bg-purple-50 dark:bg-purple-900/10`}>
              <p className={`text-xs text-purple-600`}>Credit/Installment</p>
              <p className={`text-lg font-bold text-purple-600`}>
                {summary.creditCount + summary.installmentCount}
              </p>
              <p className={`text-[10px] text-purple-500`}>
                ${(summary.totalCredit + summary.totalInstallment).toFixed(0)}
              </p>
            </div>
            <div className={`p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10`}>
              <p className={`text-xs text-blue-600`}>Average Ticket</p>
              <p className={`text-lg font-bold text-blue-600`}>{summary.formattedAverageTicket}</p>
              <p className={`text-[10px] text-blue-500`}>Last: {summary.formattedDate}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 p-4 border-b">
          <TabButton tab="transactions" label="Transactions" icon={Icons.receipt} count={transactions.length} />
          <TabButton tab="summary" label="Summary" icon={Icons.chart} />
          <TabButton tab="schedule" label="Payment Schedule" icon={Icons.calendar} count={paymentSchedule.length} />
          <TabButton tab="loyalty" label="Loyalty" icon={Icons.star} />
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 text-xs rounded-full ${
                    filterType === 'all'
                      ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white`
                      : currentTheme.colors.hover
                  }`}
                >
                  All ({transactions.length})
                </button>
                <button
                  onClick={() => setFilterType('completed')}
                  className={`px-3 py-1 text-xs rounded-full ${
                    filterType === 'completed'
                      ? 'bg-green-500 text-white'
                      : 'bg-green-50 dark:bg-green-900/10 text-green-600'
                  }`}
                >
                  Completed
                </button>
                <button
                  onClick={() => setFilterType('credit')}
                  className={`px-3 py-1 text-xs rounded-full ${
                    filterType === 'credit'
                      ? 'bg-purple-500 text-white'
                      : 'bg-purple-50 dark:bg-purple-900/10 text-purple-600'
                  }`}
                >
                  Credit ({transactions.filter(t => t.isCredit).length})
                </button>
                <button
                  onClick={() => setFilterType('installment')}
                  className={`px-3 py-1 text-xs rounded-full ${
                    filterType === 'installment'
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-50 dark:bg-blue-900/10 text-blue-600'
                  }`}
                >
                  Installment ({transactions.filter(t => t.isInstallment).length})
                </button>
                <button
                  onClick={() => setFilterType('overdue')}
                  className={`px-3 py-1 text-xs rounded-full ${
                    filterType === 'overdue'
                      ? 'bg-red-500 text-white'
                      : 'bg-red-50 dark:bg-red-900/10 text-red-600'
                  }`}
                >
                  Overdue ({transactions.filter(t => t.isOverdue).length})
                </button>
              </div>

              {/* Transactions List */}
              <div className="space-y-3">
                {filteredTransactions.map((transaction, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedTransaction(transaction)}
                    className={`p-4 rounded-lg border ${currentTheme.colors.border} hover:shadow-lg transition-all cursor-pointer`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${currentTheme.colors.text}`}>
                            {transaction.receiptNumber}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            transaction.paymentStatus === 'completed' ? 'bg-green-100 text-green-700' :
                            transaction.paymentStatus === 'overdue' ? 'bg-red-100 text-red-700' :
                            transaction.paymentStatus === 'credit' ? 'bg-purple-100 text-purple-700' :
                            transaction.paymentStatus === 'installment' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {transaction.paymentStatus}
                          </span>
                          {transaction.isOverdue && (
                            <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                              {transaction.daysSinceTransaction} days overdue
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] ${currentTheme.colors.textMuted} mt-1`}>
                          {transaction.formattedDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${currentTheme.colors.text}`}>
                          {transaction.formattedTotal}
                        </p>
                        {transaction.remaining > 0 && (
                          <p className={`text-[10px] ${
                            transaction.isOverdue ? 'text-red-500' : 'text-orange-500'
                          }`}>
                            Remaining: {customerTransactionService.formatCurrency(transaction.remaining)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Items Preview */}
                    <div className="space-y-2">
                      {transaction.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            {item.productDetails?.localImages?.length > 0 || item.productDetails?.cloudImages?.length > 0 ? (
                              <div className="w-6 h-6 bg-gray-100 rounded overflow-hidden">
                                <img 
                                  src={item.productDetails?.localMainImage || 
                                       item.productDetails?.cloudMainImage ||
                                       '/placeholder-product.png'} 
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                                <Icons.box className="text-xs text-gray-400" />
                              </div>
                            )}
                            <span className={currentTheme.colors.text}>{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`${currentTheme.colors.textMuted}`}>
                              {item.quantity} x {customerTransactionService.formatCurrency(item.price)}
                            </span>
                            <span className={`font-medium ${currentTheme.colors.text}`}>
                              {customerTransactionService.formatCurrency(item.total)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {transaction.items.length > 3 && (
                        <p className={`text-[10px] ${currentTheme.colors.textMuted} text-center`}>
                          +{transaction.items.length - 3} more items
                        </p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-3 pt-2 border-t flex justify-between items-center text-[10px]">
                      <div className="flex items-center gap-3">
                        <span className={currentTheme.colors.textMuted}>
                          Payment: {transaction.paymentMethod}
                        </span>
                        {transaction.paymentHistory?.length > 0 && (
                          <span className={currentTheme.colors.textMuted}>
                            {transaction.paymentHistory.length} payments
                          </span>
                        )}
                      </div>
                      {transaction.notes && (
                        <span className={`${currentTheme.colors.textMuted} italic`}>
                          {transaction.notes}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Tab */}
          {activeTab === 'summary' && summary && (
            <div className="space-y-6">
              {/* Financial Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border ${currentTheme.colors.border}`}>
                  <h3 className={`text-sm font-medium mb-3 ${currentTheme.colors.text}`}>Financial Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className={currentTheme.colors.textSecondary}>Total Spent:</span>
                      <span className={`font-medium ${currentTheme.colors.text}`}>{summary.formattedTotalSpent}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={currentTheme.colors.textSecondary}>Total Paid:</span>
                      <span className={`font-medium text-green-600`}>{summary.formattedTotalPaid}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={currentTheme.colors.textSecondary}>Outstanding:</span>
                      <span className={`font-medium ${summary.totalOutstanding > 0 ? 'text-red-500' : 'text-green-600'}`}>
                        {summary.formattedTotalOutstanding}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={currentTheme.colors.textSecondary}>Credit Total:</span>
                      <span className={`font-medium text-purple-600`}>{summary.formattedTotalCredit}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={currentTheme.colors.textSecondary}>Installment Total:</span>
                      <span className={`font-medium text-blue-600`}>{summary.formattedTotalInstallment}</span>
                    </div>
                  </div>
                </div>

                {/* Transaction Stats */}
                <div className={`p-4 rounded-lg border ${currentTheme.colors.border}`}>
                  <h3 className={`text-sm font-medium mb-3 ${currentTheme.colors.text}`}>Transaction Stats</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className={currentTheme.colors.textSecondary}>Total Transactions:</span>
                      <span className={`font-medium ${currentTheme.colors.text}`}>{summary.totalTransactions}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={currentTheme.colors.textSecondary}>Completed:</span>
                      <span className={`font-medium text-green-600`}>{summary.completedCount}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={currentTheme.colors.textSecondary}>Credit:</span>
                      <span className={`font-medium text-purple-600`}>{summary.creditCount}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={currentTheme.colors.textSecondary}>Installment:</span>
                      <span className={`font-medium text-blue-600`}>{summary.installmentCount}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={currentTheme.colors.textSecondary}>Overdue:</span>
                      <span className={`font-medium text-red-600`}>{summary.overdueCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className={`p-4 rounded-lg border ${currentTheme.colors.border}`}>
                <h3 className={`text-sm font-medium mb-3 ${currentTheme.colors.text}`}>Payment Methods</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(summary.paymentMethods).map(([method, count]) => (
                    <div key={method} className="flex justify-between text-xs">
                      <span className={currentTheme.colors.textSecondary}>{method}:</span>
                      <span className={`font-medium ${currentTheme.colors.text}`}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Products */}
              {summary.topProducts.length > 0 && (
                <div className={`p-4 rounded-lg border ${currentTheme.colors.border}`}>
                  <h3 className={`text-sm font-medium mb-3 ${currentTheme.colors.text}`}>Most Purchased Products</h3>
                  <div className="space-y-2">
                    {summary.topProducts.map((product, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className={currentTheme.colors.text}>{product.name}</span>
                        <div className="flex items-center gap-3">
                          <span className={currentTheme.colors.textMuted}>{product.count} units</span>
                          <span className={`font-medium ${currentTheme.colors.text}`}>
                            {customerTransactionService.formatCurrency(product.total)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly Spending */}
              <div className={`p-4 rounded-lg border ${currentTheme.colors.border}`}>
                <h3 className={`text-sm font-medium mb-3 ${currentTheme.colors.text}`}>Monthly Spending</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(summary.monthlySpending)
                    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                    .map(([month, amount]) => (
                      <div key={month} className="flex justify-between items-center text-xs">
                        <span className={currentTheme.colors.text}>{month}</span>
                        <span className={`font-medium ${currentTheme.colors.text}`}>
                          {customerTransactionService.formatCurrency(amount)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Payment Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="space-y-3">
              {paymentSchedule.length === 0 ? (
                <div className="text-center py-8">
                  <Icons.calendar className="text-3xl mx-auto mb-2 text-gray-400" />
                  <p className={`text-sm ${currentTheme.colors.textMuted}`}>No pending payments</p>
                </div>
              ) : (
                paymentSchedule.map((schedule, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${schedule.isOverdue ? 'border-red-300 bg-red-50/50' : currentTheme.colors.border}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${currentTheme.colors.text}`}>
                            {schedule.receiptNumber}
                          </span>
                          {schedule.isOverdue && (
                            <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                              {schedule.daysOverdue} days overdue
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] ${currentTheme.colors.textMuted} mt-1`}>
                          Due: {new Date(schedule.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${currentTheme.colors.text}`}>
                          {customerTransactionService.formatCurrency(schedule.remaining)}
                        </p>
                        <p className={`text-[10px] ${currentTheme.colors.textMuted}`}>
                          of {customerTransactionService.formatCurrency(schedule.total)}
                        </p>
                      </div>
                    </div>

                    {/* Payment Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className={currentTheme.colors.textSecondary}>Paid</span>
                        <span className={currentTheme.colors.textSecondary}>
                          {((schedule.paid / schedule.total) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${schedule.isOverdue ? 'bg-red-500' : 'bg-blue-500'}`}
                          style={{ width: `${(schedule.paid / schedule.total) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Payment History */}
                    {schedule.paymentHistory.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className={`text-[10px] font-medium mb-1 ${currentTheme.colors.textSecondary}`}>
                          Payment History
                        </p>
                        {schedule.paymentHistory.map((payment, idx) => (
                          <div key={idx} className="flex justify-between text-[10px]">
                            <span className={currentTheme.colors.textMuted}>
                              {new Date(payment.date).toLocaleDateString()}
                            </span>
                            <span className={currentTheme.colors.text}>
                              {customerTransactionService.formatCurrency(payment.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick Payment Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRecordPayment(schedule.transactionId, schedule.remaining, 'Cash');
                      }}
                      className={`mt-3 w-full py-2 text-xs font-medium rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white`}
                    >
                      Record Payment
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Loyalty Tab */}
          {activeTab === 'loyalty' && loyaltyStats && (
            <div className="space-y-4">
              <div className={`p-6 rounded-lg border ${currentTheme.colors.border} text-center`}>
                <div className={`w-20 h-20 mx-auto mb-3 rounded-full ${currentTheme.colors.accentLight} flex items-center justify-center`}>
                  <Icons.star className={`text-3xl ${currentTheme.accentText}`} />
                </div>
                <p className={`text-3xl font-bold ${currentTheme.colors.text}`}>{loyaltyStats.currentPoints}</p>
                <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Current Points</p>
                <p className={`mt-2 text-xs ${currentTheme.colors.textMuted}`}>
                  {loyaltyStats.pointsPerDollar} points per $1 spent
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-lg border ${currentTheme.colors.border}`}>
                  <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total Earned</p>
                  <p className={`text-lg font-bold ${currentTheme.colors.text}`}>{loyaltyStats.totalEarned}</p>
                </div>
                <div className={`p-3 rounded-lg border ${currentTheme.colors.border}`}>
                  <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Redeemed</p>
                  <p className={`text-lg font-bold ${currentTheme.colors.text}`}>{loyaltyStats.totalRedeemed}</p>
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${currentTheme.colors.border}`}>
                <p className={`text-xs font-medium mb-2 ${currentTheme.colors.text}`}>Next Reward</p>
                <p className={`text-sm ${loyaltyStats.nextReward === 'Available' ? 'text-green-600' : currentTheme.colors.text}`}>
                  {loyaltyStats.nextReward}
                </p>
              </div>

              {loyaltyStats.redemptions.length > 0 && (
                <div className={`p-3 rounded-lg border ${currentTheme.colors.border}`}>
                  <p className={`text-xs font-medium mb-2 ${currentTheme.colors.text}`}>Redemption History</p>
                  {loyaltyStats.redemptions.map((redemption, idx) => (
                    <div key={idx} className="flex justify-between text-xs mb-1">
                      <span className={currentTheme.colors.textMuted}>
                        {new Date(redemption.date).toLocaleDateString()}
                      </span>
                      <span className={currentTheme.colors.text}>
                        {redemption.points} points (${redemption.amount})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onPaymentRecorded={loadCustomerData}
        />
      )}
    </div>
  );
}