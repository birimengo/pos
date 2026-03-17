// src/features/pos/stores/MultiStore.jsx
import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Icons } from '../../../components/ui/Icons';

export default function MultiStore() {
  const [selectedStore, setSelectedStore] = useState(1);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showAddStore, setShowAddStore] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromStore: '',
    toStore: '',
    product: '',
    quantity: 1
  });
  
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  // Mock stores
  const [stores, setStores] = useState([
    { 
      id: 1, 
      name: 'Downtown Store', 
      address: '123 Main St, Downtown',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      phone: '555-1000',
      manager: 'Mike Johnson',
      email: 'downtown@store.com',
      inventory: 1245,
      open: true,
      openTime: '08:00',
      closeTime: '21:00',
      taxRate: 8.875
    },
    { 
      id: 2, 
      name: 'Mall Location', 
      address: '456 Shopping Center, Westside Mall',
      city: 'New York',
      state: 'NY',
      zip: '10002',
      phone: '555-1001',
      manager: 'Emily Davis',
      email: 'mall@store.com',
      inventory: 890,
      open: true,
      openTime: '10:00',
      closeTime: '22:00',
      taxRate: 8.875
    },
    { 
      id: 3, 
      name: 'Northside Branch', 
      address: '789 North Ave, Northside',
      city: 'New York',
      state: 'NY',
      zip: '10003',
      phone: '555-1002',
      manager: 'Tom Wilson',
      email: 'northside@store.com',
      inventory: 567,
      open: false,
      openTime: '09:00',
      closeTime: '20:00',
      taxRate: 8.875
    },
  ]);

  // Mock inventory transfers
  const [transfers, setTransfers] = useState([
    { 
      id: 1, 
      fromStore: 'Downtown Store', 
      toStore: 'Mall Location', 
      product: 'Wireless Headphones',
      productId: 1,
      quantity: 10,
      status: 'completed',
      date: '2024-03-15',
      completedDate: '2024-03-16',
      initiatedBy: 'Mike Johnson'
    },
    { 
      id: 2, 
      fromStore: 'Mall Location', 
      toStore: 'Northside Branch', 
      product: 'USB-C Cable 2m',
      productId: 3,
      quantity: 25,
      status: 'pending',
      date: '2024-03-16',
      initiatedBy: 'Emily Davis'
    },
    { 
      id: 3, 
      fromStore: 'Downtown Store', 
      toStore: 'Mall Location', 
      product: 'Bluetooth Speaker',
      productId: 2,
      quantity: 5,
      status: 'in-transit',
      date: '2024-03-16',
      initiatedBy: 'Mike Johnson'
    },
  ]);

  // Mock products for transfer
  const products = [
    { id: 1, name: 'Wireless Headphones', sku: 'WH-001', stock: { 1: 45, 2: 23, 3: 12 } },
    { id: 2, name: 'Bluetooth Speaker', sku: 'BS-002', stock: { 1: 23, 2: 15, 3: 8 } },
    { id: 3, name: 'USB-C Cable 2m', sku: 'CB-003', stock: { 1: 120, 2: 89, 3: 45 } },
    { id: 4, name: 'Laptop Stand', sku: 'LS-004', stock: { 1: 18, 2: 12, 3: 6 } },
  ];

  const handleTransfer = () => {
    if (!transferForm.fromStore || !transferForm.toStore || !transferForm.product || !transferForm.quantity) {
      alert('Please fill in all fields');
      return;
    }

    if (transferForm.fromStore === transferForm.toStore) {
      alert('From and To stores must be different');
      return;
    }

    const fromStoreName = stores.find(s => s.id === parseInt(transferForm.fromStore))?.name;
    const toStoreName = stores.find(s => s.id === parseInt(transferForm.toStore))?.name;
    const product = products.find(p => p.id === parseInt(transferForm.product));

    // Check stock availability
    const availableStock = product?.stock[parseInt(transferForm.fromStore)] || 0;
    if (transferForm.quantity > availableStock) {
      alert(`Insufficient stock. Available: ${availableStock}`);
      return;
    }

    const newTransfer = {
      id: transfers.length + 1,
      fromStore: fromStoreName,
      toStore: toStoreName,
      product: product?.name,
      productId: product?.id,
      quantity: transferForm.quantity,
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      initiatedBy: 'Current User'
    };

    setTransfers([newTransfer, ...transfers]);
    setShowTransfer(false);
    setTransferForm({
      fromStore: '',
      toStore: '',
      product: '',
      quantity: 1
    });
    
    alert('Transfer initiated successfully!');
  };

  const handleAddStore = () => {
    // In a real app, this would open a form to add a new store
    alert('Add store functionality would open a form here');
    setShowAddStore(false);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'in-transit': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return Icons.checkCircle;
      case 'pending': return Icons.clock;
      case 'in-transit': return Icons.truck;
      case 'cancelled': return Icons.xCircle;
      default: return Icons.help;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className={`text-xl font-bold ${currentTheme.colors.text}`}>Multi-Store Management</h1>
        <button
          onClick={() => setShowAddStore(true)}
          className={`px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white flex items-center gap-2`}
        >
          <Icons.add className="text-sm" /> Add Store
        </button>
      </div>

      {/* Store Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total Stores</p>
          <p className={`text-2xl font-bold ${currentTheme.colors.text}`}>{stores.length}</p>
        </div>
        <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Open Now</p>
          <p className={`text-2xl font-bold ${currentTheme.accentText}`}>
            {stores.filter(s => s.open).length}
          </p>
        </div>
        <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total Inventory</p>
          <p className={`text-2xl font-bold ${currentTheme.colors.text}`}>
            {stores.reduce((sum, s) => sum + s.inventory, 0)}
          </p>
        </div>
        <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Active Transfers</p>
          <p className={`text-2xl font-bold ${currentTheme.colors.text}`}>
            {transfers.filter(t => t.status !== 'completed').length}
          </p>
        </div>
      </div>

      {/* Store Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {stores.map(store => (
          <button
            key={store.id}
            onClick={() => setSelectedStore(store.id)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
              selectedStore === store.id
                ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white`
                : `${currentTheme.colors.hover} ${currentTheme.colors.textSecondary}`
            }`}
          >
            {store.open && <span className="w-2 h-2 bg-green-500 rounded-full" />}
            {store.name}
          </button>
        ))}
      </div>

      {/* Store Details */}
      {stores.filter(s => s.id === selectedStore).map(store => (
        <div key={store.id} className={`${currentTheme.colors.card} rounded-lg p-6 border ${currentTheme.colors.border}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>{store.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  store.open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {store.open ? 'Open' : 'Closed'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`text-sm ${currentTheme.colors.textSecondary}`}>Address</p>
                  <p className={`text-sm ${currentTheme.colors.text}`}>{store.address}</p>
                  <p className={`text-sm ${currentTheme.colors.text}`}>{store.city}, {store.state} {store.zip}</p>
                </div>
                <div>
                  <p className={`text-sm ${currentTheme.colors.textSecondary}`}>Contact</p>
                  <p className={`text-sm ${currentTheme.colors.text}`}>Phone: {store.phone}</p>
                  <p className={`text-sm ${currentTheme.colors.text}`}>Email: {store.email}</p>
                  <p className={`text-sm ${currentTheme.colors.text}`}>Manager: {store.manager}</p>
                </div>
                <div>
                  <p className={`text-sm ${currentTheme.colors.textSecondary}`}>Hours</p>
                  <p className={`text-sm ${currentTheme.colors.text}`}>{store.openTime} - {store.closeTime}</p>
                </div>
                <div>
                  <p className={`text-sm ${currentTheme.colors.textSecondary}`}>Tax Rate</p>
                  <p className={`text-sm ${currentTheme.colors.text}`}>{store.taxRate}%</p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className={`text-3xl font-bold ${currentTheme.accentText}`}>{store.inventory}</div>
              <p className={`text-xs ${currentTheme.colors.textMuted}`}>Total Items</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowTransfer(true)}
              className={`px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white flex items-center gap-2`}
            >
              <Icons.truck className="text-sm" /> Transfer Inventory
            </button>
            <button className={`px-3 py-1.5 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex items-center gap-2`}>
              <Icons.edit className="text-sm" /> Edit Store
            </button>
            <button className={`px-3 py-1.5 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex items-center gap-2`}>
              <Icons.reports className="text-sm" /> View Reports
            </button>
          </div>
        </div>
      ))}

      {/* Recent Transfers */}
      <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
        <h2 className={`font-semibold mb-3 ${currentTheme.colors.text}`}>Recent Inventory Transfers</h2>
        <div className="space-y-3">
          {transfers.map(transfer => {
            const StatusIcon = getStatusIcon(transfer.status);
            return (
              <div key={transfer.id} className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-all">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium">{transfer.product}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusColor(transfer.status)}`}>
                      <StatusIcon className="text-xs" />
                      {transfer.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Icons.arrowRight className="text-xs" />
                      {transfer.fromStore} → {transfer.toStore}
                    </span>
                    <span>Qty: {transfer.quantity}</span>
                    <span>Date: {transfer.date}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Initiated by: {transfer.initiatedBy}</p>
                </div>
                {transfer.status === 'pending' && (
                  <div className="flex gap-1">
                    <button className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600">
                      Approve
                    </button>
                    <button className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl`}>
            <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center`}>
              <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Transfer Inventory</h2>
              <button onClick={() => setShowTransfer(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <Icons.x className="text-xl" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>From Store</label>
                <select
                  value={transferForm.fromStore}
                  onChange={(e) => setTransferForm({ ...transferForm, fromStore: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary}`}
                >
                  <option value="">Select Source Store</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>To Store</label>
                <select
                  value={transferForm.toStore}
                  onChange={(e) => setTransferForm({ ...transferForm, toStore: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary}`}
                >
                  <option value="">Select Destination Store</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Product</label>
                <select
                  value={transferForm.product}
                  onChange={(e) => setTransferForm({ ...transferForm, product: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary}`}
                >
                  <option value="">Select Product</option>
                  {products.map(p => {
                    const fromStoreStock = p.stock[parseInt(transferForm.fromStore)] || 0;
                    return (
                      <option key={p.id} value={p.id} disabled={fromStoreStock === 0}>
                        {p.name} (Available: {fromStoreStock})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Quantity</label>
                <input
                  type="number"
                  value={transferForm.quantity}
                  onChange={(e) => setTransferForm({ ...transferForm, quantity: parseInt(e.target.value) || 0 })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary}`}
                  min="1"
                />
              </div>

              {transferForm.fromStore && transferForm.product && (
                <div className={`p-3 ${currentTheme.colors.accentLight} rounded-lg`}>
                  <p className={`text-sm ${currentTheme.colors.textSecondary}`}>Available Stock:</p>
                  <p className={`text-lg font-bold ${currentTheme.accentText}`}>
                    {products.find(p => p.id === parseInt(transferForm.product))?.stock[parseInt(transferForm.fromStore)] || 0}
                  </p>
                </div>
              )}
            </div>

            <div className={`p-4 border-t ${currentTheme.colors.border} flex gap-3`}>
              <button
                onClick={() => setShowTransfer(false)}
                className="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={!transferForm.fromStore || !transferForm.toStore || !transferForm.product || !transferForm.quantity}
                className={`flex-1 px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white disabled:opacity-50`}
              >
                Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Store Modal (Placeholder) */}
      {showAddStore && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl p-6`}>
            <h3 className={`text-lg font-semibold mb-4 ${currentTheme.colors.text}`}>Add New Store</h3>
            <p className={`mb-4 ${currentTheme.colors.textSecondary}`}>
              This feature will open a form to add a new store location.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddStore(false)}
                className="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStore}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}