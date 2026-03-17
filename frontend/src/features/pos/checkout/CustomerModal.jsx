// src/features/pos/checkout/CustomerModal.jsx
import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useCustomers } from '../context/CustomerContext';
import { Icons } from '../../../components/ui/Icons';

export default function CustomerModal({ isOpen, onClose, onSelect }) {
  const [view, setView] = useState('list'); // 'list', 'add', 'details'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const { theme, getTheme } = useTheme();
  const { state, dispatch } = useCustomers();
  const currentTheme = getTheme(theme);

  if (!isOpen) return null;

  const filteredCustomers = state.customers.filter(c =>
    c.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
    c.phone.includes(state.searchTerm)
  );

  const handleSelectCustomer = (customer) => {
    onSelect(customer);
    onClose();
  };

  const handleAddCustomer = () => {
    const newCustomer = {
      ...formData,
      id: Date.now(),
      loyaltyPoints: 0,
      totalSpent: 0,
      joinDate: new Date().toISOString().split('T')[0],
      lastVisit: new Date().toISOString().split('T')[0]
    };
    dispatch({ type: 'ADD_CUSTOMER', payload: newCustomer });
    onSelect(newCustomer);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`w-full max-w-2xl ${currentTheme.colors.card} rounded-xl shadow-2xl`}>
        {/* Header */}
        <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center`}>
          <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>
            {view === 'list' && 'Select Customer'}
            {view === 'add' && 'Add New Customer'}
            {view === 'details' && 'Customer Details'}
          </h2>
          <button onClick={onClose} className={`p-1 rounded-lg ${currentTheme.colors.hover}`}>
            <Icons.x className="text-xl" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {view === 'list' && (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Icons.search className={`absolute left-3 top-2.5 ${currentTheme.colors.textMuted}`} />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={state.searchTerm}
                  onChange={(e) => dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value })}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>

              {/* Customer List */}
              <div className="space-y-2">
                {filteredCustomers.map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className={`w-full p-3 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} text-left flex justify-between items-center`}
                  >
                    <div>
                      <p className={`font-medium ${currentTheme.colors.text}`}>{customer.name}</p>
                      <p className={`text-xs ${currentTheme.colors.textMuted}`}>{customer.email} • {customer.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${currentTheme.accentText}`}>{customer.loyaltyPoints} pts</p>
                      <p className={`text-xs ${currentTheme.colors.textMuted}`}>${customer.totalSpent}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Add New Button */}
              <button
                onClick={() => setView('add')}
                className={`w-full mt-4 p-3 border border-dashed ${currentTheme.colors.border} rounded-lg text-center ${currentTheme.colors.hover}`}
              >
                <Icons.add className="inline mr-2" /> Add New Customer
              </button>
            </>
          )}

          {view === 'add' && (
            <div className="space-y-4">
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows="2"
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${currentTheme.colors.border} flex gap-3`}>
          {view !== 'list' && (
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text}`}
            >
              Back
            </button>
          )}
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text}`}
          >
            Cancel
          </button>
          {view === 'add' && (
            <button
              onClick={handleAddCustomer}
              disabled={!formData.name}
              className={`flex-1 px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white font-semibold disabled:opacity-50`}
            >
              Add Customer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}