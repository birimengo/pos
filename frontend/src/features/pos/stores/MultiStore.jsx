// src/features/pos/stores/MultiStore.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useSettings } from '../context/SettingsContext';
import { Icons } from '../../../components/ui/Icons';
import { db } from '../services/database';
import { api } from '../services/api';
import { useAuth } from '../../../features/auth/AuthContext';

// Safe icon wrapper component to prevent undefined icon errors
const SafeIcon = ({ icon: Icon, className, fallback = '•' }) => {
  if (!Icon) {
    console.warn('Icon component is undefined, using fallback');
    return <span className={className}>{fallback}</span>;
  }
  return <Icon className={className} />;
};

export default function MultiStore() {
  const [selectedStore, setSelectedStore] = useState(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showAddStore, setShowAddStore] = useState(false);
  const [showEditStore, setShowEditStore] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromStore: '',
    toStore: '',
    product: '',
    quantity: 1
  });
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
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingStore, setEditingStore] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'details'
  const [settingsStore, setSettingsStore] = useState(null);
  
  const { theme, getTheme } = useTheme();
  const { formatPrice, currency, getCurrencySymbol } = useCurrency();
  const { state: settingsState, dispatch: settingsDispatch } = useSettings();
  const { user, hasPermission, hasRole } = useAuth();
  const currentTheme = getTheme(theme);

  // Format currency for display
  const formatCurrency = (amount) => {
    return formatPrice(amount, { showSymbol: true, showCode: false });
  };

  // Check if user has admin privileges
  const isAdmin = hasRole('admin');
  const canManageStores = hasPermission('manage_stores') || isAdmin;

  // Load store settings from API
  const loadStoreSettings = async () => {
    try {
      const response = await api.get('/settings/store');
      if (response.success && response.settings) {
        setSettingsStore(response.settings);
        return response.settings;
      }
    } catch (error) {
      console.error('Failed to load store settings:', error);
      return null;
    }
  };

  // Load stores from IndexedDB on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await db.ensureInitialized();
      
      // Load settings from API first
      const settings = await loadStoreSettings();
      
      // Load stores
      let allStores = await db.getAll('stores');
      
      if (!allStores || allStores.length === 0) {
        // Create default store from settings
        const defaultStore = {
          id: `store_${Date.now()}_default`,
          name: settings?.name || settingsState?.store?.name || 'My Store',
          address: settings?.address || settingsState?.store?.address || '',
          city: '',
          state: '',
          zip: '',
          phone: settings?.phone || settingsState?.store?.phone || '',
          email: settings?.email || settingsState?.store?.email || '',
          manager: user?.name || '',
          openTime: '09:00',
          closeTime: '21:00',
          taxRate: settings?.taxRate || settingsState?.store?.taxRate || 0,
          open: true,
          description: 'Main store location',
          inventory: 0,
          isDefault: true,
          createdBy: user?.id,
          createdByName: user?.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await db.put('stores', defaultStore);
        allStores = [defaultStore];
        setStores(allStores);
        setSelectedStore(defaultStore.id);
        setViewMode('details');
      } else {
        // Find and update the default store with settings
        const defaultStoreIndex = allStores.findIndex(s => s.isDefault === true);
        
        if (defaultStoreIndex !== -1) {
          // Update existing default store with settings
          const updatedDefaultStore = {
            ...allStores[defaultStoreIndex],
            name: settings?.name || settingsState?.store?.name || allStores[defaultStoreIndex].name,
            address: settings?.address || settingsState?.store?.address || allStores[defaultStoreIndex].address,
            phone: settings?.phone || settingsState?.store?.phone || allStores[defaultStoreIndex].phone,
            email: settings?.email || settingsState?.store?.email || allStores[defaultStoreIndex].email,
            taxRate: settings?.taxRate || settingsState?.store?.taxRate || allStores[defaultStoreIndex].taxRate,
            updatedAt: new Date().toISOString()
          };
          await db.put('stores', updatedDefaultStore);
          allStores[defaultStoreIndex] = updatedDefaultStore;
        } else if (allStores.length > 0) {
          // If no store marked as default, update the first store with settings
          const updatedFirstStore = {
            ...allStores[0],
            name: settings?.name || settingsState?.store?.name || allStores[0].name,
            address: settings?.address || settingsState?.store?.address || allStores[0].address,
            phone: settings?.phone || settingsState?.store?.phone || allStores[0].phone,
            email: settings?.email || settingsState?.store?.email || allStores[0].email,
            taxRate: settings?.taxRate || settingsState?.store?.taxRate || allStores[0].taxRate,
            isDefault: true,
            updatedAt: new Date().toISOString()
          };
          await db.put('stores', updatedFirstStore);
          allStores[0] = updatedFirstStore;
        }
        
        setStores(allStores);
        
        // If no store selected, select the first one
        if (!selectedStore && allStores.length > 0) {
          setSelectedStore(allStores[0].id);
        }
      }
      
      // Load products
      const allProducts = await db.getAll('products');
      setProducts(allProducts || []);
      
      // Load transfers
      const allTransfers = await db.getAll('transfers') || [];
      setTransfers(allTransfers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Switch to main store
  const switchToMainStore = () => {
    const mainStore = stores.find(s => s.isDefault === true);
    if (mainStore) {
      setSelectedStore(mainStore.id);
      setViewMode('details');
    }
  };

  // Switch to any store
  const switchToStore = (storeId) => {
    setSelectedStore(storeId);
    setViewMode('details');
  };

  // Go back to store cards view
  const goBackToCards = () => {
    setViewMode('cards');
    setSelectedStore(null);
  };

  const handleAddStore = async () => {
    if (!canManageStores) {
      alert('Only administrators can add stores');
      return;
    }

    if (!storeForm.name.trim()) {
      alert('Store name is required');
      return;
    }
    if (!storeForm.address.trim()) {
      alert('Store address is required');
      return;
    }
    if (!storeForm.city.trim()) {
      alert('Store city is required');
      return;
    }

    const newStore = {
      id: `store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: storeForm.name.trim(),
      address: storeForm.address.trim(),
      city: storeForm.city.trim(),
      state: storeForm.state.trim(),
      zip: storeForm.zip.trim(),
      phone: storeForm.phone.trim(),
      email: storeForm.email.trim(),
      manager: storeForm.manager.trim(),
      openTime: storeForm.openTime,
      closeTime: storeForm.closeTime,
      taxRate: parseFloat(storeForm.taxRate) || 0,
      open: storeForm.open,
      description: storeForm.description.trim(),
      inventory: 0,
      isDefault: false,
      createdBy: user?.id,
      createdByName: user?.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await db.put('stores', newStore);
      await loadAllData();
      setSelectedStore(newStore.id);
      setViewMode('details');
      setShowAddStore(false);
      resetStoreForm();
      alert(`Store "${newStore.name}" added successfully!`);
    } catch (error) {
      console.error('Failed to add store:', error);
      alert('Failed to add store: ' + error.message);
    }
  };

  const handleEditStore = async () => {
    if (!canManageStores) {
      alert('Only administrators can edit stores');
      return;
    }

    if (!editingStore) return;

    if (!storeForm.name.trim()) {
      alert('Store name is required');
      return;
    }

    const updatedStore = {
      ...editingStore,
      name: storeForm.name.trim(),
      address: storeForm.address.trim(),
      city: storeForm.city.trim(),
      state: storeForm.state.trim(),
      zip: storeForm.zip.trim(),
      phone: storeForm.phone.trim(),
      email: storeForm.email.trim(),
      manager: storeForm.manager.trim(),
      openTime: storeForm.openTime,
      closeTime: storeForm.closeTime,
      taxRate: parseFloat(storeForm.taxRate) || 0,
      open: storeForm.open,
      description: storeForm.description.trim(),
      updatedBy: user?.id,
      updatedByName: user?.name,
      updatedAt: new Date().toISOString()
    };

    try {
      await db.put('stores', updatedStore);
      await loadAllData();
      setShowEditStore(false);
      setEditingStore(null);
      resetStoreForm();
      alert(`Store "${updatedStore.name}" updated successfully!`);
    } catch (error) {
      console.error('Failed to update store:', error);
      alert('Failed to update store: ' + error.message);
    }
  };

  const handleDeleteStore = async () => {
    if (!isAdmin) {
      alert('Only administrators can delete stores');
      return;
    }

    if (!selectedStore) return;

    const storeToDelete = stores.find(s => s.id === selectedStore);
    
    // Prevent deletion of default store
    if (storeToDelete?.isDefault) {
      alert(`Cannot delete the main store "${storeToDelete.name}". This is your primary store location.`);
      setShowDeleteConfirm(false);
      return;
    }
    
    if (storeToDelete?.inventory > 0) {
      alert(`Cannot delete "${storeToDelete.name}" because it has ${storeToDelete.inventory} items in inventory. Please transfer all items first.`);
      setShowDeleteConfirm(false);
      return;
    }

    const pendingTransfers = transfers.filter(t => 
      (t.fromStoreId === selectedStore || t.toStoreId === selectedStore) && 
      t.status !== 'completed' && t.status !== 'cancelled'
    );

    if (pendingTransfers.length > 0) {
      alert(`Cannot delete "${storeToDelete.name}" because it has ${pendingTransfers.length} pending transfers. Please complete or cancel them first.`);
      setShowDeleteConfirm(false);
      return;
    }

    try {
      await db.delete('stores', selectedStore);
      await loadAllData();
      setShowDeleteConfirm(false);
      
      // If we deleted the selected store, go back to cards view
      if (stores.length <= 1) {
        setViewMode('cards');
        setSelectedStore(null);
      } else {
        // Select another store
        const remainingStores = stores.filter(s => s.id !== selectedStore);
        if (remainingStores.length > 0) {
          setSelectedStore(remainingStores[0].id);
        }
      }
      
      alert(`Store "${storeToDelete.name}" deleted successfully!`);
    } catch (error) {
      console.error('Failed to delete store:', error);
      alert('Failed to delete store: ' + error.message);
    }
  };

  const handleTransfer = async () => {
    if (!transferForm.fromStore || !transferForm.toStore || !transferForm.product || !transferForm.quantity) {
      alert('Please fill in all fields');
      return;
    }

    if (transferForm.fromStore === transferForm.toStore) {
      alert('From and To stores must be different');
      return;
    }

    const fromStore = stores.find(s => s.id === transferForm.fromStore);
    const toStore = stores.find(s => s.id === transferForm.toStore);
    const product = products.find(p => p.id === transferForm.product);

    if (!product) {
      alert('Product not found');
      return;
    }

    const fromStoreStock = product.storeStock?.[transferForm.fromStore] || product.stock || 0;
    const transferQuantity = parseInt(transferForm.quantity) || 0;
    
    if (transferQuantity > fromStoreStock) {
      alert(`Insufficient stock at ${fromStore?.name}. Available: ${fromStoreStock}`);
      return;
    }

    const newTransfer = {
      id: `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromStoreId: transferForm.fromStore,
      fromStore: fromStore?.name,
      toStoreId: transferForm.toStore,
      toStore: toStore?.name,
      productId: product.id,
      product: product.name,
      productSku: product.sku,
      quantity: transferQuantity,
      status: 'pending',
      createdAt: new Date().toISOString(),
      initiatedBy: user?.name || 'Current User',
      initiatedById: user?.id
    };

    try {
      await db.put('transfers', newTransfer);
      await loadAllData();
      setShowTransfer(false);
      setTransferForm({
        fromStore: '',
        toStore: '',
        product: '',
        quantity: 1
      });
      alert('Transfer initiated successfully!');
    } catch (error) {
      console.error('Failed to create transfer:', error);
      alert('Failed to create transfer: ' + error.message);
    }
  };

  const handleApproveTransfer = async (transfer) => {
    if (!isAdmin && !hasRole('manager')) {
      alert('Only managers and administrators can approve transfers');
      return;
    }

    try {
      const updatedTransfer = {
        ...transfer,
        status: 'in-transit',
        approvedAt: new Date().toISOString(),
        approvedBy: user?.name,
        approvedById: user?.id
      };
      await db.put('transfers', updatedTransfer);
      await loadAllData();
      alert('Transfer approved and marked as in-transit');
    } catch (error) {
      console.error('Failed to approve transfer:', error);
      alert('Failed to approve transfer: ' + error.message);
    }
  };

  const handleCompleteTransfer = async (transfer) => {
    try {
      const product = products.find(p => p.id === transfer.productId);
      if (product) {
        if (!product.storeStock) product.storeStock = {};
        
        product.storeStock[transfer.fromStoreId] = (product.storeStock[transfer.fromStoreId] || product.stock || 0) - transfer.quantity;
        product.storeStock[transfer.toStoreId] = (product.storeStock[transfer.toStoreId] || 0) + transfer.quantity;
        
        product.stock = Object.values(product.storeStock).reduce((a, b) => a + b, 0);
        product.updatedAt = new Date().toISOString();
        
        await db.put('products', product);
      }

      const completedTransfer = {
        ...transfer,
        status: 'completed',
        completedAt: new Date().toISOString(),
        completedBy: user?.name,
        completedById: user?.id
      };
      await db.put('transfers', completedTransfer);
      
      await loadAllData();
      alert('Transfer completed successfully!');
    } catch (error) {
      console.error('Failed to complete transfer:', error);
      alert('Failed to complete transfer: ' + error.message);
    }
  };

  const handleCancelTransfer = async (transfer) => {
    try {
      const cancelledTransfer = {
        ...transfer,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: user?.name,
        cancelledById: user?.id
      };
      await db.put('transfers', cancelledTransfer);
      await loadAllData();
      alert('Transfer cancelled');
    } catch (error) {
      console.error('Failed to cancel transfer:', error);
      alert('Failed to cancel transfer: ' + error.message);
    }
  };

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

  const openEditModal = (store) => {
    if (!canManageStores) {
      alert('Only administrators can edit stores');
      return;
    }
    setEditingStore(store);
    setStoreForm({
      name: store.name,
      address: store.address,
      city: store.city,
      state: store.state || '',
      zip: store.zip || '',
      phone: store.phone || '',
      email: store.email || '',
      manager: store.manager || '',
      openTime: store.openTime || '09:00',
      closeTime: store.closeTime || '21:00',
      taxRate: store.taxRate || 8.875,
      open: store.open,
      description: store.description || ''
    });
    setShowEditStore(true);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'in-transit': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return Icons.checkCircle;
      case 'pending': return Icons.clock;
      case 'in-transit': return Icons.truck;
      case 'cancelled': return Icons.xCircle;
      default: return Icons.help;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter stores
  const filteredStores = stores.filter(store => {
    if (filterStatus === 'open') return store.open;
    if (filterStatus === 'closed') return !store.open;
    return true;
  }).filter(store => 
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.manager.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentStore = stores.find(s => s.id === selectedStore);
  const totalInventoryValue = stores.reduce((sum, s) => sum + (s.inventory || 0), 0);
  const activeTransfers = transfers.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className={`text-sm ${currentTheme.colors.textMuted}`}>Loading stores...</p>
        </div>
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
            Manage multiple store locations, inventory transfers, and store settings
          </p>
        </div>
        <div className="flex gap-2">
          {/* View Toggle */}
          {stores.length > 0 && viewMode === 'details' && (
            <button
              onClick={goBackToCards}
              className={`px-3 py-1.5 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex items-center gap-2`}
            >
              <SafeIcon icon={Icons.grid} className="text-sm" fallback="⊞" />
              All Stores
            </button>
          )}
          {/* Currency Indicator */}
          <div className={`hidden sm:flex px-3 py-1.5 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} items-center gap-2`}>
            <Icons.creditCard className="text-sm" />
            <span className="text-xs">{currency.code} ({getCurrencySymbol()})</span>
          </div>
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

      {/* Currency Info Bar */}
      <div className={`${currentTheme.colors.accentLight} rounded-lg p-2 text-center border ${currentTheme.colors.border}`}>
        <p className={`text-xs ${currentTheme.colors.textSecondary} flex items-center justify-center gap-2 flex-wrap`}>
          <span>💰 All amounts in: {currency.code}</span>
          <span>💱 Symbol: {getCurrencySymbol()}</span>
          <span>📊 Format: {currency.position === 'after' ? 'X' + getCurrencySymbol() : getCurrencySymbol() + 'X'}</span>
        </p>
      </div>

      {/* Store Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`${currentTheme.colors.card} rounded-lg p-3 border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total Stores</p>
          <p className={`text-2xl font-bold ${currentTheme.colors.text}`}>{stores.length}</p>
        </div>
        <div className={`${currentTheme.colors.card} rounded-lg p-3 border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Open Now</p>
          <p className={`text-2xl font-bold ${currentTheme.accentText}`}>
            {stores.filter(s => s.open).length}
          </p>
        </div>
        <div className={`${currentTheme.colors.card} rounded-lg p-3 border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total Inventory</p>
          <p className={`text-2xl font-bold ${currentTheme.colors.text}`}>
            {totalInventoryValue.toLocaleString()}
          </p>
        </div>
        <div className={`${currentTheme.colors.card} rounded-lg p-3 border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Active Transfers</p>
          <p className={`text-2xl font-bold ${currentTheme.colors.text}`}>{activeTransfers}</p>
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
          {filteredStores.map(store => (
            <div
              key={store.id}
              onClick={() => switchToStore(store.id)}
              className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border} cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] relative group`}
            >
              {/* Store Badge */}
              <div className="absolute top-3 right-3">
                {store.isDefault && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    Main
                  </span>
                )}
                {!store.open && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    Closed
                  </span>
                )}
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
                  <span className="text-xs truncate">{store.city || 'City not set'}</span>
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
                  <Icons.box className="text-sm" />
                  <span className="text-xs">{store.inventory || 0} items</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 pt-3 border-t flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    switchToStore(store.id);
                  }}
                  className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  View Details
                </button>
                {canManageStores && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(store);
                    }}
                    className="px-2 py-1 text-xs border rounded hover:bg-gray-50 transition-colors"
                  >
                    <Icons.edit className="text-sm" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Store Details View */}
      {viewMode === 'details' && currentStore && (
        <>
          {/* Back Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goBackToCards}
              className={`flex items-center gap-1 text-sm ${currentTheme.colors.hover} ${currentTheme.colors.textSecondary} p-1 rounded`}
            >
              <Icons.chevronLeft className="text-lg" />
              Back to all stores
            </button>
            {!currentStore.isDefault && (
              <button
                onClick={switchToMainStore}
                className={`flex items-center gap-1 text-sm ${currentTheme.colors.accentText} p-1 rounded`}
              >
                <Icons.home className="text-sm" />
                Go to Main Store
              </button>
            )}
          </div>

          {/* Store Details Card */}
          <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>{currentStore.name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    currentStore.open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {currentStore.open ? 'Open' : 'Closed'}
                  </span>
                  {currentStore.isDefault && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Main Store
                    </span>
                  )}
                  {currentStore.createdBy && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      Created by: {currentStore.createdByName || 'System'}
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
                    <p className={currentTheme.colors.text}>
                      📞 {currentStore.phone || 'Not set'}
                    </p>
                    <p className={currentTheme.colors.text}>
                      ✉️ {currentStore.email || 'Not set'}
                    </p>
                    <p className={currentTheme.colors.text}>
                      👤 {currentStore.manager || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Hours</p>
                    <p className={currentTheme.colors.text}>🕐 {currentStore.openTime} - {currentStore.closeTime}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Tax Rate</p>
                    <p className={currentTheme.colors.text}>{currentStore.taxRate}%</p>
                  </div>
                  {currentStore.description && (
                    <div className="md:col-span-2">
                      <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Description</p>
                      <p className={`text-sm ${currentTheme.colors.text}`}>{currentStore.description}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className={`text-3xl font-bold ${currentTheme.accentText}`}>
                  {(currentStore.inventory || 0).toLocaleString()}
                </div>
                <p className={`text-xs ${currentTheme.colors.textMuted}`}>Total Items</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowTransfer(true)}
                className={`px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white flex items-center gap-2`}
              >
                <SafeIcon icon={Icons.truck} className="text-sm" fallback="🚚" /> Transfer Inventory
              </button>
              {canManageStores && (
                <>
                  <button
                    onClick={() => openEditModal(currentStore)}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex items-center gap-2`}
                  >
                    <SafeIcon icon={Icons.edit} className="text-sm" fallback="✎" /> Edit Store
                  </button>
                  {!currentStore.isDefault && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className={`px-3 py-1.5 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-2`}
                    >
                      <SafeIcon icon={Icons.trash} className="text-sm" fallback="🗑" /> Delete Store
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {filteredStores.length === 0 && (
        <div className={`${currentTheme.colors.card} rounded-lg p-12 text-center border ${currentTheme.colors.border}`}>
          <div className="text-5xl mb-3">🏪</div>
          <p className={`text-lg ${currentTheme.colors.textSecondary} mb-2`}>
            {searchTerm ? 'No stores match your search' : 'No stores added yet'}
          </p>
          <p className={`text-sm ${currentTheme.colors.textMuted} mb-4`}>
            {canManageStores 
              ? 'Click the "Add Store" button to create your first store location'
              : 'Contact an administrator to add stores'}
          </p>
          {canManageStores && !searchTerm && (
            <button
              onClick={() => setShowAddStore(true)}
              className={`px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white inline-flex items-center gap-2`}
            >
              <SafeIcon icon={Icons.add} className="text-sm" fallback="+" /> Add Your First Store
            </button>
          )}
        </div>
      )}

      {/* Recent Transfers */}
      {transfers.length > 0 && (
        <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
          <h2 className={`font-semibold mb-3 ${currentTheme.colors.text}`}>Recent Inventory Transfers</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {transfers.slice(0, 10).map(transfer => {
              const StatusIcon = getStatusIcon(transfer.status);
              const canApprove = isAdmin || hasRole('manager');
              
              return (
                <div key={transfer.id} className={`flex flex-col md:flex-row md:items-center justify-between p-3 border rounded-lg hover:shadow-md transition-all ${currentTheme.colors.border}`}>
                  <div className="flex-1 mb-2 md:mb-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-medium">{transfer.product}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusColor(transfer.status)}`}>
                        <SafeIcon icon={StatusIcon} className="text-xs" fallback="●" />
                        {transfer.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <SafeIcon icon={Icons.arrowRight} className="text-xs" fallback="→" />
                        {transfer.fromStore} → {transfer.toStore}
                      </span>
                      <span>📦 Qty: {transfer.quantity}</span>
                      <span>📅 {formatDate(transfer.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Initiated by: {transfer.initiatedBy}</p>
                  </div>
                  {transfer.status === 'pending' && canApprove && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveTransfer(transfer)}
                        className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleCancelTransfer(transfer)}
                        className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {transfer.status === 'in-transit' && (
                    <button
                      onClick={() => handleCompleteTransfer(transfer)}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      Complete Transfer
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && stores.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
            <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center sticky top-0 ${currentTheme.colors.card}`}>
              <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Transfer Inventory</h2>
              <button onClick={() => setShowTransfer(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <SafeIcon icon={Icons.x} className="text-xl" fallback="✕" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>From Store</label>
                <select
                  value={transferForm.fromStore}
                  onChange={(e) => setTransferForm({ ...transferForm, fromStore: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                >
                  <option value="">Select Source Store</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>To Store</label>
                <select
                  value={transferForm.toStore}
                  onChange={(e) => setTransferForm({ ...transferForm, toStore: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                >
                  <option value="">Select Destination Store</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Product</label>
                <select
                  value={transferForm.product}
                  onChange={(e) => setTransferForm({ ...transferForm, product: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                >
                  <option value="">Select Product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (SKU: {p.sku}) - Stock: {p.storeStock?.[transferForm.fromStore] || p.stock || 0}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Quantity</label>
                <input
                  type="number"
                  value={transferForm.quantity || 1}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setTransferForm({ ...transferForm, quantity: isNaN(value) ? 1 : value });
                  }}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  min="1"
                />
              </div>

              {transferForm.fromStore && transferForm.product && (
                <div className={`p-3 ${currentTheme.colors.accentLight} rounded-lg`}>
                  <p className={`text-sm ${currentTheme.colors.textSecondary}`}>Available Stock:</p>
                  <p className={`text-lg font-bold ${currentTheme.accentText}`}>
                    {products.find(p => p.id === transferForm.product)?.storeStock?.[transferForm.fromStore] || 
                     products.find(p => p.id === transferForm.product)?.stock || 0}
                  </p>
                </div>
              )}
            </div>

            <div className={`p-4 border-t ${currentTheme.colors.border} flex gap-3`}>
              <button
                onClick={() => setShowTransfer(false)}
                className="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={!transferForm.fromStore || !transferForm.toStore || !transferForm.product || !transferForm.quantity}
                className={`flex-1 px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
              >
                Create Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Store Modal */}
      {showAddStore && canManageStores && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
            <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center sticky top-0 ${currentTheme.colors.card}`}>
              <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Add New Store</h2>
              <button onClick={() => setShowAddStore(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <SafeIcon icon={Icons.x} className="text-xl" fallback="✕" />
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
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Address *</label>
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
                  <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>City *</label>
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
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    setStoreForm({ ...storeForm, taxRate: isNaN(value) ? 0 : value });
                  }}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>

              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Description</label>
                <textarea
                  value={storeForm.description}
                  onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                  rows="2"
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} resize-none`}
                  placeholder="Store description (optional)"
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
                className="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStore}
                disabled={!storeForm.name || !storeForm.address || !storeForm.city}
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
              <button onClick={() => setShowEditStore(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <SafeIcon icon={Icons.x} className="text-xl" fallback="✕" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Same form fields as Add Store Modal */}
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
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Address *</label>
                <input
                  type="text"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>City *</label>
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
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    setStoreForm({ ...storeForm, taxRate: isNaN(value) ? 0 : value });
                  }}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>

              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Description</label>
                <textarea
                  value={storeForm.description}
                  onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                  rows="2"
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} resize-none`}
                  placeholder="Store description"
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
                className="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditStore}
                disabled={!storeForm.name || !storeForm.address || !storeForm.city}
                className={`flex-1 px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && currentStore && isAdmin && !currentStore.isDefault && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl p-6`}>
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Delete Store</h3>
            </div>
            
            <p className={`text-sm ${currentTheme.colors.textSecondary} mb-4 text-center`}>
              Are you sure you want to delete <strong>{currentStore.name}</strong>?
              {currentStore.inventory > 0 && (
                <span className="block text-red-600 mt-2">
                  ⚠️ This store has {currentStore.inventory} items in inventory. Please transfer all items before deleting.
                </span>
              )}
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
                disabled={currentStore.inventory > 0}
                className={`flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
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