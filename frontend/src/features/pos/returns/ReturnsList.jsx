// src/features/pos/returns/ReturnsList.jsx

import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Icons } from '../../../components/ui/Icons';
import { transactionService } from '../services/transactionService';

export default function ReturnsList() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  useEffect(() => {
    loadReturns();
  }, []);

  const loadReturns = async () => {
    setLoading(true);
    try {
      const allReturns = await transactionService.getReturnTransactions();
      setReturns(allReturns);
    } catch (error) {
      console.error('Failed to load returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
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

  const filteredReturns = returns.filter(r => {
    if (filter === 'return') return r.type === 'return';
    if (filter === 'damage') return r.type === 'damage';
    return true;
  });

  const totalRefunded = filteredReturns.reduce((sum, r) => sum + r.totalRefund, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className={`text-xl font-bold ${currentTheme.colors.text}`}>Returns & Damages</h1>
        <button
          onClick={loadReturns}
          className={`px-3 py-1.5 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex items-center gap-2`}
        >
          <Icons.refresh className="text-sm" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-4 rounded-lg ${currentTheme.colors.card} border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total Returns</p>
          <p className={`text-2xl font-bold ${currentTheme.accentText}`}>
            {returns.filter(r => r.type === 'return').length}
          </p>
        </div>
        <div className={`p-4 rounded-lg ${currentTheme.colors.card} border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total Refunded</p>
          <p className={`text-2xl font-bold text-green-600`}>{formatCurrency(totalRefunded)}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-xs rounded-full ${
            filter === 'all'
              ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white`
              : `${currentTheme.colors.hover}`
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('return')}
          className={`px-3 py-1 text-xs rounded-full ${
            filter === 'return'
              ? 'bg-green-500 text-white'
              : `${currentTheme.colors.hover} text-green-600`
          }`}
        >
          Returns
        </button>
        <button
          onClick={() => setFilter('damage')}
          className={`px-3 py-1 text-xs rounded-full ${
            filter === 'damage'
              ? 'bg-red-500 text-white'
              : `${currentTheme.colors.hover} text-red-600`
          }`}
        >
          Damages
        </button>
      </div>

      {/* Returns List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Icons.refresh className={`animate-spin text-2xl ${currentTheme.colors.textMuted}`} />
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="text-center py-12">
          <Icons.refresh className="text-4xl mx-auto mb-2 text-gray-400" />
          <p className={`text-sm ${currentTheme.colors.textMuted}`}>No returns or damages recorded</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReturns.map(returnItem => (
            <div
              key={returnItem.id}
              className={`p-4 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      returnItem.type === 'return'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {returnItem.type === 'return' ? 'Return' : 'Damage'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      returnItem.condition === 'good'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {returnItem.condition === 'good' ? 'Good Condition' : 'Bad Condition'}
                    </span>
                  </div>
                  <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
                    Original Receipt: {returnItem.originalReceiptNumber}
                  </p>
                  <p className={`text-xs ${currentTheme.colors.textMuted}`}>
                    Date: {formatDate(returnItem.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold text-green-600`}>
                    {formatCurrency(returnItem.totalRefund)}
                  </p>
                  <p className={`text-xs ${currentTheme.colors.textMuted}`}>
                    Refund Amount
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className={`border-t ${currentTheme.colors.border} pt-3`}>
                <h3 className={`text-xs font-medium mb-2 ${currentTheme.colors.text}`}>Items</h3>
                <div className="space-y-1">
                  {returnItem.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span>{item.productName} x{item.quantity}</span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reason */}
              {returnItem.reason && (
                <div className={`border-t ${currentTheme.colors.border} pt-2 mt-2`}>
                  <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Reason:</p>
                  <p className={`text-xs ${currentTheme.colors.text}`}>{returnItem.reason}</p>
                </div>
              )}

              {/* Customer */}
              {returnItem.customer && (
                <div className={`border-t ${currentTheme.colors.border} pt-2 mt-2`}>
                  <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Customer:</p>
                  <p className={`text-xs ${currentTheme.colors.text}`}>{returnItem.customer.name}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}