// src/features/pos/checkout/CustomerModal.jsx

import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useCustomers } from '../context/CustomerContext';
import { Icons } from '../../../components/ui/Icons';
import { customerService } from '../services/customerService';

export default function CustomerModal({ isOpen, onClose, onSelect }) {
  const [view, setView] = useState('list');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateError, setDuplicateError] = useState('');

  const { theme, getTheme } = useTheme();
  const { state, dispatch } = useCustomers();
  const currentTheme = getTheme(theme);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', email: '', phone: '', address: '' });
      setDuplicateError('');
      setView('list');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Ensure unique customers by ID
  const uniqueCustomers = Array.from(
    new Map(state.customers.map(c => [String(c.id), c])).values()
  );

  const filteredCustomers = uniqueCustomers.filter(c =>
    c.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(state.searchTerm.toLowerCase())) ||
    (c.phone && c.phone.includes(state.searchTerm))
  );

  const handleSelectCustomer = (customer) => {
    // Ensure customer has string ID
    const customerToSelect = {
      ...customer,
      id: String(customer.id)
    };
    onSelect(customerToSelect);
    onClose();
  };

  const checkExistingCustomer = async () => {
    // Check by email
    if (formData.email) {
      const existingByEmail = uniqueCustomers.find(c => 
        c.email && c.email.toLowerCase() === formData.email.toLowerCase()
      );
      if (existingByEmail) {
        setDuplicateError(`Customer with email "${formData.email}" already exists. Please select them instead.`);
        return existingByEmail;
      }
    }

    // Check by phone
    if (formData.phone) {
      const existingByPhone = uniqueCustomers.find(c => 
        c.phone && c.phone === formData.phone
      );
      if (existingByPhone) {
        setDuplicateError(`Customer with phone "${formData.phone}" already exists. Please select them instead.`);
        return existingByPhone;
      }
    }

    return null;
  };

  const handleAddCustomer = async () => {
    if (!formData.name.trim()) {
      setDuplicateError('Customer name is required');
      return;
    }

    setIsSubmitting(true);
    setDuplicateError('');

    try {
      // Check for existing customer
      const existingCustomer = await checkExistingCustomer();
      
      if (existingCustomer) {
        // Offer to select existing customer
        const confirmSelect = window.confirm(
          `${duplicateError}\n\nWould you like to select this customer instead?`
        );
        if (confirmSelect) {
          handleSelectCustomer(existingCustomer);
        }
        setIsSubmitting(false);
        return;
      }

      // Create new customer with string ID
      const newCustomer = {
        ...formData,
        id: String(Date.now()),
        loyaltyPoints: 0,
        totalSpent: 0,
        joinDate: new Date().toISOString().split('T')[0],
        lastVisit: new Date().toISOString().split('T')[0],
        transactionCount: 0,
        creditCount: 0,
        installmentCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        synced: false
      };

      // Save to database first
      const result = await customerService.saveCustomerLocally(newCustomer);
      
      if (result.success) {
        // Update context with the saved customer (which has the correct ID)
        const savedCustomer = result.customer;
        dispatch({ type: 'ADD_CUSTOMER', payload: savedCustomer });
        onSelect(savedCustomer);
        onClose();
      } else {
        setDuplicateError('Failed to save customer: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      setDuplicateError('An error occurred while adding the customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-2xl ${currentTheme.colors.card} rounded-xl shadow-2xl max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center flex-shrink-0`}>
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
        <div className="flex-1 overflow-y-auto p-4">
          {view === 'list' && (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Icons.search className={`absolute left-3 top-2.5 ${currentTheme.colors.textMuted}`} />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={state.searchTerm}
                  onChange={(e) => dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value })}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>

              {/* Customer List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(customer => (
                    <button
                      key={`customer-${customer.id}`}
                      onClick={() => handleSelectCustomer(customer)}
                      className={`w-full p-3 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} text-left flex justify-between items-center transition-all hover:shadow-md`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${currentTheme.colors.text} truncate`}>
                          {customer.name}
                        </p>
                        <p className={`text-xs ${currentTheme.colors.textMuted} truncate`}>
                          {customer.email || 'No email'} • {customer.phone || 'No phone'}
                        </p>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <p className={`text-sm font-bold ${currentTheme.accentText}`}>
                          {customer.loyaltyPoints || 0} pts
                        </p>
                        <p className={`text-xs ${currentTheme.colors.textMuted}`}>
                          ${(customer.totalSpent || 0).toLocaleString()}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Icons.users className={`text-3xl mx-auto mb-2 ${currentTheme.colors.textMuted}`} />
                    <p className={`text-sm ${currentTheme.colors.textMuted}`}>
                      {state.searchTerm ? 'No customers found' : 'No customers yet'}
                    </p>
                  </div>
                )}
              </div>

              {/* Add New Button */}
              <button
                onClick={() => setView('add')}
                className={`w-full mt-4 p-3 border border-dashed ${currentTheme.colors.border} rounded-lg text-center ${currentTheme.colors.hover} transition-all`}
              >
                <Icons.add className="inline mr-2" /> Add New Customer
              </button>
            </>
          )}

          {view === 'add' && (
            <div className="space-y-4">
              {duplicateError && (
                <div className={`p-3 rounded-lg text-sm ${theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'} border border-red-200 dark:border-red-800`}>
                  <div className="flex items-start gap-2">
                    <Icons.alert className="text-sm flex-shrink-0 mt-0.5" />
                    <span>{duplicateError}</span>
                  </div>
                  {duplicateError.includes('already exists') && (
                    <button
                      onClick={() => setView('list')}
                      className="mt-2 text-xs underline hover:no-underline"
                    >
                      Go to customer list
                    </button>
                  )}
                </div>
              )}
              
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Enter customer name"
                />
              </div>
              
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="customer@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">Email must be unique</p>
              </div>
              
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="+1 234 567 8900"
                />
                <p className="text-xs text-gray-500 mt-1">Phone number must be unique</p>
              </div>
              
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows="2"
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Customer address"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${currentTheme.colors.border} flex gap-3 flex-shrink-0`}>
          {view !== 'list' && (
            <button
              onClick={() => {
                setView('list');
                setDuplicateError('');
              }}
              className={`px-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text} transition-colors`}
            >
              Back
            </button>
          )}
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text} transition-colors`}
          >
            Cancel
          </button>
          {view === 'add' && (
            <button
              onClick={handleAddCustomer}
              disabled={!formData.name || isSubmitting}
              className={`flex-1 px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Icons.refresh className="animate-spin text-sm" />
                  Adding...
                </span>
              ) : (
                'Add Customer'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}