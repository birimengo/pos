// src/features/pos/context/InventoryContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';
import { db } from '../services/database';

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
  lastLoadTime: null
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
          ? { ...product, stock: product.stock + action.payload.change }
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
    default:
      return state;
  }
}

export function InventoryProvider({ children }) {
  const [state, dispatch] = useReducer(inventoryReducer, initialState);

  // Load products from IndexedDB when the provider mounts
  useEffect(() => {
    const loadProducts = async () => {
      try {
        console.log('🔄 InventoryProvider: Loading products from IndexedDB...');
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Ensure database is initialized
        await db.ensureInitialized();
        
        // Get products from IndexedDB
        const products = await db.getProducts();
        
        console.log(`📦 Retrieved ${products.length} products from IndexedDB`);
        
        if (products && products.length > 0) {
          dispatch({ type: 'SET_PRODUCTS', payload: products });
          
          // Extract unique categories from products
          const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
          if (uniqueCategories.length > 0) {
            dispatch({ type: 'SET_CATEGORIES', payload: uniqueCategories });
          }
          
          console.log(`✅ Loaded ${products.length} products into state`);
        } else {
          console.log('📭 No products found in IndexedDB - starting with empty inventory');
          dispatch({ type: 'SET_PRODUCTS', payload: [] });
        }
        
      } catch (error) {
        console.error('❌ Failed to load products from IndexedDB:', error);
        dispatch({ type: 'SET_ERROR', payload: error.message });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadProducts();
  }, []);

  // Debug: Log state changes
  useEffect(() => {
    console.log(`📊 Inventory state updated: ${state.products.length} products`);
  }, [state.products]);

  return (
    <InventoryContext.Provider value={{ state, dispatch }}>
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