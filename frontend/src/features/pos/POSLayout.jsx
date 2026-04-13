// src/features/pos/POSLayout.jsx
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { usePOS } from './context/POSContext';
import { useStore } from './context/StoreContext';
import { api } from './services/api';
import { Icons } from '../../components/ui/Icons';
import Checkout from './checkout/Checkout';
import InventoryDashboard from './inventory/InventoryDashboard';
import CustomerList from './customers/CustomerList';
import ReportsDashboard from './reports/ReportsDashboard';
import Settings from './settings/Settings';
import Returns from './returns/Returns';
import PurchaseOrders from './purchaseOrders/PurchaseOrders';
import EmployeeManagement from './employees/EmployeeManagement';
import MultiStore from './stores/MultiStore';
import CloudSyncManager from './components/CloudSyncManager';
import StoreBadge from './components/StoreBadge';

// Import new components
import Records from './records/Records';
import CreditSale from './credit/CreditSale';
import InstallmentSales from './installments/InstallmentSales';
import Invoicing from './invoicing/Invoicing';
import Quotations from './quotations/Quotations';
import Suppliers from './suppliers/Suppliers';
import Transactions from './Transactions/Transactions';

export default function POSLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  const [showCloudSync, setShowCloudSync] = useState(false);
  const location = useLocation();
  const { theme, getTheme } = useTheme();
  const { state } = usePOS();
  const { activeStore, stores, switchStore, refreshStores } = useStore();
  const currentTheme = getTheme(theme);

  // Track window size for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
        setIsMobileMenuOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Sync active store with API service
  useEffect(() => {
    if (activeStore?.id) {
      api.setCurrentStore(activeStore.id);
      console.log('📡 API service store set to:', activeStore.id);
    }
  }, [activeStore]);

  // Load stores on mount
  useEffect(() => {
    const loadStores = async () => {
      if (refreshStores) {
        await refreshStores();
      }
    };
    loadStores();
  }, [refreshStores]);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const navigation = [
    { name: 'Checkout', path: '/pos/checkout', icon: Icons.shoppingBag },
    { name: 'Inventory', path: '/pos/inventory', icon: Icons.package },
    { name: 'Customers', path: '/pos/customers', icon: Icons.users },
    { name: 'Transactions', path: '/pos/transactions', icon: Icons.receipt },
    { name: 'Purchase Orders', path: '/pos/purchase-orders', icon: Icons.truck },
    { name: 'Employees', path: '/pos/employees', icon: Icons.user },
    { name: 'Stores', path: '/pos/stores', icon: Icons.grid },
    { name: 'Returns', path: '/pos/returns', icon: Icons.refresh },
    { name: 'Records', path: '/pos/records', icon: Icons.fileText },
    { name: 'Credit Sale', path: '/pos/credit', icon: Icons.creditCard },
    { name: 'Installments', path: '/pos/installments', icon: Icons.calendar },
    { name: 'Invoicing', path: '/pos/invoicing', icon: Icons.fileText },
    { name: 'Quotations', path: '/pos/quotations', icon: Icons.file },
    { name: 'Suppliers', path: '/pos/suppliers', icon: Icons.truck },
    { name: 'Reports', path: '/pos/reports', icon: Icons.reports },
    { name: 'Settings', path: '/pos/settings', icon: Icons.settings },
  ];

  // Get theme-specific text colors
  const getThemeColors = () => {
    switch(theme) {
      case 'dark':
        return {
          inactiveIcon: '#9ca3af',
          inactiveText: '#9ca3af',
          activeText: '#ffffff',
          headingText: '#ffffff'
        };
      case 'ocean':
        return {
          inactiveIcon: '#4b5563',
          inactiveText: '#4b5563',
          activeText: '#ffffff',
          headingText: '#1e293b'
        };
      default:
        return {
          inactiveIcon: '#4b5563',
          inactiveText: '#4b5563',
          activeText: '#ffffff',
          headingText: '#4b5563'
        };
    }
  };

  const themeColors = getThemeColors();

  const getIconColor = (isActive) => {
    return isActive ? themeColors.activeText : themeColors.inactiveIcon;
  };

  const getTextColor = (isActive) => {
    return isActive ? themeColors.activeText : themeColors.inactiveText;
  };

  const getActiveBg = () => {
    switch(theme) {
      case 'light': return 'linear-gradient(to right, #3b82f6, #2563eb)';
      case 'dark': return 'linear-gradient(to right, #3b82f6, #2563eb)';
      case 'ocean': return 'linear-gradient(to right, #06b6d4, #3b82f6)';
      default: return 'linear-gradient(to right, #3b82f6, #2563eb)';
    }
  };

  // Calculate sidebar width based on screen size and state
  const getSidebarWidth = () => {
    if (isMobile) {
      return isMobileMenuOpen ? 'w-56' : 'w-0';
    }
    if (isTablet) {
      return isSidebarOpen ? 'w-40' : 'w-14';
    }
    return isSidebarOpen ? 'w-48' : 'w-16';
  };

  // Handle store switching from header dropdown
  const handleStoreSwitch = async (storeId) => {
    const result = await switchStore(storeId);
    if (result.success) {
      console.log(`✅ Switched to ${result.store.name}`);
      // Refresh the page data after store switch
      window.location.reload();
    }
  };

  return (
    <div className={`flex h-screen ${currentTheme.colors.bg} transition-colors duration-300 overflow-hidden`}>
      {/* Mobile Menu Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`${getSidebarWidth()} ${currentTheme.colors.sidebar} transition-all duration-300 flex flex-col h-full fixed md:relative z-50 ${
          isMobile && !isMobileMenuOpen ? '-translate-x-full' : 'translate-x-0'
        } md:translate-x-0`}
      >
        {/* Logo and Toggle */}
        <div className="h-12 flex items-center justify-between px-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <span className={`text-sm font-bold bg-gradient-to-r ${currentTheme.colors.accent} bg-clip-text text-transparent truncate`}>
            {!isMobile && isSidebarOpen ? 'BizCore' : isMobile ? 'B' : 'B'}
          </span>
          <div className="flex items-center gap-0.5">
            {isMobile && isMobileMenuOpen && (
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`p-1 rounded-lg ${currentTheme.colors.hover} transition-colors md:hidden`}
              >
                <Icons.x className="text-base" />
              </button>
            )}
            {!isMobile && (
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-1 rounded-lg ${currentTheme.colors.hover} transition-colors hidden md:block`}
              >
                {isSidebarOpen ? <Icons.chevronLeft className="text-base" /> : <Icons.chevronRight className="text-base" />}
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          {navigation.map((item) => {
            const isActive = location.pathname === item.path;
            const IconComponent = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center px-2 py-2 mx-2 rounded-lg transition-all duration-200 group relative"
                style={{
                  background: isActive ? getActiveBg() : 'transparent'
                }}
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
              >
                <IconComponent 
                  className="text-base flex-shrink-0 transition-colors duration-200"
                  style={{ color: getIconColor(isActive) }}
                />
                {(isSidebarOpen || isMobile) && (
                  <span 
                    className="ml-2 text-xs font-medium truncate transition-colors duration-200"
                    style={{ color: getTextColor(isActive) }}
                  >
                    {item.name}
                  </span>
                )}
                
                {/* Tooltip for collapsed sidebar */}
                {!isSidebarOpen && !isMobile && (
                  <span className="absolute left-full ml-1 px-1.5 py-0.5 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Offline Indicator */}
        {state.offlineMode && (
          <div className="p-2 mx-2 mb-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-lg text-[10px]">
            <div className="flex items-center gap-1">
              <Icons.alert className="text-xs flex-shrink-0" />
              {(isSidebarOpen || isMobile) && (
                <span className="truncate">Offline</span>
              )}
            </div>
          </div>
        )}

        {/* Store Info Footer */}
        {activeStore && (isSidebarOpen || isMobile) && (
          <div className={`p-2 mx-2 mb-2 ${currentTheme.colors.accentLight} rounded-lg text-[10px] border ${currentTheme.colors.border}`}>
            <div className="flex items-center gap-1">
              <Icons.store className="text-xs flex-shrink-0" />
              <span className="truncate">{activeStore.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Header */}
        <header className={`h-10 ${currentTheme.colors.header} border-b ${currentTheme.colors.border} flex items-center justify-between px-2 flex-shrink-0`}>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`p-1 rounded-lg ${currentTheme.colors.hover} md:hidden`}
            >
              <Icons.menu className="text-base" />
            </button>
            
            <h1 
              className="text-xs font-medium truncate"
              style={{ color: themeColors.headingText }}
            >
              {navigation.find(n => n.path === location.pathname)?.name || 'POS'}
            </h1>
          </div>
          
          <div className="flex items-center gap-0.5">
            {/* Store Badge / Selector */}
            <StoreBadge />
            
            {/* Store Dropdown for multiple stores */}
            {stores && stores.length > 1 && !isMobile && activeStore && (
              <select
                className={`px-1.5 py-1 text-[9px] rounded border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} max-w-[100px]`}
                value={activeStore.id}
                onChange={(e) => handleStoreSwitch(e.target.value)}
                title="Switch Store"
              >
                {stores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.name.length > 10 ? store.name.substring(0, 10) + '...' : store.name}
                    {store.isDefault && ' (Main)'}
                  </option>
                ))}
              </select>
            )}

            {/* Cloud Sync Button */}
            <button
              onClick={() => setShowCloudSync(true)}
              className={`p-1 rounded-lg ${currentTheme.colors.hover} relative group`}
              title="Cloud Sync"
            >
              <Icons.cloud className="text-sm text-blue-500" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            </button>

            {/* Theme Switcher */}
            <button
              onClick={() => {
                // Theme toggle logic would go here
              }}
              className={`p-1 rounded-lg ${currentTheme.colors.hover}`}
              title="Theme"
            >
              {theme === 'light' && <Icons.sun className="text-amber-500 text-sm" />}
              {theme === 'dark' && <Icons.moon className="text-indigo-400 text-sm" />}
              {theme === 'ocean' && <Icons.cloud className="text-cyan-500 text-sm" />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-2">
          <Routes>
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/inventory" element={<InventoryDashboard />} />
            <Route path="/customers" element={<CustomerList />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/employees" element={<EmployeeManagement />} />
            <Route path="/stores" element={<MultiStore />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/records" element={<Records />} />
            <Route path="/credit" element={<CreditSale />} />
            <Route path="/installments" element={<InstallmentSales />} />
            <Route path="/invoicing" element={<Invoicing />} />
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/reports" element={<ReportsDashboard />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>

      {/* Cloud Sync Modal */}
      {showCloudSync && (
        <CloudSyncManager onClose={() => setShowCloudSync(false)} />
      )}
    </div>
  );
}