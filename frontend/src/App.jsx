// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { POSProvider } from './features/pos/context/POSContext';
import { CartProvider } from './features/pos/context/CartContext';
import { CustomerProvider } from './features/pos/context/CustomerContext';
import { InventoryProvider } from './features/pos/context/InventoryContext';
import { SettingsProvider } from './features/pos/context/SettingsContext';
import { SyncProvider } from './features/pos/context/SyncContext';
import POSLayout from './features/pos/POSLayout';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { db } from './features/pos/services/database';
import { opfs } from './features/pos/services/opfsService';
import { offlineSyncManager } from './features/pos/services/offlineSyncManager';
import { cloudSync } from './features/pos/services/cloudSyncService';
import { api } from './features/pos/services/api';

function App() {
  const [initialized, setInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app storage systems...');
        
        // 1. Initialize IndexedDB first
        await db.init();
        console.log('✅ IndexedDB initialized');
        
        // 2. Initialize OPFS
        await opfs.init();
        console.log('✅ OPFS initialized');
        
        // 3. Initialize offline sync manager
        await offlineSyncManager.init();
        console.log('✅ Offline sync manager ready');
        
        // 4. Initialize cloud sync
        await cloudSync.ensureInitialized();
        console.log('✅ Cloud sync ready');
        
        // 5. Check if we have any data
        const products = await db.getProducts();
        console.log(`📦 Found ${products.length} products in database`);
        
        // 6. Check cloud connection and attempt restore if needed
        if (products.length === 0) {
          console.log('📭 No products found - checking cloud for backup...');
          
          // Check if online
          if (navigator.onLine) {
            setSyncStatus('checking');
            
            // Check if we have cloud data
            try {
              const cloudProducts = await api.getAllProducts();
              
              if (cloudProducts.success && cloudProducts.products?.length > 0) {
                console.log(`☁️ Found ${cloudProducts.products.length} products in cloud`);
                setShowRestorePrompt(true);
                setSyncStatus('prompt');
              } else {
                console.log('📭 No cloud data found - starting fresh');
                setSyncStatus('none');
                setInitialized(true);
              }
            } catch (error) {
              console.log('⚠️ Could not check cloud:', error.message);
              setSyncStatus('offline');
              setInitialized(true);
            }
          } else {
            console.log('📴 Offline - starting with empty inventory');
            setSyncStatus('offline');
            setInitialized(true);
          }
        } else {
          console.log('✅ Data loaded from persistent storage');
          
          // Auto-sync in background if online
          if (navigator.onLine) {
            setTimeout(() => {
              cloudSync.fullSync().catch(() => {});
            }, 5000);
          }
          
          setInitialized(true);
        }
        
      } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        setInitError(error.message);
        setInitialized(true);
      }
    };

    initializeApp();
  }, []);

  const handleRestore = async () => {
    setRestoreInProgress(true);
    setSyncStatus('restoring');
    
    try {
      const result = await cloudSync.restoreFromCloud({ clearLocal: true });
      
      if (result.success) {
        console.log(`✅ Restored ${result.count} items from cloud`);
        setSyncStatus('success');
        
        // Reload after short delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        console.error('❌ Restore failed:', result.error);
        setSyncStatus('error');
        setRestoreInProgress(false);
        setShowRestorePrompt(false);
      }
    } catch (error) {
      console.error('❌ Restore error:', error);
      setSyncStatus('error');
      setRestoreInProgress(false);
      setShowRestorePrompt(false);
    }
  };

  const handleSkipRestore = () => {
    setShowRestorePrompt(false);
    setInitialized(true);
  };

  if (!initialized && !showRestorePrompt) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-400">Loading BizCore POS...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            {syncStatus === 'checking' ? 'Checking for cloud backup...' : 'Initializing storage systems'}
          </p>
        </div>
      </div>
    );
  }

  if (showRestorePrompt) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center max-w-md p-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
          <div className="text-blue-500 text-5xl mb-4">☁️</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Cloud Backup Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We found {syncStatus === 'prompt' ? 'products' : 'data'} in your cloud backup. 
            Would you like to restore them to this device?
          </p>
          
          {restoreInProgress ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500">Restoring your data...</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleRestore}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all"
              >
                Yes, Restore Data
              </button>
              <button
                onClick={handleSkipRestore}
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Start Fresh
              </button>
            </div>
          )}
          
          <p className="text-xs text-gray-400 mt-4">
            Your existing local data will be preserved if you choose to start fresh.
          </p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Initialization Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (syncStatus === 'success') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center max-w-md p-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
          <div className="text-green-500 text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Restore Complete!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your data has been successfully restored from the cloud.
          </p>
          <p className="text-sm text-gray-500">Refreshing application...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <ThemeProvider>
        <POSProvider>
          <InventoryProvider>
            <CustomerProvider>
              <SettingsProvider>
                <SyncProvider>
                  <CartProvider>
                    <>
                      <Routes>
                        <Route path="/" element={<Navigate to="/pos/checkout" replace />} />
                        <Route path="/pos/*" element={<POSLayout />} />
                      </Routes>
                      <PWAInstallPrompt />
                      
                      {/* Offline indicator toast */}
                      {!navigator.onLine && (
                        <div className="fixed bottom-4 right-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-lg z-50">
                          <div className="flex items-center">
                            <span className="mr-3">📴</span>
                            <div>
                              <p className="font-bold">Offline Mode</p>
                              <p className="text-sm">Changes will sync when online</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  </CartProvider>
                </SyncProvider>
              </SettingsProvider>
            </CustomerProvider>
          </InventoryProvider>
        </POSProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;