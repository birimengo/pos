// src/features/pos/customers/CustomerList.jsx

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useCustomers } from '../context/CustomerContext';
import { Icons } from '../../../components/ui/Icons';
import CustomerDetailsModal from './CustomerDetailsModal';
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
  
  const { theme, getTheme } = useTheme();
  const { state, dispatch, reloadCustomers } = useCustomers();
  const currentTheme = getTheme(theme);

  // Load summaries for all customers
  const loadSummaries = useCallback(async () => {
    if (state.customers.length === 0) {
      setCustomerSummaries({});
      return;
    }
    
    setLoadingSummaries(true);
    const summaries = {};
    
    await Promise.all(
      state.customers.map(async (customer) => {
        try {
          const summary = await customerTransactionService.getCustomerSummary(customer.id);
          if (summary) {
            summaries[customer.id] = summary;
          }
        } catch (error) {
          console.error(`Failed to load summary for customer ${customer.id}:`, error);
        }
      })
    );
    
    setCustomerSummaries(summaries);
    setLoadingSummaries(false);
  }, [state.customers]);

  // Load summaries when customers change
  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  // Listen for cloud restore events to refresh data
  useEffect(() => {
    const handleDataRestored = async (event) => {
      console.log('🔄 Cloud data restored, refreshing customer list...', event.detail);
      setRefreshing(true);
      
      // Reload customers from context/database
      if (reloadCustomers) {
        await reloadCustomers();
      }
      
      // Reload summaries
      await loadSummaries();
      
      setRefreshing(false);
    };

    // Listen for customer stats updates
    const handleCustomerStatsUpdated = (event) => {
      console.log('📊 Customer stats updated, refreshing summaries...', event.detail);
      loadSummaries();
    };

    window.addEventListener('cloud-data-restored', handleDataRestored);
    window.addEventListener('customer-stats-updated', handleCustomerStatsUpdated);
    
    return () => {
      window.removeEventListener('cloud-data-restored', handleDataRestored);
      window.removeEventListener('customer-stats-updated', handleCustomerStatsUpdated);
    };
  }, [loadSummaries, reloadCustomers]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    if (reloadCustomers) {
      await reloadCustomers();
    }
    await loadSummaries();
    setRefreshing(false);
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
      className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className={`text-xl font-bold ${currentTheme.colors.text}`}>Customers</h1>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`px-3 py-1.5 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex items-center gap-2 transition-all`}
            title="Refresh customer data"
          >
            <Icons.refresh className={`text-sm ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => setView('add')}
            className={`px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white flex items-center gap-2 shadow-md hover:shadow-lg transition-all`}
          >
            <Icons.add className="text-sm" /> Add Customer
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Icons.search className={`absolute left-3 top-2.5 ${currentTheme.colors.textMuted}`} />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className={`absolute right-3 top-2.5 ${currentTheme.colors.textMuted} hover:text-gray-700 dark:hover:text-gray-300`}
            >
              <Icons.x className="text-sm" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filterType === 'all'
                ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white shadow-sm`
                : `${currentTheme.colors.hover} ${currentTheme.colors.textSecondary}`
            }`}
          >
            All Customers
          </button>
          <button
            onClick={() => setFilterType('hasCredit')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filterType === 'hasCredit'
                ? 'bg-purple-500 text-white shadow-sm'
                : `${currentTheme.colors.hover} text-purple-600 dark:text-purple-400`
            }`}
          >
            Has Credit
          </button>
          <button
            onClick={() => setFilterType('hasInstallment')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filterType === 'hasInstallment'
                ? 'bg-blue-500 text-white shadow-sm'
                : `${currentTheme.colors.hover} text-blue-600 dark:text-blue-400`
            }`}
          >
            Has Installment
          </button>
          <button
            onClick={() => setFilterType('overdue')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filterType === 'overdue'
                ? 'bg-red-500 text-white shadow-sm'
                : `${currentTheme.colors.hover} text-red-600 dark:text-red-400`
            }`}
          >
            Overdue
          </button>
          <button
            onClick={() => setFilterType('recent')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filterType === 'recent'
                ? 'bg-green-500 text-white shadow-sm'
                : `${currentTheme.colors.hover} text-green-600 dark:text-green-400`
            }`}
          >
            Recent (30 days)
          </button>
        </div>

        {/* Sort Controls */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className={`text-xs ${currentTheme.colors.textSecondary}`}>Sort by:</span>
          <SortButton field="name" label="Name" />
          <SortButton field="spent" label="Total Spent" />
          <SortButton field="points" label="Points" />
          <SortButton field="frequency" label="Frequency" />
          <SortButton field="lastVisit" label="Last Visit" />
        </div>
      </div>

      {/* Stats Summary */}
      {state.customers.length > 0 && !loadingSummaries && (
        <div className={`p-3 rounded-lg ${currentTheme.colors.accentLight} border ${currentTheme.colors.border}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total Customers</p>
              <p className={`text-lg font-bold ${currentTheme.accentText}`}>{state.customers.length}</p>
            </div>
            <div>
              <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total Spent</p>
              <p className={`text-lg font-bold ${currentTheme.accentText}`}>
                {customerTransactionService.formatCurrency(
                  Object.values(customerSummaries).reduce((sum, s) => sum + (s.totalSpent || 0), 0)
                )}
              </p>
            </div>
            <div>
              <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total Points</p>
              <p className={`text-lg font-bold ${currentTheme.accentText}`}>
                {formatNumber(state.customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0))}
              </p>
            </div>
            <div>
              <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total Transactions</p>
              <p className={`text-lg font-bold ${currentTheme.accentText}`}>
                {formatNumber(Object.values(customerSummaries).reduce((sum, s) => sum + (s.totalTransactions || 0), 0))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Customer Grid */}
      {loadingSummaries || refreshing ? (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <Icons.refresh className={`animate-spin text-3xl ${currentTheme.colors.textMuted} mb-2`} />
            <p className={`text-sm ${currentTheme.colors.textMuted}`}>
              {refreshing ? 'Refreshing customer data...' : 'Loading customer summaries...'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedCustomers.map(customer => {
            const summary = customerSummaries[customer.id] || {
              totalSpent: 0,
              totalTransactions: 0,
              averageTicket: 0,
              creditCount: 0,
              installmentCount: 0,
              overdueCount: 0,
              lastTransaction: customer.lastVisit
            };
            
            return (
              <div
                key={customer.id}
                onClick={() => handleViewCustomer(customer)}
                className={`p-4 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] relative group`}
              >
                {/* Badges */}
                <div className="absolute top-2 right-2 flex gap-1">
                  {summary.creditCount > 0 && (
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] rounded-full font-medium">
                      {summary.creditCount} Credit
                    </span>
                  )}
                  {summary.installmentCount > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] rounded-full font-medium">
                      {summary.installmentCount} Install
                    </span>
                  )}
                  {summary.overdueCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] rounded-full font-medium">
                      {summary.overdueCount} Overdue
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-start mb-3 pr-16">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold ${currentTheme.colors.text} truncate`}>
                      {customer.name}
                    </h3>
                    <p className={`text-xs ${currentTheme.colors.textMuted} truncate`}>
                      {customer.email || 'No email'}
                    </p>
                    <p className={`text-xs ${currentTheme.colors.textMuted} truncate`}>
                      {customer.phone || 'No phone'}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); setView('edit'); }}
                    className={`p-1 rounded ${currentTheme.colors.hover} opacity-0 group-hover:opacity-100 transition-opacity`}
                  >
                    <Icons.edit className={`text-sm ${currentTheme.colors.textSecondary}`} />
                  </button>
                </div>
                
                {/* Stats Grid */}
                <div className={`border-t ${currentTheme.colors.border} pt-3 grid grid-cols-2 gap-2 text-center`}>
                  <div>
                    <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Points</p>
                    <p className={`text-sm font-bold ${currentTheme.accentText}`}>
                      {formatNumber(customer.loyaltyPoints || 0)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Lifetime</p>
                    <p className={`text-sm font-bold ${currentTheme.colors.text}`}>
                      {customerTransactionService.formatCurrency(summary.totalSpent)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Transactions</p>
                    <p className={`text-sm font-bold ${currentTheme.colors.text}`}>
                      {summary.totalTransactions}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Average</p>
                    <p className={`text-sm font-bold ${currentTheme.colors.text}`}>
                      {customerTransactionService.formatCurrency(summary.averageTicket)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Last Visit</p>
                    <p className={`text-xs ${currentTheme.colors.text} font-medium`}>
                      {summary.lastTransaction 
                        ? new Date(summary.lastTransaction).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
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
      {processedCustomers.length === 0 && !loadingSummaries && !refreshing && (
        <div className="text-center py-12">
          <Icons.users className="text-5xl mx-auto mb-3 text-gray-400" />
          <p className={`text-sm ${currentTheme.colors.textMuted} mb-2`}>
            {searchTerm ? 'No customers match your search' : 'No customers found'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setView('add')}
              className={`mt-2 px-4 py-2 text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white shadow-md hover:shadow-lg transition-all`}
            >
              Add Your First Customer
            </button>
          )}
        </div>
      )}

      {/* Customer Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          onClose={() => setShowDetailsModal(false)}
          onEdit={() => {
            setShowDetailsModal(false);
            setView('edit');
          }}
        />
      )}
    </div>
  );
}