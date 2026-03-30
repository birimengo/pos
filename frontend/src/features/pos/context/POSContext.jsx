// src/features/pos/context/POSContext.jsx

import { createContext, useContext, useReducer, useEffect } from 'react';
import { db } from '../services/database';

const POSContext = createContext();

const initialState = {
  cart: [],
  customers: [],
  stores: [],
  currentStore: null,
  offlineMode: false,
  isLoading: false,
  selectedCustomer: null,
  searchTerm: ''
};

function posReducer(state, action) {
  switch (action.type) {
    case 'SET_CART':
      return { ...state, cart: action.payload };
    case 'ADD_TO_CART':
      return { ...state, cart: [...state.cart, action.payload] };
    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter(item => item.id !== action.payload) };
    case 'UPDATE_CART_ITEM':
      return {
        ...state,
        cart: state.cart.map(item =>
          item.id === action.payload.id ? { ...item, ...action.payload } : item
        )
      };
    case 'CLEAR_CART':
      return { ...state, cart: [] };
    case 'SET_CUSTOMERS':
      return { ...state, customers: action.payload };
    case 'SET_STORES':
      return { ...state, stores: action.payload };
    case 'SET_CURRENT_STORE':
      return { ...state, currentStore: action.payload };
    case 'SET_OFFLINE_MODE':
      return { ...state, offlineMode: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SELECT_CUSTOMER':
      return { ...state, selectedCustomer: action.payload };
    case 'CLEAR_SELECTED_CUSTOMER':
      return { ...state, selectedCustomer: null };
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload };
    case 'ADD_CUSTOMER':
      // Check if customer already exists before adding
      const existingCustomer = state.customers.find(c => 
        c.email === action.payload.email || 
        c.phone === action.payload.phone ||
        String(c.id) === String(action.payload.id)
      );
      
      if (existingCustomer) {
        console.log('⚠️ Customer already exists, selecting instead of adding:', existingCustomer.name);
        return { ...state, selectedCustomer: existingCustomer };
      }
      
      return {
        ...state,
        customers: [...state.customers, {
          ...action.payload,
          id: String(Date.now()),
          joinDate: new Date().toISOString().split('T')[0],
          lastVisit: new Date().toISOString().split('T')[0],
          loyaltyPoints: action.payload.loyaltyPoints || 0,
          totalSpent: action.payload.totalSpent || 0,
          transactionCount: action.payload.transactionCount || 0,
          creditCount: action.payload.creditCount || 0,
          installmentCount: action.payload.installmentCount || 0
        }]
      };
    case 'UPDATE_CUSTOMER':
      return {
        ...state,
        customers: state.customers.map(c =>
          String(c.id) === String(action.payload.id) ? { ...c, ...action.payload } : c
        )
      };
    case 'DELETE_CUSTOMER':
      return {
        ...state,
        customers: state.customers.filter(c => String(c.id) !== String(action.payload))
      };
    case 'ADD_LOYALTY_POINTS':
      return {
        ...state,
        customers: state.customers.map(c =>
          String(c.id) === String(action.payload.customerId)
            ? {
                ...c,
                loyaltyPoints: (c.loyaltyPoints || 0) + action.payload.points,
                totalSpent: (c.totalSpent || 0) + action.payload.amount,
                lastVisit: new Date().toISOString().split('T')[0],
                transactionCount: (c.transactionCount || 0) + 1,
                creditCount: (c.creditCount || 0) + (action.payload.isCredit ? 1 : 0),
                installmentCount: (c.installmentCount || 0) + (action.payload.isInstallment ? 1 : 0)
              }
            : c
        )
      };
    default:
      return state;
  }
}

export function POSProvider({ children }) {
  const [state, dispatch] = useReducer(posReducer, initialState);

  // Load customers from IndexedDB on mount
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        await db.ensureInitialized();
        const customers = await db.getCustomers();
        if (customers && customers.length > 0) {
          // Ensure all customer IDs are strings
          const normalizedCustomers = customers.map(c => ({
            ...c,
            id: String(c.id)
          }));
          dispatch({ type: 'SET_CUSTOMERS', payload: normalizedCustomers });
        }
      } catch (error) {
        console.error('Failed to load customers from IndexedDB:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem('pos-customers');
        if (saved) {
          const parsed = JSON.parse(saved);
          const normalized = parsed.map(c => ({ ...c, id: String(c.id) }));
          dispatch({ type: 'SET_CUSTOMERS', payload: normalized });
        }
      }
    };

    loadCustomers();
  }, []);

  // Save customers to localStorage as backup
  useEffect(() => {
    if (state.customers.length > 0) {
      localStorage.setItem('pos-customers', JSON.stringify(state.customers));
    }
  }, [state.customers]);

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