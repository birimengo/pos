// src/features/pos/inventory/StockAdjustmentModal.jsx

import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Icons } from '../../../components/ui/Icons';

export default function StockAdjustmentModal({ product, onClose, onAdjust }) {
  const [quantity, setQuantity] = useState(0);
  const [adjustmentType, setAdjustmentType] = useState('add');
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');

  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  // Predefined reasons for different adjustment types
  const getReasonOptions = () => {
    if (adjustmentType === 'add') {
      return [
        { value: 'Restock', label: '📦 Restock / New Shipment', type: 'restock' },
        { value: 'Return', label: '🔄 Customer Return', type: 'return' },
        { value: 'Transfer In', label: '🚚 Transfer from Another Store', type: 'transfer' },
        { value: 'Count Correction (Increase)', label: '📊 Physical Count (Increase)', type: 'count' },
        { value: 'Gift', label: '🎁 Gift / Donation', type: 'restock' },
        { value: 'Manufacturer Credit', label: '🏭 Manufacturer Credit', type: 'restock' }
      ];
    } else {
      return [
        { value: 'Damage', label: '⚠️ Damage / Loss', type: 'damage' },
        { value: 'Theft', label: '🔒 Theft / Missing', type: 'damage' },
        { value: 'Expired', label: '📅 Expired Product', type: 'damage' },
        { value: 'Transfer Out', label: '🚚 Transfer to Another Store', type: 'transfer' },
        { value: 'Count Correction (Decrease)', label: '📊 Physical Count (Decrease)', type: 'count' },
        { value: 'Customer Return (Defective)', label: '🔄 Customer Return (Defective)', type: 'return' },
        { value: 'Quality Control', label: '🔍 Quality Control Failed', type: 'damage' }
      ];
    }
  };

  const handleAdjust = () => {
    if (quantity === 0) return;
    
    const change = adjustmentType === 'add' ? quantity : -quantity;
    const selectedReason = customReason || reason;
    
    // Determine adjustment type for stock history
    let historyType = adjustmentType === 'add' ? 'restock' : 'damage';
    
    if (selectedReason === 'Return' || selectedReason === 'Customer Return' || selectedReason === 'Customer Return (Defective)') {
      historyType = 'return';
    } else if (selectedReason === 'Damage' || selectedReason === 'Theft' || selectedReason === 'Expired' || selectedReason === 'Quality Control') {
      historyType = 'damage';
    } else if (selectedReason === 'Count Correction (Increase)' || selectedReason === 'Count Correction (Decrease)') {
      historyType = 'count';
    } else if (selectedReason === 'Restock' || selectedReason === 'Gift' || selectedReason === 'Manufacturer Credit') {
      historyType = 'restock';
    } else if (selectedReason === 'Transfer In' || selectedReason === 'Transfer Out') {
      historyType = 'transfer';
    }
    
    onAdjust(product.id, change, {
      adjustmentType: historyType,
      reason: selectedReason || (adjustmentType === 'add' ? 'Manual Restock' : 'Manual Removal'),
      notes: notes,
      previousStock: product.stock,
      newStock: adjustmentType === 'add' ? product.stock + quantity : product.stock - quantity
    });
  };

  const newStock = adjustmentType === 'add' 
    ? product.stock + quantity 
    : product.stock - quantity;

  const isRemoveExceedingStock = adjustmentType === 'remove' && quantity > product.stock;
  const reasonOptions = getReasonOptions();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center sticky top-0 ${currentTheme.colors.card} z-10`}>
          <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Adjust Stock</h2>
          <button onClick={onClose} className={`p-1 rounded-lg ${currentTheme.colors.hover}`}>
            <Icons.x className="text-xl" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Product Info */}
          <div className={`p-3 ${currentTheme.colors.accentLight} rounded-lg`}>
            <p className={`text-sm font-medium ${currentTheme.colors.text}`}>{product.name}</p>
            <p className={`text-xs ${currentTheme.colors.textMuted}`}>SKU: {product.sku}</p>
            <div className="flex justify-between mt-2">
              <span className={`text-xs ${currentTheme.colors.textSecondary}`}>Current Stock:</span>
              <span className={`text-sm font-bold ${currentTheme.accentText}`}>{product.stock}</span>
            </div>
          </div>

          {/* Adjustment Type */}
          <div>
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-2`}>Adjustment Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAdjustmentType('add')}
                className={`flex-1 py-2 rounded-lg border transition-all ${
                  adjustmentType === 'add'
                    ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white border-transparent`
                    : `${currentTheme.colors.border} ${currentTheme.colors.hover}`
                }`}
              >
                <Icons.add className="inline mr-1 text-sm" /> Add Stock
              </button>
              <button
                onClick={() => setAdjustmentType('remove')}
                className={`flex-1 py-2 rounded-lg border transition-all ${
                  adjustmentType === 'remove'
                    ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white border-transparent`
                    : `${currentTheme.colors.border} ${currentTheme.colors.hover}`
                }`}
              >
                <Icons.minus className="inline mr-1 text-sm" /> Remove Stock
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>Quantity</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max={adjustmentType === 'remove' ? product.stock : undefined}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className={`flex-1 px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                placeholder="Enter quantity"
              />
              <button
                onClick={() => setQuantity(prev => prev + 1)}
                className={`px-3 py-2 rounded-lg ${currentTheme.colors.accentLight} ${currentTheme.colors.accentText} hover:opacity-80 transition-opacity`}
                title="Increase by 1"
              >
                <Icons.add className="text-sm" />
              </button>
              <button
                onClick={() => setQuantity(prev => Math.max(0, prev - 1))}
                className={`px-3 py-2 rounded-lg ${currentTheme.colors.accentLight} ${currentTheme.colors.accentText} hover:opacity-80 transition-opacity`}
                title="Decrease by 1"
              >
                <Icons.minus className="text-sm" />
              </button>
            </div>
            {isRemoveExceedingStock && (
              <p className={`text-xs text-red-500 mt-1 flex items-center gap-1`}>
                <Icons.alert className="text-xs" />
                Cannot remove more than current stock ({product.stock})
              </p>
            )}
            {quantity > 0 && (
              <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
                {adjustmentType === 'add' 
                  ? `Will add ${quantity} unit${quantity > 1 ? 's' : ''} to inventory`
                  : `Will remove ${quantity} unit${quantity > 1 ? 's' : ''} from inventory`
                }
              </p>
            )}
          </div>

          {/* Reason Selection */}
          <div>
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
              Reason <span className="text-xs text-gray-400">(Optional but recommended)</span>
            </label>
            <select
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value) setCustomReason('');
              }}
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">Select a reason</option>
              {reasonOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Or enter custom reason..."
              value={customReason}
              onChange={(e) => {
                setCustomReason(e.target.value);
                if (e.target.value) setReason('');
              }}
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          {/* Notes */}
          <div>
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="2"
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} resize-none focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Add additional notes about this stock adjustment..."
            />
          </div>

          {/* New Stock Preview */}
          <div className={`p-3 ${currentTheme.colors.card} border ${currentTheme.colors.border} rounded-lg bg-opacity-50`}>
            <div className="flex justify-between items-center">
              <div className="text-center flex-1">
                <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Previous Stock</p>
                <p className={`text-base font-bold ${currentTheme.colors.text}`}>{product.stock}</p>
              </div>
              <div className="flex flex-col items-center">
                <Icons.arrowRight className={`text-gray-400`} />
                <span className={`text-xs ${adjustmentType === 'add' ? 'text-green-600' : 'text-red-600'} font-medium`}>
                  {adjustmentType === 'add' ? `+${quantity}` : `-${quantity}`}
                </span>
              </div>
              <div className="text-center flex-1">
                <p className={`text-xs ${currentTheme.colors.textSecondary}`}>New Stock</p>
                <p className={`text-xl font-bold ${currentTheme.accentText}`}>{newStock}</p>
              </div>
            </div>
          </div>

          {/* Warning for large adjustments */}
          {quantity > 100 && (
            <div className={`p-2 rounded-lg ${adjustmentType === 'add' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
              <p className={`text-xs flex items-center gap-1 ${adjustmentType === 'add' ? 'text-blue-600' : 'text-yellow-600'}`}>
                <Icons.alert className="text-xs" />
                {adjustmentType === 'add' 
                  ? `Adding ${quantity} units is a large adjustment. Please verify.`
                  : `Removing ${quantity} units is a large adjustment. Please verify.`
                }
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${currentTheme.colors.border} flex gap-3 sticky bottom-0 ${currentTheme.colors.card}`}>
          <button
            onClick={onClose}
            className={`flex-1 px-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text} transition-all`}
          >
            Cancel
          </button>
          <button
            onClick={handleAdjust}
            disabled={quantity === 0 || isRemoveExceedingStock}
            className={`flex-1 px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md`}
          >
            Confirm Adjustment
          </button>
        </div>
      </div>
    </div>
  );
}