import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { useStore } from './StoreContext';

const CustomerContext = createContext();

const initialState = {
  customers: [],
  selectedCustomer: null,
  searchTerm: '',
  isLoading: false,
  currentStoreId: null,
  lastLoaded: null
};

function customerReducer(state, action) {
  switch (action.type) {
    case 'SET_CUSTOMERS':
      return { 
        ...state, 
        customers: action.payload, 
        isLoading: false,
        currentStoreId: action.storeId,
        lastLoaded: new Date().toISOString()
      };
    case 'SELECT_CUSTOMER':
      return { ...state, selectedCustomer: action.payload };
    case 'CLEAR_SELECTED_CUSTOMER':
      return { ...state, selectedCustomer: null };
    case 'ADD_CUSTOMER':
      return { 
        ...state, 
        customers: [...state.customers, action.payload] 
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
    case 'CLEAR_CUSTOMERS':
      return { ...state, customers: [], currentStoreId: null };
    default:
      return state;
  }
}

export function CustomerProvider({ children }) {
  const [state, dispatch] = useReducer(customerReducer, initialState);
  const { activeStore, currentStoreId: activeStoreId, loading: storeLoading } = useStore();

  // Load customers for the current store - ONLY customers belonging to this store
  const loadCustomers = useCallback(async (storeId = null, forceRefresh = false) => {
    const targetStoreId = storeId || activeStoreId || activeStore?.id;
    
    if (!targetStoreId) {
      console.log('⏳ No store selected, skipping customer load');
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'CLEAR_CUSTOMERS' });
      return;
    }
    
    // Don't reload if already loaded for this store and not forced
    if (!forceRefresh && state.currentStoreId === targetStoreId && state.customers.length > 0 && !state.isLoading) {
      console.log(`📦 Using cached customers for store: ${targetStoreId}`);
      return;
    }
    
    console.log(`🔄 Loading customers for store: ${targetStoreId}`);
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      await db.ensureInitialized();
      
      // Get all customers and filter by storeId
      const allCustomers = await db.getAll('customers');
      
      // Get store IDs for matching (both local ID and MongoDB ID)
      const targetStoreIdStr = String(targetStoreId);
      const targetStoreCloudId = String(activeStore?._id || activeStore?.cloudId || '');
      
      // Filter customers that belong to this store
      const storeCustomers = allCustomers.filter(c => {
        const customerStoreId = String(c.storeId || '');
        return customerStoreId === targetStoreIdStr || 
               customerStoreId === targetStoreCloudId ||
               (c.storeCloudId && String(c.storeCloudId) === targetStoreCloudId);
      });
      
      if (storeCustomers && storeCustomers.length > 0) {
        const normalizedCustomers = storeCustomers.map(c => ({
          ...c,
          id: String(c.id),
          totalSpent: c.totalSpent || 0,
          transactionCount: c.transactionCount || 0,
          loyaltyPoints: c.loyaltyPoints || 0,
          storeId: c.storeId // Keep storeId for reference
        }));
        dispatch({ 
          type: 'SET_CUSTOMERS', 
          payload: normalizedCustomers,
          storeId: targetStoreId
        });
        console.log(`✅ Loaded ${normalizedCustomers.length} customers for store ${activeStore?.name || targetStoreId}`);
      } else {
        dispatch({ 
          type: 'SET_CUSTOMERS', 
          payload: [],
          storeId: targetStoreId
        });
        console.log(`📭 No customers found for store ${activeStore?.name || targetStoreId}`);
      }
      
      // Save to localStorage with store-specific key for backup
      if (storeCustomers.length > 0) {
        const backupKey = `pos-customers-${targetStoreId}`;
        localStorage.setItem(backupKey, JSON.stringify(storeCustomers));
      }
      
    } catch (error) {
      console.error('Failed to load customers:', error);
      
      // Fallback to store-specific localStorage
      const backupKey = `pos-customers-${targetStoreId}`;
      const saved = localStorage.getItem(backupKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Filter by storeId again for safety
          const filtered = parsed.filter(c => String(c.storeId) === String(targetStoreId));
          const normalized = filtered.map(c => ({ ...c, id: String(c.id) }));
          dispatch({ 
            type: 'SET_CUSTOMERS', 
            payload: normalized,
            storeId: targetStoreId
          });
          console.log(`📦 Loaded ${normalized.length} customers from localStorage backup for store ${targetStoreId}`);
        } catch (e) {
          console.error('Failed to parse backup customers:', e);
        }
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [activeStoreId, activeStore, state.currentStoreId, state.customers.length, state.isLoading]);

  // Load customers when store changes
  useEffect(() => {
    // Wait for store to be ready
    if (storeLoading) {
      console.log('⏳ Store context still loading, waiting for store...');
      return;
    }
    
    const storeId = activeStoreId || activeStore?.id;
    if (storeId) {
      // Force refresh when store changes to ensure clean data
      loadCustomers(storeId, true);
    } else {
      dispatch({ type: 'CLEAR_CUSTOMERS' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [activeStoreId, activeStore, storeLoading, loadCustomers]);

  // Listen for store switch events
  useEffect(() => {
    const handleStoreSwitch = (event) => {
      console.log('🔄 Store switched, reloading customers for new store...', event.detail);
      const newStoreId = event.detail?.storeId || event.detail?.store?._id;
      if (newStoreId) {
        // Clear current customers before loading new ones
        dispatch({ type: 'CLEAR_CUSTOMERS' });
        loadCustomers(newStoreId, true);
      }
    };

    const handleRefreshCustomers = () => {
      console.log('🔄 Refresh customers requested');
      const storeId = activeStoreId || activeStore?.id;
      if (storeId) {
        // Force refresh by clearing cache
        dispatch({ type: 'CLEAR_CUSTOMERS' });
        loadCustomers(storeId, true);
      }
    };

    window.addEventListener('store-switched', handleStoreSwitch);
    window.addEventListener('refresh-customers', handleRefreshCustomers);
    
    return () => {
      window.removeEventListener('store-switched', handleStoreSwitch);
      window.removeEventListener('refresh-customers', handleRefreshCustomers);
    };
  }, [activeStoreId, activeStore, loadCustomers]);

  // Listen for cloud restore events to reload data
  useEffect(() => {
    const handleDataRestored = async (event) => {
      console.log('🔄 Cloud data restored, reloading customers...', event.detail);
      const storeId = activeStoreId || activeStore?.id;
      if (storeId) {
        dispatch({ type: 'CLEAR_CUSTOMERS' });
        await loadCustomers(storeId, true);
      }
    };

    window.addEventListener('cloud-data-restored', handleDataRestored);
    
    return () => {
      window.removeEventListener('cloud-data-restored', handleDataRestored);
    };
  }, [activeStoreId, activeStore, loadCustomers]);

  // Save customers to store-specific localStorage as backup when they change
  useEffect(() => {
    if (state.customers.length > 0 && state.currentStoreId) {
      const backupKey = `pos-customers-${state.currentStoreId}`;
      localStorage.setItem(backupKey, JSON.stringify(state.customers));
    }
  }, [state.customers, state.currentStoreId]);

  // Method to add a customer and save to current store
  const addCustomer = useCallback(async (customerData) => {
    const storeId = activeStoreId || activeStore?.id;
    if (!storeId) {
      console.error('Cannot add customer: No active store');
      return { success: false, error: 'No active store' };
    }
    
    const newCustomer = {
      ...customerData,
      id: String(Date.now()),
      storeId: storeId,
      storeCloudId: activeStore?._id || activeStore?.cloudId,
      joinDate: new Date().toISOString().split('T')[0],
      lastVisit: new Date().toISOString().split('T')[0],
      loyaltyPoints: 0,
      totalSpent: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      transactionCount: 0,
      creditCount: 0,
      installmentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false,
      syncRequired: true
    };
    
    dispatch({ type: 'ADD_CUSTOMER', payload: newCustomer });
    
    // Save to IndexedDB
    await db.saveCustomer(newCustomer);
    
    return { success: true, customer: newCustomer };
  }, [activeStoreId, activeStore]);

  // Method to refresh customers manually
  const refreshCustomers = useCallback(() => {
    const storeId = activeStoreId || activeStore?.id;
    if (storeId) {
      dispatch({ type: 'CLEAR_CUSTOMERS' });
      loadCustomers(storeId, true);
    }
  }, [activeStoreId, activeStore, loadCustomers]);

  const value = {
    state,
    dispatch,
    reloadCustomers: refreshCustomers,
    addCustomer,
    refreshCustomers,
    getCustomersForCurrentStore: () => state.customers,
    getCustomerCount: () => state.customers.length,
    isStoreLoaded: state.currentStoreId === (activeStoreId || activeStore?.id)
  };

  return (
    <CustomerContext.Provider value={value}>
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