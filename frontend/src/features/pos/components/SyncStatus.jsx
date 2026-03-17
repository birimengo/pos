// src/features/pos/components/SyncStatus.jsx
import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useSync } from '../context/SyncContext';
import { Icons } from '../../../components/ui/Icons';

export default function SyncStatus() {
  const [showDetails, setShowDetails] = useState(false);
  const { theme, getTheme } = useTheme();
  const { syncStatus, syncStats, triggerSync, lastSync } = useSync();
  const currentTheme = getTheme(theme);

  const getStatusColor = () => {
    if (!syncStats.isOnline) return 'text-gray-500';
    if (syncStats.unsyncedTransactions > 0) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusText = () => {
    if (!syncStats.isOnline) return 'Offline';
    if (syncStats.unsyncedTransactions > 0) 
      return `${syncStats.unsyncedTransactions} pending`;
    return 'Synced';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${currentTheme.colors.hover}`}
      >
        <div className="relative">
          <Icons.cloud className={`text-lg ${getStatusColor()}`} />
          {syncStats.unsyncedTransactions > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          )}
        </div>
        <span className={`text-xs ${currentTheme.colors.textSecondary}`}>
          {getStatusText()}
        </span>
      </button>

      {showDetails && (
        <div className={`absolute right-0 mt-2 w-64 ${currentTheme.colors.card} rounded-lg shadow-xl border ${currentTheme.colors.border} z-50 p-3`}>
          <h3 className={`text-sm font-semibold mb-2 ${currentTheme.colors.text}`}>Sync Status</h3>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className={currentTheme.colors.textSecondary}>Status:</span>
              <span className={syncStats.isOnline ? 'text-green-500' : 'text-gray-500'}>
                {syncStats.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className={currentTheme.colors.textSecondary}>Pending Transactions:</span>
              <span className={syncStats.unsyncedTransactions > 0 ? 'text-yellow-500' : 'text-green-500'}>
                {syncStats.unsyncedTransactions}
              </span>
            </div>

            <div className="flex justify-between">
              <span className={currentTheme.colors.textSecondary}>Pending Products:</span>
              <span>{syncStats.unsyncedProducts}</span>
            </div>

            <div className="flex justify-between">
              <span className={currentTheme.colors.textSecondary}>Pending Customers:</span>
              <span>{syncStats.unsyncedCustomers}</span>
            </div>

            {lastSync && (
              <div className="flex justify-between">
                <span className={currentTheme.colors.textSecondary}>Last Sync:</span>
                <span>{new Date(lastSync).toLocaleTimeString()}</span>
              </div>
            )}

            {syncStatus && (
              <div className={`mt-2 p-2 rounded ${
                syncStatus.type === 'cloud-sync-complete' ? 'bg-green-100 text-green-700' :
                syncStatus.type === 'cloud-sync-error' ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {syncStatus.message}
              </div>
            )}

            <button
              onClick={triggerSync}
              disabled={!syncStats.isOnline}
              className={`w-full mt-2 py-1.5 rounded-lg text-xs ${
                syncStats.isOnline
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              Sync Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}