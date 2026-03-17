// src/features/pos/context/CustomerContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';

const CustomerContext = createContext();

const initialState = {
  customers: [], // Empty array - no demo customers!
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
          id: Date.now(),
          joinDate: new Date().toISOString().split('T')[0],
          lastVisit: new Date().toISOString().split('T')[0],
          loyaltyPoints: 0,
          totalSpent: 0
        }] 
      };
    case 'UPDATE_CUSTOMER':
      return {
        ...state,
        customers: state.customers.map(c => 
          c.id === action.payload.id ? { ...c, ...action.payload } : c
        )
      };
    case 'DELETE_CUSTOMER':
      return {
        ...state,
        customers: state.customers.filter(c => c.id !== action.payload)
      };
    case 'ADD_LOYALTY_POINTS':
      return {
        ...state,
        customers: state.customers.map(c =>
          c.id === action.payload.customerId
            ? { 
                ...c, 
                loyaltyPoints: (c.loyaltyPoints || 0) + action.payload.points,
                totalSpent: (c.totalSpent || 0) + action.payload.amount,
                lastVisit: new Date().toISOString().split('T')[0]
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

  // Load customers from localStorage or IndexedDB on mount
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        // Load from localStorage for now (can be connected to IndexedDB later)
        const saved = localStorage.getItem('pos-customers');
        if (saved) {
          dispatch({ type: 'SET_CUSTOMERS', payload: JSON.parse(saved) });
        }
      } catch (error) {
        console.error('Failed to load customers:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadCustomers();
  }, []);

  // Save customers to localStorage whenever they change
  useEffect(() => {
    if (state.customers.length > 0) {
      localStorage.setItem('pos-customers', JSON.stringify(state.customers));
    }
  }, [state.customers]);

  return (
    <CustomerContext.Provider value={{ state, dispatch }}>
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