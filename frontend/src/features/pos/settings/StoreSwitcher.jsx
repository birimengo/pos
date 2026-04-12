// src/features/pos/settings/StoreSwitcher.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useStore } from '../context/StoreContext';
import { Icons } from '../../../components/ui/Icons';
import { db } from '../services/database';

const SafeIcon = ({ icon: Icon, className, fallback = '•' }) => {
  if (!Icon) return <span className={className}>{fallback}</span>;
  return <Icon className={className} />;
};

export default function StoreSwitcher() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [switchedStore, setSwitchedStore] = useState(null);
  const { activeStore, switchStore, refreshStores } = useStore();
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    setLoading(true);
    try {
      await db.ensureInitialized();
      const allStores = await db.getAll('stores');
      setStores(allStores || []);
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchStore = async (storeId) => {
    setSwitching(true);
    setSwitchedStore(null);
    
    const result = await switchStore(storeId);
    
    if (result.success) {
      setSwitchedStore(result.store);
      // Show success message
      setTimeout(() => {
        setSwitchedStore(null);
      }, 3000);
      // Reload stores to update active status
      await loadStores();
    } else {
      alert(`❌ Failed to switch store: ${result.error}`);
    }
    
    setSwitching(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className={`p-8 text-center rounded-lg border ${currentTheme.colors.border}`}>
        <SafeIcon icon={Icons.store} className="text-4xl mx-auto mb-3 text-gray-400" fallback="🏪" />
        <p className={`text-sm ${currentTheme.colors.textMuted}`}>No stores available</p>
        <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
          Add stores in the Multi-Store Management section
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Active Store */}
      {activeStore && (
        <div className={`p-4 rounded-lg ${currentTheme.colors.accentLight} border ${currentTheme.colors.border}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Currently Active Store</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <h3 className={`font-semibold ${currentTheme.colors.text}`}>{activeStore.name}</h3>
                {activeStore.isDefault && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Main Store</span>
                )}
              </div>
              <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
                {activeStore.address && `${activeStore.address}, `}
                {activeStore.city && `${activeStore.city}`}
                {!activeStore.address && !activeStore.city && 'No address set'}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium`}>
              Active
            </div>
          </div>
        </div>
      )}

      {/* Store List */}
      <div>
        <h3 className={`text-sm font-medium mb-3 ${currentTheme.colors.text}`}>
          Available Stores ({stores.length})
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {stores.map(store => {
            const isActive = activeStore?.id === store.id;
            
            return (
              <div
                key={store.id}
                className={`p-3 rounded-lg border transition-all ${
                  isActive 
                    ? `${currentTheme.colors.accentLight} border-green-500 bg-green-50 dark:bg-green-900/10`
                    : `${currentTheme.colors.border} ${currentTheme.colors.card} hover:shadow-md`
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className={`font-medium ${currentTheme.colors.text}`}>{store.name}</h4>
                      {store.isDefault && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          Main
                        </span>
                      )}
                      {store.open ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                          Open
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                          Closed
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs mt-2">
                      {store.address && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <Icons.mapPin className="text-[10px]" />
                          <span className="text-[11px]">{store.address}</span>
                        </div>
                      )}
                      {store.city && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <Icons.building className="text-[10px]" />
                          <span className="text-[11px]">{store.city}</span>
                        </div>
                      )}
                      {store.phone && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <Icons.phone className="text-[10px]" />
                          <span className="text-[11px]">{store.phone}</span>
                        </div>
                      )}
                      {store.email && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <Icons.mail className="text-[10px]" />
                          <span className="text-[11px] truncate">{store.email}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-3 mt-2 text-[10px] text-gray-500">
                      <span>🕐 {store.openTime} - {store.closeTime}</span>
                      <span>📦 {store.inventory || 0} items</span>
                      <span>💰 {store.taxRate}% tax</span>
                    </div>
                  </div>
                  
                  {!isActive && (
                    <button
                      onClick={() => handleSwitchStore(store.id)}
                      disabled={switching}
                      className={`px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white hover:shadow-md transition-all disabled:opacity-50 ml-3 flex-shrink-0`}
                    >
                      {switching ? (
                        <span className="flex items-center gap-1">
                          <Icons.refresh className="animate-spin text-xs" />
                          Switching...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Icons.switch className="text-xs" />
                          Switch
                        </span>
                      )}
                    </button>
                  )}
                  
                  {isActive && (
                    <div className="px-3 py-1.5 text-xs rounded-lg bg-green-100 text-green-700 ml-3 flex-shrink-0">
                      <span className="flex items-center gap-1">
                        <Icons.check className="text-xs" />
                        Current
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Success Message */}
      {switchedStore && (
        <div className={`p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 animate-pulse`}>
          <div className="flex items-center gap-2">
            <Icons.checkCircle className="text-green-500 text-sm" />
            <div>
              <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                Successfully switched to {switchedStore.name}!
              </p>
              <p className="text-[10px] text-green-600 dark:text-green-500 mt-0.5">
                All data now reflects this store's inventory and settings
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className={`p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800`}>
        <div className="flex items-start gap-2">
          <SafeIcon icon={Icons.info} className="text-sm text-blue-500 mt-0.5" fallback="ℹ️" />
          <div>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
              Switching stores will:
            </p>
            <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-0.5 list-disc list-inside">
              <li>Update inventory to show the selected store's stock levels</li>
              <li>Show sales and transactions for this store only</li>
              <li>Apply store-specific tax rates and settings</li>
              <li>Filter customer data by store location</li>
              <li>Update all reports and analytics for this store</li>
            </ul>
            <p className="text-[10px] text-blue-500 mt-2">
              Your current store is saved and will be remembered on next login
            </p>
          </div>
        </div>
      </div>

      {/* Store Stats Summary */}
      <div className={`p-3 rounded-lg ${currentTheme.colors.accentLight} border ${currentTheme.colors.border}`}>
        <h4 className={`text-xs font-medium mb-2 ${currentTheme.colors.text}`}>Store Statistics</h4>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <p className={`text-[10px] ${currentTheme.colors.textSecondary}`}>Total Stores</p>
            <p className={`text-lg font-bold ${currentTheme.accentText}`}>{stores.length}</p>
          </div>
          <div>
            <p className={`text-[10px] ${currentTheme.colors.textSecondary}`}>Open Now</p>
            <p className={`text-lg font-bold text-green-600`}>{stores.filter(s => s.open).length}</p>
          </div>
          <div>
            <p className={`text-[10px] ${currentTheme.colors.textSecondary}`}>Main Store</p>
            <p className={`text-lg font-bold ${currentTheme.colors.text}`}>
              {stores.find(s => s.isDefault)?.name || 'None'}
            </p>
          </div>
          <div>
            <p className={`text-[10px] ${currentTheme.colors.textSecondary}`}>Total Inventory</p>
            <p className={`text-lg font-bold ${currentTheme.colors.text}`}>
              {stores.reduce((sum, s) => sum + (s.inventory || 0), 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}