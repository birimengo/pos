// src/features/pos/customers/CustomerList.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useCustomers } from '../context/CustomerContext';
import { useInventory } from '../context/InventoryContext';
import { Icons } from '../../../components/ui/Icons';
import CustomerDetailsModal from './CustomerDetailsModal';

export default function CustomerList() {
  const [view, setView] = useState('list');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'spent', 'points', 'frequency', 'lastVisit'
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterType, setFilterType] = useState('all'); // 'all', 'hasCredit', 'hasInstallment', 'recent'
  const [searchTerm, setSearchTerm] = useState('');
  
  const { theme, getTheme } = useTheme();
  const { state, dispatch } = useCustomers();
  const { state: inventoryState } = useInventory();
  const currentTheme = getTheme(theme);

  // Get customer transactions from inventory state or local storage
  const getCustomerTransactions = (customerId) => {
    // This would ideally come from a transaction context or database
    // For now, we'll simulate with localStorage
    const transactions = JSON.parse(localStorage.getItem('pos-transactions') || '[]');
    return transactions.filter(t => t.customer?.id === customerId || t.customerId === customerId);
  };

  // Calculate customer stats
  const getCustomerStats = (customer) => {
    const transactions = getCustomerTransactions(customer.id);
    const totalTransactions = transactions.length;
    const totalSpent = transactions.reduce((sum, t) => sum + (t.total || 0), 0);
    const averageTicket = totalTransactions > 0 ? totalSpent / totalTransactions : 0;
    const lastTransaction = transactions.sort((a, b) => 
      new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt)
    )[0];
    
    // Check for credit/installment transactions
    const creditTransactions = transactions.filter(t => t.isCredit || t.notes?.includes('Credit sale'));
    const installmentTransactions = transactions.filter(t => t.isInstallment || t.notes?.includes('Installment'));
    const hasActiveCredit = creditTransactions.some(t => !t.fullyPaid);
    const hasActiveInstallment = installmentTransactions.some(t => !t.fullyPaid);
    
    return {
      totalTransactions,
      totalSpent,
      averageTicket,
      lastTransaction,
      creditCount: creditTransactions.length,
      installmentCount: installmentTransactions.length,
      hasActiveCredit,
      hasActiveInstallment
    };
  };

  // Sort and filter customers
  const processedCustomers = state.customers
    .filter(c => {
      // Search filter
      const matchesSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm);
      
      if (!matchesSearch) return false;
      
      // Transaction type filter
      if (filterType !== 'all') {
        const stats = getCustomerStats(c);
        if (filterType === 'hasCredit' && !stats.hasActiveCredit) return false;
        if (filterType === 'hasInstallment' && !stats.hasActiveInstallment) return false;
        if (filterType === 'recent' && (!stats.lastTransaction || 
            new Date(stats.lastTransaction.timestamp) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))) {
          return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      const statsA = getCustomerStats(a);
      const statsB = getCustomerStats(b);
      
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'spent':
          comparison = (statsA.totalSpent || 0) - (statsB.totalSpent || 0);
          break;
        case 'points':
          comparison = (a.loyaltyPoints || 0) - (b.loyaltyPoints || 0);
          break;
        case 'frequency':
          comparison = (statsA.totalTransactions || 0) - (statsB.totalTransactions || 0);
          break;
        case 'lastVisit':
          const dateA = statsA.lastTransaction?.timestamp || a.lastVisit || '1970-01-01';
          const dateB = statsB.lastTransaction?.timestamp || b.lastVisit || '1970-01-01';
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
      setSortOrder('desc'); // Default to descending for numeric fields
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className={`text-xl font-bold ${currentTheme.colors.text}`}>Customers</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView('add')}
            className={`px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white flex items-center gap-2`}
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
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
          />
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filterType === 'all'
                ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white`
                : `${currentTheme.colors.hover} ${currentTheme.colors.textSecondary}`
            }`}
          >
            All Customers
          </button>
          <button
            onClick={() => setFilterType('hasCredit')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filterType === 'hasCredit'
                ? 'bg-purple-500 text-white'
                : `${currentTheme.colors.hover} text-purple-600 dark:text-purple-400`
            }`}
          >
            Has Credit
          </button>
          <button
            onClick={() => setFilterType('hasInstallment')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filterType === 'hasInstallment'
                ? 'bg-blue-500 text-white'
                : `${currentTheme.colors.hover} text-blue-600 dark:text-blue-400`
            }`}
          >
            Has Installment
          </button>
          <button
            onClick={() => setFilterType('recent')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filterType === 'recent'
                ? 'bg-green-500 text-white'
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

      {/* Customer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {processedCustomers.map(customer => {
          const stats = getCustomerStats(customer);
          
          return (
            <div
              key={customer.id}
              onClick={() => handleViewCustomer(customer)}
              className={`p-4 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} cursor-pointer transition-all hover:shadow-lg relative`}
            >
              {/* Credit/Installment Badges */}
              <div className="absolute top-2 right-2 flex gap-1">
                {stats.hasActiveCredit && (
                  <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] rounded-full">
                    Credit
                  </span>
                )}
                {stats.hasActiveInstallment && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] rounded-full">
                    Installment
                  </span>
                )}
              </div>

              <div className="flex justify-between items-start mb-3">
                <div className="pr-16">
                  <h3 className={`font-medium ${currentTheme.colors.text}`}>{customer.name}</h3>
                  <p className={`text-xs ${currentTheme.colors.textMuted}`}>{customer.email}</p>
                  <p className={`text-xs ${currentTheme.colors.textMuted}`}>{customer.phone}</p>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); setView('edit'); }}
                    className={`p-1 rounded ${currentTheme.colors.hover}`}
                  >
                    <Icons.edit className={`text-sm ${currentTheme.colors.textSecondary}`} />
                  </button>
                </div>
              </div>
              
              {/* Stats Grid */}
              <div className={`border-t ${currentTheme.colors.border} pt-3 grid grid-cols-2 gap-2 text-center`}>
                <div>
                  <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Points</p>
                  <p className={`text-sm font-bold ${currentTheme.accentText}`}>{customer.loyaltyPoints}</p>
                </div>
                <div>
                  <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total Spent</p>
                  <p className={`text-sm font-bold ${currentTheme.colors.text}`}>
                    ${(stats.totalSpent || customer.totalSpent || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Transactions</p>
                  <p className={`text-sm font-bold ${currentTheme.colors.text}`}>{stats.totalTransactions}</p>
                </div>
                <div>
                  <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Average</p>
                  <p className={`text-sm font-bold ${currentTheme.colors.text}`}>
                    ${stats.averageTicket.toFixed(0)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Last Visit</p>
                  <p className={`text-xs ${currentTheme.colors.text}`}>
                    {stats.lastTransaction 
                      ? new Date(stats.lastTransaction.timestamp).toLocaleDateString()
                      : customer.lastVisit || 'Never'
                    }
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {processedCustomers.length === 0 && (
        <div className="text-center py-12">
          <Icons.users className="text-4xl mx-auto mb-3 text-gray-400" />
          <p className={`text-sm ${currentTheme.colors.textMuted}`}>No customers found</p>
          <button
            onClick={() => setView('add')}
            className={`mt-3 px-4 py-2 text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white`}
          >
            Add Your First Customer
          </button>
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