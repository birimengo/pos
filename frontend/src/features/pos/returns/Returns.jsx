// src/features/pos/returns/Returns.jsx
import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useInventory } from '../context/InventoryContext';
import { useCart } from '../context/CartContext';
import { Icons } from '../../../components/ui/Icons';

export default function Returns() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [refundMethod, setRefundMethod] = useState('original');
  const [showConfirm, setShowConfirm] = useState(false);
  
  const { theme, getTheme } = useTheme();
  const { state: inventoryState, dispatch: inventoryDispatch } = useInventory();
  const { dispatch: cartDispatch } = useCart();
  const currentTheme = getTheme(theme);

  // Mock transactions - in real app, this would come from your backend/IndexedDB
  const transactions = [
    { 
      id: 'INV-20240315-001', 
      date: '2024-03-15', 
      time: '14:30',
      customer: 'John Doe', 
      total: 145.97,
      paymentMethod: 'Credit Card',
      items: [
        { id: 1, name: 'Wireless Headphones', price: 79.99, quantity: 1, sku: 'WH-001' },
        { id: 5, name: 'Wireless Mouse', price: 29.99, quantity: 1, sku: 'WM-005' },
        { id: 3, name: 'USB-C Cable 2m', price: 12.99, quantity: 2, sku: 'CB-003' }
      ]
    },
    { 
      id: 'INV-20240314-002', 
      date: '2024-03-14', 
      time: '11:15',
      customer: 'Jane Smith', 
      total: 89.99,
      paymentMethod: 'Cash',
      items: [
        { id: 6, name: 'Mechanical Keyboard', price: 89.99, quantity: 1, sku: 'MK-006' }
      ]
    },
    { 
      id: 'INV-20240314-003', 
      date: '2024-03-14', 
      time: '09:45',
      customer: 'Bob Johnson', 
      total: 45.99,
      paymentMethod: 'Mobile Payment',
      items: [
        { id: 4, name: 'Laptop Stand', price: 45.99, quantity: 1, sku: 'LS-004' }
      ]
    },
  ];

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    
    const found = transactions.find(t => 
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (found) {
      setSelectedTransaction(found);
      setReturnItems([]);
    } else {
      alert('Transaction not found');
    }
  };

  const handleReturnItem = (item) => {
    setReturnItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => 
          i.id === item.id 
            ? { ...i, quantity: Math.min(i.quantity + 1, item.quantity) }
            : i
        );
      }
      return [...prev, { 
        ...item, 
        returnQuantity: 1,
        maxQuantity: item.quantity 
      }];
    });
  };

  const handleUpdateQuantity = (itemId, newQuantity) => {
    setReturnItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, returnQuantity: Math.max(1, Math.min(newQuantity, item.maxQuantity)) }
          : item
      ).filter(item => item.returnQuantity > 0)
    );
  };

  const handleRemoveReturnItem = (itemId) => {
    setReturnItems(prev => prev.filter(item => item.id !== itemId));
  };

  const calculateRefundTotal = () => {
    return returnItems.reduce((sum, item) => sum + (item.price * item.returnQuantity), 0);
  };

  const handleProcessReturn = () => {
    setShowConfirm(true);
  };

  const confirmReturn = () => {
    // Update inventory
    returnItems.forEach(item => {
      inventoryDispatch({
        type: 'UPDATE_STOCK',
        payload: { id: item.id, change: item.returnQuantity }
      });
    });

    const refundTotal = calculateRefundTotal();
    
    // Here you would also:
    // 1. Record the return in your database
    // 2. Process the refund through payment system
    // 3. Print return receipt
    // 4. Update customer loyalty points if applicable
    
    alert(`Return processed successfully!\nRefund amount: $${refundTotal.toFixed(2)}`);
    
    // Reset state
    setSelectedTransaction(null);
    setReturnItems([]);
    setSearchTerm('');
    setShowConfirm(false);
  };

  return (
    <div className="space-y-4">
      <h1 className={`text-xl font-bold ${currentTheme.colors.text}`}>Returns & Refunds</h1>

      {/* Search Transaction */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Icons.search className={`absolute left-2 top-2 ${currentTheme.colors.textMuted} text-sm`} />
          <input
            type="text"
            placeholder="Search by receipt # or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className={`w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
          />
        </div>
        <button
          onClick={handleSearch}
          className={`px-4 py-1.5 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white text-sm flex items-center gap-2`}
        >
          <Icons.search className="text-sm" /> Search
        </button>
      </div>

      {selectedTransaction ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Transaction Details */}
          <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
            <h2 className={`font-semibold mb-3 ${currentTheme.colors.text}`}>Transaction Details</h2>
            
            <div className="space-y-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className={currentTheme.colors.textSecondary}>Receipt #:</span>
                <span className={`font-mono ${currentTheme.colors.text}`}>{selectedTransaction.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={currentTheme.colors.textSecondary}>Date:</span>
                <span className={currentTheme.colors.text}>{selectedTransaction.date} {selectedTransaction.time}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={currentTheme.colors.textSecondary}>Customer:</span>
                <span className={currentTheme.colors.text}>{selectedTransaction.customer}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={currentTheme.colors.textSecondary}>Payment:</span>
                <span className={currentTheme.colors.text}>{selectedTransaction.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className={currentTheme.colors.textSecondary}>Total:</span>
                <span className={currentTheme.accentText}>${selectedTransaction.total.toFixed(2)}</span>
              </div>
            </div>

            <h3 className={`text-sm font-medium mb-2 ${currentTheme.colors.text}`}>Items</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedTransaction.items.map(item => {
                const isInReturn = returnItems.some(i => i.id === item.id);
                return (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${currentTheme.colors.text}`}>{item.name}</p>
                      <p className={`text-xs ${currentTheme.colors.textMuted}`}>SKU: {item.sku} | ${item.price} x {item.quantity}</p>
                    </div>
                    {!isInReturn ? (
                      <button
                        onClick={() => handleReturnItem(item)}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Return
                      </button>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                        Added
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Return Items */}
          <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
            <h2 className={`font-semibold mb-3 ${currentTheme.colors.text}`}>Return Items</h2>
            
            {returnItems.length === 0 ? (
              <div className="text-center py-8">
                <Icons.refresh className="text-4xl mx-auto mb-2 text-gray-400" />
                <p className={`text-sm ${currentTheme.colors.textMuted}`}>
                  Select items to return
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                  {returnItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${currentTheme.colors.text}`}>{item.name}</p>
                        <p className={`text-xs ${currentTheme.colors.textMuted}`}>${item.price} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.returnQuantity - 1)}
                          className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className={`text-sm w-8 text-center ${currentTheme.colors.text}`}>
                          {item.returnQuantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.returnQuantity + 1)}
                          className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
                        >
                          +
                        </button>
                        <button
                          onClick={() => handleRemoveReturnItem(item.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Icons.trash className="text-sm" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`border-t ${currentTheme.colors.border} pt-3 space-y-3`}>
                  <div className="flex justify-between text-sm">
                    <span className={currentTheme.colors.textSecondary}>Subtotal:</span>
                    <span className={currentTheme.colors.text}>${calculateRefundTotal().toFixed(2)}</span>
                  </div>
                  
                  <div>
                    <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Refund Method</label>
                    <select
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                    >
                      <option value="original">Original Payment Method</option>
                      <option value="cash">Cash</option>
                      <option value="store">Store Credit</option>
                      <option value="gift">Gift Card</option>
                    </select>
                  </div>

                  <div className="flex justify-between font-bold text-lg">
                    <span className={currentTheme.colors.text}>Refund Total:</span>
                    <span className={currentTheme.accentText}>${calculateRefundTotal().toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleProcessReturn}
                  className={`w-full mt-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold hover:shadow-lg transition-all`}
                >
                  Process Return
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className={`${currentTheme.colors.card} rounded-lg p-12 text-center border ${currentTheme.colors.border}`}>
          <Icons.refresh className="text-5xl mx-auto mb-3 text-gray-400" />
          <p className={`text-lg ${currentTheme.colors.textSecondary} mb-2`}>No transaction selected</p>
          <p className={`text-sm ${currentTheme.colors.textMuted}`}>
            Search for a transaction by receipt number or customer name to process a return
          </p>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl p-6`}>
            <h3 className={`text-lg font-semibold mb-4 ${currentTheme.colors.text}`}>Confirm Return</h3>
            <p className={`mb-4 ${currentTheme.colors.textSecondary}`}>
              Are you sure you want to process this return for ${calculateRefundTotal().toFixed(2)}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmReturn}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}