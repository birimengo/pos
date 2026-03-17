// src/features/pos/inventory/InventoryDashboard.jsx (Card View with Image Carousel)
import { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useInventory } from '../context/InventoryContext';
import { productService } from '../services/productService';
import { Icons } from '../../../components/ui/Icons';
import ProductForm from './ProductForm';
import StockAdjustmentModal from './StockAdjustmentModal';
import { opfs } from '../services/opfsService';
import SyncStatusIndicator from '../components/SyncStatusIndicator';
import CategoryManager from '../components/CategoryManager';

export default function InventoryDashboard() {
  const [view, setView] = useState('list');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [imageUrls, setImageUrls] = useState({});
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  
  const { theme, getTheme } = useTheme();
  const { state, dispatch } = useInventory();
  const currentTheme = getTheme(theme);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load sync status periodically
  useEffect(() => {
    const loadSyncStatus = async () => {
      const status = await productService.getSyncStatus();
      setSyncStatus(status);
    };
    
    loadSyncStatus();
    const interval = setInterval(loadSyncStatus, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Memoize filtered products
  const filteredProducts = useMemo(() => {
    return state.products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(state.searchTerm?.toLowerCase() || '') ||
                           product.sku.toLowerCase().includes(state.searchTerm?.toLowerCase() || '') ||
                           (product.barcode && product.barcode.includes(state.searchTerm || ''));
      const matchesCategory = state.selectedCategory === 'All' || product.category === state.selectedCategory;
      const matchesLowStock = showLowStockOnly ? product.stock <= 10 : true;
      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [state.products, state.searchTerm, state.selectedCategory, showLowStockOnly]);

  // Load all images for products (for carousel)
  useEffect(() => {
    let isMounted = true;

    const loadAllImages = async () => {
      const urls = {};
      
      for (const product of filteredProducts) {
        if (!isMounted) break;
        
        const productImages = [];
        
        // Load local images from OPFS
        if (product.localImages?.length > 0) {
          for (const imagePath of product.localImages) {
            try {
              const fileName = imagePath.split('/').pop();
              const file = await opfs.readFile(fileName, 'products');
              if (file && isMounted) {
                productImages.push({
                  url: URL.createObjectURL(file),
                  type: 'local',
                  path: imagePath
                });
              }
            } catch (error) {
              console.debug(`Failed to load local image for product ${product.id}`);
            }
          }
        }
        
        // Add cloud images
        if (product.cloudImages?.length > 0) {
          product.cloudImages.forEach(img => {
            productImages.push({
              url: img.url,
              type: 'cloud',
              publicId: img.publicId
            });
          });
        } else if (product.cloudinaryImages?.length > 0) {
          product.cloudinaryImages.forEach(img => {
            productImages.push({
              url: img.url,
              type: 'cloud',
              publicId: img.publicId
            });
          });
        }
        
        if (productImages.length > 0) {
          urls[product.id] = productImages;
          // Initialize image index for this product
          setCurrentImageIndex(prev => ({
            ...prev,
            [product.id]: 0
          }));
        }
      }
      
      if (isMounted) {
        setImageUrls(urls);
      }
    };
    
    loadAllImages();
    
    // Cleanup URLs
    return () => {
      isMounted = false;
      Object.values(imageUrls).forEach(imageArray => {
        if (Array.isArray(imageArray)) {
          imageArray.forEach(img => {
            if (img.type === 'local') {
              try { URL.revokeObjectURL(img.url); } catch (e) {}
            }
          });
        }
      });
    };
  }, [filteredProducts]);

  // Calculate real categories
  const realCategories = useMemo(() => {
    return state.categories.filter(c => c !== 'All');
  }, [state.categories]);

  const lowStockCount = state.products.filter(p => p.stock <= 10).length;

  // Handle sync all pending items
  const handleSyncAll = async () => {
    if (!onlineStatus) {
      alert('You are offline. Please connect to the internet to sync.');
      return;
    }
    
    setSyncing(true);
    const result = await productService.syncAllPending();
    setSyncing(false);
    
    if (result.success) {
      alert(`✅ Synced ${result.results?.length || 0} products successfully!`);
      const updatedProducts = await productService.getAllProductsLocally();
      dispatch({ type: 'SET_PRODUCTS', payload: updatedProducts });
    } else {
      alert(`❌ Sync failed: ${result.error}`);
    }
  };

  // Handle delete with confirmation
  const handleDelete = async (id) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      setSyncing(true);
      const result = await productService.deleteProduct(deleteConfirm);
      
      if (result.success) {
        dispatch({ type: 'DELETE_PRODUCT', payload: deleteConfirm });
        
        // Clean up image URLs
        if (imageUrls[deleteConfirm]) {
          imageUrls[deleteConfirm].forEach(img => {
            if (img.type === 'local') {
              try { URL.revokeObjectURL(img.url); } catch (e) {}
            }
          });
        }
        
        alert('✅ Product deleted successfully');
      } else {
        alert(`❌ Failed to delete: ${result.error}`);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('❌ Failed to delete product');
    } finally {
      setSyncing(false);
      setDeleteConfirm(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  // Image carousel navigation
  const nextImage = (productId, totalImages) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [productId]: (prev[productId] + 1) % totalImages
    }));
  };

  const prevImage = (productId, totalImages) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [productId]: (prev[productId] - 1 + totalImages) % totalImages
    }));
  };

  // Handle stock adjustment
  const handleStockAdjust = (product) => {
    setSelectedProduct(product);
    setView('adjust');
  };

  // Handle edit
  const handleEdit = (product) => {
    setSelectedProduct(product);
    setView('edit');
  };

  // Handle add
  const handleAdd = () => {
    setSelectedProduct(null);
    setView('add');
  };

  // Category management
  const handleAddCategory = (category) => {
    dispatch({ type: 'ADD_CATEGORY', payload: category });
  };

  const handleRemoveCategory = (category) => {
    if (window.confirm(`Remove category "${category}"? This won't affect existing products.`)) {
      dispatch({ type: 'REMOVE_CATEGORY', payload: category });
    }
  };

  // Handle form submission
  const handleFormSubmit = (productData) => {
    setView('list');
    setSelectedProduct(null);
  };

  // Handle stock adjustment complete
  const handleStockAdjustComplete = (id, change, reason) => {
    dispatch({ type: 'UPDATE_STOCK', payload: { id, change } });
    setView('list');
    setSelectedProduct(null);
  };

  // Show loading state
  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={`text-sm ${currentTheme.colors.textSecondary}`}>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Online/Offline Status Bar */}
      {!onlineStatus && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2 text-center">
          <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400 flex items-center justify-center gap-1">
            <Icons.alert className="text-sm sm:text-base" />
            Offline - Changes will sync when online
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${currentTheme.colors.card} rounded-lg p-4 sm:p-6 max-w-md w-full`}>
            <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${currentTheme.colors.text}`}>Confirm Delete</h3>
            <p className={`text-sm sm:text-base mb-4 sm:mb-6 ${currentTheme.colors.textSecondary}`}>
              Are you sure you want to delete this product? 
              {onlineStatus 
                ? ' It will be permanently removed from both local storage and the cloud.'
                : ' It will be removed locally and queued for cloud deletion when you\'re back online.'}
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={cancelDelete}
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm"
                disabled={syncing}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={syncing}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 text-sm"
              >
                {syncing ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className={`text-xl sm:text-2xl font-bold ${currentTheme.colors.text}`}>Inventory</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowCategoryManager(true)}
            className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg ${currentTheme.colors.accentLight} ${currentTheme.colors.accentText} flex items-center gap-1 flex-1 sm:flex-none justify-center`}
            title="Manage Categories"
          >
            <Icons.grid className="text-sm" /> 
            <span className="hidden xs:inline">Categories</span> ({realCategories.length})
          </button>
          
          {syncStatus?.pendingProducts > 0 && (
            <button
              onClick={handleSyncAll}
              disabled={syncing || !onlineStatus}
              className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg flex items-center gap-1 flex-1 sm:flex-none justify-center ${
                syncing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : onlineStatus
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-gray-400 cursor-not-allowed'
              }`}
              title={!onlineStatus ? 'Connect to internet to sync' : ''}
            >
              {syncing ? (
                <Icons.refresh className="animate-spin text-sm" />
              ) : (
                <>
                  <Icons.cloud className="text-sm" />
                  <span className="hidden xs:inline">Sync</span> ({syncStatus?.pendingProducts})
                </>
              )}
            </button>
          )}
          
          {lowStockCount > 0 && (
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg flex items-center gap-1 flex-1 sm:flex-none justify-center ${
                showLowStockOnly 
                  ? 'bg-yellow-500 text-white' 
                  : `${currentTheme.colors.accentLight} ${currentTheme.colors.accentText}`
              }`}
            >
              <Icons.alert className="text-sm" />
              <span className="hidden xs:inline">Low</span> ({lowStockCount})
            </button>
          )}
          
          <button
            onClick={handleAdd}
            className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white flex items-center gap-1 flex-1 sm:flex-none justify-center`}
          >
            <Icons.add className="text-sm" /> Add
          </button>
        </div>
      </div>

      {/* Compact Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className={`${currentTheme.colors.card} rounded-lg p-2 sm:p-3 border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total</p>
          <p className={`text-lg sm:text-xl font-bold ${currentTheme.colors.text}`}>{state.products.length}</p>
        </div>
        <div className={`${currentTheme.colors.card} rounded-lg p-2 sm:p-3 border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Low Stock</p>
          <p className={`text-lg sm:text-xl font-bold text-yellow-600`}>{lowStockCount}</p>
        </div>
        <div className={`${currentTheme.colors.card} rounded-lg p-2 sm:p-3 border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Value</p>
          <p className={`text-lg sm:text-xl font-bold ${currentTheme.accentText}`}>
            ${(state.products.reduce((sum, p) => sum + (p.cost * p.stock), 0) / 1000).toFixed(1)}k
          </p>
        </div>
        <div className={`${currentTheme.colors.card} rounded-lg p-2 sm:p-3 border ${currentTheme.colors.border}`}>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Categories</p>
          <p className={`text-lg sm:text-xl font-bold ${currentTheme.colors.text}`}>{realCategories.length}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Icons.search className={`absolute left-2 sm:left-3 top-2 sm:top-2.5 ${currentTheme.colors.textMuted} text-sm sm:text-base`} />
          <input
            type="text"
            placeholder="Search products..."
            value={state.searchTerm || ''}
            onChange={(e) => dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value })}
            className={`w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
          />
        </div>
        <select
          value={state.selectedCategory || 'All'}
          onChange={(e) => dispatch({ type: 'SET_CATEGORY', payload: e.target.value })}
          className={`px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} w-full sm:w-auto`}
        >
          <option value="All">All Categories</option>
          {realCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Products Grid - Cards */}
      {filteredProducts.length === 0 ? (
        <div className={`${currentTheme.colors.card} rounded-lg border ${currentTheme.colors.border} text-center py-8 sm:py-12`}>
          <Icons.package className="text-4xl sm:text-5xl mx-auto mb-2 sm:mb-3 text-gray-400" />
          <p className={`text-base sm:text-lg ${currentTheme.colors.textSecondary} mb-1 sm:mb-2`}>No products found</p>
          <p className={`text-xs sm:text-sm ${currentTheme.colors.textMuted} mb-3 sm:mb-4`}>
            {state.products.length === 0 ? 'Start by adding your first product' : 'Try adjusting your search'}
          </p>
          {state.products.length === 0 && (
            <button
              onClick={handleAdd}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white inline-flex items-center gap-2`}
            >
              <Icons.add className="text-sm" /> Add Product
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredProducts.map(product => {
            const productImages = imageUrls[product.id] || [];
            const currentIdx = currentImageIndex[product.id] || 0;
            const currentImage = productImages[currentIdx];
            
            return (
              <div 
                key={product.id} 
                className={`${currentTheme.colors.card} rounded-lg border ${currentTheme.colors.border} overflow-hidden hover:shadow-lg transition-shadow`}
              >
                {/* Image Section with Carousel */}
                <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 group">
                  {currentImage ? (
                    <>
                      <img 
                        src={currentImage.url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Image Type Badge */}
                      <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded-full bg-black/50 text-white backdrop-blur-sm">
                        {currentImage.type === 'local' ? '📁 Local' : '☁️ Cloud'}
                      </span>
                      
                      {/* Image Counter */}
                      {productImages.length > 1 && (
                        <span className="absolute top-2 right-2 text-xs px-2 py-1 rounded-full bg-black/50 text-white backdrop-blur-sm">
                          {currentIdx + 1}/{productImages.length}
                        </span>
                      )}
                      
                      {/* Carousel Arrows */}
                      {productImages.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              prevImage(product.id, productImages.length);
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                          >
                            <Icons.chevronLeft className="text-lg" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              nextImage(product.id, productImages.length);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                          >
                            <Icons.chevronRight className="text-lg" />
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icons.box className="text-3xl sm:text-4xl text-gray-400" />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute bottom-2 left-2">
                    {product.synced ? (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                        <Icons.check className="text-xs" /> Synced
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1">
                        <Icons.alert className="text-xs" /> Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-3 sm:p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm sm:text-base font-semibold ${currentTheme.colors.text} truncate`} title={product.name}>
                        {product.name}
                      </h3>
                      <p className={`text-xs ${currentTheme.colors.textMuted} truncate`}>
                        SKU: {product.sku}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${currentTheme.colors.accentLight} ${currentTheme.colors.accentText} ml-2`}>
                      {product.category}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs sm:text-sm">
                    <div>
                      <p className={`${currentTheme.colors.textMuted}`}>Price</p>
                      <p className={`font-bold ${currentTheme.accentText}`}>${product.price?.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className={`${currentTheme.colors.textMuted}`}>Cost</p>
                      <p className={currentTheme.colors.text}>${product.cost?.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className={`${currentTheme.colors.textMuted}`}>Stock</p>
                      <p className={`font-medium ${
                        product.stock <= 5 ? 'text-red-600' : 
                        product.stock <= 10 ? 'text-yellow-600' : 
                        currentTheme.colors.text
                      }`}>
                        {product.stock}
                        {product.stock <= 5 && ' ⚠️'}
                      </p>
                    </div>
                    <div>
                      <p className={`${currentTheme.colors.textMuted}`}>Location</p>
                      <p className={currentTheme.colors.text}>{product.location || '—'}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className={`text-xs ${currentTheme.colors.textMuted} truncate max-w-[100px]`} title={product.supplier}>
                      {product.supplier || 'No supplier'}
                    </p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleStockAdjust(product)}
                        className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600"
                        title="Adjust Stock"
                        disabled={syncing}
                      >
                        <Icons.refresh className="text-sm sm:text-base" />
                      </button>
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600"
                        title="Edit Product"
                        disabled={syncing}
                      >
                        <Icons.edit className="text-sm sm:text-base" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500"
                        title="Delete Product"
                        disabled={syncing}
                      >
                        <Icons.trash className="text-sm sm:text-base" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <CategoryManager
          categories={realCategories}
          onAdd={handleAddCategory}
          onRemove={handleRemoveCategory}
          onClose={() => setShowCategoryManager(false)}
        />
      )}

      {/* Product Form Modal */}
      {(view === 'add' || view === 'edit') && (
        <ProductForm
          product={view === 'edit' ? selectedProduct : null}
          onClose={() => {
            setView('list');
            setSelectedProduct(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}

      {/* Stock Adjustment Modal */}
      {view === 'adjust' && selectedProduct && (
        <StockAdjustmentModal
          product={selectedProduct}
          onClose={() => {
            setView('list');
            setSelectedProduct(null);
          }}
          onAdjust={handleStockAdjustComplete}
        />
      )}

      {/* Sync Status Indicator */}
      <SyncStatusIndicator />
    </div>
  );
}