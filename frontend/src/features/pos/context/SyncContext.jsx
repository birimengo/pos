// src/features/pos/context/SyncContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { cloudSync } from '../services/cloudSyncService';
import { syncService } from '../services/syncService';

const SyncContext = createContext();

export function SyncProvider({ children }) {
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncStats, setSyncStats] = useState({
    unsyncedTransactions: 0,
    lastSync: null,
    isOnline: navigator.onLine
  });

  useEffect(() => {
    const handleSyncStatus = (status) => {
      setSyncStatus(status);
    };

    cloudSync.addListener(handleSyncStatus);
    syncService.addListener(handleSyncStatus);

    const updateStats = async () => {
      try {
        const stats = await cloudSync.getSyncStatus();
        setSyncStats(stats);
      } catch (error) {
        console.error('Failed to get sync stats:', error);
      }
    };

    // Initial update
    updateStats();
    
    // Update every 10 seconds
    const interval = setInterval(updateStats, 10000);

    const handleOnline = () => {
      setSyncStats(prev => ({ ...prev, isOnline: true }));
      cloudSync.syncAll().catch(console.error);
    };

    const handleOffline = () => {
      setSyncStats(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      cloudSync.removeListener(handleSyncStatus);
      syncService.removeListener(handleSyncStatus);
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSync = async () => {
    if (navigator.onLine) {
      await cloudSync.syncAll();
    } else {
      alert('You are offline. Please connect to the internet to sync.');
    }
  };

  return (
    <SyncContext.Provider value={{
      syncStatus,
      syncStats,
      triggerSync,
      lastSync: cloudSync.getLastSyncTime()
    }}>
      {children}
    </SyncContext.Provider>
  );
}

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within SyncProvider');
  }
  return context;
};