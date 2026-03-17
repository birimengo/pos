// src/features/pos/purchaseOrders/PurchaseOrders.jsx
import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useInventory } from '../context/InventoryContext';
import { Icons } from '../../../components/ui/Icons';

export default function PurchaseOrders() {
  const [view, setView] = useState('list');
  const [selectedPO, setSelectedPO] = useState(null);
  const [poItems, setPoItems] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState('');
  
  const { theme, getTheme } = useTheme();
  const { state: inventoryState } = useInventory();
  const currentTheme = getTheme(theme);

  const suppliers = [
    { id: 1, name: 'TechSupply Co.', contact: 'John Smith', email: 'john@techsupply.com', phone: '555-0101', leadTime: 3 },
    { id: 2, name: 'AudioGear Ltd.', contact: 'Sarah Johnson', email: 'sarah@audiogear.com', phone: '555-0102', leadTime: 5 },
    { id: 3, name: 'CableMart', contact: 'Mike Wilson', email: 'mike@cablemart.com', phone: '555-0103', leadTime: 2 },
    { id: 4, name: 'ErgoTech', contact: 'Lisa Brown', email: 'lisa@ergotech.com', phone: '555-0104', leadTime: 4 },
    { id: 5, name: 'KeyMaster', contact: 'Tom Davis', email: 'tom@keymaster.com', phone: '555-0105', leadTime: 3 },
  ];

  const [purchaseOrders, setPurchaseOrders] = useState([
    { 
      id: 'PO-2024-001', 
      supplier: 'TechSupply Co.', 
      date: '2024-03-15',
      expectedDate: '2024-03-18',
      status: 'pending',
      items: [
        { product: 'Wireless Headphones', quantity: 20, price: 45.00 },
        { product: 'Wireless Mouse', quantity: 30, price: 12.00 }
      ],
      total: 1260.00,
      createdBy: 'Admin'
    },
    { 
      id: 'PO-2024-002', 
      supplier: 'CableMart', 
      date: '2024-03-14',
      expectedDate: '2024-03-16',
      status: 'shipped',
      items: [
        { product: 'USB-C Cable 2m', quantity: 100, price: 4.50 }
      ],
      total: 450.00,
      createdBy: 'Admin'
    },
    { 
      id: 'PO-2024-003', 
      supplier: 'AudioGear Ltd.', 
      date: '2024-03-13',
      expectedDate: '2024-03-20',
      status: 'received',
      items: [
        { product: 'Bluetooth Speaker', quantity: 15, price: 75.00 },
        { product: 'Wireless Headphones', quantity: 10, price: 45.00 }
      ],
      total: 1575.00,
      createdBy: 'Manager'
    },
  ]);

  const lowStockItems = inventoryState.products.filter(p => p.stock <= 10);

  const handleAddToPO = (product) => {
    setPoItems(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 10 }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        quantity: 10,
        price: product.cost,
        supplier: product.supplier
      }];
    });
  };

  const handleUpdateQuantity = (productId, newQuantity) => {
    setPoItems(prev =>
      prev.map(item =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, newQuantity) }
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  const handleRemoveItem = (productId) => {
    setPoItems(prev => prev.filter(item => item.productId !== productId));
  };

  const calculateTotal = () => {
    return poItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleCreatePO = () => {
    if (!selectedSupplier || poItems.length === 0) {
      alert('Please select a supplier and add items to the PO');
      return;
    }

    const supplier = suppliers.find(s => s.name === selectedSupplier);
    const newPO = {
      id: `PO-${new Date().getFullYear()}-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
      supplier: selectedSupplier,
      date: poDate,
      expectedDate: expectedDate || new Date(new Date().setDate(new Date().getDate() + supplier.leadTime)).toISOString().split('T')[0],
      status: 'pending',
      items: poItems.map(item => ({
        product: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      total: calculateTotal(),
      createdBy: 'Current User'
    };

    setPurchaseOrders([newPO, ...purchaseOrders]);
    setView('list');
    setPoItems([]);
    setSelectedSupplier('');
    setExpectedDate('');
    
    alert(`Purchase Order ${newPO.id} created successfully!`);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'shipped': return 'bg-blue-100 text-blue-700';
      case 'received': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className={`text-xl font-bold ${currentTheme.colors.text}`}>Purchase Orders</h1>
        {view === 'list' && (
          <button
            onClick={() => setView('create')}
            className={`px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white flex items-center gap-2`}
          >
            <Icons.add className="text-sm" /> New Purchase Order
          </button>
        )}
      </div>

      {view === 'list' && (
        <>
          {/* Low Stock Alert */}
          {lowStockItems.length > 0 && (
            <div className={`p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800`}>
              <div className="flex items-center gap-2 mb-3">
                <Icons.alert className="text-yellow-600" />
                <h3 className={`font-semibold text-yellow-800 dark:text-yellow-400`}>
                  Low Stock Alert ({lowStockItems.length} items)
                </h3>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {lowStockItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setView('create');
                      handleAddToPO(item);
                    }}
                    className="flex-shrink-0 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-800 text-left hover:shadow-md transition-all"
                  >
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500">Stock: {item.stock} | Min: {item.reorderPoint || 10}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PO List */}
          <div className="grid gap-3">
            {purchaseOrders.map(po => (
              <div
                key={po.id}
                className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border} hover:shadow-md transition-all`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${currentTheme.colors.text}`}>{po.id}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(po.status)}`}>
                        {po.status}
                      </span>
                    </div>
                    <p className={`text-sm ${currentTheme.colors.textSecondary}`}>{po.supplier}</p>
                  </div>
                  <p className={`text-lg font-bold ${currentTheme.accentText}`}>${po.total.toFixed(2)}</p>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className={currentTheme.colors.textMuted}>Ordered: {po.date}</span>
                  <span className={currentTheme.colors.textMuted}>Expected: {po.expectedDate}</span>
                  <span className={currentTheme.colors.textMuted}>Items: {po.items.length}</span>
                </div>
                {po.status === 'pending' && (
                  <div className="mt-2 flex gap-2">
                    <button className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
                      Mark as Shipped
                    </button>
                    <button className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'create' && (
        <div className="grid grid-cols-2 gap-4">
          {/* Left - Product Selection */}
          <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
            <h2 className={`font-semibold mb-3 ${currentTheme.colors.text}`}>Select Products</h2>
            
            {/* Search */}
            <div className="relative mb-3">
              <Icons.search className={`absolute left-2 top-2 ${currentTheme.colors.textMuted} text-sm`} />
              <input
                type="text"
                placeholder="Search products..."
                className={`w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary}`}
              />
            </div>

            {/* Product List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {inventoryState.products.map(product => (
                <button
                  key={product.id}
                  onClick={() => handleAddToPO(product)}
                  className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                >
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{product.name}</span>
                    <span className="text-xs text-gray-500">${product.cost}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>SKU: {product.sku}</span>
                    <span>Stock: {product.stock}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right - PO Details */}
          <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
            <h2 className={`font-semibold mb-3 ${currentTheme.colors.text}`}>Purchase Order Details</h2>
            
            <div className="space-y-3 mb-4">
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Supplier *</label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary}`}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Order Date</label>
                  <input
                    type="date"
                    value={poDate}
                    onChange={(e) => setPoDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary}`}
                  />
                </div>
                <div>
                  <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Expected Date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary}`}
                  />
                </div>
              </div>
            </div>

            <h3 className={`text-sm font-medium mb-2 ${currentTheme.colors.text}`}>Items</h3>
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {poItems.length === 0 ? (
                <p className={`text-sm ${currentTheme.colors.textMuted} text-center py-4`}>
                  No items added. Select products from the left.
                </p>
              ) : (
                poItems.map(item => (
                  <div key={item.productId} className="flex items-center gap-2 p-2 border rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">${item.price}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleUpdateQuantity(item.productId, parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 text-sm border rounded"
                        min="1"
                      />
                      <button
                        onClick={() => handleRemoveItem(item.productId)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Icons.trash className="text-sm" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className={`border-t ${currentTheme.colors.border} pt-3`}>
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span className={currentTheme.accentText}>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setView('list')}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePO}
                disabled={!selectedSupplier || poItems.length === 0}
                className={`flex-1 px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white disabled:opacity-50`}
              >
                Create PO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}