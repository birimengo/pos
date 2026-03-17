// src/features/pos/inventory/StockAdjustmentModal.jsx
import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Icons } from '../../../components/ui/Icons';

export default function StockAdjustmentModal({ product, onClose, onAdjust }) {
  const [quantity, setQuantity] = useState(0);
  const [adjustmentType, setAdjustmentType] = useState('add');
  const [reason, setReason] = useState('');

  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  const handleAdjust = () => {
    if (quantity === 0) return;
    
    const change = adjustmentType === 'add' ? quantity : -quantity;
    onAdjust(product.id, change, reason);
  };

  const newStock = adjustmentType === 'add' 
    ? product.stock + quantity 
    : product.stock - quantity;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl`}>
        {/* Header */}
        <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center`}>
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
            <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Adjustment Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAdjustmentType('add')}
                className={`flex-1 py-2 rounded-lg border transition-all ${
                  adjustmentType === 'add'
                    ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white border-transparent`
                    : `${currentTheme.colors.border} ${currentTheme.colors.hover}`
                }`}
              >
                <Icons.add className="inline mr-1" /> Add Stock
              </button>
              <button
                onClick={() => setAdjustmentType('remove')}
                className={`flex-1 py-2 rounded-lg border transition-all ${
                  adjustmentType === 'remove'
                    ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white border-transparent`
                    : `${currentTheme.colors.border} ${currentTheme.colors.hover}`
                }`}
              >
                <Icons.minus className="inline mr-1" /> Remove Stock
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Quantity</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max={adjustmentType === 'remove' ? product.stock : undefined}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className={`flex-1 px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
              />
              <button
                onClick={() => setQuantity(prev => prev + 1)}
                className={`px-3 py-2 rounded-lg ${currentTheme.colors.accentLight} ${currentTheme.colors.accentText}`}
              >
                <Icons.add className="text-sm" />
              </button>
              <button
                onClick={() => setQuantity(prev => Math.max(0, prev - 1))}
                className={`px-3 py-2 rounded-lg ${currentTheme.colors.accentLight} ${currentTheme.colors.accentText}`}
              >
                <Icons.minus className="text-sm" />
              </button>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Reason (Optional)</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} mb-2`}
            >
              <option value="">Select a reason</option>
              <option value="Restock">Restock</option>
              <option value="Damage">Damage/Loss</option>
              <option value="Return">Customer Return</option>
              <option value="Count">Physical Count</option>
              <option value="Transfer">Store Transfer</option>
            </select>
            <input
              type="text"
              placeholder="Or enter custom reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
            />
          </div>

          {/* New Stock Preview */}
          <div className={`p-3 ${currentTheme.colors.card} border ${currentTheme.colors.border} rounded-lg`}>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${currentTheme.colors.textSecondary}`}>New Stock:</span>
              <span className={`text-lg font-bold ${currentTheme.accentText}`}>{newStock}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${currentTheme.colors.border} flex gap-3`}>
          <button
            onClick={onClose}
            className={`flex-1 px-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text}`}
          >
            Cancel
          </button>
          <button
            onClick={handleAdjust}
            disabled={quantity === 0}
            className={`flex-1 px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white font-semibold disabled:opacity-50`}
          >
            Confirm Adjustment
          </button>
        </div>
      </div>
    </div>
  );
}