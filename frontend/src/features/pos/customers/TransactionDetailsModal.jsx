// src/features/pos/customers/TransactionDetailsModal.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Icons } from '../../../components/ui/Icons';
import { transactionService } from '../services/transactionService';

export default function TransactionDetailsModal({ transaction, onClose, onPaymentRecorded }) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [transactionData, setTransactionData] = useState(transaction);
  const [paymentHistory, setPaymentHistory] = useState([]);
  
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  // Load latest transaction data
  useEffect(() => {
    loadTransactionData();
  }, [transaction.id]);

  const loadTransactionData = async () => {
    const data = await transactionService.getTransactionLocally(transaction.id);
    if (data) {
      setTransactionData(data);
      setPaymentHistory(data.paymentHistory || []);
      setPaymentAmount(data.remaining?.toString() || '0');
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount > (transactionData.remaining || 0)) {
      alert(`Payment amount cannot exceed remaining balance of ${formatCurrency(transactionData.remaining)}`);
      return;
    }
    
    setProcessing(true);
    const result = await transactionService.recordPayment(
      transactionData.id,
      amount,
      paymentMethod,
      paymentNotes
    );
    setProcessing(false);
    
    if (result.success) {
      // Show success message
      if (result.fullyPaid) {
        alert(`✅ Payment complete! The ${transactionData.isCredit ? 'credit' : 'installment'} has been fully settled.`);
      } else {
        alert(`✅ Payment of ${formatCurrency(amount)} recorded successfully. Remaining: ${formatCurrency(result.transaction.remaining)}`);
      }
      
      // Reload transaction data
      await loadTransactionData();
      onPaymentRecorded();
      setShowPaymentForm(false);
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

  const getPaymentStatus = () => {
    if (transactionData.fullyPaid) return 'Fully Paid';
    if (transactionData.isOverdue) return 'Overdue';
    if (transactionData.isCredit) return 'Credit';
    if (transactionData.isInstallment) return 'Installment';
    return 'Completed';
  };

  const getStatusColor = () => {
    if (transactionData.fullyPaid) return 'bg-green-50 dark:bg-green-900/10 text-green-700';
    if (transactionData.isOverdue) return 'bg-red-50 dark:bg-red-900/10 text-red-700';
    if (transactionData.isCredit) return 'bg-purple-50 dark:bg-purple-900/10 text-purple-700';
    if (transactionData.isInstallment) return 'bg-blue-50 dark:bg-blue-900/10 text-blue-700';
    return 'bg-gray-50 dark:bg-gray-800 text-gray-700';
  };

  const progressPercentage = ((transactionData.paid || 0) / transactionData.total) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className={`w-full max-w-2xl ${currentTheme.colors.card} rounded-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center`}>
          <div>
            <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>
              Transaction Details
            </h2>
            <p className={`text-xs ${currentTheme.colors.textMuted}`}>
              {transactionData.receiptNumber}
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status Banner */}
          <div className={`p-4 rounded-lg ${getStatusColor()}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">
                  Status: {getPaymentStatus()}
                </p>
                <p className="text-xs opacity-75">
                  {formatDate(transactionData.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">
                  {formatCurrency(transactionData.total)}
                </p>
                {!transactionData.fullyPaid && transactionData.remaining > 0 && (
                  <p className={`text-xs ${transactionData.isOverdue ? 'text-red-600' : 'opacity-75'}`}>
                    Remaining: {formatCurrency(transactionData.remaining)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Payment Progress for Credit/Installment */}
          {(transactionData.isCredit || transactionData.isInstallment) && (
            <div className={`p-4 rounded-lg border ${currentTheme.colors.border}`}>
              <h3 className={`text-sm font-medium mb-3 ${currentTheme.colors.text}`}>
                Payment Progress
              </h3>
              
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className={`p-2 rounded-lg ${currentTheme.colors.accentLight}`}>
                  <p className={`text-[10px] ${currentTheme.colors.textSecondary}`}>Total</p>
                  <p className={`text-sm font-bold ${currentTheme.colors.text}`}>
                    {formatCurrency(transactionData.total)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/10">
                  <p className={`text-[10px] text-green-600`}>Paid</p>
                  <p className={`text-sm font-bold text-green-600`}>
                    {formatCurrency(transactionData.paid || 0)}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${
                  transactionData.remaining > 0 && !transactionData.fullyPaid
                    ? 'bg-yellow-50 dark:bg-yellow-900/10' 
                    : 'bg-green-50'
                }`}>
                  <p className={`text-[10px] ${
                    transactionData.remaining > 0 && !transactionData.fullyPaid 
                      ? 'text-yellow-600' 
                      : 'text-green-600'
                  }`}>
                    Remaining
                  </p>
                  <p className={`text-sm font-bold ${
                    transactionData.remaining > 0 && !transactionData.fullyPaid 
                      ? 'text-yellow-600' 
                      : 'text-green-600'
                  }`}>
                    {formatCurrency(transactionData.remaining || 0)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className={currentTheme.colors.textSecondary}>Payment Progress</span>
                  <span className={currentTheme.colors.textSecondary}>
                    {progressPercentage.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      transactionData.fullyPaid 
                        ? 'bg-green-500' 
                        : transactionData.isOverdue 
                          ? 'bg-red-500' 
                          : 'bg-blue-500'
                    }`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Due Date */}
              {transactionData.dueDate && !transactionData.fullyPaid && (
                <div className={`mb-3 p-2 rounded-lg ${
                  transactionData.isOverdue 
                    ? 'bg-red-50 dark:bg-red-900/10' 
                    : 'bg-yellow-50 dark:bg-yellow-900/10'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${
                      transactionData.isOverdue ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {transactionData.isOverdue ? 'Overdue by' : 'Due'}:
                    </span>
                    <span className={`text-xs font-medium ${
                      transactionData.isOverdue ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {formatDate(transactionData.dueDate)}
                      {transactionData.isOverdue && (
                        <span className="ml-1">
                          ({Math.ceil((new Date() - new Date(transactionData.dueDate)) / (1000 * 60 * 60 * 24))} days)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment History */}
          {paymentHistory.length > 0 && (
            <div className={`p-4 rounded-lg border ${currentTheme.colors.border}`}>
              <h3 className={`text-sm font-medium mb-3 ${currentTheme.colors.text}`}>
                Payment History
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {paymentHistory.map((payment, idx) => (
                  <div key={idx} className={`p-2 rounded-lg border ${currentTheme.colors.border}`}>
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <p className={`text-xs font-medium ${currentTheme.colors.text}`}>
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className={`text-[10px] ${currentTheme.colors.textMuted}`}>
                          {formatDate(payment.date)}
                        </p>
                      </div>
                      <span className={`text-[8px] px-2 py-0.5 rounded-full ${
                        payment.method === 'Cash' ? 'bg-green-100 text-green-700' :
                        payment.method === 'Card' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {payment.method}
                      </span>
                    </div>
                    {payment.notes && (
                      <p className={`text-[10px] ${currentTheme.colors.textMuted} italic`}>
                        {payment.notes}
                      </p>
                    )}
                    <p className={`text-[8px] ${currentTheme.colors.textMuted} mt-1`}>
                      Remaining after payment: {formatCurrency(payment.remaining)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Items */}
          <div className={`p-4 rounded-lg border ${currentTheme.colors.border}`}>
            <h3 className={`text-sm font-medium mb-3 ${currentTheme.colors.text}`}>Items</h3>
            <div className="space-y-2">
              {transactionData.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-xs">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                        <Icons.box className="text-sm text-gray-400" />
                      </div>
                      <div>
                        <p className={`font-medium ${currentTheme.colors.text}`}>{item.name}</p>
                        <p className={`text-[10px] ${currentTheme.colors.textMuted}`}>
                          SKU: {item.sku}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={currentTheme.colors.text}>
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                    <p className={`text-[10px] ${currentTheme.colors.textMuted}`}>
                      {item.quantity} x {formatCurrency(item.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className={`p-4 rounded-lg border ${currentTheme.colors.border}`}>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className={currentTheme.colors.textSecondary}>Subtotal:</span>
                <span className={currentTheme.colors.text}>
                  {formatCurrency(transactionData.subtotal)}
                </span>
              </div>
              {transactionData.discount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className={currentTheme.colors.textSecondary}>Discount:</span>
                  <span className="text-green-600">
                    -{formatCurrency(transactionData.discount)}
                  </span>
                </div>
              )}
              {transactionData.tax > 0 && (
                <div className="flex justify-between text-xs">
                  <span className={currentTheme.colors.textSecondary}>Tax:</span>
                  <span className={currentTheme.colors.text}>
                    {formatCurrency(transactionData.tax)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-2 border-t mt-2">
                <span className={currentTheme.colors.text}>Total:</span>
                <span className={currentTheme.colors.text}>
                  {formatCurrency(transactionData.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {transactionData.notes && (
            <div className={`p-4 rounded-lg border ${currentTheme.colors.border}`}>
              <p className={`text-xs font-medium mb-1 ${currentTheme.colors.text}`}>Notes</p>
              <p className={`text-xs ${currentTheme.colors.textMuted}`}>{transactionData.notes}</p>
            </div>
          )}

          {/* Payment Form */}
          {showPaymentForm && !transactionData.fullyPaid && (
            <div className={`p-4 rounded-lg border ${currentTheme.colors.border} bg-opacity-50`}>
              <h3 className={`text-sm font-medium mb-3 ${currentTheme.colors.text}`}>Record Payment</h3>
              <div className="space-y-3">
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
                      max={transactionData.remaining}
                      step="0.01"
                      className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                    />
                  </div>
                  {paymentAmount && parseFloat(paymentAmount) < transactionData.remaining && (
                    <p className={`text-[10px] mt-1 text-blue-600`}>
                      Partial payment - remaining after this: {formatCurrency(transactionData.remaining - parseFloat(paymentAmount))}
                    </p>
                  )}
                  {paymentAmount && parseFloat(paymentAmount) === transactionData.remaining && (
                    <p className={`text-[10px] mt-1 text-green-600`}>
                      Final payment - this will settle the {transactionData.isCredit ? 'credit' : 'installment'}
                    </p>
                  )}
                </div>

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
                    onClick={() => setPaymentAmount((transactionData.remaining / 4).toFixed(2))}
                    className={`px-2 py-1 text-[10px] rounded ${currentTheme.colors.hover}`}
                  >
                    25%
                  </button>
                  <button
                    onClick={() => setPaymentAmount((transactionData.remaining / 2).toFixed(2))}
                    className={`px-2 py-1 text-[10px] rounded ${currentTheme.colors.hover}`}
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setPaymentAmount((transactionData.remaining * 0.75).toFixed(2))}
                    className={`px-2 py-1 text-[10px] rounded ${currentTheme.colors.hover}`}
                  >
                    75%
                  </button>
                  <button
                    onClick={() => setPaymentAmount(transactionData.remaining.toString())}
                    className={`px-2 py-1 text-[10px] rounded bg-green-100 text-green-700`}
                  >
                    Full Amount
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Fully Paid Message */}
          {transactionData.fullyPaid && (
            <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg text-center">
              <span className="text-sm text-green-600 font-medium flex items-center justify-center gap-2">
                <Icons.checkCircle className="text-lg" />
                Fully Paid - {formatDate(transactionData.fullyPaidAt || transactionData.updatedAt)}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${currentTheme.colors.border} flex gap-3`}>
          {!showPaymentForm && !transactionData.fullyPaid && (transactionData.remaining > 0) && (
            <button
              onClick={() => setShowPaymentForm(true)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white`}
            >
              Record Payment
            </button>
          )}
          {showPaymentForm && (
            <>
              <button
                onClick={() => {
                  setShowPaymentForm(false);
                  setPaymentNotes('');
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text}`}
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={processing || !paymentAmount || parseFloat(paymentAmount) <= 0}
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
            </>
          )}
          {!showPaymentForm && (
            <button
              onClick={onClose}
              className={`px-4 py-2 text-sm font-medium rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text}`}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}