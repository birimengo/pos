// src/features/pos/context/SettingsContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';

const SettingsContext = createContext();

const initialState = {
  store: {
    name: 'My Store',
    address: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    phone: '(555) 123-4567',
    email: 'store@example.com',
    taxRate: 8.875,
    currency: 'USD',
    timezone: 'America/New_York'
  },
  receipt: {
    header: 'THANK YOU FOR SHOPPING!',
    footer: 'Returns accepted within 30 days',
    showLogo: true,
    showTax: true,
    showDiscount: true,
    showCustomerInfo: true,
    showCashier: true,
    paperSize: '80mm' // 80mm, 58mm, A4
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
    sessionTimeout: 480, // minutes
    maxFailedAttempts: 3
  },
  backup: {
    autoBackup: true,
    backupFrequency: 'daily', // daily, weekly, monthly
    backupTime: '23:00',
    cloudBackup: false
  },
  appearance: {
    theme: 'light',
    compactMode: false,
    showProductImages: true,
    defaultView: 'grid' // grid or list
  },
  isLoading: false
};

function settingsReducer(state, action) {
  switch (action.type) {
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
      return initialState;
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

export function SettingsProvider({ children }) {
  const [state, dispatch] = useReducer(settingsReducer, initialState);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('pos-settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      Object.keys(parsed).forEach(key => {
        if (state[key]) {
          dispatch({ type: `UPDATE_${key.toUpperCase()}`, payload: parsed[key] });
        }
      });
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pos-settings', JSON.stringify(state));
  }, [state]);

  return (
    <SettingsContext.Provider value={{ state, dispatch }}>
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