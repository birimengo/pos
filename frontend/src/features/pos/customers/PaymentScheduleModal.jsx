// src/features/pos/customers/PaymentScheduleModal.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Icons } from '../../../components/ui/Icons';
import { transactionService } from '../services/transactionService';

export default function PaymentScheduleModal({ schedule, onClose, onPaymentRecorded }) {
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState({});
  
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  // Load payment history for each transaction
  useEffect(() => {
    const loadPaymentHistories = async () => {
      const histories = {};
      for (const payment of schedule) {
        const scheduleData = await transactionService.getPaymentSchedule(payment.transactionId);
        if (scheduleData) {
          histories[payment.transactionId] = scheduleData;
        }
      }
      setPaymentHistory(histories);
    };

    if (schedule.length > 0) {
      loadPaymentHistories();
    }
  }, [schedule]);

  const handleRecordPayment = async () => {
    if (!selectedPayment) return;
    
    setProcessing(true);
    const amount = paymentAmount ? parseFloat(paymentAmount) : selectedPayment.remaining;
    
    const result = await transactionService.recordPayment(
      selectedPayment.transactionId,
      amount,
      paymentMethod,
      paymentNotes
    );
    
    setProcessing(false);
    
    if (result.success) {
      // Show success message
      if (result.fullyPaid) {
        alert(`✅ Payment complete! The ${selectedPayment.isCredit ? 'credit' : 'installment'} has been fully settled.`);
      } else {
        alert(`✅ Payment of ${transactionService.formatCurrency(amount)} recorded successfully. Remaining: ${transactionService.formatCurrency(result.transaction.remaining)}`);
      }
      
      onPaymentRecorded();
      setShowPaymentForm(false);
      setSelectedPayment(null);
      setPaymentAmount('');
      setPaymentNotes('');
    } else {
      alert('❌ Failed to record payment: ' + result.error);
    }
  };

  const formatCurrency = (amount) => {
    return transactionService.formatCurrency(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (payment) => {
    if (payment.remaining <= 0) return 'text-green-600 bg-green-50 dark:bg-green-900/10';
    if (payment.isOverdue) return 'text-red-600 bg-red-50 dark:bg-red-900/10';
    return 'text-blue-600 bg-blue-50 dark:bg-blue-900/10';
  };

  const getStatusText = (payment) => {
    if (payment.remaining <= 0) return 'Fully Paid';
    if (payment.isOverdue) return 'Overdue';
    return `Partial (${formatCurrency(payment.paid)} paid)`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className={`w-full max-w-4xl ${currentTheme.colors.card} rounded-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center`}>
          <div>
            <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>
              Payment Schedule
            </h2>
            <p className={`text-xs ${currentTheme.colors.textMuted}`}>
              {schedule.length} active payment{schedule.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${currentTheme.colors.hover}`}
          >
            <Icons.x className="text-lg" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {schedule.length === 0 ? (
            <div className="text-center py-12">
              <Icons.calendar className="text-4xl mx-auto mb-3 text-gray-400" />
              <p className={`text-sm ${currentTheme.colors.textMuted}`}>No active payments</p>
            </div>
          ) : (
            <div className="space-y-4">
              {schedule.map((payment, index) => {
                const history = paymentHistory[payment.transactionId];
                const paidAmount = history?.paid || payment.paid || 0;
                const remainingAmount = history?.remaining || payment.remaining || payment.total;
                const progress = ((paidAmount / payment.total) * 100) || 0;
                
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${currentTheme.colors.border} hover:shadow-lg transition-all`}
                  >
                    {/* Payment Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${currentTheme.colors.text}`}>
                            {payment.receiptNumber}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(payment)}`}>
                            {getStatusText(payment)}
                          </span>
                          {payment.isCredit && (
                            <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                              Credit
                            </span>
                          )}
                          {payment.isInstallment && (
                            <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                              Installment
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] ${currentTheme.colors.textMuted} mt-1`}>
                          Transaction: {formatDate(payment.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${currentTheme.colors.text}`}>
                          {formatCurrency(remainingAmount)}
                        </p>
                        <p className={`text-[10px] ${currentTheme.colors.textMuted}`}>
                          of {formatCurrency(payment.total)}
                        </p>
                      </div>
                    </div>

                    {/* Payment Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className={currentTheme.colors.textSecondary}>
                          Paid: {formatCurrency(paidAmount)}
                        </span>
                        <span className={currentTheme.colors.textSecondary}>
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            remainingAmount <= 0 
                              ? 'bg-green-500' 
                              : payment.isOverdue 
                                ? 'bg-red-500' 
                                : 'bg-blue-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Due Date */}
                    {payment.dueDate && remainingAmount > 0 && (
                      <div className={`mb-3 p-2 rounded-lg ${
                        payment.isOverdue 
                          ? 'bg-red-50 dark:bg-red-900/10' 
                          : 'bg-yellow-50 dark:bg-yellow-900/10'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className={`text-xs ${
                            payment.isOverdue ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {payment.isOverdue ? 'Overdue by' : 'Due'}:
                          </span>
                          <span className={`text-xs font-medium ${
                            payment.isOverdue ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {formatDate(payment.dueDate)}
                            {payment.isOverdue && ` (${payment.daysOverdue} days)`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Items Summary */}
                    {payment.items && payment.items.length > 0 && (
                      <div className="mb-3">
                        <p className={`text-[10px] font-medium mb-1 ${currentTheme.colors.textSecondary}`}>
                          Items
                        </p>
                        <div className="space-y-1">
                          {payment.items.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="flex justify-between text-[10px]">
                              <span className={currentTheme.colors.textMuted}>{item.name}</span>
                              <span className={currentTheme.colors.text}>
                                {item.quantity} x {formatCurrency(item.price)}
                              </span>
                            </div>
                          ))}
                          {payment.items.length > 2 && (
                            <p className={`text-[10px] ${currentTheme.colors.textMuted}`}>
                              +{payment.items.length - 2} more items
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Payment History */}
                    {payment.paymentHistory && payment.paymentHistory.length > 0 && (
                      <div className="mb-3">
                        <p className={`text-[10px] font-medium mb-1 ${currentTheme.colors.textSecondary}`}>
                          Payment History
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                          {payment.paymentHistory.map((history, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] border-b border-gray-200 dark:border-gray-700 pb-1 last:border-0">
                              <div>
                                <span className={currentTheme.colors.textMuted}>
                                  {formatDate(history.date)}
                                </span>
                                <span className={`ml-2 text-[8px] px-1.5 py-0.5 rounded-full ${
                                  history.method === 'Cash' ? 'bg-green-100 text-green-700' :
                                  history.method === 'Card' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {history.method}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-green-600 font-medium">
                                  +{formatCurrency(history.amount)}
                                </span>
                                <span className={currentTheme.colors.textMuted}>
                                  (rem: {formatCurrency(history.remaining)})
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Next Payment Info */}
                    {remainingAmount > 0 && payment.nextPaymentDue && (
                      <div className="mb-3">
                        <p className={`text-[10px] font-medium ${currentTheme.colors.textSecondary}`}>
                          Next Payment Due: {formatDate(payment.nextPaymentDue)}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {remainingAmount > 0 && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => {
                            setSelectedPayment({
                              ...payment,
                              remaining: remainingAmount,
                              paid: paidAmount
                            });
                            setPaymentAmount(remainingAmount.toString());
                            setShowPaymentForm(true);
                          }}
                          className={`flex-1 py-2 text-xs font-medium rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white`}
                        >
                          Record Payment
                        </button>
                        {remainingAmount > 0 && (
                          <button
                            onClick={() => {
                              setSelectedPayment({
                                ...payment,
                                remaining: remainingAmount,
                                paid: paidAmount
                              });
                              setPaymentAmount('');
                              setShowPaymentForm(true);
                            }}
                            className={`px-3 py-2 text-xs font-medium rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover}`}
                          >
                            Custom Amount
                          </button>
                        )}
                      </div>
                    )}

                    {/* Fully Paid Badge */}
                    {remainingAmount <= 0 && (
                      <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg text-center">
                        <span className="text-xs text-green-600 font-medium flex items-center justify-center gap-1">
                          <Icons.checkCircle className="text-sm" />
                          Fully Paid - {formatDate(payment.fullyPaidAt || payment.updatedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Form Modal */}
        {showPaymentForm && selectedPayment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4">
            <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl`}>
              <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center`}>
                <div>
                  <h3 className={`text-md font-semibold ${currentTheme.colors.text}`}>
                    Record Payment
                  </h3>
                  <p className={`text-xs ${currentTheme.colors.textMuted}`}>
                    {selectedPayment.receiptNumber}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowPaymentForm(false);
                    setSelectedPayment(null);
                    setPaymentAmount('');
                    setPaymentNotes('');
                  }}
                  className={`p-1 rounded-lg ${currentTheme.colors.hover}`}
                >
                  <Icons.x className="text-lg" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Payment Summary */}
                <div className={`p-3 rounded-lg ${currentTheme.colors.accentLight}`}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={currentTheme.colors.textSecondary}>Total:</span>
                    <span className={`font-medium ${currentTheme.colors.text}`}>
                      {formatCurrency(selectedPayment.total)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={currentTheme.colors.textSecondary}>Paid:</span>
                    <span className="text-green-600 font-medium">
                      {formatCurrency(selectedPayment.paid || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-2 border-t mt-2">
                    <span className={currentTheme.colors.text}>Remaining:</span>
                    <span className={selectedPayment.isOverdue ? 'text-red-600' : 'text-blue-600'}>
                      {formatCurrency(selectedPayment.remaining)}
                    </span>
                  </div>
                </div>

                {/* Payment Amount Input */}
                <div>
                  <label className={`text-xs ${currentTheme.colors.textSecondary} block mb-1`}>
                    Payment Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter amount"
                      min="0.01"
                      max={selectedPayment.remaining}
                      step="0.01"
                      className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                    />
                  </div>
                  {paymentAmount && parseFloat(paymentAmount) < selectedPayment.remaining && (
                    <p className={`text-[10px] mt-1 text-blue-600`}>
                      Partial payment - remaining after this: {formatCurrency(selectedPayment.remaining - parseFloat(paymentAmount))}
                    </p>
                  )}
                  {paymentAmount && parseFloat(paymentAmount) === selectedPayment.remaining && (
                    <p className={`text-[10px] mt-1 text-green-600`}>
                      Final payment - this will settle the {selectedPayment.isCredit ? 'credit' : 'installment'}
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className={`text-xs ${currentTheme.colors.textSecondary} block mb-1`}>
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className={`w-full px-3 py-2 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Check">Check</option>
                  </select>
                </div>

                {/* Payment Notes */}
                <div>
                  <label className={`text-xs ${currentTheme.colors.textSecondary} block mb-1`}>
                    Notes (Optional)
                  </label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Add payment notes..."
                    rows="2"
                    className={`w-full px-3 py-2 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setPaymentAmount((selectedPayment.remaining / 4).toFixed(2))}
                    className={`px-2 py-1 text-[10px] rounded ${currentTheme.colors.hover}`}
                  >
                    25%
                  </button>
                  <button
                    onClick={() => setPaymentAmount((selectedPayment.remaining / 2).toFixed(2))}
                    className={`px-2 py-1 text-[10px] rounded ${currentTheme.colors.hover}`}
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setPaymentAmount((selectedPayment.remaining * 0.75).toFixed(2))}
                    className={`px-2 py-1 text-[10px] rounded ${currentTheme.colors.hover}`}
                  >
                    75%
                  </button>
                  <button
                    onClick={() => setPaymentAmount(selectedPayment.remaining.toString())}
                    className={`px-2 py-1 text-[10px] rounded bg-green-100 text-green-700`}
                  >
                    Full Amount
                  </button>
                </div>
              </div>

              <div className={`p-4 border-t ${currentTheme.colors.border} flex gap-3`}>
                <button
                  onClick={() => {
                    setShowPaymentForm(false);
                    setSelectedPayment(null);
                    setPaymentAmount('');
                    setPaymentNotes('');
                  }}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={processing || !paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > selectedPayment.remaining}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white disabled:opacity-50`}
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Icons.refresh className="animate-spin text-sm" />
                      Processing...
                    </span>
                  ) : (
                    'Confirm Payment'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={`p-4 border-t ${currentTheme.colors.border} flex justify-end`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}