// src/features/pos/stores/MultiStore.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../../../features/auth/AuthContext';
import { useStore } from '../context/StoreContext';
import { Icons } from '../../../components/ui/Icons';
import { db } from '../services/database';
import { api } from '../services/api';

// Safe icon wrapper component
const SafeIcon = ({ icon: Icon, className, fallback = '•' }) => {
  if (!Icon) {
    return <span className={className}>{fallback}</span>;
  }
  return <Icon className={className} />;
};

export default function MultiStore() {
  const [selectedStore, setSelectedStore] = useState(null);
  const [showAddStore, setShowAddStore] = useState(false);
  const [showEditStore, setShowEditStore] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssignUser, setShowAssignUser] = useState(false);
  const [showHoursEditor, setShowHoursEditor] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [storeUsers, setStoreUsers] = useState([]);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [updatingHours, setUpdatingHours] = useState(false);
  const [tempHours, setTempHours] = useState({ openTime: '', closeTime: '' });
  const [storeForm, setStoreForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    manager: '',
    openTime: '09:00',
    closeTime: '21:00',
    taxRate: 8.875,
    open: true,
    description: ''
  });
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingStore, setEditingStore] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('cards');
  
  const { theme, getTheme } = useTheme();
  const { formatPrice, currency, getCurrencySymbol } = useCurrency();
  const { user, isAdmin, hasPermission, hasRole } = useAuth();
  const { refreshStores, forceRefreshStore, activeStore } = useStore();
  const currentTheme = getTheme(theme);
  
  const isLoadingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Check permissions
  const canManageStores = isAdmin || hasPermission('manage_stores');
  const canAssignUsers = isAdmin;

  // Load all data - STRICTLY filtered by current user
  const loadAllData = useCallback(async (silent = false) => {
    if (isLoadingRef.current) {
      console.log('⏳ Load already in progress, skipping...');
      return;
    }
    
    isLoadingRef.current = true;
    if (!silent) setLoading(true);
    setError(null);
    
    try {
      await db.ensureInitialized();
      
      const storesResult = await api.getAllStores();
      if (storesResult.success && isMountedRef.current) {
        let userStores = storesResult.stores || [];
        
        // Additional client-side filtering to ensure only current user's stores
        const currentUserId = user?.id;
        if (currentUserId) {
          userStores = userStores.filter(store => 
            store.createdBy === currentUserId || 
            (store.users && store.users.includes(currentUserId))
          );
          console.log(`🔍 Filtered to ${userStores.length} stores belonging to user ${user?.email}`);
        }
        
        setStores(userStores);
      } else if (!silent) {
        console.warn('Failed to load stores:', storesResult.error);
        if (isMountedRef.current) setStores([]);
      }
      
    } catch (error) {
      console.error('Failed to load data:', error);
      if (!silent && isMountedRef.current) {
        setError('Failed to load store data. Please refresh the page.');
      }
    } finally {
      if (isMountedRef.current) {
        if (!silent) setLoading(false);
        isLoadingRef.current = false;
      }
    }
  }, [user?.id, user?.email]);

  // Load available users for assignment
  const loadAvailableUsers = useCallback(async () => {
    try {
      const result = await api.getAllUsersForAssignment();
      if (result.success && isMountedRef.current) {
        setAvailableUsers(result.users || []);
      } else {
        console.warn('Failed to load users:', result.error);
        if (isMountedRef.current) setAvailableUsers([]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      if (isMountedRef.current) setAvailableUsers([]);
    }
  }, []);

  // Load store users
  const loadStoreUsers = useCallback(async (storeId) => {
    try {
      const result = await api.getStoreUsers(storeId);
      if (result.success && isMountedRef.current) {
        setStoreUsers(result.users || []);
      } else {
        console.warn('Failed to load store users:', result.error);
        if (isMountedRef.current) setStoreUsers([]);
      }
    } catch (error) {
      console.error('Failed to load store users:', error);
      if (isMountedRef.current) setStoreUsers([]);
    }
  }, []);

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;
    loadAllData();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [loadAllData]);

  // Listen for store status changes
  useEffect(() => {
    const handleStatusChange = (event) => {
      console.log('🔄 Store status changed, refreshing MultiStore...', event?.detail);
      if (event?.detail?.storeId && !isLoadingRef.current) {
        // Update local store state immediately
        setStores(prev => prev.map(s => 
          s._id === event.detail.storeId 
            ? { ...s, open: event.detail.isOpen }
            : s
        ));
        loadAllData(true);
      }
    };
    
    window.addEventListener('store-status-changed', handleStatusChange);
    window.addEventListener('store-status-refreshed', handleStatusChange);
    window.addEventListener('store-switched', handleStatusChange);
    
    return () => {
      window.removeEventListener('store-status-changed', handleStatusChange);
      window.removeEventListener('store-status-refreshed', handleStatusChange);
      window.removeEventListener('store-switched', handleStatusChange);
    };
  }, [loadAllData]);

  // Toggle store open/close status
  const handleToggleStoreStatus = async (storeId, currentStatus, storeName) => {
    const action = currentStatus ? 'close' : 'open';
    if (!confirm(`Are you sure you want to ${action} "${storeName}"?`)) return;
    
    setTogglingStatus(true);
    try {
      const response = await api.toggleStoreStatus(storeId);
      if (response.success && isMountedRef.current) {
        console.log(`✅ Store ${storeName} is now ${response.isOpen ? 'open' : 'closed'}`);
        
        // Update local state immediately for UI responsiveness
        setStores(prev => prev.map(s => 
          s._id === storeId ? { ...s, open: response.isOpen } : s
        ));
        
        // Force refresh this specific store from backend
        if (forceRefreshStore) {
          await forceRefreshStore(storeId);
        }
        
        // Refresh all stores
        if (refreshStores) {
          await refreshStores();
        }
        
        // Reload all data silently
        await loadAllData(true);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('store-status-changed', { 
          detail: { storeId, isOpen: response.isOpen, storeName, timestamp: Date.now() }
        }));
        
        alert(response.message);
      } else {
        alert(response.error || 'Failed to toggle store status');
      }
    } catch (error) {
      console.error('Failed to toggle store status:', error);
      alert('Failed to toggle store status');
    } finally {
      if (isMountedRef.current) setTogglingStatus(false);
    }
  };

  // Update store hours
  const handleUpdateHours = async (storeId) => {
    if (!tempHours.openTime || !tempHours.closeTime) {
      alert('Please enter both open and close times');
      return;
    }
    
    setUpdatingHours(true);
    try {
      const response = await api.updateStoreHours(storeId, tempHours.openTime, tempHours.closeTime);
      if (response.success && isMountedRef.current) {
        await loadAllData(true);
        setShowHoursEditor(false);
        setTempHours({ openTime: '', closeTime: '' });
        alert('Store hours updated successfully');
      } else {
        alert(response.error || 'Failed to update hours');
      }
    } catch (error) {
      console.error('Failed to update hours:', error);
      alert('Failed to update hours');
    } finally {
      if (isMountedRef.current) setUpdatingHours(false);
    }
  };

  // Add new store
  const handleAddStore = async () => {
    if (!canManageStores) {
      alert('Only administrators can add stores');
      return;
    }

    if (!storeForm.name.trim()) {
      alert('Store name is required');
      return;
    }

    try {
      const response = await api.createStore(storeForm);
      if (response.success && isMountedRef.current) {
        await loadAllData();
        setShowAddStore(false);
        resetStoreForm();
        alert(`Store "${storeForm.name}" added successfully!`);
      } else {
        alert(response.error || 'Failed to add store');
      }
    } catch (error) {
      console.error('Failed to add store:', error);
      alert('Failed to add store: ' + error.message);
    }
  };

  // Edit store
  const handleEditStore = async () => {
    if (!canManageStores) {
      alert('Only administrators can edit stores');
      return;
    }

    if (!editingStore) return;

    try {
      const response = await api.updateStore(editingStore._id, storeForm);
      if (response.success && isMountedRef.current) {
        await loadAllData();
        setShowEditStore(false);
        setEditingStore(null);
        resetStoreForm();
        alert(`Store updated successfully!`);
      } else {
        alert(response.error || 'Failed to update store');
      }
    } catch (error) {
      console.error('Failed to update store:', error);
      alert('Failed to update store: ' + error.message);
    }
  };

  // Delete store
  const handleDeleteStore = async () => {
    if (!isAdmin) {
      alert('Only administrators can delete stores');
      return;
    }

    if (!selectedStore) return;

    try {
      const response = await api.deleteStore(selectedStore);
      if (response.success && isMountedRef.current) {
        await loadAllData();
        setShowDeleteConfirm(false);
        setSelectedStore(null);
        setViewMode('cards');
        alert('Store deleted successfully');
      } else {
        alert(response.error || 'Failed to delete store');
      }
    } catch (error) {
      console.error('Failed to delete store:', error);
      alert('Failed to delete store: ' + error.message);
    }
  };

  // Assign user to store
  const handleAssignUser = async () => {
    if (!canAssignUsers) {
      alert('Only administrators can assign users to stores');
      return;
    }

    if (!selectedStore || !selectedUser) {
      alert('Please select a store and a user');
      return;
    }

    try {
      const response = await api.assignUserToStore(selectedStore, selectedUser);
      if (response.success && isMountedRef.current) {
        await loadStoreUsers(selectedStore);
        setShowAssignUser(false);
        setSelectedUser('');
        alert(response.message || 'User assigned successfully');
      } else {
        alert(response.error || 'Failed to assign user');
      }
    } catch (error) {
      console.error('Failed to assign user:', error);
      alert('Failed to assign user: ' + error.message);
    }
  };

  // Remove user from store
  const handleRemoveUser = async (userId, userName) => {
    if (!canAssignUsers) {
      alert('Only administrators can remove users from stores');
      return;
    }

    if (!confirm(`Remove ${userName} from this store?`)) return;

    try {
      const response = await api.removeUserFromStore(selectedStore, userId);
      if (response.success && isMountedRef.current) {
        await loadStoreUsers(selectedStore);
        alert(response.message || 'User removed successfully');
      } else {
        alert(response.error || 'Failed to remove user');
      }
    } catch (error) {
      console.error('Failed to remove user:', error);
      alert('Failed to remove user: ' + error.message);
    }
  };

  // Open store details
  const openStoreDetails = async (store) => {
    setSelectedStore(store._id);
    setViewMode('details');
    await loadStoreUsers(store._id);
    setTempHours({ openTime: store.openTime, closeTime: store.closeTime });
  };

  // Open assign user modal
  const openAssignUserModal = async () => {
    await loadAvailableUsers();
    setShowAssignUser(true);
  };

  // Reset store form
  const resetStoreForm = () => {
    setStoreForm({
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      email: '',
      manager: '',
      openTime: '09:00',
      closeTime: '21:00',
      taxRate: 8.875,
      open: true,
      description: ''
    });
  };

  // Open edit modal
  const openEditModal = (store) => {
    if (!canManageStores) {
      alert('Only administrators can edit stores');
      return;
    }
    setEditingStore(store);
    setStoreForm({
      name: store.name,
      address: store.address || '',
      city: store.city || '',
      state: store.state || '',
      zip: store.zip || '',
      phone: store.phone || '',
      email: store.email || '',
      manager: store.manager || '',
      openTime: store.openTime || '09:00',
      closeTime: store.closeTime || '21:00',
      taxRate: store.taxRate || 8.875,
      open: store.open !== false,
      description: store.description || ''
    });
    setShowEditStore(true);
  };

  const currentStore = stores.find(s => s._id === selectedStore);
  const totalInventoryValue = stores.reduce((sum, s) => sum + (s.inventory || 0), 0);

  // Filter stores
  const filteredStores = stores.filter(store => {
    if (filterStatus === 'open') return store.open;
    if (filterStatus === 'closed') return !store.open;
    return true;
  }).filter(store => 
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (store.city && store.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (store.manager && store.manager.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading && stores.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className={`text-sm ${currentTheme.colors.textMuted}`}>Loading stores...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-8 text-center ${currentTheme.colors.card} rounded-lg border ${currentTheme.colors.border}`}>
        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-3">
          <Icons.alert className="text-2xl text-red-600" />
        </div>
        <p className={`text-sm ${currentTheme.colors.textSecondary}`}>{error}</p>
        <button
          onClick={() => loadAllData()}
          className="mt-3 px-4 py-2 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className={`text-xl font-bold ${currentTheme.colors.text}`}>Multi-Store Management</h1>
          <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
            Manage your store locations, hours, and employee assignments
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <div className="px-3 py-1.5 text-xs rounded-lg bg-purple-100 text-purple-700 flex items-center gap-1">
              <Icons.shield className="text-sm" />
              Admin Access
            </div>
          )}
          {canManageStores && (
            <button
              onClick={() => setShowAddStore(true)}
              className={`px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white flex items-center gap-2 shadow-md hover:shadow-lg transition-all`}
            >
              <SafeIcon icon={Icons.add} className="text-sm" fallback="+" /> Add Store
            </button>
          )}
        </div>
      </div>

      {/* Permission Info Banner for Non-Admins */}
      {!isAdmin && (
        <div className={`p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800`}>
          <div className="flex items-start gap-2">
            <Icons.info className="text-sm text-yellow-600 mt-0.5" />
            <div>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                You have limited access. You can only view stores you're assigned to.
                Contact an administrator for store access.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Store Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`${currentTheme.colors.card} rounded-lg p-3 border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Your Stores</p>
          <p className={`text-2xl font-bold ${currentTheme.colors.text}`}>{stores.length}</p>
        </div>
        <div className={`${currentTheme.colors.card} rounded-lg p-3 border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Open Now</p>
          <p className={`text-2xl font-bold ${currentTheme.accentText}`}>
            {stores.filter(s => s.open).length}
          </p>
        </div>
        <div className={`${currentTheme.colors.card} rounded-lg p-3 border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Closed</p>
          <p className={`text-2xl font-bold ${currentTheme.colors.text}`}>
            {stores.filter(s => !s.open).length}
          </p>
        </div>
        <div className={`${currentTheme.colors.card} rounded-lg p-3 border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total Inventory</p>
          <p className={`text-2xl font-bold ${currentTheme.colors.text}`}>
            {totalInventoryValue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icons.search className={`absolute left-3 top-2.5 ${currentTheme.colors.textMuted} text-sm`} />
          <input
            type="text"
            placeholder="Search stores by name, city, or manager..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              filterStatus === 'all' 
                ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white` 
                : `${currentTheme.colors.hover} ${currentTheme.colors.textSecondary}`
            }`}
          >
            All Stores
          </button>
          <button
            onClick={() => setFilterStatus('open')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              filterStatus === 'open' 
                ? 'bg-green-500 text-white' 
                : `${currentTheme.colors.hover} text-green-600`
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setFilterStatus('closed')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              filterStatus === 'closed' 
                ? 'bg-red-500 text-white' 
                : `${currentTheme.colors.hover} text-red-600`
            }`}
          >
            Closed
          </button>
        </div>
      </div>

      {/* Store Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStores.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Icons.store className="text-4xl mx-auto mb-3 text-gray-400" />
              <p className={`text-sm ${currentTheme.colors.textMuted}`}>
                {searchTerm ? 'No stores match your search' : 'No stores found for your account'}
              </p>
              {canManageStores && !searchTerm && (
                <button
                  onClick={() => setShowAddStore(true)}
                  className="mt-2 text-sm text-blue-500 hover:underline"
                >
                  Add your first store
                </button>
              )}
              {!isAdmin && !searchTerm && (
                <p className="mt-2 text-xs text-gray-400">
                  Contact an administrator to be assigned to a store
                </p>
              )}
            </div>
          ) : (
            filteredStores.map(store => (
              <div
                key={store._id}
                onClick={() => openStoreDetails(store)}
                className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border} cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] relative group`}
              >
                {/* Store Badges */}
                <div className="absolute top-3 right-3 flex gap-1">
                  {store.isDefault && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Main
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    store.open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {store.open ? 'Open' : 'Closed'}
                  </span>
                </div>

                {/* Store Name */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentTheme.colors.accentLight}`}>
                    <span className="text-xl">🏪</span>
                  </div>
                  <div>
                    <h3 className={`font-semibold ${currentTheme.colors.text}`}>{store.name}</h3>
                    {store.open && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        Open Now
                      </span>
                    )}
                  </div>
                </div>

                {/* Store Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Icons.mapPin className="text-sm" />
                    <span className="text-xs truncate">{store.city || store.address || 'Location not set'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Icons.phone className="text-sm" />
                    <span className="text-xs">{store.phone || 'Phone not set'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Icons.clock className="text-sm" />
                    <span className="text-xs">{store.openTime} - {store.closeTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Icons.users className="text-sm" />
                    <span className="text-xs">{store.users?.length || 0} employees</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-3 pt-3 border-t flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openStoreDetails(store);
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    View Details
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStoreStatus(store._id, store.open, store.name);
                    }}
                    disabled={togglingStatus}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      store.open 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {store.open ? 'Close' : 'Open'}
                  </button>
                  {canManageStores && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(store);
                      }}
                      className="px-2 py-1 text-xs border rounded hover:bg-gray-50 transition-colors"
                      title="Edit Store"
                    >
                      <Icons.edit className="text-sm" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Store Details View */}
      {viewMode === 'details' && currentStore && (
        <>
          {/* Back Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setViewMode('cards');
                setSelectedStore(null);
                setStoreUsers([]);
                setShowHoursEditor(false);
              }}
              className={`flex items-center gap-1 text-sm ${currentTheme.colors.hover} ${currentTheme.colors.textSecondary} p-1 rounded`}
            >
              <Icons.chevronLeft className="text-lg" />
              Back to all stores
            </button>
          </div>

          {/* Store Details Card */}
          <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
            {/* Status Section */}
            <div className={`p-3 rounded-lg mb-4 ${
              currentStore.open 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${currentStore.open ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className={`text-sm font-medium ${currentStore.open ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    Store is {currentStore.open ? 'OPEN' : 'CLOSED'}
                  </span>
                  {currentStore.open && (
                    <span className="text-xs text-green-600">
                      • Accepting orders
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleToggleStoreStatus(currentStore._id, currentStore.open, currentStore.name)}
                  disabled={togglingStatus}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                    currentStore.open
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  } disabled:opacity-50`}
                >
                  {togglingStatus ? (
                    <span className="flex items-center gap-1">
                      <Icons.refresh className="animate-spin text-sm" />
                      Updating...
                    </span>
                  ) : (
                    currentStore.open ? 'Close Store' : 'Open Store'
                  )}
                </button>
              </div>
            </div>

            {/* Hours Section */}
            <div className={`p-3 rounded-lg ${currentTheme.colors.accentLight} border ${currentTheme.colors.border} mb-4`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className={`text-sm font-medium ${currentTheme.colors.text}`}>
                  <Icons.clock className="inline mr-2 text-sm" />
                  Operating Hours
                </h4>
                {!showHoursEditor && (
                  <button
                    onClick={() => {
                      setTempHours({ openTime: currentStore.openTime, closeTime: currentStore.closeTime });
                      setShowHoursEditor(true);
                    }}
                    className="text-xs text-blue-500 hover:text-blue-600"
                  >
                    Edit Hours
                  </button>
                )}
              </div>
              
              {showHoursEditor ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`text-xs ${currentTheme.colors.textSecondary} block mb-1`}>Open Time</label>
                      <input
                        type="time"
                        value={tempHours.openTime}
                        onChange={(e) => setTempHours({ ...tempHours, openTime: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                      />
                    </div>
                    <div>
                      <label className={`text-xs ${currentTheme.colors.textSecondary} block mb-1`}>Close Time</label>
                      <input
                        type="time"
                        value={tempHours.closeTime}
                        onChange={(e) => setTempHours({ ...tempHours, closeTime: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateHours(currentStore._id)}
                      disabled={updatingHours}
                      className="px-3 py-1.5 text-xs rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                    >
                      {updatingHours ? 'Saving...' : 'Save Hours'}
                    </button>
                    <button
                      onClick={() => setShowHoursEditor(false)}
                      className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🕐</span>
                  <div>
                    <p className={`text-base font-semibold ${currentTheme.colors.text}`}>
                      {currentStore.openTime} - {currentStore.closeTime}
                    </p>
                    <p className={`text-xs ${currentTheme.colors.textMuted}`}>
                      {currentStore.openTime === '09:00' && currentStore.closeTime === '21:00' 
                        ? 'Standard business hours' 
                        : 'Custom operating hours'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Store Information */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>{currentStore.name}</h2>
                  {currentStore.isDefault && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Main Store
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Address</p>
                    <p className={currentTheme.colors.text}>{currentStore.address || 'Not set'}</p>
                    <p className={currentTheme.colors.text}>
                      {currentStore.city ? `${currentStore.city}, ` : ''}
                      {currentStore.state ? `${currentStore.state} ` : ''}
                      {currentStore.zip}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Contact</p>
                    <p className={currentTheme.colors.text}>📞 {currentStore.phone || 'Not set'}</p>
                    <p className={currentTheme.colors.text}>✉️ {currentStore.email || 'Not set'}</p>
                    <p className={currentTheme.colors.text}>👤 {currentStore.manager || 'Not set'}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Tax Rate</p>
                    <p className={currentTheme.colors.text}>{currentStore.taxRate}%</p>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`text-3xl font-bold ${currentTheme.accentText}`}>
                  {(currentStore.inventory || 0).toLocaleString()}
                </div>
                <p className={`text-xs ${currentTheme.colors.textMuted}`}>Total Items</p>
              </div>
            </div>

            {/* Admin Actions */}
            <div className="flex flex-wrap gap-2">
              {canManageStores && (
                <button
                  onClick={() => openEditModal(currentStore)}
                  className={`px-3 py-1.5 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex items-center gap-2`}
                >
                  <Icons.edit className="text-sm" /> Edit Store
                </button>
              )}
              {canAssignUsers && (
                <button
                  onClick={openAssignUserModal}
                  className={`px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center gap-2`}
                >
                  <Icons.userPlus className="text-sm" /> Assign Employee
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className={`px-3 py-1.5 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-2`}
                >
                  <Icons.trash className="text-sm" /> Delete Store
                </button>
              )}
            </div>
          </div>

          {/* Assigned Users Section */}
          <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className={`font-semibold ${currentTheme.colors.text}`}>
                <Icons.users className="inline mr-2 text-sm" />
                Assigned Employees ({storeUsers.length})
              </h3>
              {canAssignUsers && (
                <button
                  onClick={openAssignUserModal}
                  className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
                >
                  + Add Employee
                </button>
              )}
            </div>
            
            {storeUsers.length === 0 ? (
              <div className={`p-8 text-center ${currentTheme.colors.accentLight} rounded-lg`}>
                <Icons.users className="text-3xl mx-auto mb-2 text-gray-400" />
                <p className={`text-sm ${currentTheme.colors.textMuted}`}>No employees assigned to this store</p>
                {canAssignUsers && (
                  <button
                    onClick={openAssignUserModal}
                    className="mt-2 text-sm text-blue-500 hover:underline"
                  >
                    Assign employees to this store
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {storeUsers.map(user => (
                  <div key={user._id} className={`flex justify-between items-center p-3 rounded-lg ${currentTheme.colors.accentLight} border ${currentTheme.colors.border}`}>
                    <div>
                      <p className={`font-medium ${currentTheme.colors.text}`}>{user.name}</p>
                      <p className={`text-xs ${currentTheme.colors.textMuted}`}>{user.email}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                        user.role === 'inventory_manager' ? 'bg-cyan-100 text-cyan-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                    {canAssignUsers && (
                      <button
                        onClick={() => handleRemoveUser(user._id, user.name)}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                        title="Remove from store"
                      >
                        <Icons.userX className="text-sm" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Store Modal */}
      {showAddStore && canManageStores && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
            <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center sticky top-0 ${currentTheme.colors.card}`}>
              <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Add New Store</h2>
              <button onClick={() => setShowAddStore(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <Icons.x className="text-xl" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Store Name *</label>
                <input
                  type="text"
                  value={storeForm.name}
                  onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  placeholder="Enter store name"
                  autoFocus
                />
              </div>

              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Address</label>
                <input
                  type="text"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>City</label>
                  <input
                    type="text"
                    value={storeForm.city}
                    onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>State</label>
                  <input
                    type="text"
                    value={storeForm.state}
                    onChange={(e) => setStoreForm({ ...storeForm, state: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                    placeholder="State"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>ZIP Code</label>
                  <input
                    type="text"
                    value={storeForm.zip}
                    onChange={(e) => setStoreForm({ ...storeForm, zip: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                    placeholder="ZIP"
                  />
                </div>
                <div>
                  <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Phone</label>
                  <input
                    type="tel"
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Email</label>
                <input
                  type="email"
                  value={storeForm.email}
                  onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  placeholder="store@example.com"
                />
              </div>

              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Manager</label>
                <input
                  type="text"
                  value={storeForm.manager}
                  onChange={(e) => setStoreForm({ ...storeForm, manager: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  placeholder="Store manager name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Open Time</label>
                  <input
                    type="time"
                    value={storeForm.openTime}
                    onChange={(e) => setStoreForm({ ...storeForm, openTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  />
                </div>
                <div>
                  <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Close Time</label>
                  <input
                    type="time"
                    value={storeForm.closeTime}
                    onChange={(e) => setStoreForm({ ...storeForm, closeTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.001"
                  value={storeForm.taxRate}
                  onChange={(e) => setStoreForm({ ...storeForm, taxRate: parseFloat(e.target.value) || 0 })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={storeForm.open}
                  onChange={(e) => setStoreForm({ ...storeForm, open: e.target.checked })}
                  className="rounded cursor-pointer"
                />
                <span className={`text-sm ${currentTheme.colors.text}`}>Store is currently open</span>
              </label>
            </div>

            <div className={`p-4 border-t ${currentTheme.colors.border} flex gap-3`}>
              <button
                onClick={() => setShowAddStore(false)}
                className="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStore}
                disabled={!storeForm.name}
                className={`flex-1 px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
              >
                Add Store
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Store Modal */}
      {showEditStore && editingStore && canManageStores && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
            <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center sticky top-0 ${currentTheme.colors.card}`}>
              <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Edit Store</h2>
              <button onClick={() => setShowEditStore(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <Icons.x className="text-xl" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Store Name *</label>
                <input
                  type="text"
                  value={storeForm.name}
                  onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>

              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Address</label>
                <input
                  type="text"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>City</label>
                  <input
                    type="text"
                    value={storeForm.city}
                    onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  />
                </div>
                <div>
                  <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>State</label>
                  <input
                    type="text"
                    value={storeForm.state}
                    onChange={(e) => setStoreForm({ ...storeForm, state: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>ZIP Code</label>
                  <input
                    type="text"
                    value={storeForm.zip}
                    onChange={(e) => setStoreForm({ ...storeForm, zip: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  />
                </div>
                <div>
                  <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Phone</label>
                  <input
                    type="tel"
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Email</label>
                <input
                  type="email"
                  value={storeForm.email}
                  onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>

              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Manager</label>
                <input
                  type="text"
                  value={storeForm.manager}
                  onChange={(e) => setStoreForm({ ...storeForm, manager: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Open Time</label>
                  <input
                    type="time"
                    value={storeForm.openTime}
                    onChange={(e) => setStoreForm({ ...storeForm, openTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  />
                </div>
                <div>
                  <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Close Time</label>
                  <input
                    type="time"
                    value={storeForm.closeTime}
                    onChange={(e) => setStoreForm({ ...storeForm, closeTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.001"
                  value={storeForm.taxRate}
                  onChange={(e) => setStoreForm({ ...storeForm, taxRate: parseFloat(e.target.value) || 0 })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={storeForm.open}
                  onChange={(e) => setStoreForm({ ...storeForm, open: e.target.checked })}
                  className="rounded cursor-pointer"
                />
                <span className={`text-sm ${currentTheme.colors.text}`}>Store is currently open</span>
              </label>
            </div>

            <div className={`p-4 border-t ${currentTheme.colors.border} flex gap-3`}>
              <button
                onClick={() => setShowEditStore(false)}
                className="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditStore}
                disabled={!storeForm.name}
                className={`flex-1 px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign User Modal */}
      {showAssignUser && canAssignUsers && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl`}>
            <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center`}>
              <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Assign Employee to Store</h2>
              <button onClick={() => setShowAssignUser(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <Icons.x className="text-xl" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className={`p-3 ${currentTheme.colors.accentLight} rounded-lg`}>
                <p className={`text-sm ${currentTheme.colors.textSecondary}`}>Store</p>
                <p className={`font-medium ${currentTheme.colors.text}`}>{currentStore?.name}</p>
              </div>

              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Select Employee</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                >
                  <option value="">Select an employee...</option>
                  {availableUsers
                    .filter(u => !storeUsers.some(su => su._id === u._id))
                    .map(user => (
                      <option key={user._id} value={user._id}>
                        {user.name} ({user.email}) - {user.role}
                      </option>
                    ))}
                </select>
              </div>

              {availableUsers.filter(u => !storeUsers.some(su => su._id === u._id)).length === 0 && (
                <div className={`p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20`}>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    All available employees are already assigned to this store.
                  </p>
                </div>
              )}
            </div>

            <div className={`p-4 border-t ${currentTheme.colors.border} flex gap-3`}>
              <button
                onClick={() => setShowAssignUser(false)}
                className="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignUser}
                disabled={!selectedUser}
                className={`flex-1 px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
              >
                Assign Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && currentStore && isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl p-6`}>
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-3">
                <Icons.alert className="text-2xl text-red-600" />
              </div>
              <h3 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Delete Store</h3>
            </div>
            
            <p className={`text-sm ${currentTheme.colors.textSecondary} mb-4 text-center`}>
              Are you sure you want to delete <strong>{currentStore.name}</strong>?
              This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStore}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Delete Store
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}