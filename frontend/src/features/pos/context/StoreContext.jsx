// src/features/pos/context/StoreContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/database';
import { api } from '../services/api';

const StoreContext = createContext();

export function StoreProvider({ children }) {
  const [activeStore, setActiveStore] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentStoreId, setCurrentStoreId] = useState(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const isRefreshingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Load all stores from database
  const loadStores = useCallback(async () => {
    try {
      await db.ensureInitialized();
      const allStores = await db.getAllStores();
      if (isMountedRef.current) {
        setStores(allStores || []);
        console.log(`📦 Loaded ${allStores?.length || 0} stores from database`);
      }
      return allStores;
    } catch (error) {
      console.error('Failed to load stores:', error);
      return [];
    }
  }, []);

  // Load active store from localStorage
  const loadActiveStore = useCallback(() => {
    const savedStoreId = localStorage.getItem('activeStoreId');
    if (savedStoreId) {
      setCurrentStoreId(savedStoreId);
      console.log(`📌 Active store ID from localStorage: ${savedStoreId}`);
    }
  }, []);

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;
    loadStores();
    loadActiveStore();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [loadStores, loadActiveStore]);

  // Load active store details when currentStoreId changes
  useEffect(() => {
    const loadActiveStoreDetails = async () => {
      if (currentStoreId && isMountedRef.current) {
        try {
          let store = await db.getStore(currentStoreId);
          
          if (!store) {
            const response = await api.getStore(currentStoreId);
            if (response.success && response.store) {
              store = response.store;
              await db.saveStore({
                ...store,
                id: store._id,
                _id: store._id,
                userId: store.createdBy
              });
            }
          }
          
          if (store && isMountedRef.current) {
            setActiveStore(store);
            api.setCurrentStore(currentStoreId);
            console.log(`🏪 Active store set to: ${store.name} (ID: ${currentStoreId}, Open: ${store.open})`);
          } else if (isMountedRef.current) {
            console.warn(`⚠️ No store found for ID: ${currentStoreId}`);
            const defaultResponse = await api.getDefaultStore();
            if (defaultResponse.success && defaultResponse.store) {
              const defaultStore = defaultResponse.store;
              setActiveStore(defaultStore);
              setCurrentStoreId(defaultStore._id);
              localStorage.setItem('activeStoreId', defaultStore._id);
              api.setCurrentStore(defaultStore._id);
              console.log(`🏪 Fallback to default store: ${defaultStore.name}`);
            }
          }
        } catch (error) {
          console.error('Failed to load active store:', error);
        }
      }
      if (isMountedRef.current) setLoading(false);
    };
    loadActiveStoreDetails();
  }, [currentStoreId]);

  // Switch to a different store
  const switchStore = useCallback(async (storeId) => {
    try {
      console.log(`🔄 Switching to store: ${storeId}`);
      
      let store = await db.getStore(storeId);
      if (!store) {
        const response = await api.getStore(storeId);
        if (response.success && response.store) {
          store = response.store;
          await db.saveStore({
            ...store,
            id: store._id,
            _id: store._id
          });
        }
      }
      
      if (store && isMountedRef.current) {
        setActiveStore(store);
        setCurrentStoreId(storeId);
        localStorage.setItem('activeStoreId', storeId);
        api.setCurrentStore(storeId);
        
        window.dispatchEvent(new CustomEvent('store-switched', { 
          detail: { store, storeId, timestamp: new Date().toISOString() }
        }));
        
        console.log(`✅ Switched to store: ${store.name} (Open: ${store.open})`);
        return { success: true, store };
      }
      return { success: false, error: 'Store not found' };
    } catch (error) {
      console.error('Failed to switch store:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Force refresh a specific store
  const forceRefreshStore = useCallback(async (storeId) => {
    if (isRefreshingRef.current) {
      console.log('⏳ Refresh already in progress, skipping...');
      return { success: false, error: 'Refresh already in progress' };
    }
    
    isRefreshingRef.current = true;
    
    try {
      console.log(`🔄 Force refreshing store: ${storeId}`);
      const response = await api.getStore(storeId);
      if (response.success && response.store && isMountedRef.current) {
        const updatedStore = response.store;
        
        await db.saveStore({
          ...updatedStore,
          id: updatedStore._id,
          _id: updatedStore._id
        });
        
        if (activeStore?._id === storeId) {
          setActiveStore(updatedStore);
        }
        
        setStores(prev => prev.map(s => 
          s._id === storeId ? updatedStore : s
        ));
        
        console.log(`🔄 Store ${updatedStore.name} force refreshed: ${updatedStore.open ? 'Open' : 'Closed'}`);
        
        window.dispatchEvent(new CustomEvent('store-status-changed', { 
          detail: { storeId, isOpen: updatedStore.open, store: updatedStore, timestamp: Date.now() }
        }));
        
        return { success: true, store: updatedStore };
      }
      return { success: false, error: 'Store not found' };
    } catch (error) {
      console.error('Failed to force refresh store:', error);
      return { success: false, error: error.message };
    } finally {
      isRefreshingRef.current = false;
    }
  }, [activeStore]);

  // Refresh store status without event (to prevent loops)
  const refreshStoreStatus = useCallback(async (storeId, skipEvent = false) => {
    if (isRefreshingRef.current) {
      console.log('⏳ Refresh already in progress, skipping...');
      return { success: false, error: 'Refresh already in progress' };
    }
    
    isRefreshingRef.current = true;
    
    try {
      console.log(`🔄 Refreshing store status for: ${storeId}`);
      const response = await api.getStore(storeId);
      if (response.success && response.store && isMountedRef.current) {
        const updatedStore = response.store;
        
        await db.saveStore({
          ...updatedStore,
          id: updatedStore._id,
          _id: updatedStore._id
        });
        
        if (activeStore?._id === storeId) {
          setActiveStore(updatedStore);
        }
        
        setStores(prev => prev.map(s => 
          s._id === storeId ? updatedStore : s
        ));
        
        console.log(`🔄 Store ${updatedStore.name} status refreshed: ${updatedStore.open ? 'Open' : 'Closed'}`);
        
        if (!skipEvent) {
          window.dispatchEvent(new CustomEvent('store-status-refreshed', { 
            detail: { storeId, isOpen: updatedStore.open, store: updatedStore }
          }));
        }
        
        return { success: true, store: updatedStore };
      }
      return { success: false, error: 'Store not found' };
    } catch (error) {
      console.error('Failed to refresh store status:', error);
      return { success: false, error: error.message };
    } finally {
      isRefreshingRef.current = false;
    }
  }, [activeStore]);

  // Refresh all stores
  const refreshStores = useCallback(async () => {
    if (isRefreshingRef.current) {
      console.log('⏳ Refresh already in progress, skipping...');
      return;
    }
    
    isRefreshingRef.current = true;
    await loadStores();
    setForceUpdate(prev => prev + 1);
    isRefreshingRef.current = false;
  }, [loadStores]);

  // Get current store info
  const getCurrentStore = useCallback(() => {
    return activeStore;
  }, [activeStore]);

  // Get store by ID
  const getStoreById = useCallback(async (storeId) => {
    try {
      return await db.getStore(storeId);
    } catch (error) {
      console.error('Failed to get store:', error);
      return null;
    }
  }, []);

  // Check if store is open
  const isStoreOpen = useCallback((store = activeStore) => {
    if (!store) return false;
    return store.open === true;
  }, [activeStore]);

  // Get store status text
  const getStoreStatusText = useCallback((store = activeStore) => {
    if (!store) return 'Unknown';
    return store.open ? 'Open' : 'Closed';
  }, [activeStore]);

  // Get store status color
  const getStoreStatusColor = useCallback((store = activeStore) => {
    if (!store) return 'gray';
    return store.open ? 'green' : 'red';
  }, [activeStore]);

  const value = {
    activeStore,
    stores,
    loading,
    currentStoreId,
    switchStore,
    refreshStoreStatus,
    forceRefreshStore,
    getCurrentStore,
    getStoreById,
    refreshStores,
    loadStores,
    isStoreOpen,
    getStoreStatusText,
    getStoreStatusColor,
    forceUpdate
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return context;
};