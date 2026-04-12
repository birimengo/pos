// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { CurrencyProvider } from './features/pos/context/CurrencyContext';
import { StoreProvider } from './features/pos/context/StoreContext';
import { POSProvider } from './features/pos/context/POSContext';
import { CartProvider } from './features/pos/context/CartContext';
import { CustomerProvider } from './features/pos/context/CustomerContext';
import { InventoryProvider } from './features/pos/context/InventoryContext';
import { SettingsProvider } from './features/pos/context/SettingsContext';
import { SyncProvider } from './features/pos/context/SyncContext';
import POSLayout from './features/pos/POSLayout';
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { db } from './features/pos/services/database';
import { opfs } from './features/pos/services/opfsService';
import { offlineSyncManager } from './features/pos/services/offlineSyncManager';
import { cloudSync } from './features/pos/services/cloudSyncService';
import { api } from './features/pos/services/api';

// Helper function to validate MongoDB ObjectId
const isValidMongoId = (id) => {
  return id && typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
};

// Helper function to fix store IDs
const fixStoreIds = async () => {
  console.log('🔄 Running store ID migration...');
  
  try {
    // Get all local stores
    const localStores = await db.getAllStores();
    console.log(`📦 Found ${localStores.length} local stores`);
    
    if (localStores.length === 0) {
      console.log('📭 No local stores to fix');
      return { success: true };
    }
    
    // Try to get stores from cloud
    let cloudStoresArray = [];
    try {
      const cloudResult = await api.getAllStores();
      console.log('Cloud response:', cloudResult);
      
      // Handle different response formats
      if (cloudResult.success && Array.isArray(cloudResult.stores)) {
        cloudStoresArray = cloudResult.stores;
      } else if (Array.isArray(cloudResult)) {
        cloudStoresArray = cloudResult;
      } else if (cloudResult.stores && Array.isArray(cloudResult.stores)) {
        cloudStoresArray = cloudResult.stores;
      } else if (cloudResult.data && Array.isArray(cloudResult.data)) {
        cloudStoresArray = cloudResult.data;
      }
      
      console.log(`☁️ Found ${cloudStoresArray.length} cloud stores`);
    } catch (error) {
      console.log('⚠️ Could not fetch cloud stores:', error.message);
    }
    
    let fixedCount = 0;
    
    for (const localStore of localStores) {
      // Check if store has invalid ID format
      const hasValidId = isValidMongoId(localStore._id) || isValidMongoId(localStore.cloudId);
      
      if (!hasValidId) {
        console.log(`⚠️ Store "${localStore.name}" has invalid ID:`, localStore.id);
        
        // Try to find matching store in cloud by name
        const matchingCloudStore = cloudStoresArray.find(s => s.name === localStore.name);
        
        if (matchingCloudStore && isValidMongoId(matchingCloudStore._id)) {
          console.log(`✅ Found matching cloud store with ID: ${matchingCloudStore._id}`);
          
          // Update local store with correct MongoDB ID
          const updatedStore = {
            ...localStore,
            id: matchingCloudStore._id,
            _id: matchingCloudStore._id,
            cloudId: matchingCloudStore._id,
            synced: true
          };
          
          await db.saveStore(updatedStore);
          console.log(`✅ Updated store "${localStore.name}" with correct MongoDB ID`);
          fixedCount++;
        } else if (cloudStoresArray.length > 0) {
          // Use the first cloud store as fallback
          const firstCloudStore = cloudStoresArray[0];
          if (firstCloudStore && isValidMongoId(firstCloudStore._id)) {
            console.log(`📌 Using first cloud store as fallback: ${firstCloudStore._id}`);
            
            const updatedStore = {
              ...localStore,
              id: firstCloudStore._id,
              _id: firstCloudStore._id,
              cloudId: firstCloudStore._id,
              name: firstCloudStore.name,
              synced: true
            };
            
            await db.saveStore(updatedStore);
            console.log(`✅ Updated store with cloud store ID`);
            fixedCount++;
          }
        }
      }
    }
    
    console.log(`✅ Store ID migration completed. Fixed ${fixedCount} stores.`);
    return { success: true, fixedCount };
    
  } catch (error) {
    console.error('❌ Store ID migration failed:', error);
    return { success: false, error: error.message };
  }
};

// Loading component
const LoadingScreen = ({ message = 'Loading...', progress = null }) => (
  <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-lg text-gray-600 dark:text-gray-400">{message}</p>
      {progress && <p className="text-sm text-gray-500 mt-2">{progress}</p>}
    </div>
  </div>
);

// Error screen component
const ErrorScreen = ({ error, onRetry }) => (
  <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 p-4">
    <div className="text-center max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
      <div className="text-red-500 text-5xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Initialization Error</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        Retry
      </button>
    </div>
  </div>
);

// Restore prompt component
const RestorePrompt = ({ onRestore, onSkip, isRestoring }) => (
  <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 p-4">
    <div className="text-center max-w-md p-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
      <div className="text-blue-500 text-5xl mb-4">☁️</div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Cloud Backup Found</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        We found data in your cloud backup. Would you like to restore them to this device?
      </p>
      
      {isRestoring ? (
        <div className="space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500">Restoring your data...</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRestore}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all"
          >
            Yes, Restore Data
          </button>
          <button
            onClick={onSkip}
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

// Restore success component
const RestoreSuccess = () => (
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

// Offline indicator component
const OfflineIndicator = () => (
  <div className="fixed bottom-4 right-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-lg z-50">
    <div className="flex items-center">
      <span className="mr-3">📴</span>
      <div>
        <p className="font-bold">Offline Mode</p>
        <p className="text-sm">Changes will sync when online</p>
      </div>
    </div>
  </div>
);

// Protected route wrapper
const ProtectedRoute = ({ children, requiredPermission, requiredRole }) => {
  const { isAuthenticated, loading, hasPermission, hasRole } = useAuth();

  if (loading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Main app content with routes
const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (!isAuthenticated) {
    return showRegister ? (
      <Register onSuccess={() => setShowRegister(false)} onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <Login onSuccess={() => {}} onSwitchToRegister={() => setShowRegister(true)} />
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/pos/checkout" replace />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route 
        path="/pos/*" 
        element={
          <ProtectedRoute>
            <POSLayout />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

function App() {
  const [appState, setAppState] = useState({
    initialized: false,
    initError: null,
    syncStatus: null,
    showRestorePrompt: false,
    restoreInProgress: false,
    systemReady: false,
    initProgress: ''
  });

  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing app storage systems...');
      setAppState(prev => ({ ...prev, syncStatus: 'initializing', initProgress: 'Initializing storage...' }));
      
      // 1. Initialize IndexedDB first
      await db.init();
      console.log('✅ IndexedDB initialized');
      setAppState(prev => ({ ...prev, initProgress: 'IndexedDB ready...' }));
      
      // 2. Initialize OPFS
      await opfs.init();
      console.log('✅ OPFS initialized');
      setAppState(prev => ({ ...prev, initProgress: 'Storage ready...' }));
      
      // 3. Initialize offline sync manager
      await offlineSyncManager.init();
      console.log('✅ Offline sync manager ready');
      
      // 4. Initialize cloud sync (without auto-sync)
      await cloudSync.ensureInitialized();
      console.log('✅ Cloud sync ready');
      
      // 5. Check authentication and set token in API client
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const isAuthenticated = !!token;
      
      if (isAuthenticated && token) {
        api.setAuthToken(token);
        console.log('🔐 Auth token set in API client');
        setAppState(prev => ({ ...prev, initProgress: 'Authenticated, syncing store...' }));
        
        // Run store ID migration to fix any invalid store IDs
        await fixStoreIds();
      }
      
      // 6. Check if we have any data locally
      const products = await db.getProducts();
      console.log(`📦 Found ${products.length} products in database`);
      
      // 7. Check if we have a valid store selected
      const currentStoreId = db.getCurrentStore();
      let hasValidStore = false;
      let currentStore = null;
      
      if (currentStoreId) {
        currentStore = await db.getStore(currentStoreId);
        hasValidStore = currentStore && (isValidMongoId(currentStore._id) || isValidMongoId(currentStore.cloudId));
        if (!hasValidStore && currentStore) {
          console.warn(`⚠️ Current store has invalid ID: ${currentStoreId}`);
        }
      }
      
      // 8. If no valid store exists, try to get one from cloud
      if (!hasValidStore && isAuthenticated) {
        console.log('🏪 No valid local store, fetching from cloud...');
        try {
          const cloudStores = await api.getAllStores();
          let cloudStoresArray = [];
          
          if (cloudStores.success && Array.isArray(cloudStores.stores)) {
            cloudStoresArray = cloudStores.stores;
          } else if (Array.isArray(cloudStores)) {
            cloudStoresArray = cloudStores;
          }
          
          if (cloudStoresArray.length > 0) {
            const cloudStore = cloudStoresArray[0];
            const mongoId = cloudStore._id;
            
            if (isValidMongoId(mongoId)) {
              const newStore = {
                id: mongoId,
                _id: mongoId,
                cloudId: mongoId,
                name: cloudStore.name,
                address: cloudStore.address || '',
                city: cloudStore.city || '',
                state: cloudStore.state || '',
                zip: cloudStore.zip || '',
                phone: cloudStore.phone || '',
                email: cloudStore.email || '',
                manager: cloudStore.manager || '',
                openTime: cloudStore.openTime || '09:00',
                closeTime: cloudStore.closeTime || '21:00',
                taxRate: cloudStore.taxRate || 0,
                open: cloudStore.active !== false,
                isDefault: true,
                synced: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              
              await db.saveStore(newStore);
              db.setCurrentStore(mongoId);
              api.setCurrentStore(mongoId);
              console.log('✅ Store fetched from cloud and saved locally');
              hasValidStore = true;
            }
          }
        } catch (error) {
          console.warn('Could not fetch store from cloud:', error.message);
        }
      }
      
      // 9. Check cloud connection and attempt restore if needed
      if (products.length === 0) {
        console.log('📭 No products found locally');
        
        if (isAuthenticated && navigator.onLine && hasValidStore) {
          console.log('☁️ User authenticated - checking cloud for backup...');
          setAppState(prev => ({ ...prev, syncStatus: 'checking', initProgress: 'Checking cloud backup...' }));
          
          try {
            const cloudProducts = await api.getAllProducts();
            
            if (cloudProducts.success && cloudProducts.products?.length > 0) {
              console.log(`☁️ Found ${cloudProducts.products.length} products in cloud`);
              setAppState(prev => ({ 
                ...prev, 
                showRestorePrompt: true, 
                syncStatus: 'prompt',
                systemReady: true 
              }));
            } else {
              console.log('📭 No cloud data found - starting fresh');
              setAppState(prev => ({ 
                ...prev, 
                initialized: true, 
                syncStatus: 'none',
                systemReady: true 
              }));
            }
          } catch (error) {
            console.log('⚠️ Could not check cloud:', error.message);
            setAppState(prev => ({ 
              ...prev, 
              initialized: true, 
              syncStatus: 'offline',
              systemReady: true 
            }));
          }
        } else {
          if (!isAuthenticated) {
            console.log('🔐 Not authenticated - skipping cloud check until login');
          } else if (!hasValidStore) {
            console.log('🏪 No valid store - skipping cloud check');
          } else {
            console.log('📴 Offline - starting with local data only');
          }
          setAppState(prev => ({ 
            ...prev, 
            initialized: true, 
            syncStatus: 'offline',
            systemReady: true 
          }));
        }
      } else {
        console.log('✅ Data loaded from persistent storage');
        
        if (isAuthenticated && navigator.onLine && hasValidStore) {
          console.log('🔄 Background sync scheduled...');
          setTimeout(() => {
            cloudSync.fullSync().catch(err => {
              console.warn('Background sync error:', err);
            });
          }, 5000);
        }
        
        setAppState(prev => ({ 
          ...prev, 
          initialized: true, 
          syncStatus: 'loaded',
          systemReady: true 
        }));
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      setAppState(prev => ({ 
        ...prev, 
        initError: error.message, 
        initialized: true,
        systemReady: true 
      }));
    }
  };

  useEffect(() => {
    initializeApp();
  }, []);

  const handleRestore = async () => {
    setAppState(prev => ({ ...prev, restoreInProgress: true, syncStatus: 'restoring', initProgress: 'Restoring from cloud...' }));
    
    try {
      const result = await cloudSync.restoreFromCloud({ clearLocal: true });
      
      if (result.success) {
        console.log(`✅ Restored ${result.count} items from cloud`);
        setAppState(prev => ({ ...prev, syncStatus: 'success' }));
        
        await fixStoreIds();
        
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        console.error('❌ Restore failed:', result.error);
        setAppState(prev => ({ 
          ...prev, 
          syncStatus: 'error', 
          restoreInProgress: false, 
          showRestorePrompt: false,
          initialized: true
        }));
      }
    } catch (error) {
      console.error('❌ Restore error:', error);
      setAppState(prev => ({ 
        ...prev, 
        syncStatus: 'error', 
        restoreInProgress: false, 
        showRestorePrompt: false,
        initialized: true
      }));
    }
  };

  const handleSkipRestore = () => {
    setAppState(prev => ({ 
      ...prev, 
      showRestorePrompt: false, 
      initialized: true,
      syncStatus: 'skipped'
    }));
  };

  const handleRetry = () => {
    setAppState({
      initialized: false,
      initError: null,
      syncStatus: null,
      showRestorePrompt: false,
      restoreInProgress: false,
      systemReady: false,
      initProgress: ''
    });
    initializeApp();
  };

  // Loading state
  if (!appState.systemReady && !appState.showRestorePrompt) {
    let loadingMessage = 'Loading BizCore POS...';
    if (appState.syncStatus === 'checking') loadingMessage = 'Checking for cloud backup...';
    if (appState.syncStatus === 'initializing') loadingMessage = 'Initializing storage systems...';
    
    return <LoadingScreen message={loadingMessage} progress={appState.initProgress} />;
  }

  // Restore prompt
  if (appState.showRestorePrompt) {
    return (
      <RestorePrompt 
        onRestore={handleRestore}
        onSkip={handleSkipRestore}
        isRestoring={appState.restoreInProgress}
      />
    );
  }

  // Error state
  if (appState.initError) {
    return <ErrorScreen error={appState.initError} onRetry={handleRetry} />;
  }

  // Restore success
  if (appState.syncStatus === 'success') {
    return <RestoreSuccess />;
  }

  // Main app
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <CurrencyProvider>
            <StoreProvider>
              <POSProvider>
                <InventoryProvider>
                  <CustomerProvider>
                    <SettingsProvider>
                      <SyncProvider>
                        <CartProvider>
                          <AppContent />
                          <PWAInstallPrompt />
                          {!navigator.onLine && <OfflineIndicator />}
                        </CartProvider>
                      </SyncProvider>
                    </SettingsProvider>
                  </CustomerProvider>
                </InventoryProvider>
              </POSProvider>
            </StoreProvider>
          </CurrencyProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App; 