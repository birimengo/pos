// src/features/pos/customers/CustomerList.jsx
import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useCustomers } from '../context/CustomerContext';
import { Icons } from '../../../components/ui/Icons';

export default function CustomerList() {
  const [view, setView] = useState('list');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const { theme, getTheme } = useTheme();
  const { state, dispatch } = useCustomers();
  const currentTheme = getTheme(theme);

  const filteredCustomers = state.customers.filter(c =>
    c.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
    c.phone.includes(state.searchTerm)
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className={`text-xl font-bold ${currentTheme.colors.text}`}>Customers</h1>
        <button
          onClick={() => setView('add')}
          className={`px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white flex items-center gap-2`}
        >
          <Icons.add className="text-sm" /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Icons.search className={`absolute left-3 top-2.5 ${currentTheme.colors.textMuted}`} />
        <input
          type="text"
          placeholder="Search customers..."
          value={state.searchTerm}
          onChange={(e) => dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value })}
          className={`w-full pl-10 pr-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
        />
      </div>

      {/* Customer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(customer => (
          <div
            key={customer.id}
            className={`p-4 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className={`font-medium ${currentTheme.colors.text}`}>{customer.name}</h3>
                <p className={`text-xs ${currentTheme.colors.textMuted}`}>{customer.email}</p>
                <p className={`text-xs ${currentTheme.colors.textMuted}`}>{customer.phone}</p>
              </div>
              <div className="flex gap-1">
                <button className={`p-1 rounded ${currentTheme.colors.hover}`}>
                  <Icons.edit className={`text-sm ${currentTheme.colors.textSecondary}`} />
                </button>
                <button className={`p-1 rounded ${currentTheme.colors.hover}`}>
                  <Icons.trash className="text-sm text-red-500" />
                </button>
              </div>
            </div>
            
            <div className={`border-t ${currentTheme.colors.border} pt-3 grid grid-cols-2 gap-2 text-center`}>
              <div>
                <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Points</p>
                <p className={`text-sm font-bold ${currentTheme.accentText}`}>{customer.loyaltyPoints}</p>
              </div>
              <div>
                <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total Spent</p>
                <p className={`text-sm font-bold ${currentTheme.colors.text}`}>${customer.totalSpent}</p>
              </div>
              <div>
                <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Joined</p>
                <p className={`text-xs ${currentTheme.colors.text}`}>{customer.joinDate}</p>
              </div>
              <div>
                <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Last Visit</p>
                <p className={`text-xs ${currentTheme.colors.text}`}>{customer.lastVisit}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}