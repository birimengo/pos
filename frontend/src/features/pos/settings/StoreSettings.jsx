import { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../../../features/auth/AuthContext';
import { useStore } from '../context/StoreContext';
import { Icons } from '../../../components/ui/Icons';
import { countries, getCurrencyByCountry } from '../data/currencyData';
import { api } from '../services/api';
import { db } from '../services/database';

export default function StoreSettings({ currentStore: propCurrentStore, onStoreUpdate }) {
  const { theme, getTheme } = useTheme();
  const { updateStoreSettings, refreshSettings, state: settingsState } = useSettings();
  const { refreshCurrency, getCurrencySymbol, currency } = useCurrency();
  const { user, isAdmin } = useAuth();
  const { activeStore, refreshStores, forceRefreshStore } = useStore();
  const currentTheme = getTheme(theme);
  
  const [currentStore, setCurrentStore] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    taxRate: 0,
    country: 'US',
    currency: 'USD'
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveMessageType, setSaveMessageType] = useState('');
  const [loadingStore, setLoadingStore] = useState(true);
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter countries based on search term
  const filteredCountries = useMemo(() => {
    if (!countrySearchTerm) return countries;
    const term = countrySearchTerm.toLowerCase();
    return countries.filter(country => 
      country.name.toLowerCase().includes(term) ||
      country.currency.toLowerCase().includes(term) ||
      country.code.toLowerCase().includes(term)
    );
  }, [countrySearchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsCountryDropdownOpen(false);
        setCountrySearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load current store and settings
  useEffect(() => {
    loadCurrentStore();
  }, [activeStore, settingsState]);

  const loadCurrentStore = async () => {
    setLoadingStore(true);
    try {
      let store = null;
      
      // Priority 1: Use activeStore from context, but only if it belongs to current user
      if (activeStore && activeStore.createdBy === user?.id) {
        store = activeStore;
        console.log('📦 Using activeStore from context:', store.name);
      }
      
      // Priority 2: Get from database using currentStoreId
      if (!store) {
        const activeStoreId = db.getCurrentStore();
        if (activeStoreId) {
          const dbStore = await db.getStore(activeStoreId);
          // Only use if it belongs to current user
          if (dbStore && dbStore.createdBy === user?.id) {
            store = dbStore;
            console.log('📦 Loaded store from database:', store.name);
          }
        }
      }
      
      // Priority 3: Get the user's first store from API
      if (!store) {
        const userStoresResult = await api.getAllStores();
        if (userStoresResult.success && userStoresResult.stores?.length > 0) {
          // Filter stores that belong to current user
          const userStores = userStoresResult.stores.filter(s => s.createdBy === user?.id);
          if (userStores.length > 0) {
            store = userStores[0];
            console.log('📦 Using first user store from API:', store.name);
          }
        }
      }
      
      // Priority 4: Get default store from API
      if (!store) {
        const response = await api.getDefaultStore();
        if (response.success && response.store && response.store.createdBy === user?.id) {
          store = response.store;
          console.log('📦 Loaded default store from API:', store.name);
        }
      }
      
      if (store) {
        setCurrentStore(store);
        
        // Load country and currency from settings (user-specific)
        const settingsCountry = settingsState?.store?.country || 'US';
        const settingsCurrency = settingsState?.store?.currency || 'USD';
        
        setFormData({
          name: store.name || '',
          address: store.address || '',
          phone: store.phone || '',
          email: store.email || '',
          taxRate: store.taxRate || 0,
          country: settingsCountry,
          currency: settingsCurrency
        });
        
        console.log('✅ Current store loaded in Settings:', store.name);
        console.log('📊 Form data loaded:', { country: settingsCountry, currency: settingsCurrency });
      } else {
        console.warn('⚠️ No store found for current user');
        setCurrentStore(null);
      }
    } catch (error) {
      console.error('Failed to load current store:', error);
      setCurrentStore(null);
    } finally {
      setLoadingStore(false);
    }
  };

  // Get selected country details
  const selectedCountry = countries.find(c => c.code === formData.country);
  
  // Get currency details based on selected country
  const getCurrencyForCountry = (countryCode) => {
    const country = countries.find(c => c.code === countryCode);
    if (country) {
      return {
        code: country.currency,
        symbol: country.symbol,
        name: country.name,
        flag: country.flag
      };
    }
    return { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' };
  };

  const currencyInfo = getCurrencyForCountry(formData.country);

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Store name is required';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    
    if (formData.phone && !/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,5}[-\s\.]?[0-9]{1,5}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Invalid phone number';
    }
    
    if (formData.taxRate < 0 || formData.taxRate > 100) {
      newErrors.taxRate = 'Tax rate must be between 0 and 100';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleCountrySelect = (country) => {
    const newCurrencyInfo = getCurrencyForCountry(country.code);
    setFormData({
      ...formData,
      country: country.code,
      currency: newCurrencyInfo.code
    });
    setIsCountryDropdownOpen(false);
    setCountrySearchTerm('');
    setTouched(prev => ({ ...prev, country: true }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSaveMessage('Please fix the errors before saving');
      setSaveMessageType('error');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    
    if (!currentStore) {
      setSaveMessage('No store selected to edit');
      setSaveMessageType('error');
      return;
    }
    
    setSaving(true);
    setSaveMessage('');
    
    try {
      // Update store basic info
      const updateData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        taxRate: parseFloat(formData.taxRate) || 0
      };
      
      let storeUpdateSuccess = false;
      
      if (currentStore && currentStore._id) {
        const response = await api.updateStore(currentStore._id, updateData);
        if (response.success) {
          const updatedStore = { ...currentStore, ...updateData, updatedAt: new Date().toISOString() };
          setCurrentStore(updatedStore);
          await db.saveStore(updatedStore);
          storeUpdateSuccess = true;
          console.log('✅ Store info updated successfully');
        } else {
          throw new Error(response.error || 'Failed to save store info');
        }
      } else {
        await updateStoreSettings(updateData);
        storeUpdateSuccess = true;
      }
      
      // Update store settings (country and currency) - these go to settings endpoint
      const settingsUpdateData = {
        country: formData.country,
        currency: formData.currency
      };
      
      // Use the settings endpoint for country/currency
      const settingsResponse = await api.put('/settings/store', settingsUpdateData);
      if (!settingsResponse.success) {
        console.warn('Failed to update settings:', settingsResponse.error);
        // Don't throw, just warn - the store info was saved successfully
      } else {
        console.log('✅ Settings updated with country/currency:', settingsUpdateData);
      }
      
      // Refresh currency context
      await refreshCurrency();
      
      // Refresh settings context
      if (refreshSettings) await refreshSettings();
      
      if (refreshStores) await refreshStores();
      if (onStoreUpdate) onStoreUpdate();
      
      setSaveMessage('✅ Store settings saved successfully!');
      setSaveMessageType('success');
      
      setTimeout(() => {
        setSaveMessage('');
      }, 3000);
      
    } catch (error) {
      console.error('Failed to save store settings:', error);
      setSaveMessage('❌ Failed to save settings: ' + error.message);
      setSaveMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  if (loadingStore) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentStore && !loadingStore) {
    return (
      <div className={`p-8 text-center ${currentTheme.colors.card} rounded-lg border ${currentTheme.colors.border}`}>
        <Icons.store className="text-4xl mx-auto mb-3 text-gray-400" />
        <p className={`text-sm ${currentTheme.colors.textMuted}`}>No store found for your account</p>
        <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
          Please create a store in Multi-Store Management first
        </p>
        {isAdmin && (
          <button
            onClick={() => window.location.href = '/pos/stores'}
            className="mt-3 px-4 py-2 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600"
          >
            Go to Multi-Store Management
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Store Display */}
      {currentStore && (
        <div className={`p-4 rounded-lg ${currentTheme.colors.accentLight} border ${currentTheme.colors.border}`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                <Icons.store className="text-sm" />
              </div>
              <div>
                <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Currently Editing Store</p>
                <p className={`text-base font-semibold ${currentTheme.colors.text}`}>{currentStore.name}</p>
                <p className={`text-xs ${currentTheme.colors.textMuted}`}>
                  {currentStore.address || 'No address set'} • {currentStore.phone || 'No phone'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {currentStore.isDefault && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  Main Store
                </span>
              )}
              {currentStore.open ? (
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                  Open
                </span>
              ) : (
                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                  Closed
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Info Banner */}
      <div className={`p-3 rounded-lg ${currentTheme.colors.accentLight} border ${currentTheme.colors.border}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Logged in as</p>
            <p className={`text-sm font-medium ${currentTheme.colors.text}`}>{user?.email}</p>
            <p className={`text-xs ${currentTheme.colors.textMuted}`}>{user?.name}</p>
          </div>
          <div className={`ml-auto text-xs px-2 py-1 rounded-full ${
            user?.role === 'admin' ? 'bg-purple-100 text-purple-700' :
            user?.role === 'manager' ? 'bg-blue-100 text-blue-700' :
            user?.role === 'inventory_manager' ? 'bg-cyan-100 text-cyan-700' :
            'bg-green-100 text-green-700'
          }`}>
            {user?.role?.replace('_', ' ') || 'Cashier'}
          </div>
        </div>
        <p className={`text-[10px] ${currentTheme.colors.textMuted} mt-2 pt-1 border-t ${currentTheme.colors.border}`}>
          These settings are specific to your account and will persist across devices
        </p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
          saveMessageType === 'success' 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800'
            : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>
          {saveMessageType === 'success' ? (
            <Icons.checkCircle className="text-sm" />
          ) : (
            <Icons.alert className="text-sm" />
          )}
          {saveMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Store Name */}
          <div>
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1.5`}>
              Store Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Icons.store className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${currentTheme.colors.textMuted}`} />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                className={`w-full pl-10 pr-3 py-2.5 rounded-lg border transition-all ${
                  touched.name && errors.name 
                    ? 'border-red-500 ring-1 ring-red-500' 
                    : `${currentTheme.colors.border} focus:ring-2 focus:ring-blue-500`
                } ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none`}
                placeholder="Enter store name"
              />
            </div>
            {touched.name && errors.name && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <Icons.alert className="text-xs" /> {errors.name}
              </p>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1.5`}>
              Email Address
            </label>
            <div className="relative">
              <Icons.mail className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${currentTheme.colors.textMuted}`} />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                className={`w-full pl-10 pr-3 py-2.5 rounded-lg border transition-all ${
                  touched.email && errors.email 
                    ? 'border-red-500 ring-1 ring-red-500' 
                    : `${currentTheme.colors.border} focus:ring-2 focus:ring-blue-500`
                } ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none`}
                placeholder="store@example.com"
              />
            </div>
            {touched.email && errors.email && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <Icons.alert className="text-xs" /> {errors.email}
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1.5`}>
              Phone Number
            </label>
            <div className="relative">
              <Icons.phone className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${currentTheme.colors.textMuted}`} />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                onBlur={() => handleBlur('phone')}
                className={`w-full pl-10 pr-3 py-2.5 rounded-lg border transition-all ${
                  touched.phone && errors.phone 
                    ? 'border-red-500 ring-1 ring-red-500' 
                    : `${currentTheme.colors.border} focus:ring-2 focus:ring-blue-500`
                } ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none`}
                placeholder="+1 234 567 8900"
              />
            </div>
            {touched.phone && errors.phone && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <Icons.alert className="text-xs" /> {errors.phone}
              </p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1.5`}>
              Address
            </label>
            <div className="relative">
              <Icons.mapPin className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${currentTheme.colors.textMuted}`} />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className={`w-full pl-10 pr-3 py-2.5 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                placeholder="Street address"
              />
            </div>
          </div>

          {/* Country with Search Dropdown */}
          <div ref={dropdownRef} className="relative">
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1.5`}>
              Country <span className="text-red-500">*</span>
            </label>
            
            <div
              onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
              className={`w-full px-3 py-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                isCountryDropdownOpen 
                  ? 'border-blue-500 ring-2 ring-blue-500' 
                  : currentTheme.colors.border
              } ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedCountry?.flag || '🌍'}</span>
                <span>{selectedCountry?.name || 'Select country'}</span>
                <span className={`text-xs ${currentTheme.colors.textMuted}`}>
                  ({selectedCountry?.currency || 'USD'})
                </span>
              </div>
              <Icons.chevronDown className={`text-sm transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {isCountryDropdownOpen && (
              <div className={`absolute z-50 w-full mt-1 rounded-lg border shadow-lg ${currentTheme.colors.card} ${currentTheme.colors.border} max-h-80 overflow-hidden flex flex-col`}>
                <div className="p-2 border-b">
                  <div className="relative">
                    <Icons.search className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${currentTheme.colors.textMuted}`} />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={countrySearchTerm}
                      onChange={(e) => setCountrySearchTerm(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="Search country by name, currency, or code..."
                      autoFocus
                    />
                  </div>
                </div>
                
                <div className="overflow-y-auto max-h-60">
                  {filteredCountries.length > 0 ? (
                    filteredCountries.map(country => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => handleCountrySelect(country)}
                        className={`w-full px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between ${
                          formData.country === country.code ? `bg-blue-50 dark:bg-blue-900/20 ${currentTheme.accentText}` : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{country.flag}</span>
                          <span className="text-sm">{country.name}</span>
                          <span className={`text-xs ${currentTheme.colors.textMuted}`}>
                            ({country.currency})
                          </span>
                        </div>
                        {formData.country === country.code && (
                          <Icons.check className="text-sm text-blue-500" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-8 text-center">
                      <p className={`text-sm ${currentTheme.colors.textMuted}`}>
                        No countries found matching "{countrySearchTerm}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tax Rate */}
          <div>
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1.5`}>
              Tax Rate (%)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                value={formData.taxRate}
                onChange={(e) => handleInputChange('taxRate', parseFloat(e.target.value))}
                onBlur={() => handleBlur('taxRate')}
                min="0"
                max="100"
                step="0.1"
                className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 accent-blue-500"
              />
              <div className="relative w-24">
                <input
                  type="number"
                  step="0.1"
                  value={formData.taxRate}
                  onChange={(e) => handleInputChange('taxRate', parseFloat(e.target.value) || 0)}
                  onBlur={() => handleBlur('taxRate')}
                  className={`w-full px-3 py-2 rounded-lg border text-right ${
                    touched.taxRate && errors.taxRate 
                      ? 'border-red-500 ring-1 ring-red-500' 
                      : currentTheme.colors.border
                  } ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
              </div>
            </div>
            {touched.taxRate && errors.taxRate && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <Icons.alert className="text-xs" /> {errors.taxRate}
              </p>
            )}
            <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
              Tax will be applied to all sales at checkout
            </p>
          </div>
        </div>

        {/* Currency Information Card */}
        <div className={`p-5 rounded-xl ${currentTheme.colors.accentLight} border ${currentTheme.colors.border}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-8 h-8 rounded-full ${currentTheme.colors.accent} bg-opacity-20 flex items-center justify-center`}>
              <Icons.creditCard className={`text-sm ${currentTheme.accentText}`} />
            </div>
            <h3 className={`text-base font-semibold ${currentTheme.colors.text}`}>Currency Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className={`p-4 rounded-lg ${currentTheme.colors.card} border ${currentTheme.colors.border} text-center`}>
              <p className={`text-xs ${currentTheme.colors.textSecondary} mb-2`}>Sample Price Display</p>
              <div className="flex items-center justify-center gap-1 mb-2">
                <span className="text-4xl font-bold">{currencyInfo.symbol}</span>
                <span className="text-4xl font-bold">99.99</span>
              </div>
              <div className="flex justify-center gap-4 mt-3">
                <div className="text-center">
                  <p className={`text-[10px] ${currentTheme.colors.textSecondary}`}>Format</p>
                  <p className={`text-sm font-mono ${currentTheme.colors.text}`}>{currencyInfo.symbol}X</p>
                </div>
                <div className="text-center">
                  <p className={`text-[10px] ${currentTheme.colors.textSecondary}`}>Symbol Position</p>
                  <p className={`text-sm ${currentTheme.colors.text}`}>Before amount</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className={`text-sm ${currentTheme.colors.textSecondary}`}>Currency Code:</span>
                <span className={`text-lg font-semibold font-mono ${currentTheme.accentText}`}>
                  {currencyInfo.code}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className={`text-sm ${currentTheme.colors.textSecondary}`}>Currency Name:</span>
                <span className={`text-sm ${currentTheme.colors.text}`}>{currencyInfo.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className={`text-sm ${currentTheme.colors.textSecondary}`}>Symbol:</span>
                <span className={`text-xl ${currentTheme.accentText}`}>{currencyInfo.symbol}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className={`text-sm ${currentTheme.colors.textSecondary}`}>Country:</span>
                <span className={`text-sm ${currentTheme.colors.text}`}>
                  {selectedCountry?.flag} {selectedCountry?.name}
                </span>
              </div>
            </div>
          </div>
          
          <p className={`text-[10px] ${currentTheme.colors.textMuted} mt-4 pt-3 border-t ${currentTheme.colors.border} text-center`}>
            Currency is automatically set based on selected country
          </p>
        </div>

        {/* Store Summary Card */}
        <div className={`p-5 rounded-xl ${currentTheme.colors.card} border ${currentTheme.colors.border}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-8 h-8 rounded-full ${currentTheme.colors.accentLight} flex items-center justify-center`}>
              <Icons.fileText className={`text-sm ${currentTheme.accentText}`} />
            </div>
            <h3 className={`text-base font-semibold ${currentTheme.colors.text}`}>Store Summary</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex justify-between py-1.5">
                <span className={`text-sm ${currentTheme.colors.textSecondary}`}>Store Name:</span>
                <span className={`text-sm font-medium ${currentTheme.colors.text} text-right`}>
                  {formData.name || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className={`text-sm ${currentTheme.colors.textSecondary}`}>Address:</span>
                <span className={`text-sm ${currentTheme.colors.text} text-right`}>
                  {formData.address || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className={`text-sm ${currentTheme.colors.textSecondary}`}>Phone:</span>
                <span className={`text-sm ${currentTheme.colors.text} text-right`}>
                  {formData.phone || 'Not set'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between py-1.5">
                <span className={`text-sm ${currentTheme.colors.textSecondary}`}>Email:</span>
                <span className={`text-sm ${currentTheme.colors.text} text-right truncate max-w-[180px]`}>
                  {formData.email || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className={`text-sm ${currentTheme.colors.textSecondary}`}>Country:</span>
                <span className={`text-sm ${currentTheme.colors.text} text-right`}>
                  {selectedCountry?.flag} {selectedCountry?.name || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className={`text-sm ${currentTheme.colors.textSecondary}`}>Tax Rate:</span>
                <span className={`text-sm font-medium ${currentTheme.accentText} text-right`}>
                  {formData.taxRate}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => loadCurrentStore()}
            className={`px-5 py-2.5 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text} transition-all`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !currentStore}
            className={`px-6 py-2.5 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg`}
          >
            {saving ? (
              <>
                <Icons.refresh className="animate-spin text-sm" />
                Saving...
              </>
            ) : (
              <>
                <Icons.save className="text-sm" />
                Save Store Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}