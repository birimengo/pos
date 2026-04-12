// src/features/pos/returns/Returns.jsx

import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useInventory } from '../context/InventoryContext';
import { useCart } from '../context/CartContext';
import { Icons } from '../../../components/ui/Icons';
import { transactionService } from '../services/transactionService';
import { productService } from '../services/productService';
import { db } from '../services/database';

export default function Returns() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('receipt'); // 'receipt' or 'customer'
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [refundMethod, setRefundMethod] = useState('original');
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnCondition, setReturnCondition] = useState('good');
  const [processing, setProcessing] = useState(false);
  
  const { theme, getTheme } = useTheme();
  const { state: inventoryState, dispatch: inventoryDispatch } = useInventory();
  const { dispatch: cartDispatch } = useCart();
  const currentTheme = getTheme(theme);

  // Load recent transactions on mount
  useEffect(() => {
    loadRecentTransactions();
  }, []);

  const loadRecentTransactions = async () => {
    setLoading(true);
    try {
      await db.ensureInitialized();
      const transactions = await transactionService.getAllTransactionsLocally();
      // Get last 10 transactions
      const recent = transactions.slice(0, 10);
      setSearchResults(recent);
    } catch (error) {
      console.error('Failed to load recent transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      await loadRecentTransactions();
      setShowResults(true);
      return;
    }

    setLoading(true);
    try {
      await db.ensureInitialized();
      let results = [];
      
      if (searchType === 'receipt') {
        // Search by receipt number
        const allTransactions = await transactionService.getAllTransactionsLocally();
        results = allTransactions.filter(t => 
          t.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      } else {
        // Search by customer name or email
        const allTransactions = await transactionService.getAllTransactionsLocally();
        results = allTransactions.filter(t => 
          t.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setSearchResults(results);
      setShowResults(true);
      
      if (results.length === 0) {
        alert('No transactions found');
      }
    } catch (error) {
      console.error('Search failed:', error);
      alert('Failed to search transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTransaction = (transaction) => {
    // Check if transaction has any returnable items
    const returnableItems = transaction.items.filter(item => {
      const alreadyReturned = transaction.returnedItems?.some(r => r.productId === item.productId);
      return !alreadyReturned;
    });

    if (returnableItems.length === 0) {
      alert('All items in this transaction have already been returned or damaged');
      return;
    }

    setSelectedTransaction(transaction);
    setReturnItems([]);
    setReturnReason('');
    setReturnCondition('good');
    setShowResults(false);
  };

  const handleReturnItem = (item) => {
    const alreadyReturned = selectedTransaction?.returnedItems?.some(r => r.productId === item.productId);
    if (alreadyReturned) {
      alert('This item has already been returned');
      return;
    }

    setReturnItems(prev => {
      const existing = prev.find(i => i.id === item.productId);
      if (existing) {
        return prev.map(i => 
          i.id === item.productId 
            ? { ...i, returnQuantity: Math.min(i.returnQuantity + 1, item.quantity) }
            : i
        );
      }
      return [...prev, { 
        ...item, 
        productId: item.productId,
        id: item.productId,
        returnQuantity: 1,
        maxQuantity: item.quantity,
        originalQuantity: item.quantity,
        price: item.price,
        name: item.name,
        sku: item.sku
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
    if (returnItems.length === 0) {
      alert('Please select items to return');
      return;
    }
    setShowConfirm(true);
  };

  const confirmReturn = async () => {
    setProcessing(true);
    
    try {
      await db.ensureInitialized();
      
      const refundTotal = calculateRefundTotal();
      const selectedItemsList = returnItems.map(item => ({
        productId: item.productId,
        productName: item.name,
        productSku: item.sku,
        quantity: item.returnQuantity,
        price: item.price,
        total: item.price * item.returnQuantity,
        condition: returnCondition,
        reason: returnReason
      }));

      // Process each returned item
      for (const item of selectedItemsList) {
        const product = await productService.getProductLocally(item.productId);
        
        if (product) {
          const oldStock = product.stock;
          
          if (returnCondition === 'good') {
            // Good condition - add back to inventory
            const newStock = product.stock + item.quantity;
            
            // Update product stock
            await productService.updateProductStock(item.productId, item.quantity);
            
            // Record stock history for return (good condition)
            await productService.recordLocalStockHistory({
              productId: product._id || product.id,
              productName: product.name,
              productSku: product.sku,
              previousStock: oldStock,
              newStock: newStock,
              quantityChange: item.quantity,
              adjustmentType: 'return',
              reason: `Customer return - Good condition - ${returnReason || 'No reason provided'}`,
              notes: `Returned from transaction: ${selectedTransaction.receiptNumber}`,
              transactionId: selectedTransaction.id,
              transactionReceipt: selectedTransaction.receiptNumber
            });
          } else {
            // Bad condition - do NOT add back to inventory
            await productService.recordLocalStockHistory({
              productId: product._id || product.id,
              productName: product.name,
              productSku: product.sku,
              previousStock: oldStock,
              newStock: oldStock,
              quantityChange: 0,
              adjustmentType: 'damage',
              reason: `Customer return - Bad condition - ${returnReason || 'No reason provided'}`,
              notes: `Returned (not restocked) from transaction: ${selectedTransaction.receiptNumber}`,
              transactionId: selectedTransaction.id,
              transactionReceipt: selectedTransaction.receiptNumber
            });
          }
        }
      }

      // Create return transaction record
      const returnTransaction = {
        id: `ret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'return',
        returnType: 'return',
        originalTransactionId: selectedTransaction.id,
        originalReceiptNumber: selectedTransaction.receiptNumber,
        items: selectedItemsList,
        totalRefund: refundTotal,
        condition: returnCondition,
        reason: returnReason,
        refundMethod: refundMethod,
        customer: selectedTransaction.customer,
        createdAt: new Date().toISOString(),
        status: 'completed',
        synced: false
      };

      // Save return record
      await db.saveReturn(returnTransaction);

      // Update original transaction to mark items as returned
      const updatedTransaction = {
        ...selectedTransaction,
        returnedItems: [
          ...(selectedTransaction.returnedItems || []),
          ...selectedItemsList.map(item => ({
            ...item,
            returnedAt: new Date().toISOString(),
            condition: returnCondition,
            type: 'return'
          }))
        ],
        updatedAt: new Date().toISOString(),
        syncRequired: true,
        synced: false
      };
      
      await transactionService.updateTransactionLocally(selectedTransaction.id, updatedTransaction);

      // Update inventory context
      for (const item of selectedItemsList) {
        if (returnCondition === 'good') {
          inventoryDispatch({
            type: 'UPDATE_STOCK',
            payload: { id: item.productId, change: item.quantity }
          });
        }
      }

      // Show success message
      const conditionMessage = returnCondition === 'good' 
        ? 'Items added back to inventory.' 
        : 'Items marked as damaged - not restocked.';
      
      alert(`✅ Return processed successfully!\n\nRefund amount: $${refundTotal.toFixed(2)}\n${conditionMessage}\nRefund method: ${refundMethod === 'original' ? 'Original payment method' : refundMethod}`);

      // Reset state
      setSelectedTransaction(null);
      setReturnItems([]);
      setSearchTerm('');
      setSearchResults([]);
      setShowResults(false);
      setShowConfirm(false);
      setReturnReason('');
      setReturnCondition('good');
      
      // Reload recent transactions
      await loadRecentTransactions();
      
    } catch (error) {
      console.error('Failed to process return:', error);
      alert('Failed to process return: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  return (
    <div className="space-y-4">
      <h1 className={`text-xl font-bold ${currentTheme.colors.text}`}>Returns & Refunds</h1>

      {/* Search Transaction */}
      <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setSearchType('receipt')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                searchType === 'receipt'
                  ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white`
                  : `${currentTheme.colors.hover} ${currentTheme.colors.textSecondary}`
              }`}
            >
              Receipt #
            </button>
            <button
              onClick={() => setSearchType('customer')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                searchType === 'customer'
                  ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white`
                  : `${currentTheme.colors.hover} ${currentTheme.colors.textSecondary}`
              }`}
            >
              Customer Name
            </button>
          </div>
          
          <div className="relative flex-1">
            <Icons.search className={`absolute left-2 top-2.5 ${currentTheme.colors.textMuted} text-sm`} />
            <input
              type="text"
              placeholder={searchType === 'receipt' ? "Enter receipt number..." : "Enter customer name..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className={`w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className={`px-4 py-1.5 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white text-sm flex items-center gap-2 disabled:opacity-50`}
          >
            {loading ? <Icons.refresh className="animate-spin text-sm" /> : <Icons.search className="text-sm" />}
            Search
          </button>
        </div>

        {/* Search Results */}
        {showResults && searchResults.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h3 className={`text-sm font-medium mb-2 ${currentTheme.colors.text}`}>Search Results</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map(transaction => (
                <div
                  key={transaction.id}
                  onClick={() => handleSelectTransaction(transaction)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    currentTheme.colors.border
                  } ${currentTheme.colors.hover}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`text-sm font-medium ${currentTheme.colors.text}`}>
                        {transaction.receiptNumber}
                      </p>
                      <p className={`text-xs ${currentTheme.colors.textMuted}`}>
                        {transaction.customer?.name || 'Guest'} • {formatDate(transaction.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${currentTheme.accentText}`}>
                        {formatCurrency(transaction.total)}
                      </p>
                      <p className={`text-xs ${currentTheme.colors.textMuted}`}>
                        {transaction.paymentMethod}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Items: {transaction.items.length} • 
                    Returned: {transaction.returnedItems?.length || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedTransaction ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Transaction Details */}
          <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
            <h2 className={`font-semibold mb-3 ${currentTheme.colors.text}`}>Transaction Details</h2>
            
            <div className="space-y-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className={currentTheme.colors.textSecondary}>Receipt #:</span>
                <span className={`font-mono ${currentTheme.colors.text}`}>{selectedTransaction.receiptNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={currentTheme.colors.textSecondary}>Date:</span>
                <span className={currentTheme.colors.text}>{formatDate(selectedTransaction.createdAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={currentTheme.colors.textSecondary}>Customer:</span>
                <span className={currentTheme.colors.text}>{selectedTransaction.customer?.name || 'Guest'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={currentTheme.colors.textSecondary}>Payment:</span>
                <span className={currentTheme.colors.text}>{selectedTransaction.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className={currentTheme.colors.textSecondary}>Total:</span>
                <span className={currentTheme.accentText}>{formatCurrency(selectedTransaction.total)}</span>
              </div>
            </div>

            <h3 className={`text-sm font-medium mb-2 ${currentTheme.colors.text}`}>Items</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {selectedTransaction.items.map(item => {
                const alreadyReturned = selectedTransaction.returnedItems?.some(r => r.productId === item.productId);
                const isInReturn = returnItems.some(i => i.id === item.productId);
                const returnableQty = item.quantity - (selectedTransaction.returnedItems?.find(r => r.productId === item.productId)?.quantity || 0);
                
                return (
                  <div key={item.productId} className={`p-3 rounded-lg border ${
                    alreadyReturned ? 'opacity-50 bg-gray-50 dark:bg-gray-800' : currentTheme.colors.border
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${currentTheme.colors.text}`}>{item.name}</p>
                        <p className={`text-xs ${currentTheme.colors.textMuted}`}>
                          SKU: {item.sku} | ${item.price} x {item.quantity}
                        </p>
                        {alreadyReturned && (
                          <p className="text-xs text-green-600 mt-1">✓ Already returned</p>
                        )}
                        {returnableQty < item.quantity && !alreadyReturned && (
                          <p className="text-xs text-orange-600 mt-1">
                            {returnableQty} of {item.quantity} remaining to return
                          </p>
                        )}
                      </div>
                      {!alreadyReturned && returnableQty > 0 && !isInReturn && (
                        <button
                          onClick={() => handleReturnItem({...item, quantity: returnableQty})}
                          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                          Return
                        </button>
                      )}
                      {isInReturn && !alreadyReturned && (
                        <span className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded">
                          Added
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Return Items */}
          <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
            <h2 className={`font-semibold mb-3 ${currentTheme.colors.text}`}>Return Items</h2>
            
            {returnItems.length === 0 ? (
              <div className="text-center py-12">
                <Icons.refresh className="text-5xl mx-auto mb-3 text-gray-400" />
                <p className={`text-sm ${currentTheme.colors.textMuted}`}>
                  Select items from the transaction to return
                </p>
              </div>
            ) : (
              <>
                {/* Return Condition Selection */}
                <div className={`mb-4 p-3 rounded-lg ${currentTheme.colors.accentLight}`}>
                  <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-2`}>
                    Return Condition
                  </label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="good"
                        checked={returnCondition === 'good'}
                        onChange={(e) => setReturnCondition(e.target.value)}
                        className="rounded-full cursor-pointer"
                      />
                      <span className={`text-sm ${currentTheme.colors.text}`}>
                        ✅ Good Condition (Restock)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="bad"
                        checked={returnCondition === 'bad'}
                        onChange={(e) => setReturnCondition(e.target.value)}
                        className="rounded-full cursor-pointer"
                      />
                      <span className={`text-sm ${currentTheme.colors.text}`}>
                        ⚠️ Bad Condition (Damage/Loss)
                      </span>
                    </label>
                  </div>
                  {returnCondition === 'bad' && (
                    <p className="text-xs text-yellow-600 mt-2">
                      Note: Items in bad condition will NOT be added back to inventory
                    </p>
                  )}
                </div>

                {/* Return Items List */}
                <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
                  {returnItems.map(item => (
                    <div key={item.id} className={`p-3 rounded-lg border ${currentTheme.colors.border}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${currentTheme.colors.text}`}>{item.name}</p>
                          <p className={`text-xs ${currentTheme.colors.textMuted}`}>
                            SKU: {item.sku} | ${item.price} each
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveReturnItem(item.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Icons.trash className="text-sm" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${currentTheme.colors.textSecondary}`}>Quantity:</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.returnQuantity - 1)}
                              className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              disabled={item.returnQuantity <= 1}
                            >
                              -
                            </button>
                            <span className={`text-sm w-8 text-center ${currentTheme.colors.text}`}>
                              {item.returnQuantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.returnQuantity + 1)}
                              className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              disabled={item.returnQuantity >= item.maxQuantity}
                            >
                              +
                            </button>
                          </div>
                          <span className={`text-xs ${currentTheme.colors.textMuted}`}>
                            of {item.maxQuantity}
                          </span>
                        </div>
                        <p className={`text-sm font-bold ${currentTheme.accentText}`}>
                          {formatCurrency(item.price * item.returnQuantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Return Reason */}
                <div className="mb-4">
                  <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
                    Reason for Return <span className="text-xs text-gray-400">(Optional)</span>
                  </label>
                  <textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    rows="2"
                    className={`w-full px-3 py-2 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Why is the customer returning this item?"
                  />
                </div>

                {/* Refund Method */}
                <div className="mb-4">
                  <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
                    Refund Method
                  </label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className={`w-full px-3 py-2 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  >
                    <option value="original">Original Payment Method</option>
                    <option value="cash">Cash</option>
                    <option value="store">Store Credit</option>
                    <option value="gift">Gift Card</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>

                {/* Summary */}
                <div className={`border-t ${currentTheme.colors.border} pt-3 space-y-2`}>
                  <div className="flex justify-between text-sm">
                    <span className={currentTheme.colors.textSecondary}>Items Returned:</span>
                    <span className={currentTheme.colors.text}>{returnItems.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className={currentTheme.colors.textSecondary}>Total Units:</span>
                    <span className={currentTheme.colors.text}>
                      {returnItems.reduce((sum, i) => sum + i.returnQuantity, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2">
                    <span className={currentTheme.colors.text}>Refund Total:</span>
                    <span className="text-green-600">{formatCurrency(calculateRefundTotal())}</span>
                  </div>
                  {returnCondition === 'good' && (
                    <p className="text-xs text-green-600 text-center">
                      ✓ Items will be added back to inventory
                    </p>
                  )}
                  {returnCondition === 'bad' && (
                    <p className="text-xs text-red-600 text-center">
                      ⚠️ Items will NOT be added back to inventory
                    </p>
                  )}
                </div>

                <button
                  onClick={handleProcessReturn}
                  disabled={processing}
                  className={`w-full mt-4 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                >
                  {processing ? (
                    <>
                      <Icons.refresh className="animate-spin text-sm" />
                      Processing...
                    </>
                  ) : (
                    'Process Return & Refund'
                  )}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl p-6`}>
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-3">
                <Icons.alert className="text-2xl text-yellow-600" />
              </div>
              <h3 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Confirm Return</h3>
            </div>
            
            <div className={`p-3 rounded-lg ${currentTheme.colors.accentLight} mb-4`}>
              <div className="flex justify-between text-sm mb-1">
                <span>Items to return:</span>
                <span>{returnItems.length}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span>Total units:</span>
                <span>{returnItems.reduce((sum, i) => sum + i.returnQuantity, 0)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 mt-2 border-t">
                <span>Refund Amount:</span>
                <span className="text-green-600">{formatCurrency(calculateRefundTotal())}</span>
              </div>
            </div>
            
            <p className={`text-sm ${currentTheme.colors.textSecondary} mb-4`}>
              {returnCondition === 'good' 
                ? 'Items will be added back to inventory.' 
                : 'Items will NOT be added back to inventory (marked as damaged/loss).'}
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReturn}
                disabled={processing}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg transition-all disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}