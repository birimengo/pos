// src/features/pos/components/CloudSyncManager.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { cloudSync } from '../services/cloudSyncService';
import { Icons } from '../../../components/ui/Icons';

export default function CloudSyncManager({ onClose }) {
  const [status, setStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [syncStats, setSyncStats] = useState(null);
  const [autoSync, setAutoSync] = useState(true);
  
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  useEffect(() => {
    loadStatus();
    loadSyncStats();
    
    const handleSyncStatus = (status) => {
      setSyncMessage(status.message);
      if (status.type === 'sync-complete' || status.type === 'sync-error') {
        setSyncing(false);
        setRestoring(false);
        loadStatus();
        loadSyncStats();
      }
    };

    cloudSync.addListener(handleSyncStatus);
    checkAutoSync();
    
    return () => {
      cloudSync.removeListener(handleSyncStatus);
    };
  }, []);

  const loadStatus = async () => {
    const syncStatus = await cloudSync.getSyncStatus();
    setStatus(syncStatus);
  };

  const loadSyncStats = async () => {
    const stats = await cloudSync.getSyncStats();
    setSyncStats(stats);
  };

  const checkAutoSync = async () => {
    const autoSyncEnabled = localStorage.getItem('autoSync') !== 'false';
    setAutoSync(autoSyncEnabled);
    
    if (autoSyncEnabled && navigator.onLine) {
      const lastSync = localStorage.getItem('lastCloudSync');
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      if (!lastSync || lastSync < oneDayAgo) {
        handleFullSync();
      }
    }
  };

  const handleFullSync = async () => {
    setSyncing(true);
    setSyncMessage('Starting full sync with cloud...');
    const result = await cloudSync.fullSync();
    
    if (result.success) {
      setSyncMessage(`✅ Sync complete: ${result.stats.pulled} items pulled, ${result.stats.pushed} items pushed`);
    } else {
      setSyncMessage(`❌ Sync failed: ${result.error}`);
    }
    
    setSyncing(false);
    loadStatus();
    loadSyncStats();
  };

  const handlePullFromCloud = async () => {
    setSyncing(true);
    setSyncMessage('Pulling all data from cloud...');
    const result = await cloudSync.pullFromCloud();
    
    if (result.success) {
      setSyncMessage(`✅ Pulled ${result.count} items from cloud`);
    } else {
      setSyncMessage(`❌ Pull failed: ${result.error}`);
    }
    
    setSyncing(false);
    loadStatus();
    loadSyncStats();
  };

  const handlePushToCloud = async () => {
    setSyncing(true);
    setSyncMessage('Pushing local data to cloud...');
    const result = await cloudSync.pushToCloud();
    
    if (result.success) {
      setSyncMessage(`✅ Pushed ${result.count} items to cloud`);
    } else {
      setSyncMessage(`❌ Push failed: ${result.error}`);
    }
    
    setSyncing(false);
    loadStatus();
    loadSyncStats();
  };

  const handleRestore = async () => {
    setShowConfirm(true);
  };

  const confirmRestore = async () => {
    setShowConfirm(false);
    setRestoring(true);
    setSyncMessage('Restoring from cloud backup...');
    
    const result = await cloudSync.restoreFromCloud({ clearLocal: true });
    
    if (result.success) {
      setSyncMessage('✅ Restore complete! Reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      setSyncMessage(`❌ Restore failed: ${result.error}`);
      setRestoring(false);
    }
  };

  const toggleAutoSync = () => {
    const newValue = !autoSync;
    setAutoSync(newValue);
    localStorage.setItem('autoSync', newValue);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className={`w-full max-w-2xl ${currentTheme.colors.card} rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200`}>
          {/* Header */}
          <div className={`p-4 sm:p-6 border-b ${currentTheme.colors.border} flex justify-between items-center sticky top-0 ${currentTheme.colors.card} z-10`}>
            <div className="flex items-center gap-2">
              <Icons.cloud className={`text-xl sm:text-2xl ${currentTheme.accentText}`} />
              <h2 className={`text-lg sm:text-xl font-semibold ${currentTheme.colors.text}`}>
                Cloud Sync Manager
              </h2>
            </div>
            <button 
              onClick={onClose} 
              className={`p-2 rounded-lg ${currentTheme.colors.hover} transition-colors`}
              disabled={syncing || restoring}
            >
              <Icons.x className="text-xl" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Connection Status */}
            <div className={`p-4 rounded-lg ${
              status?.isOnline 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`relative flex h-3 w-3`}>
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                      status?.isOnline ? 'bg-green-400' : 'bg-yellow-400'
                    } opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${
                      status?.isOnline ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></span>
                  </span>
                  <span className={`text-sm font-medium ${
                    status?.isOnline ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'
                  }`}>
                    {status?.isOnline ? 'Connected to cloud' : 'Offline - Connect to internet'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Last sync: {formatDate(status?.lastSync)}
                </div>
              </div>
            </div>

            {/* Auto Sync Toggle */}
            <div className={`flex items-center justify-between p-4 ${currentTheme.colors.accentLight} rounded-lg border ${currentTheme.colors.border}`}>
              <div>
                <p className={`text-sm font-medium ${currentTheme.colors.text}`}>Auto Sync</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Automatically sync data when online</p>
              </div>
              <button
                onClick={toggleAutoSync}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  autoSync ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoSync ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Sync Status Message */}
            {syncMessage && (
              <div className={`p-4 rounded-lg text-sm ${
                syncMessage.includes('✅') 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                  : syncMessage.includes('❌')
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
              }`}>
                <div className="flex items-center gap-2">
                  {syncMessage.includes('✅') && <Icons.checkCircle className="text-lg" />}
                  {syncMessage.includes('❌') && <Icons.alertCircle className="text-lg" />}
                  {!syncMessage.includes('✅') && !syncMessage.includes('❌') && (
                    <Icons.refresh className="animate-spin text-lg" />
                  )}
                  <span>{syncMessage}</span>
                </div>
              </div>
            )}

            {/* Sync Statistics */}
            {syncStats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={`${currentTheme.colors.accentLight} p-4 rounded-lg border ${currentTheme.colors.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Icons.package className={`text-lg ${currentTheme.accentText}`} />
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      syncStats.products.unsynced > 0 
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {syncStats.products.unsynced > 0 ? `${syncStats.products.unsynced} unsynced` : 'synced'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Products</p>
                  <p className={`text-2xl font-bold ${currentTheme.colors.text}`}>{syncStats.products.total}</p>
                </div>

                <div className={`${currentTheme.colors.accentLight} p-4 rounded-lg border ${currentTheme.colors.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Icons.users className={`text-lg ${currentTheme.accentText}`} />
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      syncStats.customers.unsynced > 0 
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {syncStats.customers.unsynced > 0 ? `${syncStats.customers.unsynced} unsynced` : 'synced'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Customers</p>
                  <p className={`text-2xl font-bold ${currentTheme.colors.text}`}>{syncStats.customers.total}</p>
                </div>

                <div className={`${currentTheme.colors.accentLight} p-4 rounded-lg border ${currentTheme.colors.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Icons.shoppingBag className={`text-lg ${currentTheme.accentText}`} />
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      syncStats.transactions.unsynced > 0 
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {syncStats.transactions.unsynced > 0 ? `${syncStats.transactions.unsynced} unsynced` : 'synced'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Transactions</p>
                  <p className={`text-2xl font-bold ${currentTheme.colors.text}`}>{syncStats.transactions.total}</p>
                </div>

                <div className={`${currentTheme.colors.accentLight} p-4 rounded-lg border ${currentTheme.colors.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Icons.clock className={`text-lg ${currentTheme.accentText}`} />
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      syncStats.queue > 0 
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {syncStats.queue > 0 ? `${syncStats.queue} pending` : 'clear'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Queue</p>
                  <p className={`text-2xl font-bold ${currentTheme.colors.text}`}>{syncStats.queue}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleFullSync}
                disabled={syncing || restoring || !status?.isOnline}
                className={`w-full py-3 sm:py-4 rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base font-medium transition-all
                  ${syncing || restoring || !status?.isOnline
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg'
                  }`}
              >
                {syncing ? (
                  <>
                    <Icons.refresh className="animate-spin text-lg sm:text-xl" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <Icons.refresh className="text-lg sm:text-xl" />
                    <span>Full Sync (Push & Pull)</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handlePushToCloud}
                  disabled={syncing || restoring || !status?.isOnline || (syncStats?.products.unsynced === 0 && syncStats?.customers.unsynced === 0 && syncStats?.transactions.unsynced === 0)}
                  className={`py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all
                    ${syncing || restoring || !status?.isOnline || (syncStats?.products.unsynced === 0 && syncStats?.customers.unsynced === 0 && syncStats?.transactions.unsynced === 0)
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-lg'
                    }`}
                >
                  <Icons.upload className="text-base sm:text-lg" />
                  <span>Push to Cloud</span>
                </button>

                <button
                  onClick={handlePullFromCloud}
                  disabled={syncing || restoring || !status?.isOnline}
                  className={`py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all
                    ${syncing || restoring || !status?.isOnline
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-md hover:shadow-lg'
                    }`}
                >
                  <Icons.download className="text-base sm:text-lg" />
                  <span>Pull from Cloud</span>
                </button>
              </div>

              <button
                onClick={handleRestore}
                disabled={syncing || restoring || !status?.isOnline}
                className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all
                  ${syncing || restoring || !status?.isOnline
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700 shadow-md hover:shadow-lg'
                }`}
              >
                <Icons.refresh className="text-base sm:text-lg" />
                <span>Restore from Cloud (Clear Local)</span>
              </button>
            </div>

            {/* Warning Note */}
            <div className={`text-xs text-gray-500 dark:text-gray-400 ${currentTheme.colors.accentLight} p-4 rounded-lg border ${currentTheme.colors.border} flex items-start gap-2`}>
              <Icons.info className="text-base flex-shrink-0 mt-0.5" />
              <p>
                Restore will clear all local data and replace with cloud data. Make sure you have a backup before proceeding.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className={`p-4 sm:p-6 border-t ${currentTheme.colors.border} flex justify-end sticky bottom-0 ${currentTheme.colors.card}`}>
            <button
              onClick={onClose}
              disabled={syncing || restoring}
              className={`px-6 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text} transition-colors disabled:opacity-50`}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Restore Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className={`${currentTheme.colors.card} rounded-xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Icons.alert className="text-xl text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Confirm Restore</h3>
            </div>
            
            <p className={`mb-6 ${currentTheme.colors.textSecondary}`}>
              This will delete all local data and replace it with data from the cloud. 
              This action cannot be undone. Are you sure you want to continue?
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700 shadow-md hover:shadow-lg transition-all"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}