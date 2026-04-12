// src/features/pos/purchaseOrders/PurchaseOrders.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useInventory } from '../context/InventoryContext';
import { Icons } from '../../../components/ui/Icons';

export default function PurchaseOrders() {
  const [view, setView] = useState('list');
  const [selectedPO, setSelectedPO] = useState(null);
  const [poItems, setPoItems] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  
  const { theme, getTheme } = useTheme();
  const { formatPrice, currency, getCurrencySymbol } = useCurrency();
  const { state: inventoryState } = useInventory();
  const currentTheme = getTheme(theme);

  // Format currency using platform settings
  const formatCurrency = (amount) => {
    return formatPrice(amount, { showSymbol: true, showCode: false });
  };

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

  // Filter products by search term
  const filteredProducts = inventoryState.products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter purchase orders by status
  const filteredPOs = purchaseOrders.filter(po => {
    if (statusFilter === 'all') return true;
    return po.status === statusFilter;
  });

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
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'shipped': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'received': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Calculate totals for stats
  const totalPending = purchaseOrders.filter(po => po.status === 'pending').reduce((sum, po) => sum + po.total, 0);
  const totalShipped = purchaseOrders.filter(po => po.status === 'shipped').reduce((sum, po) => sum + po.total, 0);
  const totalReceived = purchaseOrders.filter(po => po.status === 'received').reduce((sum, po) => sum + po.total, 0);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3">
        <h1 className={`text-lg sm:text-xl font-bold ${currentTheme.colors.text}`}>Purchase Orders</h1>
        <div className="flex flex-wrap gap-2 w-full xs:w-auto">
          {/* Currency Indicator */}
          <div className={`hidden sm:flex px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} items-center gap-1 sm:gap-2`}>
            <Icons.creditCard className="text-xs sm:text-sm" />
            <span className="text-[10px] sm:text-xs">{currency.code} ({getCurrencySymbol()})</span>
          </div>
          
          {view === 'list' && (
            <button
              onClick={() => setView('create')}
              className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white flex items-center gap-1 sm:gap-2 shadow-md hover:shadow-lg transition-all flex-1 xs:flex-none justify-center`}
            >
              <Icons.add className="text-xs sm:text-sm" /> 
              <span className="hidden xs:inline">New PO</span>
              <span className="xs:hidden">New</span>
            </button>
          )}
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

      {view === 'list' && (
        <>
          {/* Stats Summary */}
          <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 sm:gap-3">
            <div className={`p-2 sm:p-3 rounded-lg ${currentTheme.colors.card} border ${currentTheme.colors.border}`}>
              <p className={`text-[10px] sm:text-xs ${currentTheme.colors.textSecondary}`}>Total POs</p>
              <p className={`text-base sm:text-lg font-bold ${currentTheme.accentText}`}>{purchaseOrders.length}</p>
            </div>
            <div className={`p-2 sm:p-3 rounded-lg ${currentTheme.colors.card} border ${currentTheme.colors.border}`}>
              <p className={`text-[10px] sm:text-xs ${currentTheme.colors.textSecondary}`}>Pending</p>
              <p className={`text-base sm:text-lg font-bold text-yellow-600`}>
                {purchaseOrders.filter(po => po.status === 'pending').length}
              </p>
            </div>
            <div className={`p-2 sm:p-3 rounded-lg ${currentTheme.colors.card} border ${currentTheme.colors.border}`}>
              <p className={`text-[10px] sm:text-xs ${currentTheme.colors.textSecondary}`}>Shipped</p>
              <p className={`text-base sm:text-lg font-bold text-blue-600`}>
                {purchaseOrders.filter(po => po.status === 'shipped').length}
              </p>
            </div>
            <div className={`p-2 sm:p-3 rounded-lg ${currentTheme.colors.card} border ${currentTheme.colors.border}`}>
              <p className={`text-[10px] sm:text-xs ${currentTheme.colors.textSecondary}`}>Received</p>
              <p className={`text-base sm:text-lg font-bold text-green-600`}>
                {purchaseOrders.filter(po => po.status === 'received').length}
              </p>
            </div>
          </div>

          {/* Low Stock Alert */}
          {lowStockItems.length > 0 && (
            <div className={`p-3 sm:p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800`}>
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <Icons.alert className="text-yellow-600 text-sm sm:text-base" />
                <h3 className={`font-semibold text-sm sm:text-base text-yellow-800 dark:text-yellow-400`}>
                  Low Stock Alert ({lowStockItems.length} items)
                </h3>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {lowStockItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setView('create');
                      handleAddToPO(item);
                    }}
                    className="flex-shrink-0 px-2 sm:px-3 py-1.5 sm:py-2 bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-800 text-left hover:shadow-md transition-all min-w-[150px] sm:min-w-[180px]"
                  >
                    <p className="text-xs sm:text-sm font-medium truncate">{item.name}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500">Stock: {item.stock} | Min: {item.reorderPoint || 10}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-full transition-colors ${
                statusFilter === 'all'
                  ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white`
                  : `${currentTheme.colors.hover} ${currentTheme.colors.textSecondary}`
              }`}
            >
              All ({purchaseOrders.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-full transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-yellow-50 dark:bg-yellow-900/10 text-yellow-600'
              }`}
            >
              Pending ({purchaseOrders.filter(po => po.status === 'pending').length})
            </button>
            <button
              onClick={() => setStatusFilter('shipped')}
              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-full transition-colors ${
                statusFilter === 'shipped'
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-50 dark:bg-blue-900/10 text-blue-600'
              }`}
            >
              Shipped ({purchaseOrders.filter(po => po.status === 'shipped').length})
            </button>
            <button
              onClick={() => setStatusFilter('received')}
              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-full transition-colors ${
                statusFilter === 'received'
                  ? 'bg-green-500 text-white'
                  : 'bg-green-50 dark:bg-green-900/10 text-green-600'
              }`}
            >
              Received ({purchaseOrders.filter(po => po.status === 'received').length})
            </button>
          </div>

          {/* PO List */}
          <div className="grid gap-3 sm:gap-4">
            {filteredPOs.map(po => (
              <div
                key={po.id}
                className={`${currentTheme.colors.card} rounded-lg p-3 sm:p-4 border ${currentTheme.colors.border} hover:shadow-md transition-all`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className={`font-semibold text-sm sm:text-base ${currentTheme.colors.text}`}>{po.id}</h3>
                      <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full ${getStatusColor(po.status)}`}>
                        {po.status}
                      </span>
                    </div>
                    <p className={`text-xs sm:text-sm ${currentTheme.colors.textSecondary}`}>{po.supplier}</p>
                  </div>
                  <p className={`text-base sm:text-lg font-bold ${currentTheme.accentText}`}>{formatCurrency(po.total)}</p>
                </div>
                <div className="flex flex-wrap gap-3 sm:gap-4 text-[10px] sm:text-xs">
                  <span className={currentTheme.colors.textMuted}>Ordered: {po.date}</span>
                  <span className={currentTheme.colors.textMuted}>Expected: {po.expectedDate}</span>
                  <span className={currentTheme.colors.textMuted}>Items: {po.items.length}</span>
                </div>
                {po.status === 'pending' && (
                  <div className="mt-2 sm:mt-3 flex gap-2">
                    <button className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                      Mark as Shipped
                    </button>
                    <button className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}

            {filteredPOs.length === 0 && (
              <div className="text-center py-8 sm:py-12">
                <Icons.package className="text-3xl sm:text-4xl mx-auto mb-2 text-gray-400" />
                <p className={`text-sm ${currentTheme.colors.textMuted}`}>No purchase orders found</p>
              </div>
            )}
          </div>
        </>
      )}

      {view === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left - Product Selection */}
          <div className={`${currentTheme.colors.card} rounded-lg p-3 sm:p-4 border ${currentTheme.colors.border}`}>
            <h2 className={`font-semibold mb-3 text-sm sm:text-base ${currentTheme.colors.text}`}>Select Products</h2>
            
            {/* Search */}
            <div className="relative mb-3">
              <Icons.search className={`absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 ${currentTheme.colors.textMuted} text-xs sm:text-sm`} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-7 sm:pl-9 pr-2 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
              />
            </div>

            {/* Product List */}
            <div className="space-y-2 max-h-80 sm:max-h-96 overflow-y-auto">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => handleAddToPO(product)}
                  className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-medium truncate flex-1">{product.name}</span>
                    <span className="text-[10px] sm:text-xs text-gray-500 ml-2">{formatCurrency(product.cost)}</span>
                  </div>
                  <div className="flex justify-between text-[9px] sm:text-xs text-gray-500 mt-0.5">
                    <span>SKU: {product.sku}</span>
                    <span>Stock: {product.stock}</span>
                  </div>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className={`text-xs sm:text-sm ${currentTheme.colors.textMuted} text-center py-4`}>
                  No products found
                </p>
              )}
            </div>
          </div>

          {/* Right - PO Details */}
          <div className={`${currentTheme.colors.card} rounded-lg p-3 sm:p-4 border ${currentTheme.colors.border}`}>
            <h2 className={`font-semibold mb-3 text-sm sm:text-base ${currentTheme.colors.text}`}>Purchase Order Details</h2>
            
            <div className="space-y-3 mb-4">
              <div>
                <label className={`text-xs sm:text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Supplier *</label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs sm:text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Order Date</label>
                  <input
                    type="date"
                    value={poDate}
                    onChange={(e) => setPoDate(e.target.value)}
                    className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  />
                </div>
                <div>
                  <label className={`text-xs sm:text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Expected Date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  />
                </div>
              </div>
            </div>

            <h3 className={`text-xs sm:text-sm font-medium mb-2 ${currentTheme.colors.text}`}>Items ({poItems.length})</h3>
            <div className="space-y-2 mb-4 max-h-48 sm:max-h-60 overflow-y-auto">
              {poItems.length === 0 ? (
                <p className={`text-xs sm:text-sm ${currentTheme.colors.textMuted} text-center py-4`}>
                  No items added. Select products from the left.
                </p>
              ) : (
                poItems.map(item => (
                  <div key={item.productId} className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">{item.name}</p>
                      <p className="text-[9px] sm:text-xs text-gray-500">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleUpdateQuantity(item.productId, parseInt(e.target.value) || 0)}
                        className="w-14 sm:w-16 px-1 sm:px-2 py-1 text-xs sm:text-sm border rounded"
                        min="1"
                      />
                      <button
                        onClick={() => handleRemoveItem(item.productId)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Icons.trash className="text-xs sm:text-sm" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className={`border-t ${currentTheme.colors.border} pt-3`}>
              <div className="flex justify-between font-bold text-sm sm:text-base">
                <span className={currentTheme.colors.text}>Total:</span>
                <span className={currentTheme.accentText}>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setView('list');
                  setPoItems([]);
                  setSelectedSupplier('');
                  setSearchTerm('');
                }}
                className={`flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text} transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePO}
                disabled={!selectedSupplier || poItems.length === 0}
                className={`flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
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