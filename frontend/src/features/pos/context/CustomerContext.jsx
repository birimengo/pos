// src/features/pos/context/CustomerContext.jsx

import { createContext, useContext, useReducer, useEffect } from 'react';
import { db } from '../services/database';

const CustomerContext = createContext();

const initialState = {
  customers: [],
  selectedCustomer: null,
  searchTerm: '',
  isLoading: false
};

function customerReducer(state, action) {
  switch (action.type) {
    case 'SET_CUSTOMERS':
      return { ...state, customers: action.payload };
    case 'SELECT_CUSTOMER':
      return { ...state, selectedCustomer: action.payload };
    case 'CLEAR_SELECTED_CUSTOMER':
      return { ...state, selectedCustomer: null };
    case 'ADD_CUSTOMER':
      return { 
        ...state, 
        customers: [...state.customers, { 
          ...action.payload, 
          id: String(Date.now()),
          joinDate: new Date().toISOString().split('T')[0],
          lastVisit: new Date().toISOString().split('T')[0],
          loyaltyPoints: 0,
          totalSpent: 0,
          transactionCount: 0,
          creditCount: 0,
          installmentCount: 0
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
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

export function CustomerProvider({ children }) {
  const [state, dispatch] = useReducer(customerReducer, initialState);

  const loadCustomers = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await db.ensureInitialized();
      
      // Load customers from IndexedDB
      const customers = await db.getCustomers();
      
      if (customers && customers.length > 0) {
        // Normalize customer data
        const normalizedCustomers = customers.map(c => ({
          ...c,
          id: String(c.id),
          totalSpent: c.totalSpent || 0,
          transactionCount: c.transactionCount || 0,
          loyaltyPoints: c.loyaltyPoints || 0
        }));
        dispatch({ type: 'SET_CUSTOMERS', payload: normalizedCustomers });
        console.log(`✅ Loaded ${normalizedCustomers.length} customers from IndexedDB`);
      } else {
        // Fallback to localStorage
        const saved = localStorage.getItem('pos-customers');
        if (saved) {
          const parsed = JSON.parse(saved);
          const normalized = parsed.map(c => ({ ...c, id: String(c.id) }));
          dispatch({ type: 'SET_CUSTOMERS', payload: normalized });
          console.log(`✅ Loaded ${normalized.length} customers from localStorage`);
        } else {
          console.log('📭 No customers found');
        }
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Load customers on mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Listen for cloud restore events to reload data
  useEffect(() => {
    const handleDataRestored = async (event) => {
      console.log('🔄 Cloud data restored, reloading customers...', event.detail);
      await loadCustomers();
    };

    // Listen for storage events (for cross-tab sync)
    const handleStorageChange = (e) => {
      if (e.key === 'lastRestore' || e.key === 'pos-customers') {
        console.log('🔄 Storage changed, reloading customers...');
        loadCustomers();
      }
    };

    window.addEventListener('cloud-data-restored', handleDataRestored);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('cloud-data-restored', handleDataRestored);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save customers to localStorage as backup
  useEffect(() => {
    if (state.customers.length > 0) {
      localStorage.setItem('pos-customers', JSON.stringify(state.customers));
    }
  }, [state.customers]);

  return (
    <CustomerContext.Provider value={{ state, dispatch, reloadCustomers: loadCustomers }}>
      {children}
    </CustomerContext.Provider>
  );
}

export const useCustomers = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomers must be used within CustomerProvider');
  }
  return context;
};