// src/features/pos/suppliers/Suppliers.jsx
import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Icons } from '../../../components/ui/Icons';

export default function Suppliers() {
  const [showForm, setShowForm] = useState(false);
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  const suppliers = [
    { id: 1, name: 'TechSupply Co.', contact: 'John Smith', email: 'john@techsupply.com', phone: '555-0101', products: 45 },
    { id: 2, name: 'AudioGear Ltd.', contact: 'Sarah Johnson', email: 'sarah@audiogear.com', phone: '555-0102', products: 23 },
    { id: 3, name: 'CableMart', contact: 'Mike Wilson', email: 'mike@cablemart.com', phone: '555-0103', products: 67 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className={`text-xl font-bold ${currentTheme.colors.text}`}>Suppliers</h1>
        <button
          onClick={() => setShowForm(true)}
          className={`px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white flex items-center gap-2`}
        >
          <Icons.add className="text-sm" /> Add Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map(supplier => (
          <div key={supplier.id} className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className={`font-medium ${currentTheme.colors.text}`}>{supplier.name}</h3>
                <p className={`text-xs ${currentTheme.colors.textMuted}`}>{supplier.contact}</p>
              </div>
              <div className="flex gap-1">
                <button className={`p-1 rounded ${currentTheme.colors.hover}`}>
                  <Icons.edit className="text-sm" />
                </button>
                <button className={`p-1 rounded ${currentTheme.colors.hover}`}>
                  <Icons.trash className="text-sm text-red-500" />
                </button>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <p className={currentTheme.colors.textSecondary}>{supplier.email}</p>
              <p className={currentTheme.colors.textSecondary}>{supplier.phone}</p>
            </div>
            <div className={`mt-3 pt-3 border-t ${currentTheme.colors.border} flex justify-between`}>
              <span className={`text-xs ${currentTheme.colors.textSecondary}`}>Products</span>
              <span className={`text-sm font-medium ${currentTheme.accentText}`}>{supplier.products}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}