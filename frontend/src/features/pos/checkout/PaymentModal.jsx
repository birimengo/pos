// src/features/pos/checkout/PaymentModal.jsx
import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Icons } from '../../../components/ui/Icons';

export default function PaymentModal({ isOpen, onClose, total, onPaymentComplete }) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState(total);
  const [splitPayments, setSplitPayments] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showInsufficientOptions, setShowInsufficientOptions] = useState(false);
  const [insufficientAction, setInsufficientAction] = useState(null); // 'installment', 'credit', or null
  const [downPayment, setDownPayment] = useState(0);
  const [installmentPeriod, setInstallmentPeriod] = useState(3); // months
  const [creditPaymentSchedule, setCreditPaymentSchedule] = useState('monthly'); // 'weekly', '3months', '6months', '12months'
  const [customDueDate, setCustomDueDate] = useState('');
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  if (!isOpen) return null;

  const paymentMethods = [
    { id: 'cash', name: 'Cash', icon: Icons.money },
    { id: 'card', name: 'Credit Card', icon: Icons.creditCard },
    { id: 'mobile', name: 'Mobile Wallet', icon: Icons.phone },
    { id: 'gift', name: 'Gift Card', icon: Icons.star },
    { id: 'split', name: 'Split Payment', icon: Icons.grid },
  ];

  const change = amountPaid - total;
  const isShort = amountPaid < total && amountPaid > 0;
  const remainingAmount = total - amountPaid;

  // Calculate due date based on selected schedule
  const calculateDueDate = () => {
    const today = new Date();
    let dueDate = new Date(today);
    
    switch(creditPaymentSchedule) {
      case 'weekly':
        dueDate.setDate(today.getDate() + 7);
        break;
      case '3months':
        dueDate.setMonth(today.getMonth() + 3);
        break;
      case '6months':
        dueDate.setMonth(today.getMonth() + 6);
        break;
      case '12months':
        dueDate.setMonth(today.getMonth() + 12);
        break;
      default:
        dueDate.setMonth(today.getMonth() + 1); // Default 1 month
    }
    
    return dueDate.toISOString().split('T')[0];
  };

  const handleAmountChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setAmountPaid(value);
    setShowInsufficientOptions(false);
    setInsufficientAction(null);
  };

  const handleProceedWithShortage = () => {
    setShowInsufficientOptions(true);
  };

  const handleInstallmentOption = () => {
    setInsufficientAction('installment');
    setDownPayment(amountPaid);
  };

  const handleCreditOption = () => {
    setInsufficientAction('credit');
    setCreditPaymentSchedule('monthly'); // Default to monthly
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    
    // Determine payment status and due date
    let paymentStatus = 'completed';
    let paymentNotes = '';
    let dueDate = null;
    
    if (amountPaid < total) {
      if (insufficientAction === 'installment') {
        paymentStatus = 'installment';
        paymentNotes = `Down payment: $${downPayment.toFixed(2)}, Remaining: $${remainingAmount.toFixed(2)} over ${installmentPeriod} months`;
        dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default 30 days for first payment
      } else if (insufficientAction === 'credit') {
        paymentStatus = 'credit';
        dueDate = customDueDate || calculateDueDate();
        const scheduleText = {
          'weekly': 'Weekly',
          '3months': '3 Months',
          '6months': '6 Months',
          '12months': '12 Months'
        }[creditPaymentSchedule] || 'Monthly';
        
        paymentNotes = `Credit sale: $${remainingAmount.toFixed(2)} to be paid by ${new Date(dueDate).toLocaleDateString()} (${scheduleText} schedule)`;
      }
    }

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      onPaymentComplete({
        method: paymentMethod,
        amount: amountPaid,
        total: total,
        remaining: remainingAmount > 0 ? remainingAmount : 0,
        change: change > 0 ? change : 0,
        timestamp: new Date().toISOString(),
        status: paymentStatus,
        notes: paymentNotes,
        dueDate: dueDate,
        creditSchedule: insufficientAction === 'credit' ? creditPaymentSchedule : null,
        stockAction: paymentStatus === 'completed' ? 'reduce' : 
                    (paymentStatus === 'credit' ? 'reduce' : 'reserve') // Credit reduces stock, installment reserves
      });
    }, 1500);
  };

  // Handle schedule selection without triggering parent button
  const handleScheduleSelect = (e, schedule) => {
    e.stopPropagation();
    setCreditPaymentSchedule(schedule);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center sticky top-0 ${currentTheme.colors.card} z-10`}>
          <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Process Payment</h2>
          <button onClick={onClose} className={`p-1 rounded-lg ${currentTheme.colors.hover}`}>
            <Icons.x className="text-xl" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Total Amount */}
          <div className={`p-3 ${currentTheme.colors.accentLight} rounded-lg text-center`}>
            <p className={`text-sm ${currentTheme.colors.textSecondary}`}>Total Amount</p>
            <p className={`text-3xl font-bold ${currentTheme.accentText}`}>${total.toFixed(2)}</p>
          </div>

          {/* Payment Methods */}
          <div>
            <p className={`text-sm font-medium mb-2 ${currentTheme.colors.text}`}>Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map(method => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-2 rounded-lg border transition-all ${
                      isSelected 
                        ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white border-transparent` 
                        : `${currentTheme.colors.border} ${currentTheme.colors.hover}`
                    }`}
                  >
                    <Icon className={`text-xl mx-auto mb-1 ${isSelected ? 'text-white' : currentTheme.colors.textSecondary}`} />
                    <span className={`text-xs ${isSelected ? 'text-white' : currentTheme.colors.textSecondary}`}>
                      {method.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Payment Input */}
          {paymentMethod === 'cash' && (
            <div>
              <p className={`text-sm font-medium mb-2 ${currentTheme.colors.text}`}>Amount Paid</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amountPaid}
                  onChange={handleAmountChange}
                  className={`flex-1 px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  min="0"
                  step="0.01"
                />
                <button
                  onClick={() => setAmountPaid(total)}
                  className={`px-3 py-2 rounded-lg ${currentTheme.colors.hover} ${currentTheme.colors.text} text-sm`}
                >
                  Exact
                </button>
              </div>
              
              {/* Change or Shortage Display */}
              {amountPaid >= total && (
                <p className={`text-sm mt-2 ${currentTheme.colors.textSecondary}`}>
                  Change: <span className="text-green-600 font-bold">${change.toFixed(2)}</span>
                </p>
              )}
              
              {isShort && !showInsufficientOptions && (
                <div className="mt-3 space-y-2">
                  <p className={`text-sm text-amber-600 dark:text-amber-400`}>
                    Short by: <span className="font-bold">${remainingAmount.toFixed(2)}</span>
                  </p>
                  <button
                    onClick={handleProceedWithShortage}
                    className={`w-full py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors`}
                  >
                    Proceed with Shortage
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Insufficient Payment Options */}
          {showInsufficientOptions && (
            <div className="space-y-3 p-3 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-900/10">
              <p className={`text-sm font-medium ${currentTheme.colors.text}`}>Choose Payment Option:</p>
              
              {/* Installment Option */}
              <div
                onClick={handleInstallmentOption}
                className={`w-full p-3 rounded-lg border cursor-pointer ${
                  insufficientAction === 'installment' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : currentTheme.colors.border
                } transition-all`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    insufficientAction === 'installment' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <Icons.calendar className="text-lg" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${currentTheme.colors.text}`}>Pay in Installments</p>
                    <p className={`text-xs ${currentTheme.colors.textSecondary} mt-1`}>
                      Pay ${amountPaid.toFixed(2)} now, remaining ${remainingAmount.toFixed(2)} in installments
                    </p>
                    {insufficientAction === 'installment' && (
                      <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={installmentPeriod}
                          onChange={(e) => setInstallmentPeriod(parseInt(e.target.value))}
                          className={`w-full px-2 py-1.5 text-xs rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                        >
                          <option value={3}>3 months (${(remainingAmount/3).toFixed(2)}/month)</option>
                          <option value={6}>6 months (${(remainingAmount/6).toFixed(2)}/month)</option>
                          <option value={12}>12 months (${(remainingAmount/12).toFixed(2)}/month)</option>
                        </select>
                        <p className={`text-[10px] ${currentTheme.colors.textSecondary}`}>
                          Note: Product will be reserved until fully paid
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Credit Sale Option */}
              <div
                onClick={handleCreditOption}
                className={`w-full p-3 rounded-lg border cursor-pointer ${
                  insufficientAction === 'credit' 
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                    : currentTheme.colors.border
                } transition-all`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    insufficientAction === 'credit' 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <Icons.creditCard className="text-lg" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${currentTheme.colors.text}`}>Credit Sale</p>
                    <p className={`text-xs ${currentTheme.colors.textSecondary} mt-1`}>
                      Pay ${amountPaid.toFixed(2)} now, remaining ${remainingAmount.toFixed(2)} on credit
                    </p>
                    {insufficientAction === 'credit' && (
                      <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                        {/* Payment Schedule Selection */}
                        <div>
                          <p className={`text-xs font-medium mb-2 ${currentTheme.colors.text}`}>Payment Schedule:</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={(e) => handleScheduleSelect(e, 'weekly')}
                              className={`p-2 rounded-lg border text-xs ${
                                creditPaymentSchedule === 'weekly'
                                  ? 'bg-purple-500 text-white border-purple-500'
                                  : `${currentTheme.colors.border} ${currentTheme.colors.hover}`
                              }`}
                            >
                              Weekly (7 days)
                            </button>
                            <button
                              onClick={(e) => handleScheduleSelect(e, '3months')}
                              className={`p-2 rounded-lg border text-xs ${
                                creditPaymentSchedule === '3months'
                                  ? 'bg-purple-500 text-white border-purple-500'
                                  : `${currentTheme.colors.border} ${currentTheme.colors.hover}`
                              }`}
                            >
                              3 Months
                            </button>
                            <button
                              onClick={(e) => handleScheduleSelect(e, '6months')}
                              className={`p-2 rounded-lg border text-xs ${
                                creditPaymentSchedule === '6months'
                                  ? 'bg-purple-500 text-white border-purple-500'
                                  : `${currentTheme.colors.border} ${currentTheme.colors.hover}`
                              }`}
                            >
                              6 Months
                            </button>
                            <button
                              onClick={(e) => handleScheduleSelect(e, '12months')}
                              className={`p-2 rounded-lg border text-xs ${
                                creditPaymentSchedule === '12months'
                                  ? 'bg-purple-500 text-white border-purple-500'
                                  : `${currentTheme.colors.border} ${currentTheme.colors.hover}`
                              }`}
                            >
                              12 Months
                            </button>
                          </div>
                        </div>

                        {/* Due Date Display */}
                        <div className={`p-2 rounded-lg ${currentTheme.colors.accentLight}`}>
                          <div className="flex justify-between items-center">
                            <span className={`text-xs ${currentTheme.colors.textSecondary}`}>Due Date:</span>
                            <span className={`text-sm font-medium text-purple-600`}>
                              {new Date(calculateDueDate()).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className={`text-xs ${currentTheme.colors.textSecondary}`}>Remaining:</span>
                            <span className={`text-sm font-medium text-amber-600`}>
                              ${remainingAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Custom Due Date Option */}
                        <div>
                          <p className={`text-xs font-medium mb-1 ${currentTheme.colors.text}`}>Or set custom due date:</p>
                          <input
                            type="date"
                            value={customDueDate}
                            onChange={(e) => setCustomDueDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className={`w-full px-2 py-1.5 text-xs rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                          />
                        </div>

                        <p className={`text-[10px] ${currentTheme.colors.textSecondary}`}>
                          Note: Customer takes product now, payment due by selected date
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card Payment Message */}
          {paymentMethod === 'card' && amountPaid >= total && (
            <div className={`p-4 ${currentTheme.colors.accentLight} rounded-lg text-center`}>
              <Icons.creditCard className={`text-4xl mx-auto mb-2 ${currentTheme.accentText}`} />
              <p className={`text-sm ${currentTheme.colors.text}`}>Tap, insert, or swipe card</p>
              <p className={`text-xs ${currentTheme.colors.textSecondary} mt-1`}>Terminal will connect automatically</p>
            </div>
          )}

          {/* Mobile Payment */}
          {paymentMethod === 'mobile' && amountPaid >= total && (
            <div className={`p-4 ${currentTheme.colors.accentLight} rounded-lg text-center`}>
              <Icons.phone className={`text-4xl mx-auto mb-2 ${currentTheme.accentText}`} />
              <p className={`text-sm ${currentTheme.colors.text}`}>Apple Pay / Google Pay</p>
              <p className={`text-xs ${currentTheme.colors.textSecondary} mt-1`}>Ready for contactless payment</p>
            </div>
          )}

          {/* Gift Card */}
          {paymentMethod === 'gift' && amountPaid >= total && (
            <div>
              <input
                type="text"
                placeholder="Enter gift card number"
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} mb-2`}
              />
              <input
                type="text"
                placeholder="PIN (optional)"
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
              />
            </div>
          )}

          {/* Split Payment */}
          {paymentMethod === 'split' && (
            <div>
              <p className={`text-sm mb-2 ${currentTheme.colors.textSecondary}`}>Split payment methods</p>
              <button className={`w-full p-2 border border-dashed ${currentTheme.colors.border} rounded-lg text-sm ${currentTheme.colors.hover}`}>
                + Add Split Payment
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${currentTheme.colors.border} flex gap-3 sticky bottom-0 ${currentTheme.colors.card}`}>
          <button
            onClick={onClose}
            className={`flex-1 px-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text}`}
          >
            Cancel
          </button>
          
          {/* Determine if payment can proceed */}
          {(() => {
            const canProceed = 
              (paymentMethod === 'cash' && amountPaid >= total) || 
              (paymentMethod === 'cash' && isShort && insufficientAction) ||
              (paymentMethod !== 'cash' && amountPaid >= total);
            
            return (
              <button
                onClick={handlePayment}
                disabled={isProcessing || !canProceed}
                className={`flex-1 px-4 py-2 rounded-lg bg-gradient-to-r ${
                  insufficientAction === 'installment' 
                    ? 'from-blue-500 to-blue-600' 
                    : insufficientAction === 'credit'
                    ? 'from-purple-500 to-purple-600'
                    : currentTheme.colors.accent
                } text-white font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Icons.refresh className="animate-spin" /> Processing...
                  </span>
                ) : (
                  insufficientAction === 'installment' ? 'Start Installment' :
                  insufficientAction === 'credit' ? 'Create Credit Sale' :
                  'Complete Payment'
                )}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}