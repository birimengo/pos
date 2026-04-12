// src/features/pos/customers/CustomerForm.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useCustomers } from '../context/CustomerContext';
import { Icons } from '../../../components/ui/Icons';
import { customerService } from '../services/customerService';

export default function CustomerForm({ customer, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    birthDate: '',
    tags: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const { theme, getTheme } = useTheme();
  const { state, dispatch } = useCustomers();
  const currentTheme = getTheme(theme);

  // Initialize form with customer data if editing
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        notes: customer.notes || '',
        birthDate: customer.birthDate || '',
        tags: customer.tags || []
      });
    }
  }, [customer]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Customer name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let result;
      
      if (customer) {
        // Update existing customer
        const updatedCustomer = {
          ...customer,
          ...formData,
          updatedAt: new Date().toISOString(),
          syncRequired: true
        };
        
        result = await customerService.saveCustomerLocally(updatedCustomer);
        
        if (result.success) {
          dispatch({ type: 'UPDATE_CUSTOMER', payload: updatedCustomer });
          alert('Customer updated successfully!');
          onClose(true);
        } else {
          setError(result.error || 'Failed to update customer');
        }
      } else {
        // Create new customer
        const newCustomer = {
          ...formData,
          id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          loyaltyPoints: 0,
          totalSpent: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          joinDate: new Date().toISOString().split('T')[0],
          lastVisit: new Date().toISOString().split('T')[0],
          transactionCount: 0,
          creditCount: 0,
          installmentCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          synced: false,
          syncRequired: true
        };
        
        result = await customerService.saveCustomerLocally(newCustomer);
        
        if (result.success) {
          dispatch({ type: 'ADD_CUSTOMER', payload: result.customer });
          alert('Customer added successfully!');
          onClose(true);
        } else {
          setError(result.error || 'Failed to add customer');
        }
      }
    } catch (err) {
      console.error('Error saving customer:', err);
      setError('An error occurred while saving the customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center sticky top-0 ${currentTheme.colors.card}`}>
          <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>
            {customer ? 'Edit Customer' : 'Add New Customer'}
          </h2>
          <button 
            onClick={() => onClose(false)} 
            className={`p-1 rounded-lg ${currentTheme.colors.hover}`}
          >
            <Icons.x className="text-xl" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Error Message */}
          {error && (
            <div className={`p-3 rounded-lg text-sm ${theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'} border border-red-200 dark:border-red-800`}>
              <div className="flex items-start gap-2">
                <Icons.alert className="text-sm flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="John Doe"
              autoFocus
            />
          </div>

          {/* Email */}
          <div>
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="customer@example.com"
            />
            <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
              Email must be unique
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="+1 234 567 8900"
            />
            <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
              Phone number must be unique
            </p>
          </div>

          {/* Address */}
          <div>
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              rows="2"
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
              placeholder="123 Main Street, City, State"
            />
          </div>

          {/* Birth Date */}
          <div>
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
              Birth Date
            </label>
            <input
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleChange('birthDate', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          {/* Notes */}
          <div>
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows="3"
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
              placeholder="Additional notes about the customer..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
              Tags
            </label>
            <input
              type="text"
              value={formData.tags.join(', ')}
              onChange={(e) => handleChange('tags', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="VIP, Regular, Wholesale (comma separated)"
            />
            <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
              Separate tags with commas
            </p>
          </div>

          {/* Info Box */}
          <div className={`p-3 rounded-lg ${currentTheme.colors.accentLight} border ${currentTheme.colors.border}`}>
            <div className="flex items-start gap-2">
              <Icons.info className="text-sm text-blue-500 mt-0.5" />
              <div>
                <p className={`text-xs ${currentTheme.colors.textSecondary}`}>
                  {customer 
                    ? 'Editing this customer will update their information across all transactions.'
                    : 'New customers will automatically start earning loyalty points on purchases.'
                  }
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className={`p-4 border-t ${currentTheme.colors.border} flex gap-3`}>
          <button
            type="button"
            onClick={() => onClose(false)}
            className={`flex-1 px-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text} transition-colors`}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name.trim()}
            className={`flex-1 px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Icons.refresh className="animate-spin text-sm" />
                {customer ? 'Updating...' : 'Adding...'}
              </span>
            ) : (
              customer ? 'Update Customer' : 'Add Customer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}