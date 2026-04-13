// src/features/pos/settings/StoreSettings.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useCurrency } from '../context/CurrencyContext'; // Fixed import path
import { api } from '../../pos/services/api';
import { Icons } from '../../../components/ui/Icons';
import { 
  countries, 
  groupedCountries, 
  sortedRegions, 
  totalCountries,
  getCountryByCode,
  getCurrencyByCountry
} from '../data/currencyData';

const SafeIcon = ({ icon: Icon, className, fallback = '•' }) => {
  if (!Icon) return <span className={className}>{fallback}</span>;
  return <Icon className={className} />;
};

export default function StoreSettings() {
  const { theme, getTheme } = useTheme();
  const { state, dispatch } = useSettings();
  const { refreshCurrency } = useCurrency();
  const currentTheme = getTheme(theme);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState(state.store);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRegions, setExpandedRegions] = useState(() => {
    const initial = {};
    sortedRegions.forEach(region => { initial[region] = true; });
    return initial;
  });

  // Load settings from API on mount
  useEffect(() => {
    loadStoreSettings();
  }, []);

  const loadStoreSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/settings/store');
      if (response.success && response.settings) {
        setStoreData(response.settings);
        dispatch({ type: 'UPDATE_STORE', payload: response.settings });
      }
    } catch (error) {
      console.error('Failed to load store settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.put('/settings/store', storeData);
      if (response.success) {
        dispatch({ type: 'UPDATE_STORE', payload: storeData });
        // Refresh currency context to update all components
        if (refreshCurrency) {
          await refreshCurrency();
        }
        alert('Store settings saved successfully! Currency updated across the platform.');
      } else {
        alert('Failed to save settings: ' + response.error);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setStoreData(prev => ({ ...prev, [field]: value }));
    dispatch({ type: 'UPDATE_STORE', payload: { [field]: value } });
  };

  const handleCountrySelect = (country) => {
    setStoreData(prev => ({ 
      ...prev, 
      country: country.code,
      currency: country.currency 
    }));
    dispatch({ type: 'UPDATE_STORE', payload: { 
      country: country.code, 
      currency: country.currency 
    }});
    setIsCountryDropdownOpen(false);
    setSearchTerm('');
  };

  const selectedCountry = getCountryByCode(storeData.country);
  const currencyInfo = getCurrencyByCountry(storeData.country);

  // Filter countries based on search term
  const getFilteredCountries = () => {
    if (!searchTerm.trim()) return null;
    
    const term = searchTerm.toLowerCase();
    const filtered = {};
    
    sortedRegions.forEach(region => {
      if (groupedCountries[region]) {
        const matchedCountries = groupedCountries[region].filter(country =>
          country.name.toLowerCase().includes(term) ||
          country.code.toLowerCase().includes(term) ||
          country.currency.toLowerCase().includes(term)
        );
        if (matchedCountries.length > 0) {
          filtered[region] = matchedCountries;
        }
      }
    });
    
    return filtered;
  };

  const toggleRegion = (region) => {
    setExpandedRegions(prev => ({ ...prev, [region]: !prev[region] }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <SafeIcon icon={Icons.refresh} className="animate-spin text-2xl" fallback="⟳" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Store Information</h2>
          <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
            Configure your store details that appear on receipts and reports
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white text-sm flex items-center gap-2 disabled:opacity-50`}
        >
          {saving ? (
            <>
              <SafeIcon icon={Icons.refresh} className="animate-spin text-sm" fallback="⟳" />
              Saving...
            </>
          ) : (
            <>
              <SafeIcon icon={Icons.save} className="text-sm" fallback="💾" />
              Save Store Settings
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Store Name */}
        <div className="md:col-span-2">
          <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
            Store Name *
          </label>
          <input
            type="text"
            value={storeData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="My Store Name"
          />
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
            Address
          </label>
          <input
            type="text"
            value={storeData.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="123 Main Street, City, State"
          />
        </div>

        {/* Phone */}
        <div>
          <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
            Phone Number
          </label>
          <input
            type="tel"
            value={storeData.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="(555) 123-4567"
          />
        </div>

        {/* Email */}
        <div>
          <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
            Email Address
          </label>
          <input
            type="email"
            value={storeData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="store@example.com"
          />
        </div>

        {/* Country - Custom Dropdown with Expand/Collapse */}
        <div className="relative">
          <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
            Country *
          </label>
          
          {/* Dropdown Trigger */}
          <button
            type="button"
            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
            className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between`}
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">{selectedCountry?.flag}</span>
              <span>{selectedCountry?.name}</span>
              <span className="text-xs text-gray-500">({selectedCountry?.currency})</span>
            </span>
            <SafeIcon 
              icon={isCountryDropdownOpen ? Icons.chevronUp : Icons.chevronDown} 
              className="text-sm"
              fallback={isCountryDropdownOpen ? '▲' : '▼'}
            />
          </button>

          {/* Dropdown Menu */}
          {isCountryDropdownOpen && (
            <div className={`absolute z-50 mt-1 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} shadow-lg overflow-hidden`}>
              {/* Search Input */}
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <SafeIcon icon={Icons.search} className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" fallback="🔍" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Search among ${totalCountries} countries...`}
                    className={`w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    autoFocus
                  />
                </div>
              </div>

              {/* Country List */}
              <div className="max-h-80 overflow-y-auto">
                {searchTerm ? (
                  // Search results view
                  (() => {
                    const filtered = getFilteredCountries();
                    if (!filtered || Object.keys(filtered).length === 0) {
                      return (
                        <div className="p-4 text-center text-gray-500">
                          No countries found matching "{searchTerm}"
                        </div>
                      );
                    }
                    return sortedRegions.map(region => {
                      if (!filtered[region] || filtered[region].length === 0) return null;
                      return (
                        <div key={region}>
                          <div className={`px-3 py-1.5 text-xs font-semibold ${currentTheme.colors.textMuted} bg-gray-50 dark:bg-gray-800/50`}>
                            {region} ({filtered[region].length})
                          </div>
                          {filtered[region].map(country => (
                            <button
                              key={country.code}
                              onClick={() => handleCountrySelect(country)}
                              className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors ${
                                storeData.country === country.code ? `bg-blue-50 dark:bg-blue-900/20 ${currentTheme.accentText}` : currentTheme.colors.text
                              }`}
                            >
                              <span className="text-lg">{country.flag}</span>
                              <span className="flex-1">{country.name}</span>
                              <span className="text-xs text-gray-500">{country.currency}</span>
                            </button>
                          ))}
                        </div>
                      );
                    });
                  })()
                ) : (
                  // Grouped view with expand/collapse
                  sortedRegions.map(region => {
                    if (!groupedCountries[region] || groupedCountries[region].length === 0) return null;
                    return (
                      <div key={region}>
                        {/* Region Header - Click to Expand/Collapse */}
                        <button
                          onClick={() => toggleRegion(region)}
                          className={`w-full px-3 py-1.5 text-xs font-semibold ${currentTheme.colors.textMuted} bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                        >
                          <span>{region} ({groupedCountries[region].length})</span>
                          <SafeIcon 
                            icon={expandedRegions[region] ? Icons.chevronUp : Icons.chevronDown} 
                            className="text-xs"
                            fallback={expandedRegions[region] ? '▲' : '▼'}
                          />
                        </button>
                        
                        {/* Countries in Region - Collapsible */}
                        {expandedRegions[region] && (
                          <div>
                            {groupedCountries[region].map(country => (
                              <button
                                key={country.code}
                                onClick={() => handleCountrySelect(country)}
                                className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors ${
                                  storeData.country === country.code ? `bg-blue-50 dark:bg-blue-900/20 ${currentTheme.accentText}` : currentTheme.colors.text
                                }`}
                              >
                                <span className="text-lg">{country.flag}</span>
                                <span className="flex-1">{country.name}</span>
                                <span className="text-xs text-gray-500">{country.currency}</span>
                                {storeData.country === country.code && (
                                  <SafeIcon icon={Icons.check} className="text-sm text-blue-500" fallback="✓" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Footer */}
              <div className={`p-2 border-t ${currentTheme.colors.border} text-center`}>
                <p className="text-xs text-gray-500">{totalCountries} countries and territories available</p>
              </div>
            </div>
          )}
        </div>

        {/* Currency (Auto-selected based on country) */}
        <div>
          <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
            Currency
          </label>
          <div className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} bg-gray-100 dark:bg-gray-800`}>
            <div className="flex items-center justify-between">
              <span>
                {currencyInfo.code} ({currencyInfo.symbol})
              </span>
              <span className="text-xs text-gray-500">
                {currencyInfo.name}
              </span>
            </div>
          </div>
          <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
            Currency is automatically set based on selected country
          </p>
        </div>

        {/* Tax Rate */}
        <div>
          <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
            Tax Rate (%)
          </label>
          <input
            type="number"
            step="0.001"
            value={storeData.taxRate || 0}
            onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
            className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="0"
          />
        </div>
      </div>

      {/* Currency Preview Card */}
      <div className={`p-4 rounded-lg ${currentTheme.colors.accentLight} border ${currentTheme.colors.border}`}>
        <h3 className={`text-sm font-medium mb-3 ${currentTheme.colors.text}`}>Currency Preview</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className={currentTheme.colors.textSecondary}>Sample Price:</span>
            <div className="text-right">
              <span className={`text-lg font-bold ${currentTheme.accentText}`}>
                {currencyInfo.position === 'after' 
                  ? `99.99${currencyInfo.symbol}`
                  : `${currencyInfo.symbol}99.99`
                }
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Format: {currencyInfo.position === 'after' ? `X${currencyInfo.symbol}` : `${currencyInfo.symbol}X`}
              </p>
            </div>
          </div>
          <div className="flex justify-between">
            <span className={currentTheme.colors.textSecondary}>Currency Code:</span>
            <span className={`font-mono ${currentTheme.colors.text}`}>{currencyInfo.code}</span>
          </div>
          <div className="flex justify-between">
            <span className={currentTheme.colors.textSecondary}>Currency Name:</span>
            <span className={currentTheme.colors.text}>{currencyInfo.name}</span>
          </div>
          <div className="flex justify-between">
            <span className={currentTheme.colors.textSecondary}>Symbol Position:</span>
            <span className={currentTheme.colors.text}>
              {currencyInfo.position === 'after' ? 'After amount (e.g., 100€)' : 'Before amount (e.g., $100)'}
            </span>
          </div>
        </div>
      </div>

      {/* Store Summary Card */}
      <div className={`p-4 rounded-lg ${currentTheme.colors.accentLight} border ${currentTheme.colors.border}`}>
        <h3 className={`text-sm font-medium mb-3 ${currentTheme.colors.text}`}>Store Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className={currentTheme.colors.textSecondary}>Store Name:</span>
            <span className={`font-medium ${currentTheme.colors.text}`}>{storeData.name || 'Not set'}</span>
          </div>
          <div className="flex justify-between">
            <span className={currentTheme.colors.textSecondary}>Address:</span>
            <span className={currentTheme.colors.text}>{storeData.address || 'Not set'}</span>
          </div>
          <div className="flex justify-between">
            <span className={currentTheme.colors.textSecondary}>Phone:</span>
            <span className={currentTheme.colors.text}>{storeData.phone || 'Not set'}</span>
          </div>
          <div className="flex justify-between">
            <span className={currentTheme.colors.textSecondary}>Email:</span>
            <span className={currentTheme.colors.text}>{storeData.email || 'Not set'}</span>
          </div>
          <div className="flex justify-between">
            <span className={currentTheme.colors.textSecondary}>Country:</span>
            <span className={currentTheme.colors.text}>
              <span className="text-lg mr-1">{selectedCountry?.flag}</span>
              {selectedCountry?.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={currentTheme.colors.textSecondary}>Currency:</span>
            <span className={currentTheme.colors.text}>
              {currencyInfo.code} ({currencyInfo.symbol}) - {currencyInfo.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={currentTheme.colors.textSecondary}>Tax Rate:</span>
            <span className={currentTheme.colors.text}>{storeData.taxRate || 0}%</span>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className={`p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800`}>
        <div className="flex items-start gap-2">
          <SafeIcon icon={Icons.info} className="text-sm text-blue-500 mt-0.5" fallback="ℹ️" />
          <div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Changing the country will automatically update the currency across your entire store, including:
            </p>
            <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 list-disc list-inside">
              <li>Product prices and inventory values</li>
              <li>Cart totals and checkout amounts</li>
              <li>Receipts and invoices</li>
              <li>Sales reports and analytics</li>
              <li>Customer loyalty points valuation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}