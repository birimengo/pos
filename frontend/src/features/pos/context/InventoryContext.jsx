// src/features/pos/context/InventoryContext.jsx
import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { useStore } from './StoreContext';

const InventoryContext = createContext();

const initialState = {
  products: [],
  categories: ['All'],
  suppliers: [],
  searchTerm: '',
  selectedCategory: 'All',
  lowStockThreshold: 10,
  isLoading: true,
  error: null,
  lastLoadTime: null,
  currentStoreId: null,
  initialLoadComplete: false
};

function inventoryReducer(state, action) {
  switch (action.type) {
    case 'SET_PRODUCTS':
      return { 
        ...state, 
        products: action.payload, 
        isLoading: false,
        lastLoadTime: new Date().toISOString()
      };
    case 'SET_CURRENT_STORE':
      return { ...state, currentStoreId: action.payload };
    case 'ADD_PRODUCT':
      return { 
        ...state, 
        products: [...state.products, action.payload] 
      };
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
    case 'UPDATE_STOCK': {
      const updatedProducts = state.products.map(product =>
        product.id === action.payload.id
          ? { ...product, stock: (product.stock || 0) + action.payload.change }
          : product
      );
      return { ...state, products: updatedProducts };
    }
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload };
    case 'SET_CATEGORY':
      return { ...state, selectedCategory: action.payload };
    case 'ADD_CATEGORY':
      if (!state.categories.includes(action.payload) && action.payload !== 'All') {
        return { 
          ...state, 
          categories: [...state.categories, action.payload] 
        };
      }
      return state;
    case 'REMOVE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(c => c !== action.payload && c !== 'All')
      };
    case 'SET_CATEGORIES':
      return { ...state, categories: ['All', ...action.payload] };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_INITIAL_LOAD_COMPLETE':
      return { ...state, initialLoadComplete: action.payload };
    case 'CLEAR_PRODUCTS':
      return { ...state, products: [], isLoading: false };
    default:
      return state;
  }
}

export function InventoryProvider({ children }) {
  const [state, dispatch] = useReducer(inventoryReducer, initialState);
  const { activeStore, loading: storeLoading } = useStore();

  // Load products from IndexedDB filtered by current store
  const loadProducts = useCallback(async () => {
    // Don't try to load if no store is selected
    if (!activeStore) {
      console.log('⏳ Waiting for active store...');
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'CLEAR_PRODUCTS' });
      return;
    }
    
    // Don't reload if already loaded for this store and not forced
    if (state.currentStoreId === activeStore.id && state.initialLoadComplete && state.products.length > 0) {
      console.log(`📦 Using cached products for store: ${activeStore.name}`);
      return;
    }
    
    try {
      console.log(`🔄 Loading products for store: ${activeStore.name} (${activeStore.id})`);
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      dispatch({ type: 'SET_CURRENT_STORE', payload: activeStore.id });
      
      await db.ensureInitialized();
      
      // Get all products and filter by storeId
      const allProducts = await db.getAll('products');
      const storeProducts = allProducts.filter(p => {
        // Match by storeId (could be ObjectId string or local ID)
        const productStoreId = String(p.storeId || '');
        const activeStoreId = String(activeStore.id);
        const activeStoreCloudId = String(activeStore._id || activeStore.cloudId || '');
        
        return productStoreId === activeStoreId || 
               productStoreId === activeStoreCloudId ||
               (p.storeId === activeStore._id) ||
               (p.storeId === activeStore.cloudId);
      });
      
      console.log(`📦 Retrieved ${storeProducts.length} products for store ${activeStore.name}`);
      
      if (storeProducts && storeProducts.length > 0) {
        dispatch({ type: 'SET_PRODUCTS', payload: storeProducts });
        
        // Extract unique categories
        const uniqueCategories = [...new Set(storeProducts.map(p => p.category).filter(Boolean))];
        if (uniqueCategories.length > 0) {
          dispatch({ type: 'SET_CATEGORIES', payload: uniqueCategories });
        } else {
          dispatch({ type: 'SET_CATEGORIES', payload: [] });
        }
        
        console.log(`✅ Loaded ${storeProducts.length} products into state for store ${activeStore.name}`);
      } else {
        console.log(`📭 No products found for store ${activeStore.name}`);
        dispatch({ type: 'SET_PRODUCTS', payload: [] });
        dispatch({ type: 'SET_CATEGORIES', payload: [] });
      }
      
      dispatch({ type: 'SET_INITIAL_LOAD_COMPLETE', payload: true });
      
    } catch (error) {
      console.error('❌ Failed to load products from IndexedDB:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      dispatch({ type: 'SET_PRODUCTS', payload: [] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [activeStore, state.currentStoreId, state.initialLoadComplete, state.products.length]);

  // Load products when store changes or becomes available
  useEffect(() => {
    // Wait for store to be ready
    if (storeLoading) {
      console.log('⏳ Store context still loading...');
      return;
    }
    
    // Load products when store is available
    loadProducts();
    
    // Set up store change listener
    const handleStoreSwitch = (event) => {
      console.log('🔄 Store switched, reloading inventory...');
      dispatch({ type: 'SET_INITIAL_LOAD_COMPLETE', payload: false });
      loadProducts();
    };
    
    window.addEventListener('store-switched', handleStoreSwitch);
    
    return () => {
      window.removeEventListener('store-switched', handleStoreSwitch);
    };
  }, [activeStore, storeLoading, loadProducts]);

  // Debug: Log state changes
  useEffect(() => {
    if (state.currentStoreId && !state.isLoading) {
      console.log(`📊 Inventory state: ${state.products.length} products for store ${state.currentStoreId}`);
    }
  }, [state.products.length, state.currentStoreId, state.isLoading]);

  // Method to manually refresh inventory
  const refreshInventory = useCallback(async () => {
    console.log('🔄 Manually refreshing inventory...');
    dispatch({ type: 'SET_INITIAL_LOAD_COMPLETE', payload: false });
    await loadProducts();
  }, [loadProducts]);

  // Method to get low stock products
  const getLowStockProducts = useCallback(() => {
    return state.products.filter(p => p.stock <= state.lowStockThreshold);
  }, [state.products, state.lowStockThreshold]);

  // Method to get out of stock products
  const getOutOfStockProducts = useCallback(() => {
    return state.products.filter(p => p.stock <= 0);
  }, [state.products]);

  // Method to get product by ID
  const getProductById = useCallback((id) => {
    return state.products.find(p => p.id === id || p._id === id);
  }, [state.products]);

  // Method to get products by category
  const getProductsByCategory = useCallback((category) => {
    if (category === 'All') return state.products;
    return state.products.filter(p => p.category === category);
  }, [state.products]);

  // Method to search products
  const searchProducts = useCallback((searchTerm) => {
    if (!searchTerm) return state.products;
    const term = searchTerm.toLowerCase();
    return state.products.filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.includes(term))
    );
  }, [state.products]);

  const value = {
    state,
    dispatch,
    refreshInventory,
    getLowStockProducts,
    getOutOfStockProducts,
    getProductById,
    getProductsByCategory,
    searchProducts,
    hasProducts: state.products.length > 0,
    isLoading: state.isLoading || storeLoading,
    isReady: !state.isLoading && !storeLoading && state.initialLoadComplete
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within InventoryProvider');
  }
  return context;
};