// src/features/pos/inventory/StockAdjustmentModal.jsx
import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Icons } from '../../../components/ui/Icons';

export default function StockAdjustmentModal({ product, onClose, onAdjust }) {
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('restock');
  const [note, setNote] = useState('');

  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  const handleAdjust = () => {
    if (quantity === 0) return;
    onAdjust(product.id, quantity, { reason, note });
  };

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
          <div className={`p-3 ${currentTheme.colors.accentLight} rounded-lg`}>
            <p className={`text-sm ${currentTheme.colors.textSecondary}`}>Product</p>
            <p className={`font-medium ${currentTheme.colors.text}`}>{product.name}</p>
            <p className={`text-xs ${currentTheme.colors.textMuted}`}>Current Stock: {product.stock}</p>
          </div>

          <div>
            <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Adjustment Type</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
            >
              <option value="restock">Restock (+)</option>
              <option value="sale">Sale (-)</option>
              <option value="return">Return (+)</option>
              <option value="damage">Damage (-)</option>
              <option value="count">Count Adjustment</option>
            </select>
          </div>

          <div>
            <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Quantity</label>
            <div className="flex gap-2">
              <input
                type="number"
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

          <div>
            <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Note (Optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows="2"
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
              placeholder="Add reason for adjustment..."
            />
          </div>

          <div className={`p-3 ${currentTheme.colors.card} border ${currentTheme.colors.border} rounded-lg`}>
            <div className="flex justify-between text-sm">
              <span className={currentTheme.colors.textSecondary}>New Stock:</span>
              <span className={`font-bold ${currentTheme.accentText}`}>
                {product.stock + (reason === 'sale' || reason === 'damage' ? -quantity : quantity)}
              </span>
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