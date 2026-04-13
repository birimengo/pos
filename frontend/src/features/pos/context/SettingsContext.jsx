// src/features/pos/context/SettingsContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../../../features/auth/AuthContext';

const SettingsContext = createContext();

const DEFAULT_STORE_SETTINGS = {
  name: 'My Store',
  address: '',
  phone: '',
  email: '',
  taxRate: 0,
  country: 'US',
  currency: 'USD'
};

const DEFAULT_RECEIPT_SETTINGS = {
  header: 'THANK YOU FOR SHOPPING!',
  footer: 'Returns accepted within 30 days',
  showLogo: true,
  showTax: true,
  showDiscount: true,
  showCustomerInfo: true,
  showCashier: true,
  paperSize: '80mm'
};

const DEFAULT_HARDWARE_SETTINGS = {
  printer: 'USB',
  cashDrawer: 'COM1',
  barcodeScanner: 'USB',
  customerDisplay: true,
  scale: false
};

const DEFAULT_USERS_SETTINGS = {
  requireLogin: true,
  sessionTimeout: 480,
  maxFailedAttempts: 3
};

const DEFAULT_BACKUP_SETTINGS = {
  autoBackup: true,
  backupFrequency: 'daily',
  backupTime: '23:00',
  cloudBackup: false,
  lastBackup: null
};

const DEFAULT_APPEARANCE_SETTINGS = {
  theme: 'light',
  compactMode: false,
  showProductImages: true,
  defaultView: 'grid'
};

const initialState = {
  store: { ...DEFAULT_STORE_SETTINGS },
  receipt: { ...DEFAULT_RECEIPT_SETTINGS },
  hardware: { ...DEFAULT_HARDWARE_SETTINGS },
  users: { ...DEFAULT_USERS_SETTINGS },
  backup: { ...DEFAULT_BACKUP_SETTINGS },
  appearance: { ...DEFAULT_APPEARANCE_SETTINGS },
  isLoading: false,
  lastFetched: null,
  isInitialized: false
};

function settingsReducer(state, action) {
  switch (action.type) {
    case 'SET_ALL_SETTINGS':
      return { 
        ...state, 
        ...action.payload, 
        isLoading: false, 
        lastFetched: new Date().toISOString(),
        isInitialized: true
      };
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
      return { 
        ...initialState, 
        isLoading: false, 
        isInitialized: true,
        store: { ...DEFAULT_STORE_SETTINGS, ...(action.payload?.store || {}) }
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// Helper to get user-specific storage key
const getUserSettingsKey = (userId) => `pos-settings-${userId}`;

export function SettingsProvider({ children }) {
  const [state, dispatch] = useReducer(settingsReducer, initialState);
  const { user, isAuthenticated, getUserId } = useAuth();

  // Load settings when user changes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadSettingsFromBackend();
    } else if (!isAuthenticated) {
      // Reset to defaults when logged out
      dispatch({ type: 'RESET_SETTINGS' });
    }
  }, [isAuthenticated, user?.id]);

  const loadSettingsFromBackend = async () => {
    if (!user?.id) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      console.log(`📡 Loading settings for user: ${user.email}`);
      const response = await api.get('/settings/store');
      
      if (response.success && response.settings) {
        // Update state with backend settings
        dispatch({ type: 'UPDATE_STORE', payload: response.settings });
        
        // Save to user-specific localStorage
        const userSettingsKey = getUserSettingsKey(user.id);
        localStorage.setItem(userSettingsKey, JSON.stringify({
          store: response.settings,
          lastUpdated: new Date().toISOString(),
          userId: user.id
        }));
        
        console.log(`✅ Settings loaded from backend for user: ${user.email}`, response.settings);
      } else {
        // No settings in backend, create default settings
        console.log(`📭 No settings found for user ${user.email}, creating defaults`);
        await createDefaultSettings();
      }
    } catch (error) {
      console.error('Failed to load settings from backend:', error);
      
      // Try to load from user-specific localStorage as fallback
      const userSettingsKey = getUserSettingsKey(user.id);
      const savedSettings = localStorage.getItem(userSettingsKey);
      
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed.store) {
            dispatch({ type: 'UPDATE_STORE', payload: parsed.store });
            console.log(`📦 Loaded settings from localStorage for user: ${user.email}`);
          }
        } catch (e) {
          console.error('Failed to parse saved settings:', e);
        }
      } else {
        // Use defaults
        console.log(`📦 Using default settings for user: ${user.email}`);
        dispatch({ type: 'RESET_SETTINGS', payload: { store: { ...DEFAULT_STORE_SETTINGS, email: user.email, name: `${user.name?.split('@')[0] || 'My'}'s Store` } } });
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const createDefaultSettings = async () => {
    if (!user?.id) return;
    
    try {
      const defaultStoreSettings = {
        ...DEFAULT_STORE_SETTINGS,
        name: `${user.name?.split('@')[0] || user.email?.split('@')[0] || 'My'}'s Store`,
        email: user.email || '',
        phone: '',
        address: ''
      };
      
      const response = await api.put('/settings/store', defaultStoreSettings);
      
      if (response.success) {
        dispatch({ type: 'UPDATE_STORE', payload: response.settings });
        
        // Save to user-specific localStorage
        const userSettingsKey = getUserSettingsKey(user.id);
        localStorage.setItem(userSettingsKey, JSON.stringify({
          store: response.settings,
          lastUpdated: new Date().toISOString(),
          userId: user.id
        }));
        
        console.log(`✅ Default settings created for user: ${user.email}`);
      }
    } catch (error) {
      console.error('Failed to create default settings:', error);
    }
  };

  // Save settings to backend
  const saveSettingsToBackend = async (data) => {
    if (!user?.id) return false;
    
    try {
      console.log(`💾 Saving settings for user: ${user.email}`, data);
      const response = await api.put('/settings/store', data);
      
      if (response.success) {
        // Update user-specific localStorage
        const userSettingsKey = getUserSettingsKey(user.id);
        localStorage.setItem(userSettingsKey, JSON.stringify({
          store: response.settings,
          lastUpdated: new Date().toISOString(),
          userId: user.id
        }));
        
        console.log(`✅ Settings saved to backend for user: ${user.email}`);
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
    await saveSettingsToBackend(data);
  };

  const updateReceiptSettings = async (data) => {
    dispatch({ type: 'UPDATE_RECEIPT', payload: data });
    await saveSettingsToBackend(data);
  };

  const updateHardwareSettings = async (data) => {
    dispatch({ type: 'UPDATE_HARDWARE', payload: data });
    await saveSettingsToBackend(data);
  };

  const updateUserSettings = async (data) => {
    dispatch({ type: 'UPDATE_USERS', payload: data });
    await saveSettingsToBackend(data);
  };

  const updateBackupSettings = async (data) => {
    dispatch({ type: 'UPDATE_BACKUP', payload: data });
    await saveSettingsToBackend(data);
  };

  const updateAppearanceSettings = async (data) => {
    dispatch({ type: 'UPDATE_APPEARANCE', payload: data });
    await saveSettingsToBackend(data);
  };

  const resetSettings = async () => {
    const defaultStoreSettings = {
      ...DEFAULT_STORE_SETTINGS,
      name: `${user?.name?.split('@')[0] || user?.email?.split('@')[0] || 'My'}'s Store`,
      email: user?.email || '',
      phone: '',
      address: ''
    };
    
    dispatch({ type: 'RESET_SETTINGS', payload: { store: defaultStoreSettings } });
    await saveSettingsToBackend(defaultStoreSettings);
  };

  const refreshSettings = () => {
    loadSettingsFromBackend();
  };

  const value = {
    state,
    dispatch,
    updateStoreSettings,
    updateReceiptSettings,
    updateHardwareSettings,
    updateUserSettings,
    updateBackupSettings,
    updateAppearanceSettings,
    resetSettings,
    refreshSettings,
    isInitialized: state.isInitialized
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