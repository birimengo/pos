// src/features/pos/context/StoreContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { api } from '../services/api';

const StoreContext = createContext();

export function StoreProvider({ children }) {
  const [activeStore, setActiveStore] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentStoreId, setCurrentStoreId] = useState(null);

  // Load all stores and active store from localStorage
  useEffect(() => {
    loadStores();
    loadActiveStore();
  }, []);

  const loadStores = async () => {
    try {
      await db.ensureInitialized();
      const allStores = await db.getAll('stores');
      setStores(allStores || []);
    } catch (error) {
      console.error('Failed to load stores:', error);
    }
  };

  const loadActiveStore = () => {
    const savedStoreId = localStorage.getItem('activeStoreId');
    if (savedStoreId) {
      setCurrentStoreId(savedStoreId);
    }
  };

  // Load active store details when currentStoreId changes
  useEffect(() => {
    const loadActiveStoreDetails = async () => {
      if (currentStoreId) {
        try {
          const store = await db.get('stores', currentStoreId);
          setActiveStore(store);
        } catch (error) {
          console.error('Failed to load active store:', error);
        }
      }
      setLoading(false);
    };
    loadActiveStoreDetails();
  }, [currentStoreId]);

  // Switch to a different store
  const switchStore = useCallback(async (storeId) => {
    try {
      const store = await db.get('stores', storeId);
      if (store) {
        setActiveStore(store);
        setCurrentStoreId(storeId);
        localStorage.setItem('activeStoreId', storeId);
        
        // Dispatch event for other components to react
        window.dispatchEvent(new CustomEvent('store-switched', { detail: { store } }));
        
        console.log(`🔄 Switched to store: ${store.name}`);
        return { success: true, store };
      }
      return { success: false, error: 'Store not found' };
    } catch (error) {
      console.error('Failed to switch store:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Get current store info
  const getCurrentStore = useCallback(() => {
    return activeStore;
  }, [activeStore]);

  // Get store by ID
  const getStoreById = useCallback(async (storeId) => {
    try {
      return await db.get('stores', storeId);
    } catch (error) {
      console.error('Failed to get store:', error);
      return null;
    }
  }, []);

  const value = {
    activeStore,
    stores,
    loading,
    currentStoreId,
    switchStore,
    getCurrentStore,
    getStoreById,
    refreshStores: loadStores
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