// src/features/pos/customers/CustomerList.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useCustomers } from '../context/CustomerContext';
import { Icons } from '../../../components/ui/Icons';
import CustomerDetailsModal from './CustomerDetailsModal';
import CustomerForm from './CustomerForm';
import { customerTransactionService } from '../services/customerTransactionService';

export default function CustomerList() {
  const [view, setView] = useState('list');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerSummaries, setCustomerSummaries] = useState({});
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { theme, getTheme } = useTheme();
  const { formatPrice, currency, getCurrencySymbol } = useCurrency();
  const { state, dispatch, reloadCustomers } = useCustomers();
  const currentTheme = getTheme(theme);
  const isMounted = useRef(true);
  const loadingRef = useRef(false);
  const initialLoadDone = useRef(false);
  const summaryCache = useRef({});

  // Format currency for customer data
  const formatCurrency = useCallback((amount) => {
    return formatPrice(amount, { showSymbol: true, showCode: false });
  }, [formatPrice]);

  // Load summaries for all customers - FIXED to use cache and prevent infinite loop
  const loadSummaries = useCallback(async (forceRefresh = false) => {
    // Prevent multiple simultaneous loads
    if (loadingRef.current) return;
    
    // Skip if no customers
    if (!state.customers.length) {
      setCustomerSummaries({});
      return;
    }
    
    // Use cache if not forcing refresh
    if (!forceRefresh && Object.keys(summaryCache.current).length === state.customers.length) {
      setCustomerSummaries(summaryCache.current);
      return;
    }
    
    loadingRef.current = true;
    setLoadingSummaries(true);
    
    try {
      const summaries = {};
      
      // Process customers in batches
      const batchSize = 5;
      const customersCopy = [...state.customers];
      
      for (let i = 0; i < customersCopy.length; i += batchSize) {
        const batch = customersCopy.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (customer) => {
            try {
              const summary = await customerTransactionService.getCustomerSummary(customer.id);
              if (summary && isMounted.current) {
                summaries[customer.id] = {
                  ...summary,
                  formattedTotalSpent: formatCurrency(summary.totalSpent),
                  formattedTotalOutstanding: formatCurrency(summary.totalOutstanding),
                  formattedAverageTicket: formatCurrency(summary.averageTicket)
                };
              }
            } catch (error) {
              console.error(`Failed to load summary for customer ${customer.id}:`, error);
            }
          })
        );
      }
      
      if (isMounted.current) {
        // Update cache
        summaryCache.current = summaries;
        setCustomerSummaries(summaries);
      }
    } catch (error) {
      console.error('Error loading summaries:', error);
    } finally {
      if (isMounted.current) {
        setLoadingSummaries(false);
        setLoading(false);
      }
      loadingRef.current = false;
    }
  }, [state.customers, formatCurrency]);

  // Initial load - ONLY ONCE
  useEffect(() => {
    isMounted.current = true;
    
    const initLoad = async () => {
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        setLoading(true);
        await loadSummaries();
      }
    };
    
    initLoad();
    
    return () => {
      isMounted.current = false;
    };
  }, [loadSummaries]);

  // Listen for cloud restore events - ONLY for external triggers
  useEffect(() => {
    const handleDataRestored = async (event) => {
      console.log('🔄 Cloud data restored, refreshing customer list...', event.detail);
      setRefreshing(true);
      
      if (reloadCustomers) {
        await reloadCustomers();
      }
      
      // Clear cache and force refresh
      summaryCache.current = {};
      await loadSummaries(true);
      setRefreshing(false);
    };

    const handleCustomerStatsUpdated = (event) => {
      console.log('📊 Customer stats updated, refreshing summaries...', event.detail);
      // Clear cache and force refresh
      summaryCache.current = {};
      loadSummaries(true);
    };

    window.addEventListener('cloud-data-restored', handleDataRestored);
    window.addEventListener('customer-stats-updated', handleCustomerStatsUpdated);
    
    return () => {
      window.removeEventListener('cloud-data-restored', handleDataRestored);
      window.removeEventListener('customer-stats-updated', handleCustomerStatsUpdated);
    };
  }, [reloadCustomers, loadSummaries]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    // Clear cache
    summaryCache.current = {};
    if (reloadCustomers) {
      await reloadCustomers();
    }
    await loadSummaries(true);
    setRefreshing(false);
  };

  // Handle add customer
  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setView('add');
  };

  // Handle edit customer
  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setView('edit');
  };

  // Handle form close
  const handleFormClose = async (saved = false) => {
    setView('list');
    setSelectedCustomer(null);
    if (saved) {
      // Clear cache and refresh
      summaryCache.current = {};
      if (reloadCustomers) {
        await reloadCustomers();
      }
      await loadSummaries(true);
    }
  };

  // Sort and filter customers
  const processedCustomers = state.customers
    .filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.phone && c.phone.includes(searchTerm));
      
      if (!matchesSearch) return false;
      
      const summary = customerSummaries[c.id];
      if (filterType === 'hasCredit' && (!summary || summary.creditCount === 0)) return false;
      if (filterType === 'hasInstallment' && (!summary || summary.installmentCount === 0)) return false;
      if (filterType === 'overdue' && (!summary || summary.overdueCount === 0)) return false;
      if (filterType === 'recent' && (!summary || !summary.lastTransaction || 
          new Date(summary.lastTransaction) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      const summaryA = customerSummaries[a.id];
      const summaryB = customerSummaries[b.id];
      
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'spent':
          comparison = (summaryA?.totalSpent || 0) - (summaryB?.totalSpent || 0);
          break;
        case 'points':
          comparison = (a.loyaltyPoints || 0) - (b.loyaltyPoints || 0);
          break;
        case 'frequency':
          comparison = (summaryA?.totalTransactions || 0) - (summaryB?.totalTransactions || 0);
          break;
        case 'lastVisit':
          const dateA = summaryA?.lastTransaction || a.lastVisit || '1970-01-01';
          const dateB = summaryB?.lastTransaction || b.lastVisit || '1970-01-01';
          comparison = new Date(dateA) - new Date(dateB);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowDetailsModal(true);
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortButton = ({ field, label }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`flex items-center gap-1 px-2 py-1 text-xs rounded whitespace-nowrap ${
        sortBy === field 
          ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white` 
          : currentTheme.colors.hover
      }`}
    >
      {label}
      {sortBy === field && (
        <Icons.chevronDown className={`text-xs transform transition-transform ${
          sortOrder === 'desc' ? 'rotate-180' : ''
        }`} />
      )}
    </button>
  );

  // Format large numbers with commas
  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toLocaleString();
  };

  // Calculate totals using cache
  const totalSpent = Object.values(customerSummaries).reduce((sum, s) => sum + (s.totalSpent || 0), 0);
  const totalPoints = state.customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0);
  const totalTransactions = Object.values(customerSummaries).reduce((sum, s) => sum + (s.totalTransactions || 0), 0);

  // Show loading state
  if (loading && state.customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={`text-sm ${currentTheme.colors.textSecondary}`}>Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3">
        <h1 className={`text-lg sm:text-xl font-bold ${currentTheme.colors.text}`}>Customers</h1>
        <div className="flex flex-wrap gap-2 w-full xs:w-auto">
          {/* Currency Indicator */}
          <div className={`hidden sm:flex px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} items-center gap-1 sm:gap-2`}>
            <Icons.creditCard className="text-xs sm:text-sm" />
            <span className="text-[10px] sm:text-xs">{currency.code} ({getCurrencySymbol()})</span>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex items-center gap-1 sm:gap-2 transition-all flex-1 xs:flex-none justify-center`}
            title="Refresh customer data"
          >
            <Icons.refresh className={`text-xs sm:text-sm ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          
          {/* Add Customer Button */}
          <button
            onClick={handleAddCustomer}
            className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white flex items-center gap-1 sm:gap-2 shadow-md hover:shadow-lg transition-all flex-1 xs:flex-none justify-center`}
          >
            <Icons.add className="text-xs sm:text-sm" /> 
            <span className="hidden xs:inline">Add Customer</span>
            <span className="xs:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Currency Info Bar */}
      <div className={`${currentTheme.colors.accentLight} rounded-lg p-2 text-center border ${currentTheme.colors.border}`}>
        <p className={`text-[10px] sm:text-xs ${currentTheme.colors.textSecondary} flex items-center justify-center gap-1 sm:gap-2 flex-wrap`}>
          <span>💰 All amounts in: {currency.code}</span>
          <span className="hidden xs:inline">💱 Symbol: {getCurrencySymbol()}</span>
          <span className="hidden sm:inline">📊 Format: {currency.position === 'after' ? 'X' + getCurrencySymbol() : getCurrencySymbol() + 'X'}</span>
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Icons.search className={`absolute left-3 top-1/2 -translate-y-1/2 ${currentTheme.colors.textMuted} text-sm`} />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-8 py-2 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${currentTheme.colors.textMuted} hover:text-gray-700 dark:hover:text-gray-300`}
            >
              <Icons.x className="text-sm" />
            </button>
          )}
        </div>

        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          className="flex sm:hidden items-center justify-between w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <span className="text-sm">Filters & Sort</span>
          <Icons.chevronDown className={`text-sm transition-transform ${mobileFiltersOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Filter Chips */}
        <div className={`${mobileFiltersOpen ? 'block' : 'hidden sm:block'} space-y-3`}>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-full transition-colors whitespace-nowrap ${
                filterType === 'all'
                  ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white shadow-sm`
                  : `${currentTheme.colors.hover} ${currentTheme.colors.textSecondary}`
              }`}
            >
              All Customers ({state.customers.length})
            </button>
            <button
              onClick={() => setFilterType('hasCredit')}
              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-full transition-colors whitespace-nowrap ${
                filterType === 'hasCredit'
                  ? 'bg-purple-500 text-white shadow-sm'
                  : `${currentTheme.colors.hover} text-purple-600 dark:text-purple-400`
              }`}
            >
              Has Credit
            </button>
            <button
              onClick={() => setFilterType('hasInstallment')}
              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-full transition-colors whitespace-nowrap ${
                filterType === 'hasInstallment'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : `${currentTheme.colors.hover} text-blue-600 dark:text-blue-400`
              }`}
            >
              Has Installment
            </button>
            <button
              onClick={() => setFilterType('overdue')}
              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-full transition-colors whitespace-nowrap ${
                filterType === 'overdue'
                  ? 'bg-red-500 text-white shadow-sm'
                  : `${currentTheme.colors.hover} text-red-600 dark:text-red-400`
              }`}
            >
              Overdue
            </button>
            <button
              onClick={() => setFilterType('recent')}
              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-full transition-colors whitespace-nowrap ${
                filterType === 'recent'
                  ? 'bg-green-500 text-white shadow-sm'
                  : `${currentTheme.colors.hover} text-green-600 dark:text-green-400`
              }`}
            >
              Recent (30 days)
            </button>
          </div>

          {/* Sort Controls */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center overflow-x-auto pb-1 sm:pb-0">
            <span className={`text-[10px] sm:text-xs ${currentTheme.colors.textSecondary} flex-shrink-0`}>Sort by:</span>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <SortButton field="name" label="Name" />
              <SortButton field="spent" label="Total Spent" />
              <SortButton field="points" label="Loyalty Points" />
              <SortButton field="frequency" label="Transaction Count" />
              <SortButton field="lastVisit" label="Last Visit" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      {state.customers.length > 0 && !loadingSummaries && (
        <div className={`p-2 sm:p-3 rounded-lg ${currentTheme.colors.accentLight} border ${currentTheme.colors.border}`}>
          <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 sm:gap-3 text-center">
            <div>
              <p className={`text-[10px] sm:text-xs ${currentTheme.colors.textSecondary}`}>Total Customers</p>
              <p className={`text-base sm:text-lg font-bold ${currentTheme.accentText}`}>{state.customers.length}</p>
            </div>
            <div>
              <p className={`text-[10px] sm:text-xs ${currentTheme.colors.textSecondary}`}>Total Spent</p>
              <p className={`text-base sm:text-lg font-bold ${currentTheme.accentText} truncate`}>
                {formatCurrency(totalSpent)}
              </p>
            </div>
            <div>
              <p className={`text-[10px] sm:text-xs ${currentTheme.colors.textSecondary}`}>Total Points</p>
              <p className={`text-base sm:text-lg font-bold ${currentTheme.accentText}`}>
                {formatNumber(totalPoints)}
              </p>
            </div>
            <div>
              <p className={`text-[10px] sm:text-xs ${currentTheme.colors.textSecondary}`}>Total Transactions</p>
              <p className={`text-base sm:text-lg font-bold ${currentTheme.accentText}`}>
                {formatNumber(totalTransactions)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading/Refreshing State */}
      {(loadingSummaries || refreshing) && state.customers.length > 0 ? (
        <div className="flex justify-center py-8 sm:py-12">
          <div className="text-center">
            <Icons.refresh className={`animate-spin text-2xl sm:text-3xl ${currentTheme.colors.textMuted} mb-2`} />
            <p className={`text-xs sm:text-sm ${currentTheme.colors.textMuted}`}>
              {refreshing ? 'Refreshing customer data...' : 'Loading customer summaries...'}
            </p>
          </div>
        </div>
      ) : (
        /* Customer Grid */
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {processedCustomers.map(customer => {
            const summary = customerSummaries[customer.id] || {
              totalSpent: 0,
              totalTransactions: 0,
              averageTicket: 0,
              creditCount: 0,
              installmentCount: 0,
              overdueCount: 0,
              lastTransaction: customer.lastVisit,
              formattedTotalSpent: formatCurrency(0),
              formattedTotalOutstanding: formatCurrency(0),
              formattedAverageTicket: formatCurrency(0)
            };
            
            return (
              <div
                key={customer.id}
                onClick={() => handleViewCustomer(customer)}
                className={`p-3 sm:p-4 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] relative group`}
              >
                {/* Badges */}
                <div className="absolute top-2 right-2 flex flex-wrap gap-1 justify-end max-w-[70%]">
                  {summary.creditCount > 0 && (
                    <span className="px-1.5 sm:px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[8px] sm:text-[10px] rounded-full font-medium whitespace-nowrap">
                      {summary.creditCount} Credit
                    </span>
                  )}
                  {summary.installmentCount > 0 && (
                    <span className="px-1.5 sm:px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[8px] sm:text-[10px] rounded-full font-medium whitespace-nowrap">
                      {summary.installmentCount} Installment
                    </span>
                  )}
                  {summary.overdueCount > 0 && (
                    <span className="px-1.5 sm:px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[8px] sm:text-[10px] rounded-full font-medium whitespace-nowrap">
                      {summary.overdueCount} Overdue
                    </span>
                  )}
                </div>

                {/* Customer Info */}
                <div className="flex justify-between items-start mb-2 sm:mb-3 pr-16">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold ${currentTheme.colors.text} text-sm sm:text-base truncate`}>
                      {customer.name}
                    </h3>
                    <p className={`text-[10px] sm:text-xs ${currentTheme.colors.textMuted} truncate`}>
                      {customer.email || 'No email'}
                    </p>
                    <p className={`text-[10px] sm:text-xs ${currentTheme.colors.textMuted} truncate`}>
                      {customer.phone || 'No phone'}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleEditCustomer(customer); }}
                    className={`p-1 rounded ${currentTheme.colors.hover} opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0`}
                    title="Edit Customer"
                  >
                    <Icons.edit className={`text-xs sm:text-sm ${currentTheme.colors.textSecondary}`} />
                  </button>
                </div>
                
                {/* Stats Grid */}
                <div className={`border-t ${currentTheme.colors.border} pt-2 sm:pt-3 grid grid-cols-2 gap-1 sm:gap-2 text-center`}>
                  <div>
                    <p className={`text-[8px] sm:text-xs ${currentTheme.colors.textSecondary}`}>Loyalty Points</p>
                    <p className={`text-xs sm:text-sm font-bold ${currentTheme.accentText}`}>
                      {formatNumber(customer.loyaltyPoints || 0)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-[8px] sm:text-xs ${currentTheme.colors.textSecondary}`}>Lifetime Value</p>
                    <p className={`text-xs sm:text-sm font-bold ${currentTheme.colors.text} truncate`}>
                      {summary.formattedTotalSpent}
                    </p>
                  </div>
                  <div>
                    <p className={`text-[8px] sm:text-xs ${currentTheme.colors.textSecondary}`}>Transactions</p>
                    <p className={`text-xs sm:text-sm font-bold ${currentTheme.colors.text}`}>
                      {summary.totalTransactions}
                    </p>
                  </div>
                  <div>
                    <p className={`text-[8px] sm:text-xs ${currentTheme.colors.textSecondary}`}>Average Ticket</p>
                    <p className={`text-xs sm:text-sm font-bold ${currentTheme.colors.text} truncate`}>
                      {summary.formattedAverageTicket}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className={`text-[8px] sm:text-xs ${currentTheme.colors.textSecondary}`}>Last Visit</p>
                    <p className={`text-[9px] sm:text-xs ${currentTheme.colors.text} font-medium truncate`}>
                      {summary.lastTransaction 
                        ? new Date(summary.lastTransaction).toLocaleDateString()
                        : customer.lastVisit 
                          ? new Date(customer.lastVisit).toLocaleDateString()
                          : 'Never'
                      }
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {processedCustomers.length === 0 && !loadingSummaries && !refreshing && !loading && (
        <div className="text-center py-8 sm:py-12">
          <Icons.users className="text-3xl sm:text-5xl mx-auto mb-2 sm:mb-3 text-gray-400" />
          <p className={`text-sm sm:text-base ${currentTheme.colors.textMuted} mb-2`}>
            {searchTerm ? 'No customers match your search' : 'No customers found'}
          </p>
          {!searchTerm && (
            <button
              onClick={handleAddCustomer}
              className={`mt-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white shadow-md hover:shadow-lg transition-all`}
            >
              Add Your First Customer
            </button>
          )}
        </div>
      )}

      {/* Customer Form Modal (Add/Edit) */}
      {(view === 'add' || view === 'edit') && (
        <CustomerForm
          customer={view === 'edit' ? selectedCustomer : null}
          onClose={handleFormClose}
        />
      )}

      {/* Customer Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          onClose={() => setShowDetailsModal(false)}
          onEdit={() => {
            setShowDetailsModal(false);
            handleEditCustomer(selectedCustomer);
          }}
        />
      )}
    </div>
  );
}