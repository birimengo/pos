// src/features/pos/checkout/Checkout.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useInventory } from '../context/InventoryContext';
import { useCart } from '../context/CartContext';
import { useCustomers } from '../context/CustomerContext';
import { Icons } from '../../../components/ui/Icons';
import PaymentModal from './PaymentModal';
import Receipt from './Receipt';
import CustomerModal from './CustomerModal';
import { opfs } from '../services/opfsService';
import { db } from '../services/database';
import { transactionService } from '../services/transactionService';
import { cloudSync } from '../services/cloudSyncService';

// Helper function to format price without .00 and with commas
const formatPrice = (price) => {
  // Round to 2 decimal places first
  const rounded = Math.round(price * 100) / 100;
  
  // Check if it's a whole number (no cents)
  if (rounded % 1 === 0) {
    // Format with commas but no decimal places
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  } else {
    // Format with commas and 2 decimal places
    return rounded.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
};

export default function Checkout() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [discountCode, setDiscountCode] = useState('');
  const [taxRate, setTaxRate] = useState(0.1);
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [processingSale, setProcessingSale] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });
  
  const { theme, getTheme } = useTheme();
  const { state: inventoryState, dispatch: inventoryDispatch } = useInventory();
  const { state: cartState, dispatch: cartDispatch } = useCart();
  const { state: customerState, dispatch: customerDispatch } = useCustomers();
  const currentTheme = getTheme(theme);

  // Get theme-specific colors for components
  const getThemeSpecificClasses = () => {
    switch(theme) {
      case 'dark':
        return {
          processingBg: 'bg-blue-900/30',
          processingText: 'text-blue-400',
          lowStockBg: 'bg-yellow-900/20',
          lowStockText: 'text-yellow-400',
          successBg: 'bg-green-900/20',
          successText: 'text-green-400',
          warningBg: 'bg-red-900/20',
          warningText: 'text-red-400',
          cardHover: 'hover:bg-gray-800/50',
          borderHover: 'hover:border-gray-600',
          blueText: 'text-blue-400',
          blueBg: 'bg-blue-900/30'
        };
      case 'ocean':
        return {
          processingBg: 'bg-cyan-100',
          processingText: 'text-cyan-700',
          lowStockBg: 'bg-amber-100',
          lowStockText: 'text-amber-700',
          successBg: 'bg-emerald-100',
          successText: 'text-emerald-700',
          warningBg: 'bg-rose-100',
          warningText: 'text-rose-700',
          cardHover: 'hover:bg-cyan-50',
          borderHover: 'hover:border-cyan-300',
          blueText: 'text-blue-600',
          blueBg: 'bg-blue-100'
        };
      default: // light
        return {
          processingBg: 'bg-blue-50',
          processingText: 'text-blue-600',
          lowStockBg: 'bg-yellow-50',
          lowStockText: 'text-yellow-700',
          successBg: 'bg-green-50',
          successText: 'text-green-700',
          warningBg: 'bg-red-50',
          warningText: 'text-red-700',
          cardHover: 'hover:bg-gray-50',
          borderHover: 'hover:border-gray-300',
          blueText: 'text-blue-600',
          blueBg: 'bg-blue-50'
        };
    }
  };

  const themeSpecific = getThemeSpecificClasses();

  // Track window dimensions for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine if we're on a square-like display (aspect ratio close to 1:1)
  const isSquareDisplay = useMemo(() => {
    const aspectRatio = windowDimensions.width / windowDimensions.height;
    return aspectRatio > 0.8 && aspectRatio < 1.2;
  }, [windowDimensions]);

  // Adjust grid columns based on screen size and shape
  const productsGridCols = useMemo(() => {
    if (windowDimensions.width < 640) return 'grid-cols-2';
    if (windowDimensions.width < 1024) return 'grid-cols-3';
    if (isSquareDisplay) return 'grid-cols-3';
    return 'grid-cols-3';
  }, [windowDimensions.width, isSquareDisplay]);

  // Adjust layout based on display shape
  const mainLayoutCols = useMemo(() => {
    if (windowDimensions.width < 768) return 'grid-cols-1';
    if (isSquareDisplay) return 'grid-cols-2';
    return 'grid-cols-1 lg:grid-cols-3';
  }, [windowDimensions.width, isSquareDisplay]);

  // Adjust cart column span based on display shape
  const cartColSpan = useMemo(() => {
    if (windowDimensions.width < 768) return '';
    if (isSquareDisplay) return 'lg:col-span-1';
    return 'lg:col-span-1';
  }, [windowDimensions.width, isSquareDisplay]);

  // Adjust products column span based on display shape
  const productsColSpan = useMemo(() => {
    if (windowDimensions.width < 768) return '';
    if (isSquareDisplay) return 'lg:col-span-1';
    return 'lg:col-span-2';
  }, [windowDimensions.width, isSquareDisplay]);

  const categories = useMemo(() => {
    return ['All', ...new Set(inventoryState.products.map(p => p.category).filter(Boolean))];
  }, [inventoryState.products]);

  const filteredProducts = useMemo(() => {
    return inventoryState.products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.barcode && product.barcode.includes(searchTerm));
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventoryState.products, searchTerm, selectedCategory]);

  const [productImages, setProductImages] = useState({});
  
  useEffect(() => {
    const loadImages = async () => {
      const images = {};
      for (const product of filteredProducts) {
        const productImageList = [];
        
        if (product.localImages?.length > 0) {
          for (const imagePath of product.localImages) {
            try {
              const fileName = imagePath.split('/').pop();
              const file = await opfs.readFile(fileName, 'products');
              if (file) {
                productImageList.push({
                  url: URL.createObjectURL(file),
                  type: 'local'
                });
              }
            } catch (error) {
              console.debug(`No local image for product ${product.id}`);
            }
          }
        }
        
        if (product.cloudImages?.length > 0) {
          product.cloudImages.forEach(img => {
            productImageList.push({
              url: img.url,
              type: 'cloud'
            });
          });
        } else if (product.cloudinaryImages?.length > 0) {
          product.cloudinaryImages.forEach(img => {
            productImageList.push({
              url: img.url,
              type: 'cloud'
            });
          });
        } else if (product.cloudMainImage) {
          productImageList.push({
            url: product.cloudMainImage,
            type: 'cloud'
          });
        }
        
        if (productImageList.length > 0) {
          images[product.id] = productImageList;
          setCurrentImageIndex(prev => ({
            ...prev,
            [product.id]: 0
          }));
        }
      }
      setProductImages(images);
    };

    loadImages();

    return () => {
      Object.values(productImages).forEach(imageList => {
        if (Array.isArray(imageList)) {
          imageList.forEach(img => {
            if (img.type === 'local' && img.url.startsWith('blob:')) {
              URL.revokeObjectURL(img.url);
            }
          });
        }
      });
    };
  }, [filteredProducts]);

  const nextImage = (productId, e) => {
    e.stopPropagation();
    const images = productImages[productId];
    if (images && images.length > 1) {
      setCurrentImageIndex(prev => ({
        ...prev,
        [productId]: (prev[productId] + 1) % images.length
      }));
    }
  };

  const prevImage = (productId, e) => {
    e.stopPropagation();
    const images = productImages[productId];
    if (images && images.length > 1) {
      setCurrentImageIndex(prev => ({
        ...prev,
        [productId]: (prev[productId] - 1 + images.length) % images.length
      }));
    }
  };

  const addToCart = (product) => {
    const currentInCart = cartState.items.find(item => item.id === product.id)?.quantity || 0;
    if (currentInCart >= product.stock) {
      alert(`Cannot add more. Only ${product.stock} in stock.`);
      return;
    }
    
    cartDispatch({ type: 'ADD_ITEM', payload: product });
  };

  const updateQuantity = (id, newQuantity) => {
    const product = inventoryState.products.find(p => p.id === id);
    if (!product) return;

    if (newQuantity < 1) {
      cartDispatch({ type: 'REMOVE_ITEM', payload: id });
    } else if (newQuantity <= product.stock) {
      cartDispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity: newQuantity } });
    } else {
      alert(`Cannot add more. Only ${product.stock} in stock.`);
    }
  };

  const handleApplyDiscount = () => {
    if (discountCode === 'SAVE10') {
      const discount = cartState.subtotal * 0.1;
      cartDispatch({ type: 'SET_DISCOUNT', payload: discount });
      alert('Discount applied: 10% off');
    } else {
      alert('Invalid discount code');
    }
  };

  const handleSelectCustomer = (customer) => {
    cartDispatch({ type: 'SET_CUSTOMER', payload: customer });
    setShowCustomerModal(false);
  };

  const calculateTax = () => {
    return (cartState.subtotal - cartState.discount) * taxRate;
  };

  const calculateTotal = () => {
    return (cartState.subtotal - cartState.discount) + calculateTax();
  };

  const updateProductStock = async (productId, quantitySold) => {
    const product = inventoryState.products.find(p => p.id === productId);
    if (!product) return;

    const newStock = product.stock - quantitySold;
    
    inventoryDispatch({
      type: 'UPDATE_STOCK',
      payload: { id: productId, change: -quantitySold }
    });

    try {
      const updatedProduct = {
        ...product,
        stock: newStock,
        updatedAt: new Date().toISOString(),
        synced: false,
        syncRequired: true
      };
      
      await db.put('products', updatedProduct);
      console.log(`✅ Stock updated for ${product.name}: ${newStock} remaining`);
      
      await db.addToSyncQueue({
        type: 'product',
        productId: product.id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to update stock in database:', error);
    }
  };

  const saveTransaction = async (saleData) => {
    try {
      const transactionData = {
        receiptNumber: saleData.receiptNumber,
        items: saleData.items.map(item => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity
        })),
        subtotal: saleData.subtotal,
        discount: saleData.discount,
        tax: saleData.tax,
        total: saleData.total,
        paymentMethod: saleData.method,
        change: saleData.change || 0,
        customer: saleData.customer,
        notes: saleData.notes || '',
        timestamp: saleData.timestamp,
        synced: false,
        syncRequired: true
      };

      const result = await transactionService.saveTransactionLocally(transactionData);
      
      if (result.success) {
        console.log('✅ Transaction saved:', result.transactionId);
        return result.transaction;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Failed to save transaction:', error);
      throw error;
    }
  };

  const updateCustomerLoyalty = async (customerId, amount) => {
    const pointsEarned = Math.floor(amount);
    
    customerDispatch({
      type: 'ADD_LOYALTY_POINTS',
      payload: {
        customerId,
        points: pointsEarned,
        amount
      }
    });

    try {
      const customer = customerState.customers.find(c => c.id === customerId);
      if (customer) {
        const updatedCustomer = {
          ...customer,
          loyaltyPoints: (customer.loyaltyPoints || 0) + pointsEarned,
          totalSpent: (customer.totalSpent || 0) + amount,
          lastVisit: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString(),
          synced: false
        };
        
        await db.put('customers', updatedCustomer);
        
        await db.addToSyncQueue({
          type: 'customer',
          customerId: customer.id,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('❌ Failed to update customer in database:', error);
    }
  };

  const handlePaymentComplete = async (paymentDetails) => {
    setProcessingSale(true);
    
    try {
      for (const item of cartState.items) {
        await updateProductStock(item.id, item.quantity);
      }

      const tax = calculateTax();
      const total = calculateTotal();
      const subtotal = cartState.subtotal - cartState.discount;

      const sale = {
        ...cartState,
        ...paymentDetails,
        items: cartState.items,
        customer: cartState.customer,
        timestamp: new Date().toISOString(),
        receiptNumber: `INV-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        tax,
        taxRate,
        subtotal: cartState.subtotal,
        total
      };

      const savedTransaction = await saveTransaction(sale);

      if (cartState.customer) {
        await updateCustomerLoyalty(cartState.customer.id, subtotal);
      }

      if (navigator.onLine) {
        setTimeout(() => {
          cloudSync.fullSync().catch(err => 
            console.log('Background sync queued for later:', err.message)
          );
        }, 1000);
      }

      setLastSale({ ...sale, id: savedTransaction?.id });
      setShowPaymentModal(false);
      setShowReceipt(true);

    } catch (error) {
      console.error('❌ Payment processing failed:', error);
      alert('Payment processed but failed to save to database. Please check your connection.');
    } finally {
      setProcessingSale(false);
    }
  };

  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const storeName = inventoryState.store?.name || 'STORE NAME';
      const storeAddress = inventoryState.store?.address || '123 Main Street';
      const storePhone = inventoryState.store?.phone || '(555) 123-4567';
      const tax = lastSale?.tax || calculateTax();
      const total = lastSale?.total || calculateTotal();
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt</title>
            <style>
              body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 20px; }
              .items { margin: 20px 0; }
              .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
              .total { border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; font-weight: bold; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${storeName}</h2>
              <p>${storeAddress}</p>
              <p>Tel: ${storePhone}</p>
              <p>Receipt #: ${lastSale?.receiptNumber}</p>
              <p>Date: ${new Date(lastSale?.timestamp || Date.now()).toLocaleString()}</p>
              ${lastSale?.customer ? `<p>Customer: ${lastSale.customer.name}</p>` : ''}
            </div>
            <div class="items">
              ${lastSale?.items.map(item => `
                <div class="item">
                  <span>${item.name} x${item.quantity}</span>
                  <span>$${formatPrice(item.price * item.quantity)}</span>
                </div>
              `).join('')}
            </div>
            <div class="total">
              <div class="item">
                <span>Subtotal:</span>
                <span>$${formatPrice(lastSale?.subtotal)}</span>
              </div>
              ${lastSale?.discount > 0 ? `
                <div class="item">
                  <span>Discount:</span>
                  <span>-$${formatPrice(lastSale?.discount)}</span>
                </div>
              ` : ''}
              <div class="item">
                <span>Tax (${(taxRate * 100).toFixed(0)}%):</span>
                <span>$${formatPrice(tax)}</span>
              </div>
              <div class="item" style="font-size: 16px;">
                <span>TOTAL:</span>
                <span>$${formatPrice(total)}</span>
              </div>
              ${lastSale?.change > 0 ? `
                <div class="item">
                  <span>Change:</span>
                  <span>$${formatPrice(lastSale?.change)}</span>
                </div>
              ` : ''}
            </div>
            <div class="footer">
              <p>Thank you for your business!</p>
              <p style="font-size: 10px; margin-top: 10px;">${lastSale?.id ? `Transaction ID: ${lastSale.id}` : ''}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleNewSale = () => {
    setShowReceipt(false);
    setLastSale(null);
    cartDispatch({ type: 'CLEAR_CART' });
    setDiscountCode('');
    setSearchTerm('');
    setSelectedCategory('All');
  };

  const handleEmailReceipt = () => {
    if (lastSale?.customer?.email) {
      alert(`Receipt sent to ${lastSale.customer.email}`);
    } else {
      alert('No email address available for this customer');
    }
  };

  const handleSmsReceipt = () => {
    if (lastSale?.customer?.phone) {
      alert(`Receipt sent to ${lastSale.customer.phone}`);
    } else {
      alert('No phone number available for this customer');
    }
  };

  // Calculate dynamic heights based on window dimensions
  const productsGridHeight = useMemo(() => {
    if (windowDimensions.height < 600) return 'max-h-[300px]';
    if (windowDimensions.height < 800) return 'max-h-[400px]';
    if (isSquareDisplay) return 'max-h-[500px]';
    return 'max-h-[600px]';
  }, [windowDimensions.height, isSquareDisplay]);

  const cartItemsHeight = useMemo(() => {
    if (windowDimensions.height < 600) return 'max-h-[200px]';
    if (windowDimensions.height < 800) return 'max-h-[250px]';
    if (isSquareDisplay) return 'max-h-[300px]';
    return 'max-h-[400px]';
  }, [windowDimensions.height, isSquareDisplay]);

  return (
    <div className="h-full flex flex-col m-0 p-0">
      {/* Header - Ultra Compact with theme support */}
      <div className="flex justify-end items-center m-0 p-0">
        <span className={`text-[12px] m-0 p-0`}
          style={{ color: theme === 'light' ? '#4b5563' : currentTheme.colors.textSecondary }}>
          products {inventoryState.products.length}
        </span>
        {processingSale && (
          <span className={`flex items-center gap-0.5 px-1 py-0.5 rounded-sm text-[8px] ml-0.5 m-0 ${themeSpecific.processingBg} ${themeSpecific.processingText}`}>
            <Icons.refresh className="animate-spin text-[8px] m-0 p-0" />
          </span>
        )}
      </div>

      {/* Main Grid - Adaptive layout for square displays */}
      <div className={`grid ${mainLayoutCols} gap-3 sm:gap-4 flex-1 min-h-0`}>
        {/* Left Column - Products */}
        <div className={`${productsColSpan} flex flex-col space-y-3 min-h-0`}>
          {/* Search - Compact */}
          <div className="relative flex-shrink-0">
            <Icons.search className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${currentTheme.colors.textMuted} text-sm`} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow`}
            />
          </div>

          {/* Categories - Scrollable row with theme support */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin flex-shrink-0">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0
                  ${selectedCategory === category 
                    ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white shadow-sm` 
                    : `${currentTheme.colors.hover} ${currentTheme.colors.textSecondary}`
                  }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Products Grid - Scrollable with dynamic height */}
          <div className={`flex-1 overflow-y-auto ${productsGridHeight} min-h-0 scrollbar-thin`}>
            <div className={`grid ${productsGridCols} gap-2 p-1`}>
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => {
                  const inCart = cartState.items.find(item => item.id === product.id)?.quantity || 0;
                  const availableStock = product.stock - inCart;
                  const images = productImages[product.id] || [];
                  const currentIdx = currentImageIndex[product.id] || 0;
                  const currentImage = images[currentIdx];
                  
                  return (
                    <div
                      key={product.id}
                      className={`group relative p-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} 
                        ${themeSpecific.cardHover} ${themeSpecific.borderHover} transition-all
                        ${product.stock < 10 ? `border-yellow-500/50 ${theme === 'dark' ? 'border-yellow-700' : ''}` : ''}
                        ${availableStock <= 0 ? 'opacity-50' : 'cursor-pointer hover:scale-[1.02]'}`}
                      onClick={() => availableStock > 0 && addToCart(product)}
                    >
                      {/* Image Container */}
                      <div className="relative aspect-square mb-2 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                        {currentImage ? (
                          <>
                            <img 
                              src={currentImage.url} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                            
                            {/* Image Navigation */}
                            {images.length > 1 && (
                              <>
                                <button
                                  onClick={(e) => prevImage(product.id, e)}
                                  className="absolute left-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 text-xs"
                                >
                                  ‹
                                </button>
                                <button
                                  onClick={(e) => nextImage(product.id, e)}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 text-xs"
                                >
                                  ›
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icons.box className="text-2xl text-gray-400" />
                          </div>
                        )}
                        
                        {/* Stock Badge */}
                        <span className={`absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium
                          ${product.stock < 10 
                            ? theme === 'dark' 
                              ? 'bg-yellow-900/50 text-yellow-400'
                              : theme === 'ocean'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-yellow-100 text-yellow-700'
                            : theme === 'dark'
                              ? 'bg-green-900/50 text-green-400'
                              : theme === 'ocean'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-green-100 text-green-700'
                          }`}>
                          {availableStock}
                        </span>
                      </div>

                      {/* Product Info - Updated with blue name and price, and SKU display */}
                      <h3 className={`text-xs font-medium mb-1 text-blue-600 dark:text-blue-400 line-clamp-2 h-8`}>
                        {product.name}
                      </h3>
                      
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-bold text-blue-600 dark:text-blue-400`}>
                          ${formatPrice(product.price)}
                        </p>
                        {inCart > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full
                            ${theme === 'dark' 
                              ? 'bg-blue-900/50 text-blue-400'
                              : theme === 'ocean'
                                ? 'bg-cyan-100 text-cyan-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                            {inCart}
                          </span>
                        )}
                      </div>

                      {/* SKU Display */}
                      <div className="flex items-center text-[9px] text-gray-500 dark:text-gray-400">
                        <span className="truncate">SKU: {product.sku}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-8">
                  <Icons.package className="text-3xl mx-auto mb-2 text-gray-400" />
                  <p className={`text-sm ${currentTheme.colors.textMuted}`}>
                    No products found
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Cart */}
        <div className={`${cartColSpan} ${currentTheme.colors.card} rounded-lg border ${currentTheme.colors.border} p-3 flex flex-col space-y-3 min-h-0 ${isSquareDisplay ? 'sticky top-0' : 'lg:sticky lg:top-4'}`}>
          {/* Customer Section */}
          <div className="flex-shrink-0">
            {cartState.customer ? (
              <div className={`flex items-center justify-between p-2 rounded-lg border ${currentTheme.colors.border} bg-gradient-to-r ${currentTheme.colors.accentLight} bg-opacity-10`}>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium ${currentTheme.colors.text} truncate`}>
                    {cartState.customer.name}
                  </p>
                  <p className={`text-[10px] ${currentTheme.colors.textMuted}`}>
                    {cartState.customer.loyaltyPoints} pts
                  </p>
                </div>
                <button
                  onClick={() => cartDispatch({ type: 'SET_CUSTOMER', payload: null })}
                  className={`p-1 rounded-lg ${theme === 'dark' ? 'hover:bg-red-900/20' : theme === 'ocean' ? 'hover:bg-rose-100' : 'hover:bg-red-50'} text-red-500`}
                >
                  <Icons.x className="text-xs" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCustomerModal(true)}
                className={`w-full p-2 border border-dashed ${currentTheme.colors.border} rounded-lg text-left text-xs ${currentTheme.colors.hover} flex items-center justify-between`}
              >
                <span className={`${currentTheme.colors.textMuted}`}>+ Add Customer</span>
                <Icons.user className={`text-xs ${currentTheme.colors.textMuted}`} />
              </button>
            )}
          </div>

          {/* Cart Header */}
          <div className="flex items-center justify-between flex-shrink-0">
            <h2 className={`font-semibold text-sm flex items-center gap-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
            }`}>
              <Icons.shoppingBag className={currentTheme.accentText} />
              Cart
            </h2>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${currentTheme.colors.accentLight}`}>
              <span className="text-blue-600 dark:text-blue-400 font-medium">{cartState.items.length}</span>
              <span className={`ml-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>items</span>
            </span>
          </div>

          {/* Cart Items */}
          <div className={`flex-1 overflow-y-auto ${cartItemsHeight} min-h-0 space-y-2 pr-1 -mr-1 scrollbar-thin`}>
            {cartState.items.length === 0 ? (
              <div className="text-center py-4">
                <Icons.shoppingBag className={`text-3xl mx-auto mb-2 ${currentTheme.colors.textMuted}`} />
                <p className={`text-xs ${currentTheme.colors.textMuted}`}>Cart is empty</p>
              </div>
            ) : (
              cartState.items.map((item) => {
                const product = inventoryState.products.find(p => p.id === item.id);
                const maxStock = product?.stock || 0;
                const isLowStock = maxStock - item.quantity < 5;
                
                return (
                  <div key={item.id} className={`p-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} space-y-2`}>
                    {/* Item Header - No Image */}
                    <div className="flex items-start gap-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`text-xs font-medium truncate max-w-[100px] ${
                            theme === 'dark' 
                              ? 'text-blue-400' 
                              : 'text-gray-600'
                          }`}>
                            {item.name}
                          </p>
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            ${formatPrice(item.price)}
                          </p>
                          <button
                            onClick={() => cartDispatch({ type: 'REMOVE_ITEM', payload: item.id })}
                            className={`p-0.5 rounded ${theme === 'dark' ? 'hover:bg-red-900/20' : theme === 'ocean' ? 'hover:bg-rose-100' : 'hover:bg-red-50'} text-red-500`}
                          >
                            <Icons.trash className="text-xs" />
                          </button>
                        </div>
                        
                        <p className={`text-[8px] ${currentTheme.colors.textMuted} mt-0.5`}>
                          SKU: {item.sku}
                        </p>
                      </div>
                    </div>

                    {/* Quantity Controls - Ultra Compact */}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-5 h-5 rounded bg-gray-100 dark:bg-transparent text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors shadow-sm dark:shadow-gray-800"
                        >
                          -
                        </button>
                        <span className={`text-[10px] w-4 text-center ${currentTheme.colors.text}`}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= maxStock}
                          className="w-5 h-5 rounded bg-gray-100 dark:bg-transparent text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm dark:shadow-gray-800"
                        >
                          +
                        </button>
                      </div>
                      
                      <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        ${formatPrice(item.price * item.quantity)}
                      </p>
                    </div>

                    {/* Low Stock Warning */}
                    {isLowStock && (
                      <div className={`flex items-center gap-2 text-[10px] ${themeSpecific.lowStockBg} ${themeSpecific.lowStockText} p-1.5 rounded`}>
                        <Icons.alert className="text-xs" />
                        <span>Only {maxStock - item.quantity} left</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Discount Section */}
          {cartState.items.length > 0 && (
            <div className="flex gap-1 flex-shrink-0">
              <input
                type="text"
                placeholder="Discount"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                className={`flex-1 px-2 py-1.5 text-xs rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
              />
              <button
                onClick={handleApplyDiscount}
                disabled={!discountCode}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg ${currentTheme.colors.accentLight} ${currentTheme.accentText} disabled:opacity-50`}
              >
                Apply
              </button>
            </div>
          )}

          {/* Order Summary - Ultra Compact with Blue Values */}
          <div className={`pt-1.5 border-t ${currentTheme.colors.border} flex-shrink-0`}>
            <div className="flex justify-between items-center text-[14px]">
              <span className={currentTheme.colors.textSecondary}>Subtotal</span>
              <span className="text-blue-600 dark:text-blue-400">${formatPrice(cartState.subtotal)}</span>
            </div>
            {cartState.discount > 0 && (
              <div className="flex justify-between items-center text-[12px]">
                <span className={currentTheme.colors.textSecondary}>Discount</span>
                <span className={`${theme === 'dark' ? 'text-green-400' : theme === 'ocean' ? 'text-emerald-600' : 'text-green-600'}`}>
                  -${formatPrice(cartState.discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-[14px]">
              <span className={currentTheme.colors.textSecondary}>Tax</span>
              <span className="text-blue-600 dark:text-blue-400">${formatPrice(calculateTax())}</span>
            </div>
            <div className="flex justify-between items-center font-medium text-xs pt-1 mt-0.5 border-t border-dashed">
              <span className="text-blue-600 dark:text-gray-700">Total</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                ${formatPrice(calculateTotal())}
              </span>
            </div>
          </div>

          {/* Notes */}
          <textarea
            placeholder="Notes..."
            rows="1"
            value={cartState.notes}
            onChange={(e) => cartDispatch({ type: 'SET_NOTES', payload: e.target.value })}
            className={`w-full px-2 py-1.5 text-xs rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} resize-none flex-shrink-0`}
          />

          {/* Payment Button */}
          <button
            disabled={cartState.items.length === 0 || processingSale}
            onClick={() => setShowPaymentModal(true)}
            className={`w-full py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white hover:shadow disabled:opacity-50 flex items-center justify-center gap-1 flex-shrink-0`}
          >
            {processingSale ? (
              <>
                <Icons.refresh className="animate-spin text-sm" />
                Processing...
              </>
            ) : (
              <>
                <Icons.creditCard className="text-sm" />
                Pay ${formatPrice(calculateTotal())}
              </>
            )}
          </button>

          {/* Stock Warning */}
          {cartState.items.some(item => {
            const product = inventoryState.products.find(p => p.id === item.id);
            return product && product.stock - item.quantity < 5;
          }) && (
            <div className={`flex items-center gap-1.5 p-2 rounded-lg text-xs ${themeSpecific.lowStockBg} ${themeSpecific.lowStockText} flex-shrink-0`}>
              <Icons.alert className="text-sm" />
              <span className="truncate">Low stock</span>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelect={handleSelectCustomer}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        total={calculateTotal()}
        onPaymentComplete={handlePaymentComplete}
      />

      {showReceipt && lastSale && (
        <Receipt
          sale={lastSale}
          onClose={handleNewSale}
          onPrint={handlePrintReceipt}
          onEmail={handleEmailReceipt}
          onSms={handleSmsReceipt}
        />
      )}
    </div>
  );
}