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
  currentStoreMongoId: null,
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
      return { 
        ...state, 
        currentStoreId: action.payload.id,
        currentStoreMongoId: action.payload.mongoId
      };
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

// Helper to get store's MongoDB ID for proper isolation
const getStoreMongoId = (store) => {
  if (!store) return null;
  return store._id || store.cloudId || store.id;
};

// Helper to check if product belongs to current store
const productBelongsToStore = (product, storeMongoId, storeId) => {
  const productStoreId = String(product.storeId || product.storeMongoId || '');
  const targetStoreId = String(storeMongoId || storeId || '');
  
  return productStoreId === targetStoreId ||
         productStoreId === String(storeId) ||
         product.storeId === storeMongoId;
};

export function InventoryProvider({ children }) {
  const [state, dispatch] = useReducer(inventoryReducer, initialState);
  const { activeStore, loading: storeLoading } = useStore();

  // Load products from IndexedDB filtered by current store
  const loadProducts = useCallback(async () => {
    // Don't try to load if no store is selected
    if (!activeStore) {
      console.log('⏳ Inventory: Waiting for active store...');
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'CLEAR_PRODUCTS' });
      dispatch({ type: 'SET_CURRENT_STORE', payload: { id: null, mongoId: null } });
      return;
    }
    
    // Get store identifiers for isolation
    const storeMongoId = getStoreMongoId(activeStore);
    const storeLocalId = activeStore.id;
    
    // Don't reload if already loaded for this store and not forced
    if (state.currentStoreId === storeLocalId && 
        state.currentStoreMongoId === storeMongoId && 
        state.initialLoadComplete && 
        state.products.length >= 0) {
      console.log(`📦 Inventory: Using cached products for store: ${activeStore.name} (${storeMongoId?.slice(-6)})`);
      return;
    }
    
    try {
      console.log(`🔄 Inventory: Loading products for store: ${activeStore.name}`);
      console.log(`   Store Local ID: ${storeLocalId}`);
      console.log(`   Store MongoDB ID: ${storeMongoId?.slice(-6) || 'N/A'}`);
      
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      dispatch({ type: 'SET_CURRENT_STORE', payload: { id: storeLocalId, mongoId: storeMongoId } });
      
      await db.ensureInitialized();
      
      // Get all products from database
      const allProducts = await db.getAll('products');
      console.log(`📦 Inventory: Total products in DB: ${allProducts.length}`);
      
      // CRITICAL: Filter products that belong to the current store only
      const storeProducts = allProducts.filter(product => {
        // Skip products without storeId
        if (!product.storeId && !product.storeMongoId) {
          console.debug(`⚠️ Product ${product.name} has no store ID, skipping`);
          return false;
        }
        
        const productStoreId = String(product.storeId || product.storeMongoId || '');
        
        // Check against both local and MongoDB IDs
        const matchesLocalId = productStoreId === String(storeLocalId);
        const matchesMongoId = storeMongoId ? productStoreId === String(storeMongoId) : false;
        const matchesCloudId = activeStore.cloudId ? productStoreId === String(activeStore.cloudId) : false;
        
        return matchesLocalId || matchesMongoId || matchesCloudId;
      });
      
      console.log(`📦 Inventory: Retrieved ${storeProducts.length} products for store ${activeStore.name}`);
      
      if (storeProducts && storeProducts.length > 0) {
        dispatch({ type: 'SET_PRODUCTS', payload: storeProducts });
        
        // Extract unique categories from filtered products
        const uniqueCategories = [...new Set(storeProducts.map(p => p.category).filter(Boolean))];
        if (uniqueCategories.length > 0) {
          dispatch({ type: 'SET_CATEGORIES', payload: uniqueCategories });
          console.log(`📦 Inventory: Found ${uniqueCategories.length} categories`);
        } else {
          dispatch({ type: 'SET_CATEGORIES', payload: [] });
        }
        
        console.log(`✅ Inventory: Loaded ${storeProducts.length} products into state for store ${activeStore.name}`);
        
        // Log sample product for debugging
        if (storeProducts.length > 0) {
          console.log(`   Sample product: ${storeProducts[0].name} (Store ID: ${storeProducts[0].storeId})`);
        }
      } else {
        console.log(`📭 Inventory: No products found for store ${activeStore.name}`);
        dispatch({ type: 'SET_PRODUCTS', payload: [] });
        dispatch({ type: 'SET_CATEGORIES', payload: [] });
      }
      
      dispatch({ type: 'SET_INITIAL_LOAD_COMPLETE', payload: true });
      
    } catch (error) {
      console.error('❌ Inventory: Failed to load products from IndexedDB:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      dispatch({ type: 'SET_PRODUCTS', payload: [] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [activeStore, state.currentStoreId, state.currentStoreMongoId, state.initialLoadComplete]);

  // Load products when store changes or becomes available
  useEffect(() => {
    // Wait for store to be ready
    if (storeLoading) {
      console.log('⏳ Inventory: Store context still loading...');
      return;
    }
    
    // Load products when store is available
    loadProducts();
    
    // Set up store change listener
    const handleStoreSwitch = (event) => {
      console.log('🔄 Inventory: Store switched, reloading inventory...', event?.detail);
      dispatch({ type: 'SET_INITIAL_LOAD_COMPLETE', payload: false });
      dispatch({ type: 'CLEAR_PRODUCTS' });
      loadProducts();
    };
    
    window.addEventListener('store-switched', handleStoreSwitch);
    
    return () => {
      window.removeEventListener('store-switched', handleStoreSwitch);
    };
  }, [activeStore, storeLoading, loadProducts]);

  // Debug: Log state changes
  useEffect(() => {
    if (state.currentStoreId && !state.isLoading && state.initialLoadComplete) {
      console.log(`📊 Inventory: ${state.products.length} products for store ${state.currentStoreId?.slice(-6)}`);
    }
  }, [state.products.length, state.currentStoreId, state.isLoading, state.initialLoadComplete]);

  // Method to manually refresh inventory
  const refreshInventory = useCallback(async () => {
    console.log('🔄 Inventory: Manually refreshing inventory...');
    dispatch({ type: 'SET_INITIAL_LOAD_COMPLETE', payload: false });
    dispatch({ type: 'CLEAR_PRODUCTS' });
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

  // Method to get product by ID (with store isolation check)
  const getProductById = useCallback((id) => {
    const product = state.products.find(p => p.id === id || p._id === id);
    
    // Additional safety: verify product belongs to current store
    if (product && activeStore) {
      const storeMongoId = getStoreMongoId(activeStore);
      if (!productBelongsToStore(product, storeMongoId, activeStore.id)) {
        console.warn(`⚠️ Inventory: Product ${id} belongs to different store, access denied`);
        return null;
      }
    }
    
    return product;
  }, [state.products, activeStore]);

  // Method to get products by category (already filtered by store)
  const getProductsByCategory = useCallback((category) => {
    if (category === 'All') return state.products;
    return state.products.filter(p => p.category === category);
  }, [state.products]);

  // Method to search products (already filtered by store)
  const searchProducts = useCallback((searchTerm) => {
    if (!searchTerm) return state.products;
    const term = searchTerm.toLowerCase();
    return state.products.filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.includes(term))
    );
  }, [state.products]);

  // Get store statistics
  const getStoreStats = useCallback(() => {
    const totalProducts = state.products.length;
    const totalValue = state.products.reduce((sum, p) => sum + ((p.cost || 0) * p.stock), 0);
    const lowStockCount = state.products.filter(p => p.stock <= state.lowStockThreshold).length;
    const outOfStockCount = state.products.filter(p => p.stock <= 0).length;
    const categoriesCount = new Set(state.products.map(p => p.category).filter(Boolean)).size;
    
    return {
      totalProducts,
      totalValue,
      lowStockCount,
      outOfStockCount,
      categoriesCount
    };
  }, [state.products, state.lowStockThreshold]);

  const value = {
    state,
    dispatch,
    refreshInventory,
    getLowStockProducts,
    getOutOfStockProducts,
    getProductById,
    getProductsByCategory,
    searchProducts,
    getStoreStats,
    hasProducts: state.products.length > 0,
    isLoading: state.isLoading || storeLoading,
    isReady: !state.isLoading && !storeLoading && state.initialLoadComplete,
    currentStoreId: state.currentStoreId,
    currentStoreMongoId: state.currentStoreMongoId
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