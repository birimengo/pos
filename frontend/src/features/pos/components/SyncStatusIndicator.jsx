// src/features/pos/components/SyncStatusIndicator.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { productService } from '../services/productService';
import { Icons } from '../../../components/ui/Icons';

export default function SyncStatusIndicator() {
  const [status, setStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  useEffect(() => {
    const loadStatus = async () => {
      const syncStatus = await productService.getSyncStatus();
      setStatus(syncStatus);
    };
    
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (!navigator.onLine) {
      alert('You are offline');
      return;
    }
    
    setSyncing(true);
    await productService.syncAllPending();
    const syncStatus = await productService.getSyncStatus();
    setStatus(syncStatus);
    setSyncing(false);
  };

  if (!status || status.pendingProducts === 0) return null;

  return (
    <div className={`fixed bottom-4 right-4 ${currentTheme.colors.card} rounded-lg shadow-xl border ${currentTheme.colors.border} p-3 z-50`}>
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${navigator.onLine ? 'bg-green-500' : 'bg-gray-400'}`} />
        
        <div className="text-xs">
          <div className="flex items-center gap-2">
            <Icons.package className="text-sm" />
            <span>{status.totalProducts} products</span>
          </div>
          {status.pendingProducts > 0 && (
            <div className="flex items-center gap-2 mt-1 text-yellow-600">
              <Icons.alert className="text-sm" />
              <span>{status.pendingProducts} pending sync</span>
            </div>
          )}
        </div>
        
        {status.pendingProducts > 0 && navigator.onLine && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`px-2 py-1 text-xs rounded ${
              syncing 
                ? 'bg-gray-200 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {syncing ? (
              <Icons.refresh className="animate-spin text-sm" />
            ) : (
              'Sync Now'
            )}
          </button>
        )}
      </div>
    </div>
  );
}