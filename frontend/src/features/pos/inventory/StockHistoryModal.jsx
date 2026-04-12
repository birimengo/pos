// src/features/pos/inventory/StockHistoryModal.jsx

import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Icons } from '../../../components/ui/Icons';
import { db } from '../services/database';

export default function StockHistoryModal({ product, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ totalAdded: 0, totalRemoved: 0, netChange: 0 });
  
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  useEffect(() => {
    loadStockHistory();
  }, [product, filter]);

  // Calculate statistics from history
  const calculateStats = (historyData) => {
    const totalAdded = historyData
      .filter(h => h.quantityChange > 0)
      .reduce((sum, h) => sum + h.quantityChange, 0);
    const totalRemoved = historyData
      .filter(h => h.quantityChange < 0)
      .reduce((sum, h) => sum + Math.abs(h.quantityChange), 0);
    const netChange = totalAdded - totalRemoved;
    
    return { totalAdded, totalRemoved, netChange };
  };

  const loadStockHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load from local IndexedDB only (cloud sync will be added later)
      await loadLocalStockHistory();
    } catch (error) {
      console.error('Failed to load stock history:', error);
      setError('Failed to load stock history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadLocalStockHistory = async () => {
    try {
      await db.ensureInitialized();
      
      let localHistory = [];
      try {
        localHistory = await db.getAll('stockHistory') || [];
      } catch (e) {
        console.log('Stock history store not found, creating empty array');
        localHistory = [];
      }
      
      // Filter history for this product
      const productHistory = localHistory.filter(h => 
        String(h.productId) === String(product._id) || 
        String(h.productId) === String(product.id) ||
        h.productName === product.name
      );
      
      if (productHistory.length > 0) {
        // Apply filter
        let filteredHistory = productHistory;
        if (filter !== 'all') {
          filteredHistory = productHistory.filter(h => h.adjustmentType === filter);
        }
        setHistory(filteredHistory);
        setStats(calculateStats(productHistory));
      } else {
        setHistory([]);
        setStats({ totalAdded: 0, totalRemoved: 0, netChange: 0 });
      }
    } catch (error) {
      console.error('Failed to load local stock history:', error);
      setHistory([]);
      setStats({ totalAdded: 0, totalRemoved: 0, netChange: 0 });
    }
  };

  const getAdjustmentIcon = (type) => {
    switch(type) {
      case 'restock': return <Icons.package className="text-green-500" />;
      case 'sale': return <Icons.shoppingBag className="text-blue-500" />;
      case 'return': return <Icons.refresh className="text-purple-500" />;
      case 'damage': return <Icons.alert className="text-red-500" />;
      case 'count': return <Icons.check className="text-cyan-500" />;
      case 'transfer': return <Icons.truck className="text-orange-500" />;
      case 'transaction_delete': return <Icons.trash className="text-red-500" />;
      default: return <Icons.edit className="text-gray-500" />;
    }
  };

  const getAdjustmentLabel = (type) => {
    switch(type) {
      case 'restock': return 'Restock';
      case 'sale': return 'Sale';
      case 'return': return 'Return';
      case 'damage': return 'Damage';
      case 'count': return 'Count';
      case 'transfer': return 'Transfer';
      case 'transaction_delete': return 'Transaction Deleted';
      default: return type || 'Adjustment';
    }
  };

  const getAdjustmentColor = (type) => {
    switch(type) {
      case 'restock': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      case 'sale': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
      case 'return': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400';
      case 'damage': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'count': return 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20 dark:text-cyan-400';
      case 'transfer': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400';
      case 'transaction_delete': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const refreshHistory = () => {
    loadStockHistory();
  };

  // Apply filter to displayed history
  const getFilteredHistory = () => {
    if (filter === 'all') return history;
    return history.filter(h => h.adjustmentType === filter);
  };

  const displayHistory = getFilteredHistory();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-4xl ${currentTheme.colors.card} rounded-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center sticky top-0 ${currentTheme.colors.card} z-10`}>
          <div>
            <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Stock History</h2>
            <p className={`text-xs ${currentTheme.colors.textMuted}`}>
              {product.name} (SKU: {product.sku})
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refreshHistory}
              className={`p-1 rounded-lg ${currentTheme.colors.hover}`}
              title="Refresh"
              disabled={loading}
            >
              <Icons.refresh className={`text-lg ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className={`p-1 rounded-lg ${currentTheme.colors.hover}`}
            >
              <Icons.x className="text-xl" />
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        {history.length > 0 && !loading && (
          <div className={`p-4 border-b ${currentTheme.colors.border} grid grid-cols-3 gap-3`}>
            <div className={`p-2 rounded-lg text-center ${currentTheme.colors.accentLight}`}>
              <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total Added</p>
              <p className={`text-lg font-bold text-green-600 dark:text-green-400`}>
                +{stats.totalAdded}
              </p>
            </div>
            <div className={`p-2 rounded-lg text-center ${currentTheme.colors.accentLight}`}>
              <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total Removed</p>
              <p className={`text-lg font-bold text-red-600 dark:text-red-400`}>
                -{stats.totalRemoved}
              </p>
            </div>
            <div className={`p-2 rounded-lg text-center ${currentTheme.colors.accentLight}`}>
              <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Net Change</p>
              <p className={`text-lg font-bold ${stats.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.netChange >= 0 ? `+${stats.netChange}` : stats.netChange}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={`p-4 border-b ${currentTheme.colors.border}`}>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'all'
                  ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white`
                  : `${currentTheme.colors.hover} ${currentTheme.colors.textSecondary}`
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('restock')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'restock'
                  ? 'bg-green-500 text-white'
                  : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
              }`}
            >
              📦 Restock
            </button>
            <button
              onClick={() => setFilter('sale')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'sale'
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
              }`}
            >
              🛒 Sale
            </button>
            <button
              onClick={() => setFilter('return')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'return'
                  ? 'bg-purple-500 text-white'
                  : 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
              }`}
            >
              🔄 Return
            </button>
            <button
              onClick={() => setFilter('damage')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'damage'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
              }`}
            >
              ⚠️ Damage
            </button>
            <button
              onClick={() => setFilter('count')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'count'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400'
              }`}
            >
              📊 Count
            </button>
            <button
              onClick={() => setFilter('transaction_delete')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'transaction_delete'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
              }`}
            >
              🗑️ Deleted
            </button>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="text-center">
                <Icons.refresh className={`animate-spin text-3xl ${currentTheme.colors.textMuted} mb-2`} />
                <p className={`text-sm ${currentTheme.colors.textMuted}`}>Loading history...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <Icons.alert className="text-4xl mx-auto mb-2 text-red-400" />
              <p className={`text-sm ${currentTheme.colors.textMuted}`}>{error}</p>
              <button
                onClick={refreshHistory}
                className={`mt-3 px-4 py-2 text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white`}
              >
                Try Again
              </button>
            </div>
          ) : displayHistory.length === 0 ? (
            <div className="text-center py-12">
              <Icons.history className="text-4xl mx-auto mb-2 text-gray-400" />
              <p className={`text-sm ${currentTheme.colors.textMuted}`}>No stock history found</p>
              <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
                {filter !== 'all' 
                  ? `No records found for filter: ${filter}`
                  : 'Stock changes will appear here when products are sold, restocked, or adjusted'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayHistory.map((record, idx) => (
                <div key={idx} className={`p-4 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} hover:shadow-md transition-shadow`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getAdjustmentIcon(record.adjustmentType)}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getAdjustmentColor(record.adjustmentType)}`}>
                        {getAdjustmentLabel(record.adjustmentType)}
                      </span>
                      {record.transactionReceipt && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${currentTheme.colors.accentLight} ${currentTheme.accentText}`}>
                          Receipt: {record.transactionReceipt}
                        </span>
                      )}
                    </div>
                    <span className={`text-xs ${currentTheme.colors.textMuted}`}>
                      {formatDate(record.createdAt)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-center flex-1">
                      <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Previous</p>
                      <p className={`text-base font-bold ${currentTheme.colors.text}`}>{record.previousStock}</p>
                    </div>
                    <Icons.arrowRight className={`text-gray-400 mx-2`} />
                    <div className="text-center flex-1">
                      <p className={`text-xs ${currentTheme.colors.textSecondary}`}>New</p>
                      <p className={`text-base font-bold ${currentTheme.accentText}`}>{record.newStock}</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Change</p>
                      <p className={`text-base font-bold ${record.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {record.quantityChange > 0 ? `+${record.quantityChange}` : record.quantityChange}
                      </p>
                    </div>
                  </div>
                  
                  {(record.reason || record.notes) && (
                    <div className={`mt-2 pt-2 border-t ${currentTheme.colors.border}`}>
                      {record.reason && (
                        <div className="flex items-start gap-1 mb-1">
                          <Icons.info className="text-xs text-gray-400 mt-0.5" />
                          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>
                            <span className="font-medium">Reason:</span> {record.reason}
                          </p>
                        </div>
                      )}
                      {record.notes && (
                        <p className={`text-xs ${currentTheme.colors.textSecondary} mt-1 ml-4`}>
                          {record.notes}
                        </p>
                      )}
                      {record.performedBy && (
                        <p className={`text-[10px] ${currentTheme.colors.textMuted} mt-1 flex items-center gap-1`}>
                          <Icons.user className="text-[10px]" />
                          By: {record.performedBy}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${currentTheme.colors.border} flex justify-between items-center sticky bottom-0 ${currentTheme.colors.card}`}>
          <div className={`text-xs ${currentTheme.colors.textMuted}`}>
            {displayHistory.length > 0 && !loading && `${displayHistory.length} records found`}
          </div>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}