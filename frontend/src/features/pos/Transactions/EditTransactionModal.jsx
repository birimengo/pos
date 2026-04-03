// src/features/pos/Transactions/EditTransactionModal.jsx

import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Icons } from '../../../components/ui/Icons';

export default function EditTransactionModal({ transaction, onClose, onSave }) {
  const [formData, setFormData] = useState({
    receiptNumber: transaction.receiptNumber || '',
    paymentMethod: transaction.paymentMethod || 'Cash',
    notes: transaction.notes || '',
    status: transaction.status || 'completed',
    isCredit: transaction.isCredit || false,
    isInstallment: transaction.isInstallment || false,
    paid: transaction.paid || 0,
    remaining: transaction.remaining || 0,
    dueDate: transaction.dueDate ? transaction.dueDate.split('T')[0] : '',
    discount: transaction.discount || 0,
    tax: transaction.tax || 0
  });

  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const updatedTransaction = {
      ...transaction,
      receiptNumber: formData.receiptNumber,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes,
      status: formData.status,
      isCredit: formData.isCredit,
      isInstallment: formData.isInstallment,
      paid: parseFloat(formData.paid) || 0,
      remaining: parseFloat(formData.remaining) || 0,
      dueDate: formData.dueDate || null,
      discount: parseFloat(formData.discount) || 0,
      tax: parseFloat(formData.tax) || 0,
      updatedAt: new Date().toISOString()
    };
    
    // Recalculate total if needed
    if (updatedTransaction.discount || updatedTransaction.tax) {
      updatedTransaction.total = updatedTransaction.subtotal - updatedTransaction.discount + updatedTransaction.tax;
    }
    
    // Ensure fullyPaid is set correctly
    updatedTransaction.fullyPaid = updatedTransaction.remaining <= 0;
    
    onSave(updatedTransaction);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className={`w-full max-w-2xl ${currentTheme.colors.card} rounded-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center`}>
          <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Edit Transaction</h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg ${currentTheme.colors.hover}`}
          >
            <Icons.x className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
                Receipt Number
              </label>
              <input
                type="text"
                value={formData.receiptNumber}
                onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                required
              />
            </div>
            <div>
              <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
                Payment Method
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Money">Mobile Money</option>
              </select>
            </div>
          </div>

          {/* Transaction Type */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isCredit}
                onChange={(e) => setFormData({ ...formData, isCredit: e.target.checked })}
                className="rounded"
              />
              <span className={`text-sm ${currentTheme.colors.text}`}>Credit Sale</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isInstallment}
                onChange={(e) => setFormData({ ...formData, isInstallment: e.target.checked })}
                className="rounded"
              />
              <span className={`text-sm ${currentTheme.colors.text}`}>Installment Sale</span>
            </label>
          </div>

          {/* Payment Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
                Paid Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.paid}
                onChange={(e) => setFormData({ ...formData, paid: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
              />
            </div>
            <div>
              <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
                Remaining Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.remaining}
                onChange={(e) => setFormData({ ...formData, remaining: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
              />
            </div>
          </div>

          {/* Due Date (for credit/installment) */}
          {(formData.isCredit || formData.isInstallment) && (
            <div>
              <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
              />
            </div>
          )}

          {/* Discount and Tax */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
                Discount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
              />
            </div>
            <div>
              <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
                Tax
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.tax}
                onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="3"
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
            />
          </div>

          {/* Summary */}
          <div className={`p-3 rounded-lg ${currentTheme.colors.accentLight}`}>
            <div className="flex justify-between text-sm mb-1">
              <span>Subtotal:</span>
              <span>{formatCurrency(transaction.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1 text-green-600">
              <span>Discount:</span>
              <span>-{formatCurrency(formData.discount)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span>Tax:</span>
              <span>{formatCurrency(formData.tax)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-1 border-t">
              <span>Total:</span>
              <span>{formatCurrency(transaction.subtotal - formData.discount + formData.tax)}</span>
            </div>
          </div>
        </form>

        <div className={`p-4 border-t ${currentTheme.colors.border} flex gap-3`}>
          <button
            onClick={onClose}
            className={`flex-1 px-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text}`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`flex-1 px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white font-semibold`}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}