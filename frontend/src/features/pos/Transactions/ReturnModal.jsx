// src/features/pos/transactions/ReturnModal.jsx

import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Icons } from '../../../components/ui/Icons';
import { transactionService } from '../services/transactionService';
import { productService } from '../services/productService';

export default function ReturnModal({ transaction, onClose, onComplete }) {
  const [selectedItems, setSelectedItems] = useState({});
  const [returnCondition, setReturnCondition] = useState('good');
  const [returnReason, setReturnReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [returnType, setReturnType] = useState('return'); // 'return' or 'damage'
  
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  // Initialize selected items with all items from transaction
  useEffect(() => {
    const initialSelected = {};
    transaction.items.forEach(item => {
      initialSelected[item.productId] = {
        selected: true,
        quantity: item.quantity,
        maxQuantity: item.quantity,
        product: item
      };
    });
    setSelectedItems(initialSelected);
  }, [transaction]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const updateItemSelection = (productId, selected) => {
    setSelectedItems(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        selected
      }
    }));
  };

  const updateItemQuantity = (productId, quantity) => {
    const maxQty = selectedItems[productId]?.maxQuantity ?? 1;
    const newQuantity = Math.min(Math.max(1, quantity), maxQty);
    
    setSelectedItems(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        quantity: newQuantity
      }
    }));
  };

  const calculateReturnTotal = () => {
    let total = 0;
    Object.values(selectedItems).forEach(item => {
      if (item.selected) {
        total += (item.product.price * item.quantity);
      }
    });
    return total;
  };

  const handleProcessReturn = async () => {
    setProcessing(true);
    
    try {
      const selectedItemsList = Object.entries(selectedItems)
        .filter(([_, data]) => data.selected)
        .map(([productId, data]) => ({
          productId,
          productName: data.product.name,
          productSku: data.product.sku,
          quantity: data.quantity,
          price: data.product.price,
          total: data.product.price * data.quantity,
          condition: returnCondition,
          reason: returnReason
        }));

      if (selectedItemsList.length === 0) {
        alert('Please select at least one item to return');
        setProcessing(false);
        return;
      }

      const returnData = {
        originalTransactionId: transaction.id,
        originalReceiptNumber: transaction.receiptNumber,
        items: selectedItemsList,
        returnType: returnType,
        condition: returnCondition,
        reason: returnReason,
        totalRefund: calculateReturnTotal(),
        timestamp: new Date().toISOString(),
        customer: transaction.customer
      };

      // Process each returned item
      for (const item of selectedItemsList) {
        const product = await productService.getProductLocally(item.productId);
        
        if (product) {
          const oldStock = product.stock;
          
          if (returnType === 'return' && returnCondition === 'good') {
            // Good condition - add back to inventory
            product.stock = (product.stock || 0) + item.quantity;
            
            // Record stock history for return (good condition)
            await productService.recordLocalStockHistory({
              productId: product._id || product.id,
              productName: product.name,
              productSku: product.sku,
              previousStock: oldStock,
              newStock: product.stock,
              quantityChange: item.quantity,
              adjustmentType: 'return',
              reason: `Customer return - Good condition - ${returnReason || 'No reason provided'}`,
              notes: `Returned from transaction: ${transaction.receiptNumber}`,
              transactionId: transaction.id,
              transactionReceipt: transaction.receiptNumber
            });
            
            // Update product stock
            await productService.updateProductLocally(product.id, { stock: product.stock });
            
          } else if (returnType === 'damage' || returnCondition === 'bad') {
            // Bad condition or damage - do NOT add back to inventory
            // Record as damage/loss
            await productService.recordLocalStockHistory({
              productId: product._id || product.id,
              productName: product.name,
              productSku: product.sku,
              previousStock: oldStock,
              newStock: oldStock, // No change to stock
              quantityChange: 0,
              adjustmentType: 'damage',
              reason: `Customer return - ${returnCondition === 'bad' ? 'Bad condition' : 'Damaged'} - ${returnReason || 'No reason provided'}`,
              notes: `Returned (not restocked) from transaction: ${transaction.receiptNumber}`,
              transactionId: transaction.id,
              transactionReceipt: transaction.receiptNumber
            });
            
            // Note: Stock is NOT updated for damaged items
          }
        }
      }

      // Create return transaction record with both type and returnType fields
      const returnTransaction = {
        id: `ret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: returnType,
        returnType: returnType, // Ensure both fields are set for compatibility
        originalTransactionId: transaction.id,
        originalReceiptNumber: transaction.receiptNumber,
        items: selectedItemsList,
        totalRefund: calculateReturnTotal(),
        condition: returnCondition,
        reason: returnReason,
        customer: transaction.customer,
        createdAt: new Date().toISOString(),
        status: 'completed',
        synced: false
      };

      console.log('📝 Saving return record:', {
        id: returnTransaction.id,
        returnType: returnType,
        condition: returnCondition,
        totalRefund: returnTransaction.totalRefund,
        itemsCount: selectedItemsList.length
      });

      // Save return record
      await transactionService.saveReturnTransaction(returnTransaction);

      // Update original transaction to mark items as returned
      const updatedTransaction = {
        ...transaction,
        returnedItems: [
          ...(transaction.returnedItems || []),
          ...selectedItemsList.map(item => ({
            ...item,
            returnedAt: new Date().toISOString(),
            condition: returnCondition,
            type: returnType
          }))
        ],
        updatedAt: new Date().toISOString()
      };
      
      await transactionService.updateTransactionLocally(transaction.id, updatedTransaction);

      // Show success message with appropriate details
      const successMessage = returnType === 'return' 
        ? `✅ Return processed successfully!\n\nRefund amount: ${formatCurrency(calculateReturnTotal())}\n${returnCondition === 'good' ? 'Items added back to inventory.' : 'Items marked as damaged/loss - not restocked.'}`
        : `✅ Damage report processed successfully!\n\nTotal value: ${formatCurrency(calculateReturnTotal())}\nItems marked as damaged/loss - not restocked.`;
      
      alert(successMessage);
      
      onComplete();
      onClose();
    } catch (error) {
      console.error('Failed to process return:', error);
      alert('Failed to process return. Please try again.\n\nError: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const returnTotal = calculateReturnTotal();

  // Check if any item can be returned (not already returned)
  const hasReturnableItems = transaction.items.some(
    item => !transaction.returnedItems?.some(r => r.productId === item.productId)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className={`w-full max-w-2xl ${currentTheme.colors.card} rounded-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center`}>
          <div>
            <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>
              {returnType === 'return' ? 'Process Return' : 'Report Damage'}
            </h2>
            <p className={`text-xs ${currentTheme.colors.textMuted}`}>
              Transaction: {transaction.receiptNumber}
            </p>
          </div>
          <button onClick={onClose} className={`p-1 rounded-lg ${currentTheme.colors.hover}`}>
            <Icons.x className="text-xl" />
          </button>
        </div>

        {/* Return Type Selection */}
        <div className={`p-4 border-b ${currentTheme.colors.border}`}>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setReturnType('return');
                setReturnCondition('good'); // Reset condition when switching
              }}
              className={`flex-1 py-2 rounded-lg border transition-all ${
                returnType === 'return'
                  ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white border-transparent`
                  : `${currentTheme.colors.border} ${currentTheme.colors.hover}`
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Icons.refresh className="text-sm" />
                <span>Return (Restock if good)</span>
              </div>
            </button>
            <button
              onClick={() => {
                setReturnType('damage');
                setReturnCondition('bad'); // Damage always counts as bad condition
              }}
              className={`flex-1 py-2 rounded-lg border transition-all ${
                returnType === 'damage'
                  ? 'bg-red-500 text-white border-transparent'
                  : `${currentTheme.colors.border} ${currentTheme.colors.hover}`
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Icons.alert className="text-sm" />
                <span>Damage/Loss</span>
              </div>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Condition Selection (only for returns) */}
          {returnType === 'return' && (
            <div className={`p-3 rounded-lg ${currentTheme.colors.accentLight}`}>
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
                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    ⚠️ Note: Items in bad condition will NOT be added back to inventory
                  </p>
                </div>
              )}
              {returnCondition === 'good' && (
                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✓ Items in good condition will be added back to inventory
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Items Selection */}
          <div>
            <h3 className={`text-sm font-medium mb-3 ${currentTheme.colors.text}`}>
              Select Items to {returnType === 'return' ? 'Return' : 'Report as Damaged'}
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {transaction.items.map((item, idx) => {
                const itemData = selectedItems[item.productId];
                const alreadyReturned = transaction.returnedItems?.some(
                  r => r.productId === item.productId
                );
                
                // Ensure itemData has default values to prevent uncontrolled input error
                const isSelected = itemData?.selected ?? false;
                const quantity = itemData?.quantity ?? item.quantity;
                const maxQuantity = itemData?.maxQuantity ?? item.quantity;
                
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${currentTheme.colors.border} transition-all ${
                      alreadyReturned ? 'opacity-50 bg-gray-100 dark:bg-gray-800' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected && !alreadyReturned}
                        onChange={(e) => updateItemSelection(item.productId, e.target.checked)}
                        disabled={alreadyReturned}
                        className="mt-1 rounded cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`text-sm font-medium ${currentTheme.colors.text}`}>
                              {item.name}
                            </p>
                            <p className={`text-xs ${currentTheme.colors.textMuted}`}>
                              SKU: {item.sku} | Price: {formatCurrency(item.price)}
                            </p>
                            {alreadyReturned && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                ✓ Already {returnType === 'return' ? 'returned' : 'reported'}
                              </p>
                            )}
                          </div>
                          <p className={`text-sm font-bold ${currentTheme.accentText}`}>
                            {formatCurrency(item.price * quantity)}
                          </p>
                        </div>
                        
                        {isSelected && !alreadyReturned && (
                          <div className="flex items-center gap-3 mt-2 pt-2 border-t">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${currentTheme.colors.textSecondary}`}>
                                Quantity:
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => updateItemQuantity(item.productId, quantity - 1)}
                                  className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                  disabled={quantity <= 1}
                                >
                                  -
                                </button>
                                <span className="w-8 text-center text-sm font-medium">
                                  {quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateItemQuantity(item.productId, quantity + 1)}
                                  className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                  disabled={quantity >= maxQuantity}
                                >
                                  +
                                </button>
                              </div>
                              <span className={`text-xs ${currentTheme.colors.textMuted}`}>
                                of {maxQuantity}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Return Reason */}
          <div>
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>
              Reason for {returnType === 'return' ? 'Return' : 'Damage'} <span className="text-xs text-gray-400">(Optional)</span>
            </label>
            <textarea
              value={returnReason ?? ''}
              onChange={(e) => setReturnReason(e.target.value)}
              rows="2"
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
              placeholder={`Why is this product being ${returnType === 'return' ? 'returned' : 'reported as damaged'}?`}
            />
          </div>

          {/* Return Summary */}
          <div className={`p-3 rounded-lg ${currentTheme.colors.accentLight}`}>
            <div className="flex justify-between items-center mb-2">
              <span className={`text-sm font-medium ${currentTheme.colors.text}`}>Summary</span>
              <span className={`text-xs ${currentTheme.colors.textMuted}`}>
                {Object.values(selectedItems).filter(i => i.selected).length} item(s) selected
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className={currentTheme.colors.textSecondary}>Total Refund:</span>
              <span className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(returnTotal)}
              </span>
            </div>
            {returnType === 'return' && returnCondition === 'good' && returnTotal > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                <Icons.check className="text-xs" />
                ✓ Items will be added back to inventory
              </p>
            )}
            {(returnType === 'damage' || returnCondition === 'bad') && returnTotal > 0 && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                <Icons.alert className="text-xs" />
                ⚠️ Items will NOT be added back to inventory
              </p>
            )}
            {returnTotal === 0 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 flex items-center gap-1">
                <Icons.alert className="text-xs" />
                Please select items to {returnType === 'return' ? 'return' : 'report'}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${currentTheme.colors.border} flex gap-3`}>
          <button
            onClick={onClose}
            disabled={processing}
            className={`flex-1 px-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text} transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Cancel
          </button>
          <button
            onClick={handleProcessReturn}
            disabled={processing || returnTotal === 0 || !hasReturnableItems}
            className={`flex-1 px-4 py-2 rounded-lg transition-all ${
              returnType === 'damage'
                ? 'bg-red-500 hover:bg-red-600'
                : `bg-gradient-to-r ${currentTheme.colors.accent}`
            } text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {processing ? (
              <>
                <Icons.refresh className="animate-spin text-sm" />
                Processing...
              </>
            ) : (
              returnType === 'damage' ? 'Report Damage' : 'Process Return'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}