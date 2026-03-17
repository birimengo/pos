// src/features/pos/context/POSContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';
import { offlineDB } from '../services/indexedDB';
import { syncService } from '../services/syncService';
import { api } from '../services/api';

const POSContext = createContext();

const initialState = {
  store: null,
  currentUser: null,
  settings: {},
  offlineMode: !navigator.onLine,
  syncQueue: [],
  isLoading: false,
  error: null,
  products: [], // Empty array - no demo data!
  categories: ['All', 'Electronics', 'Accessories', 'Clothing', 'Food', 'Other'],
  syncStatus: null,
  lastSyncTime: null
};

function posReducer(state, action) {
  switch (action.type) {
    case 'SET_STORE':
      return { ...state, store: action.payload };
    case 'SET_USER':
      return { ...state, currentUser: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_OFFLINE_MODE':
      return { ...state, offlineMode: action.payload };
    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.payload };
    case 'SET_LAST_SYNC':
      return { ...state, lastSyncTime: action.payload };
    case 'ADD_TO_QUEUE':
      return { ...state, syncQueue: [...state.syncQueue, action.payload] };
    case 'CLEAR_QUEUE':
      return { ...state, syncQueue: [] };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p => 
          p.id === action.payload.id ? action.payload : p
        )
      };
    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(p => p.id !== action.payload)
      };
    case 'UPDATE_PRODUCT_STOCK': {
      const updatedProducts = state.products.map(product =>
        product.id === action.payload.id
          ? { ...product, stock: product.stock - action.payload.quantity }
          : product
      );
      return { ...state, products: updatedProducts };
    }
    default:
      return state;
  }
}

export function POSProvider({ children }) {
  const [state, dispatch] = useReducer(posReducer, initialState);

  // Load products from IndexedDB on mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const products = await offlineDB.getProducts();
        if (products && products.length > 0) {
          dispatch({ type: 'SET_PRODUCTS', payload: products });
          console.log(`📦 Loaded ${products.length} products from IndexedDB`);
        } else {
          console.log('📦 No products found in IndexedDB');
        }
      } catch (error) {
        console.error('Failed to load products:', error);
      }
    };

    loadProducts();
  }, []);

  // Initialize offline database
  useEffect(() => {
    const initOffline = async () => {
      try {
        await offlineDB.init();
        console.log('✅ Offline database initialized');
      } catch (err) {
        console.error('❌ Failed to initialize offline DB:', err);
      }
    };

    initOffline();
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      dispatch({ type: 'SET_OFFLINE_MODE', payload: false });
      dispatch({ type: 'SET_SYNC_STATUS', payload: { type: 'info', message: 'Online - Syncing...' } });
      
      try {
        await syncService.sync();
        dispatch({ type: 'SET_LAST_SYNC', payload: new Date().toISOString() });
        dispatch({ type: 'SET_SYNC_STATUS', payload: null });
      } catch (error) {
        console.error('Sync failed:', error);
        dispatch({ type: 'SET_SYNC_STATUS', payload: { type: 'error', message: 'Sync failed' } });
      }
    };

    const handleOffline = () => {
      dispatch({ type: 'SET_OFFLINE_MODE', payload: true });
      dispatch({ type: 'SET_SYNC_STATUS', payload: { type: 'warning', message: 'Offline Mode - Changes will sync when online' } });
    };

    syncService.addListener((status) => {
      dispatch({ type: 'SET_SYNC_STATUS', payload: status });
    });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    api.checkConnection().then(isOnline => {
      dispatch({ type: 'SET_OFFLINE_MODE', payload: !isOnline });
    }).catch(() => {
      dispatch({ type: 'SET_OFFLINE_MODE', payload: true });
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      syncService.removeListener();
    };
  }, []);

  return (
    <POSContext.Provider value={{ state, dispatch }}>
      {children}
    </POSContext.Provider>
  );
}

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within POSProvider');
  }
  return context;
};