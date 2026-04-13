// src/features/pos/settings/Settings.jsx
import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../../../features/auth/AuthContext';
import { useStore } from '../context/StoreContext';
import { Icons } from '../../../components/ui/Icons';
import StoreSettings from './StoreSettings';
import UserManagement from './UserManagement';
import BackupRestore from './BackupRestore';
import AppearanceSettings from './AppearanceSettings';
import SystemSettings from './SystemSettings';
import StoreSwitcher from './StoreSwitcher';
import { api } from '../services/api';
import { db } from '../services/database';

const SafeIcon = ({ icon: Icon, className, fallback = '•' }) => {
  if (!Icon) return <span className={className}>{fallback}</span>;
  return <Icon className={className} />;
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState('store');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [currentStore, setCurrentStore] = useState(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [storeUpdateTrigger, setStoreUpdateTrigger] = useState(0);
  const [userStores, setUserStores] = useState([]);
  
  const { theme, getTheme } = useTheme();
  const { state, dispatch } = useSettings();
  const { logout, user, hasPermission, hasRole, isAdmin, refreshUserStores } = useAuth();
  const { activeStore, getCurrentStore, refreshStores, stores } = useStore();
  const currentTheme = getTheme(theme);

  // Load current store information - ALWAYS use the active store from context
  useEffect(() => {
    loadCurrentStore();
  }, [activeStore, storeUpdateTrigger, stores]);

  // Load user's stores
  useEffect(() => {
    loadUserStores();
  }, []);

  const loadUserStores = async () => {
    try {
      const response = await api.getAllStores();
      if (response.success && response.stores) {
        // Filter stores that belong to current user
        const filteredStores = response.stores.filter(store => 
          store.createdBy === user?.id
        );
        setUserStores(filteredStores);
        console.log(`📦 Loaded ${filteredStores.length} stores for user ${user?.email}`);
      }
    } catch (error) {
      console.error('Failed to load user stores:', error);
    }
  };

  const loadCurrentStore = async () => {
    setLoadingStore(true);
    try {
      let store = null;
      
      // Priority 1: Use activeStore from context
      if (activeStore) {
        // Verify this store belongs to the current user
        if (activeStore.createdBy === user?.id) {
          store = activeStore;
          console.log('📦 Using activeStore from context:', store.name);
        } else {
          console.warn('⚠️ Active store does not belong to current user, finding correct store');
        }
      }
      
      // Priority 2: Get from database using currentStoreId
      if (!store) {
        const activeStoreId = db.getCurrentStore();
        if (activeStoreId) {
          const dbStore = await db.getStore(activeStoreId);
          if (dbStore && dbStore.createdBy === user?.id) {
            store = dbStore;
            console.log('📦 Loaded store from database:', store.name);
          }
        }
      }
      
      // Priority 3: Get the user's first store from API
      if (!store && userStores.length > 0) {
        store = userStores[0];
        console.log('📦 Using first user store from list:', store.name);
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
        console.log('✅ Current store loaded in Settings:', store.name);
        console.log('📦 Store details:', {
          id: store._id,
          name: store.name,
          phone: store.phone,
          address: store.address,
          createdBy: store.createdBy,
          currentUser: user?.id
        });
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

  const handleStoreUpdate = () => {
    // Refresh store data after update
    setStoreUpdateTrigger(prev => prev + 1);
    if (refreshStores) refreshStores();
    loadUserStores();
  };

  const handleStoreSwitch = () => {
    // Reload current store after switching
    loadCurrentStore();
    loadUserStores();
  };

  // Check user permissions
  const canManageUsers = hasPermission('manage_users') || isAdmin;
  const canManageSettings = hasPermission('manage_settings') || isAdmin;

  const getAllTabs = () => {
    const allTabs = [
      { id: 'store', name: 'Store Info', icon: Icons.home, permission: null, adminOnly: false },
      { id: 'appearance', name: 'Appearance', icon: Icons.star, permission: null, adminOnly: false },
      { id: 'storeSwitcher', name: 'Switch Store', icon: Icons.switch, permission: null, adminOnly: false },
    ];

    if (canManageUsers) {
      allTabs.push({ id: 'users', name: 'Users', icon: Icons.users, permission: 'manage_users', adminOnly: true });
    }

    if (isAdmin) {
      allTabs.push({ id: 'backup', name: 'Backup & Restore', icon: Icons.download, permission: null, adminOnly: true });
    }

    if (canManageSettings) {
      allTabs.push({ id: 'system', name: 'System', icon: Icons.settings, permission: 'manage_settings', adminOnly: true });
    }

    return allTabs;
  };

  const tabs = getAllTabs();

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    window.location.href = '/login';
  };

  const handleSave = () => {
    localStorage.setItem('pos-settings', JSON.stringify(state));
    alert('Settings saved successfully!');
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to default? This action cannot be undone.')) {
      dispatch({ type: 'RESET_SETTINGS' });
      alert('Settings reset to default');
    }
  };

  if (tabs.length === 0) {
    return (
      <div className={`p-8 text-center ${currentTheme.colors.card} rounded-lg border ${currentTheme.colors.border}`}>
        <SafeIcon icon={Icons.lock} className="text-5xl mx-auto mb-3 text-gray-400" fallback="🔒" />
        <h2 className={`text-lg font-semibold ${currentTheme.colors.text} mb-2`}>Access Denied</h2>
        <p className={`text-sm ${currentTheme.colors.textMuted}`}>
          You don't have permission to access settings. Please contact an administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className={`text-xl font-bold ${currentTheme.colors.text}`}>Settings</h1>
          <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
            Manage your store settings, users, and preferences
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className={`px-3 py-1.5 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text}`}
          >
            <SafeIcon icon={Icons.refresh} className="text-sm mr-1" fallback="↺" />
            Reset
          </button>
          <button
            onClick={handleSave}
            className={`px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white flex items-center gap-1`}
          >
            <SafeIcon icon={Icons.save} className="text-sm" fallback="💾" />
            Save Changes
          </button>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="px-3 py-1.5 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-1"
          >
            <SafeIcon icon={Icons.logout} className="text-sm" fallback="🚪" />
            Logout
          </button>
        </div>
      </div>

      {/* No Store Warning */}
      {!loadingStore && !currentStore && (
        <div className={`p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Icons.alert className="text-yellow-600" />
            </div>
            <div>
              <p className={`text-sm font-medium text-yellow-800 dark:text-yellow-400`}>
                No Store Found
              </p>
              <p className={`text-xs text-yellow-700 dark:text-yellow-500 mt-0.5`}>
                You don't have any stores yet. Please create a store in Multi-Store Management.
              </p>
              <button
                onClick={() => window.location.href = '/pos/stores'}
                className="mt-2 text-xs px-3 py-1 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700"
              >
                Go to Multi-Store Management
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Store Info Banner - Shows which store is being edited */}
      {!loadingStore && currentStore && (
        <div className={`p-4 rounded-lg ${currentTheme.colors.accentLight} border ${currentTheme.colors.border}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
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
                <p className={`text-[10px] ${currentTheme.colors.textMuted} mt-0.5`}>
                  ID: {currentStore._id} • Created by: {currentStore.createdByName || currentStore.createdBy}
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

      {/* User Info Bar */}
      {user && (
        <div className={`p-3 rounded-lg ${currentTheme.colors.accentLight} border ${currentTheme.colors.border}`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className={`text-sm font-medium ${currentTheme.colors.text}`}>{user.name || user.email}</p>
                <p className={`text-xs ${currentTheme.colors.textMuted}`}>{user.email} • {user.role}</p>
                <p className={`text-[10px] ${currentTheme.colors.textMuted} mt-0.5`}>
                  User ID: {user.id}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${
                user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                user.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                user.role === 'inventory_manager' ? 'bg-cyan-100 text-cyan-700' :
                'bg-green-100 text-green-700'
              }`}>
                {user.role?.replace('_', ' ') || 'Cashier'}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                Stores: {userStores.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white shadow-md`
                  : `${currentTheme.colors.hover} ${currentTheme.colors.textSecondary}`
              }`}
              title={tab.adminOnly && !isAdmin ? 'Admin only' : ''}
            >
              <SafeIcon icon={tab.icon} className="text-sm" fallback="●" />
              {tab.name}
              {tab.adminOnly && !isAdmin && (
                <SafeIcon icon={Icons.lock} className="text-xs ml-1" fallback="🔒" />
              )}
            </button>
          );
        })}
      </div>

      {/* Settings Content */}
      <div className={`${currentTheme.colors.card} rounded-lg p-6 border ${currentTheme.colors.border}`}>
        {activeTab === 'store' && (
          <StoreSettings 
            currentStore={currentStore} 
            onStoreUpdate={handleStoreUpdate}
          />
        )}
        {activeTab === 'storeSwitcher' && (
          <StoreSwitcher onStoreSwitch={handleStoreSwitch} />
        )}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'appearance' && <AppearanceSettings />}
        {activeTab === 'backup' && <BackupRestore />}
        {activeTab === 'system' && <SystemSettings />}
      </div>

      {/* Admin Note for Non-Admin Users */}
      {!isAdmin && (
        <div className={`p-3 rounded-lg ${currentTheme.colors.accentLight} border ${currentTheme.colors.border}`}>
          <div className="flex items-start gap-2">
            <SafeIcon icon={Icons.info} className="text-sm text-blue-500 mt-0.5" fallback="ℹ️" />
            <p className={`text-xs ${currentTheme.colors.textSecondary}`}>
              Some settings are restricted to administrators only. Contact your administrator if you need access to user management, backup, or system settings.
            </p>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl p-6`}>
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-3">
                <SafeIcon icon={Icons.alert} className="text-2xl text-red-600" fallback="⚠️" />
              </div>
              <h3 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Confirm Logout</h3>
            </div>
            
            <p className={`text-sm ${currentTheme.colors.textSecondary} mb-6 text-center`}>
              Are you sure you want to logout? You will need to login again to access the POS system.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}