// src/features/pos/context/CurrencyContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../../../features/auth/AuthContext';
import { 
  getCountryByCode, 
  getCurrencyByCountry,
  currencySymbols,
  countries
} from '../data/currencyData';

const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState({
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    position: 'before',
    countryCode: 'US'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);
  
  // Get auth context - but handle it safely if not available
  let auth;
  try {
    auth = useAuth();
  } catch (e) {
    // Auth context not available yet
    auth = { isAuthenticated: false, user: null };
  }
  
  const { isAuthenticated, user } = auth;

  // Load currency settings from localStorage first (as fallback)
  const loadFromLocalStorage = useCallback(() => {
    try {
      const savedSettings = localStorage.getItem('storeSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        const { country, currency: currencyCode } = settings;
        const currencyDetails = getCurrencyByCountry(country || 'US');
        
        setCurrency({
          code: currencyDetails.code,
          symbol: currencyDetails.symbol,
          name: currencyDetails.name,
          position: currencyDetails.position || 'before',
          countryCode: country || 'US'
        });
        setStoreSettings(settings);
        return true;
      }
    } catch (err) {
      console.error('Failed to load from localStorage:', err);
    }
    return false;
  }, []);

  // Load currency settings from backend
  const loadCurrencySettings = useCallback(async () => {
    // If not authenticated, try to load from localStorage
    if (!isAuthenticated) {
      console.log('User not authenticated, loading currency from localStorage');
      const loaded = loadFromLocalStorage();
      if (loaded) {
        setLoading(false);
        return;
      }
      // Use default if nothing in localStorage
      setCurrency({
        code: 'USD',
        symbol: '$',
        name: 'US Dollar',
        position: 'before',
        countryCode: 'US'
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/settings/store');
      if (response.success && response.settings) {
        const { country, currency: currencyCode } = response.settings;
        
        // Get currency details based on country code
        const currencyDetails = getCurrencyByCountry(country || 'US');
        
        const newCurrency = {
          code: currencyDetails.code,
          symbol: currencyDetails.symbol,
          name: currencyDetails.name,
          position: currencyDetails.position || 'before',
          countryCode: country || 'US'
        };
        
        setCurrency(newCurrency);
        setStoreSettings(response.settings);
        
        // Save to localStorage for offline/unauth access
        localStorage.setItem('storeSettings', JSON.stringify(response.settings));
        localStorage.setItem('currencySettings', JSON.stringify(newCurrency));
      } else {
        // Fallback to localStorage or default
        const loaded = loadFromLocalStorage();
        if (!loaded) {
          setCurrency({
            code: 'USD',
            symbol: '$',
            name: 'US Dollar',
            position: 'before',
            countryCode: 'US'
          });
        }
      }
    } catch (error) {
      console.error('Failed to load currency settings:', error);
      setError(error.message);
      
      // Fallback to localStorage or default
      const loaded = loadFromLocalStorage();
      if (!loaded) {
        setCurrency({
          code: 'USD',
          symbol: '$',
          name: 'US Dollar',
          position: 'before',
          countryCode: 'US'
        });
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, loadFromLocalStorage]);

  // Load on mount and when authentication changes
  useEffect(() => {
    loadCurrencySettings();
  }, [loadCurrencySettings, isAuthenticated]);

  // Format price with currency
  const formatPrice = useCallback((amount, options = {}) => {
    const { showSymbol = true, showCode = false, decimals = 2, forcePosition = null } = options;
    
    // Handle null/undefined
    if (amount === undefined || amount === null || isNaN(amount)) {
      if (showSymbol) {
        const position = forcePosition || currency.position;
        return position === 'after' ? `0${currency.symbol}` : `${currency.symbol}0`;
      }
      return '0';
    }
    
    // Round to avoid floating point issues
    const rounded = Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
    
    // Format the number with proper thousand separators
    const formattedNumber = rounded.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    
    // Show currency code instead of symbol
    if (showCode) {
      return `${currency.code} ${formattedNumber}`;
    }
    
    // Show symbol
    if (showSymbol) {
      const position = forcePosition || currency.position;
      if (position === 'after') {
        return `${formattedNumber}${currency.symbol}`;
      }
      return `${currency.symbol}${formattedNumber}`;
    }
    
    return formattedNumber;
  }, [currency]);

  // Format price for input fields (no symbols, just numbers)
  const formatPriceForInput = useCallback((amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '0';
    }
    return amount.toFixed(2);
  }, []);

  // Parse input value to number
  const parsePriceInput = useCallback((value) => {
    if (!value) return 0;
    // Remove any non-numeric characters except decimal point
    const cleaned = value.toString().replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }, []);

  // Format large amounts (for reports, summaries)
  const formatLargeAmount = useCallback((amount, options = {}) => {
    const { showSymbol = true, abbreviated = false, decimals = 1 } = options;
    
    if (abbreviated && Math.abs(amount) >= 1000000) {
      const millions = amount / 1000000;
      const formatted = millions.toFixed(decimals);
      const number = formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted;
      const suffix = 'M';
      
      if (showSymbol) {
        if (currency.position === 'after') {
          return `${number}${suffix}${currency.symbol}`;
        }
        return `${currency.symbol}${number}${suffix}`;
      }
      return `${number}${suffix}`;
    }
    
    if (abbreviated && Math.abs(amount) >= 1000) {
      const thousands = amount / 1000;
      const formatted = thousands.toFixed(decimals);
      const number = formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted;
      const suffix = 'K';
      
      if (showSymbol) {
        if (currency.position === 'after') {
          return `${number}${suffix}${currency.symbol}`;
        }
        return `${currency.symbol}${number}${suffix}`;
      }
      return `${number}${suffix}`;
    }
    
    return formatPrice(amount, { showSymbol, decimals });
  }, [currency, formatPrice]);

  // Convert amount between currencies (for future multi-currency support)
  const convertCurrency = useCallback((amount, fromCurrency, toCurrency, rate = null) => {
    // If rate is provided, use it
    if (rate !== null) {
      return amount * rate;
    }
    
    // If currencies are the same, return original
    if (fromCurrency === toCurrency) {
      return amount;
    }
    
    // For now, just return the amount
    console.warn('Currency conversion not implemented yet');
    return amount;
  }, []);

  // Get currency symbol for a specific currency code
  const getCurrencySymbol = useCallback((currencyCode = null) => {
    if (currencyCode) {
      return currencySymbols[currencyCode] || currencyCode;
    }
    return currency.symbol;
  }, [currency.symbol]);

  // Get full currency info
  const getCurrencyInfo = useCallback(() => {
    return { ...currency };
  }, [currency]);

  // Refresh currency settings (called after store settings update)
  const refreshCurrency = useCallback(async () => {
    await loadCurrencySettings();
  }, [loadCurrencySettings]);

  // Check if currency is using position after (e.g., 100€)
  const isPositionAfter = useCallback(() => {
    return currency.position === 'after';
  }, [currency.position]);

  // Get formatted currency example
  const getCurrencyExample = useCallback((amount = 1234.56) => {
    return formatPrice(amount);
  }, [formatPrice]);

  // Save currency settings to localStorage (called from StoreSettings after save)
  const saveCurrencySettings = useCallback((settings) => {
    try {
      localStorage.setItem('storeSettings', JSON.stringify(settings));
      const currencyDetails = getCurrencyByCountry(settings.country || 'US');
      localStorage.setItem('currencySettings', JSON.stringify({
        code: currencyDetails.code,
        symbol: currencyDetails.symbol,
        name: currencyDetails.name,
        position: currencyDetails.position || 'before',
        countryCode: settings.country || 'US'
      }));
    } catch (err) {
      console.error('Failed to save currency settings to localStorage:', err);
    }
  }, []);

  const value = {
    // State
    currency,
    loading,
    error,
    storeSettings,
    
    // Formatting functions
    formatPrice,
    formatPriceForInput,
    formatLargeAmount,
    parsePriceInput,
    
    // Utility functions
    convertCurrency,
    getCurrencySymbol,
    getCurrencyInfo,
    refreshCurrency,
    isPositionAfter,
    getCurrencyExample,
    saveCurrencySettings,
    
    // Direct access helpers
    getSymbol: () => currency.symbol,
    getCode: () => currency.code,
    getName: () => currency.name,
    getPosition: () => currency.position,
    
    // Convenience properties
    symbol: currency.symbol,
    code: currency.code,
    name: currency.name,
    position: currency.position
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

// Custom hook for using currency context
export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
};

// Higher-order component to wrap components that need currency
export const withCurrency = (Component) => {
  return function WrappedComponent(props) {
    const currencyProps = useCurrency();
    return <Component {...props} currency={currencyProps} />;
  };
};

export default CurrencyContext;