// src/features/pos/context/SettingsContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../../../features/auth/AuthContext';

const SettingsContext = createContext();

const initialState = {
  store: {
    name: 'My Store',
    address: '',
    phone: '',
    email: '',
    taxRate: 0,
    country: 'US',
    currency: 'USD'
  },
  receipt: {
    header: 'THANK YOU FOR SHOPPING!',
    footer: 'Returns accepted within 30 days',
    showLogo: true,
    showTax: true,
    showDiscount: true,
    showCustomerInfo: true,
    showCashier: true,
    paperSize: '80mm'
  },
  hardware: {
    printer: 'USB',
    cashDrawer: 'COM1',
    barcodeScanner: 'USB',
    customerDisplay: true,
    scale: false
  },
  users: {
    requireLogin: true,
    sessionTimeout: 480,
    maxFailedAttempts: 3
  },
  backup: {
    autoBackup: true,
    backupFrequency: 'daily',
    backupTime: '23:00',
    cloudBackup: false
  },
  appearance: {
    theme: 'light',
    compactMode: false,
    showProductImages: true,
    defaultView: 'grid'
  },
  isLoading: false,
  lastFetched: null
};

function settingsReducer(state, action) {
  switch (action.type) {
    case 'SET_ALL_SETTINGS':
      return { ...state, ...action.payload, isLoading: false, lastFetched: new Date().toISOString() };
    case 'UPDATE_STORE':
      return { ...state, store: { ...state.store, ...action.payload } };
    case 'UPDATE_RECEIPT':
      return { ...state, receipt: { ...state.receipt, ...action.payload } };
    case 'UPDATE_HARDWARE':
      return { ...state, hardware: { ...state.hardware, ...action.payload } };
    case 'UPDATE_USERS':
      return { ...state, users: { ...state.users, ...action.payload } };
    case 'UPDATE_BACKUP':
      return { ...state, backup: { ...state.backup, ...action.payload } };
    case 'UPDATE_APPEARANCE':
      return { ...state, appearance: { ...state.appearance, ...action.payload } };
    case 'RESET_SETTINGS':
      return { ...initialState, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

export function SettingsProvider({ children }) {
  const [state, dispatch] = useReducer(settingsReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // Load settings from backend when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadSettingsFromBackend();
    } else {
      // Clear settings when logged out
      dispatch({ type: 'RESET_SETTINGS' });
      localStorage.removeItem(`pos-settings-${user?.id}`);
    }
  }, [isAuthenticated, user?.id]);

  const loadSettingsFromBackend = async () => {
    if (!user?.id) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await api.get('/settings/store');
      
      if (response.success && response.settings) {
        // Update state with backend settings
        dispatch({ type: 'UPDATE_STORE', payload: response.settings });
        
        // Save to localStorage with user-specific key
        const userSettingsKey = `pos-settings-${user.id}`;
        localStorage.setItem(userSettingsKey, JSON.stringify({
          store: response.settings,
          lastUpdated: new Date().toISOString()
        }));
        
        console.log('✅ Settings loaded from backend for user:', user.email);
      } else {
        // No settings found in backend, use defaults
        console.log('📭 No settings found in backend, using defaults');
      }
    } catch (error) {
      console.error('Failed to load settings from backend:', error);
      
      // Fallback to localStorage for this specific user
      const userSettingsKey = `pos-settings-${user.id}`;
      const savedSettings = localStorage.getItem(userSettingsKey);
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed.store) {
            dispatch({ type: 'UPDATE_STORE', payload: parsed.store });
          }
        } catch (e) {
          console.error('Failed to parse saved settings:', e);
        }
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Save settings to backend when they change
  const saveSettingsToBackend = async (section, data) => {
    if (!user?.id) return false;
    
    try {
      const response = await api.put('/settings/store', data);
      
      if (response.success) {
        // Update user-specific localStorage
        const userSettingsKey = `pos-settings-${user.id}`;
        const currentSaved = localStorage.getItem(userSettingsKey);
        const saved = currentSaved ? JSON.parse(currentSaved) : {};
        
        localStorage.setItem(userSettingsKey, JSON.stringify({
          ...saved,
          store: response.settings,
          lastUpdated: new Date().toISOString()
        }));
        
        console.log('✅ Settings saved to backend for user:', user.email);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to save settings to backend:', error);
      return false;
    }
  };

  // Wrapper for updating store settings
  const updateStoreSettings = async (data) => {
    dispatch({ type: 'UPDATE_STORE', payload: data });
    await saveSettingsToBackend('store', data);
  };

  const value = {
    state,
    dispatch,
    updateStoreSettings,
    updateReceiptSettings: async (data) => {
      dispatch({ type: 'UPDATE_RECEIPT', payload: data });
      await saveSettingsToBackend('receipt', data);
    },
    updateHardwareSettings: async (data) => {
      dispatch({ type: 'UPDATE_HARDWARE', payload: data });
      await saveSettingsToBackend('hardware', data);
    },
    updateUserSettings: async (data) => {
      dispatch({ type: 'UPDATE_USERS', payload: data });
      await saveSettingsToBackend('users', data);
    },
    updateBackupSettings: async (data) => {
      dispatch({ type: 'UPDATE_BACKUP', payload: data });
      await saveSettingsToBackend('backup', data);
    },
    updateAppearanceSettings: async (data) => {
      dispatch({ type: 'UPDATE_APPEARANCE', payload: data });
      await saveSettingsToBackend('appearance', data);
    },
    resetSettings: async () => {
      dispatch({ type: 'RESET_SETTINGS' });
      // Also reset in backend
      await saveSettingsToBackend('store', initialState.store);
    },
    refreshSettings: loadSettingsFromBackend
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};