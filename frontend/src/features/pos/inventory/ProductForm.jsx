// src/features/pos/inventory/ProductForm.jsx
import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useInventory } from '../context/InventoryContext';
import { opfs } from '../services/opfsService';
import { productService } from '../services/productService';
import { Icons } from '../../../components/ui/Icons';
import BarcodeGenerator from '../components/BarcodeGenerator';
import CloudinaryUpload from '../components/CloudinaryUpload';

export default function ProductForm({ product, onClose, onSubmit }) {
  // ===== ALL HOOKS MUST BE CALLED FIRST =====
  const { theme, getTheme } = useTheme();
  const { state, dispatch } = useInventory();
  const currentTheme = getTheme(theme);

  // ===== HELPER FUNCTIONS (can now safely use state) =====
  const generateSKU = () => {
    const prefix = 'SKU';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}${random}`;
  };

  // Generate unique SKU with collision detection for initial state
  const getInitialSKU = () => {
    if (product?.sku) return product.sku;
    
    const usedSKUs = new Set(state?.products?.map(p => p.sku) || []);
    let newSKU;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      newSKU = generateSKU();
      attempts++;
      if (attempts > maxAttempts) {
        // Fallback: add timestamp to ensure uniqueness
        newSKU = `SKU-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        break;
      }
    } while (usedSKUs.has(newSKU));
    
    return newSKU;
  };

  // ===== STATE DECLARATIONS =====
  const [formData, setFormData] = useState({
    id: product?.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: product?.name || '',
    sku: getInitialSKU(),
    barcode: product?.barcode || '',
    price: product?.price || '',
    cost: product?.cost || '',
    stock: product?.stock || '',
    category: product?.category || '',
    supplier: product?.supplier || '',
    location: product?.location || '',
    reorderPoint: product?.reorderPoint || 5,
    description: product?.description || '',
    localImages: product?.localImages || [],
    cloudImages: product?.cloudImages || [],
    localMainImage: product?.localMainImage || null,
    cloudMainImage: product?.cloudMainImage || null,
    synced: product?.synced || false,
    syncRequired: product?.syncRequired || true,
    createdAt: product?.createdAt || null,
    updatedAt: product?.updatedAt || null
  });

  const [showBarcodeGen, setShowBarcodeGen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState('local');
  const [imagePreviews, setImagePreviews] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveMessageType, setSaveMessageType] = useState('');
  const [activeTab, setActiveTab] = useState('local');
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);

  // ===== EFFECTS =====
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

  // Initialize previews from existing images
  useEffect(() => {
    const loadExistingPreviews = async () => {
      const previews = [];
      
      // Load local images
      if (formData.localImages?.length > 0) {
        for (const imagePath of formData.localImages) {
          try {
            const fileName = imagePath.split('/').pop();
            const file = await opfs.readFile(fileName, 'products');
            if (file && file.size > 0) {
              previews.push({
                url: URL.createObjectURL(file),
                type: 'local',
                path: imagePath,
                isMain: imagePath === formData.localMainImage
              });
            }
          } catch (error) {
            console.debug('No local image for product', imagePath);
          }
        }
      }
      
      // Load cloud images
      if (formData.cloudImages?.length > 0) {
        formData.cloudImages.forEach((img, index) => {
          if (img?.url) {
            previews.push({
              url: img.url,
              type: 'cloud',
              publicId: img.publicId,
              isMain: img.isMain || (index === 0 && !formData.localMainImage)
            });
          }
        });
      }
      
      setImagePreviews(previews);
    };

    loadExistingPreviews();

    return () => {
      imagePreviews.forEach(preview => {
        if (preview.type === 'local' && preview.url?.startsWith('blob:')) {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, [formData.localImages, formData.cloudImages, formData.localMainImage]);

  // ===== DERIVED VALUES =====
  const existingCategories = state.categories.filter(c => c !== 'All');
  const view = product ? 'edit' : 'add';

  // ===== VALIDATION =====
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name?.trim()) errors.name = 'Product name is required';
    if (!formData.sku?.trim()) errors.sku = 'SKU is required';
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      errors.price = 'Price must be greater than 0';
    }
    
    if (!formData.cost || parseFloat(formData.cost) <= 0) {
      errors.cost = 'Cost must be greater than 0';
    } else if (parseFloat(formData.cost) >= parseFloat(formData.price)) {
      errors.cost = 'Cost must be less than selling price';
    }
    
    if (!formData.stock || parseInt(formData.stock) < 0) errors.stock = 'Stock must be 0 or greater';
    if (!formData.category) errors.category = 'Category is required';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ===== EVENT HANDLERS =====
  const handleGenerateSKU = () => {
    const usedSKUs = new Set(state.products.map(p => p.sku));
    let newSKU;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      newSKU = generateSKU();
      attempts++;
      if (attempts > maxAttempts) {
        newSKU = `SKU-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        break;
      }
    } while (usedSKUs.has(newSKU));
    
    setFormData({ ...formData, sku: newSKU });
  };

  const handleLocalImagesUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // Filter valid image files
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        console.warn(`Skipping non-image file: ${file.name}`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        console.warn(`File too large (max 5MB): ${file.name}`);
        return false;
      }
      if (file.size === 0) {
        console.warn(`File is empty: ${file.name}`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      setSaveMessage('No valid image files selected');
      setSaveMessageType('error');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    if (validFiles.length < files.length) {
      setSaveMessage(`${files.length - validFiles.length} file(s) were skipped (invalid format or too large)`);
      setSaveMessageType('warning');
    }

    setUploading(true);
    setUploadMethod('local');

    try {
      const newPreviews = [];
      const newLocalImages = [];
      
      for (const file of validFiles) {
        const arrayBuffer = await file.arrayBuffer();
        if (arrayBuffer.byteLength === 0) {
          console.warn(`File appears empty: ${file.name}`);
          continue;
        }

        const reader = new FileReader();
        const previewUrl = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 6);
        const fileName = `${formData.id}_${timestamp}_${random}.jpg`;
        await opfs.saveFile(fileName, file, 'products');
        const imagePath = `products/${fileName}`;

        newPreviews.push({
          url: previewUrl,
          type: 'local',
          path: imagePath,
          isMain: imagePreviews.length === 0 && newPreviews.length === 0
        });
        
        newLocalImages.push(imagePath);
      }

      if (newPreviews.length > 0) {
        setImagePreviews([...imagePreviews, ...newPreviews]);
        setFormData({
          ...formData,
          localImages: [...(formData.localImages || []), ...newLocalImages],
          localMainImage: formData.localMainImage || newLocalImages[0] || null,
          cloudMainImage: null
        });

        setSaveMessage(`${newPreviews.length} image(s) saved locally`);
        setSaveMessageType('success');
      } else {
        setSaveMessage('No valid images could be processed');
        setSaveMessageType('error');
      }
    } catch (error) {
      console.error('Failed to upload images to OPFS:', error);
      setSaveMessage('Failed to upload images');
      setSaveMessageType('error');
    } finally {
      setUploading(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleCloudinaryUpload = (imageData) => {
    if (!imageData?.url) {
      setSaveMessage('Invalid image data received');
      setSaveMessageType('error');
      return;
    }

    const newPreview = {
      url: imageData.url,
      type: 'cloud',
      publicId: imageData.publicId,
      isMain: imagePreviews.length === 0
    };

    setImagePreviews([...imagePreviews, newPreview]);
    setUploadMethod('cloudinary');
    
    setFormData({
      ...formData,
      cloudImages: [...(formData.cloudImages || []), imageData],
      cloudMainImage: formData.cloudMainImage || imageData.url,
      localMainImage: null
    });

    setSaveMessage('Image uploaded to cloud');
    setSaveMessageType('success');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const setAsMainImage = (index) => {
    if (!imagePreviews[index]) return;
    
    const updatedPreviews = imagePreviews.map((img, i) => ({
      ...img,
      isMain: i === index
    }));
    
    setImagePreviews(updatedPreviews);

    const mainImage = imagePreviews[index];
    
    if (mainImage.type === 'local') {
      setFormData({
        ...formData,
        localMainImage: mainImage.path,
        cloudMainImage: null
      });
    } else {
      setFormData({
        ...formData,
        cloudMainImage: mainImage.url,
        localMainImage: null
      });
    }
  };

  const removeImage = async (index) => {
    const imageToRemove = imagePreviews[index];
    if (!imageToRemove) return;
    
    if (imageToRemove.type === 'local') {
      try {
        const fileName = imageToRemove.path.split('/').pop();
        await opfs.deleteFile(fileName, 'products');
      } catch (error) {
        console.error('Failed to delete local file:', error);
      }
      
      const updatedLocalImages = formData.localImages.filter(path => path !== imageToRemove.path);
      setFormData({
        ...formData,
        localImages: updatedLocalImages,
        localMainImage: formData.localMainImage === imageToRemove.path 
          ? (updatedLocalImages[0] || null) 
          : formData.localMainImage
      });
    } else {
      const updatedCloudImages = formData.cloudImages.filter(img => img.url !== imageToRemove.url);
      setFormData({
        ...formData,
        cloudImages: updatedCloudImages,
        cloudMainImage: formData.cloudMainImage === imageToRemove.url
          ? (updatedCloudImages[0]?.url || null)
          : formData.cloudMainImage
      });
    }

    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
    
    if (imageToRemove.isMain && updatedPreviews.length > 0) {
      updatedPreviews[0].isMain = true;
    }
    
    setImagePreviews(updatedPreviews);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setShowCamera(true);
      setUploadMethod('camera');
      setActiveTab('camera');
    } catch (error) {
      console.error('Camera error:', error);
      setSaveMessage('Could not access camera');
      setSaveMessageType('error');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob || blob.size === 0) {
          setSaveMessage('Failed to capture photo');
          setSaveMessageType('error');
          return;
        }

        setUploading(true);

        try {
          const reader = new FileReader();
          const previewUrl = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });

          const fileName = `${formData.id}_${Date.now()}_camera.jpg`;
          await opfs.saveFile(fileName, blob, 'products');
          const imagePath = `products/${fileName}`;

          const newPreview = {
            url: previewUrl,
            type: 'local',
            path: imagePath,
            isMain: imagePreviews.length === 0
          };

          setImagePreviews([...imagePreviews, newPreview]);
          setFormData({
            ...formData,
            localImages: [...(formData.localImages || []), imagePath],
            localMainImage: formData.localMainImage || imagePath,
            cloudMainImage: null
          });

          stopCamera();
          setSaveMessage('Photo captured and saved locally');
          setSaveMessageType('success');
        } catch (error) {
          console.error('Failed to save photo:', error);
          setSaveMessage('Failed to save photo');
          setSaveMessageType('error');
        } finally {
          setUploading(false);
          setTimeout(() => setSaveMessage(''), 3000);
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const handleAddNewCategory = () => {
    if (newCategory.trim()) {
      dispatch({ type: 'ADD_CATEGORY', payload: newCategory.trim() });
      setFormData({ ...formData, category: newCategory.trim() });
      setNewCategory('');
      setIsAddingNewCategory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSaveMessage('Please fix validation errors');
      setSaveMessageType('error');
      return;
    }

    setSaving(true);
    setSaveMessage('');

    try {
      const finalFormData = {
        ...formData,
        price: parseFloat(formData.price),
        cost: parseFloat(formData.cost),
        stock: parseInt(formData.stock, 10),
        reorderPoint: parseInt(formData.reorderPoint, 10) || 5,
        uploadMethod,
        updatedAt: new Date().toISOString(),
        synced: false,
        syncRequired: true
      };

      const files = selectedFiles;

      const localResult = await productService.saveProductLocally(finalFormData, files);
      
      if (!localResult.success) {
        throw new Error(localResult.error || 'Failed to save locally');
      }

      if (view === 'add') {
        dispatch({ type: 'ADD_PRODUCT', payload: localResult.product });
      } else {
        dispatch({ type: 'UPDATE_PRODUCT', payload: localResult.product });
      }

      if (onlineStatus) {
        try {
          setSaveMessage('Saving and syncing to cloud...');
          const syncResult = await productService.syncProductToCloud(localResult.productId);
          
          if (syncResult.success) {
            dispatch({ type: 'UPDATE_PRODUCT', payload: syncResult.product });
            setSaveMessage('✅ Product saved and synced to cloud!');
            setSaveMessageType('success');
            if (onSubmit) onSubmit(syncResult.product);
          } else {
            setSaveMessage('⚠️ Product saved locally. Cloud sync will retry.');
            setSaveMessageType('warning');
            if (onSubmit) onSubmit(localResult.product);
          }
        } catch (syncError) {
          console.error('Sync error:', syncError);
          setSaveMessage('📴 Product saved locally. Will sync when online.');
          setSaveMessageType('warning');
          if (onSubmit) onSubmit(localResult.product);
        }
      } else {
        setSaveMessage('📴 Product saved locally. Will sync when online.');
        setSaveMessageType('warning');
        if (onSubmit) onSubmit(localResult.product);
      }

      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Save failed:', error);
      setSaveMessage(`❌ Failed to save: ${error.message}`);
      setSaveMessageType('error');
      setSaving(false);
    }
  };

  // ===== RENDER =====
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className={`w-full max-w-6xl ${currentTheme.colors.card} rounded-xl shadow-2xl mx-auto`}>
        {/* Header */}
        <div className={`p-4 sm:p-6 border-b ${currentTheme.colors.border} flex justify-between items-center`}>
          <h2 className={`text-lg sm:text-xl font-semibold ${currentTheme.colors.text} truncate pr-4`}>
            {view === 'add' ? 'Add New Product' : 'Edit Product'}
          </h2>
          <button 
            type="button"
            onClick={onClose} 
            className={`p-2 rounded-lg ${currentTheme.colors.hover} flex-shrink-0`}
            disabled={saving}
          >
            <Icons.x className="text-xl sm:text-2xl" />
          </button>
        </div>

        {/* Online/Offline Status */}
        <div className={`px-4 sm:px-6 py-2 ${onlineStatus ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'} border-b ${currentTheme.colors.border}`}>
          <p className={`text-xs sm:text-sm flex items-center gap-1 ${onlineStatus ? 'text-green-600' : 'text-yellow-600'}`}>
            <span className={`w-2 h-2 rounded-full ${onlineStatus ? 'bg-green-500' : 'bg-yellow-500'}`} />
            {onlineStatus ? 'Online - Cloud sync enabled' : 'Offline - Saving locally'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Save Message */}
          {saveMessage && (
            <div className={`p-3 sm:p-4 rounded-lg text-sm sm:text-base ${
              saveMessageType === 'success' ? 'bg-green-100 text-green-700' :
              saveMessageType === 'warning' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {saveMessage}
            </div>
          )}

          {/* Image Gallery Section */}
          <div className="mb-6 sm:mb-8">
            <label className={`text-sm sm:text-base ${currentTheme.colors.textSecondary} block mb-2 sm:mb-3 font-medium`}>
              Product Images ({imagePreviews.length})
            </label>
            
            {/* Image Gallery Grid */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 mb-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <div className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                      preview.isMain ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 dark:border-gray-700'
                    }`}>
                      <img 
                        src={preview.url} 
                        alt={`Product ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/150?text=Error';
                        }}
                      />
                      
                      {/* Image Type Badge */}
                      <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded-full bg-black/50 text-white">
                        {preview.type === 'local' ? '📁' : '☁️'}
                      </span>
                      
                      {/* Main Image Badge */}
                      {preview.isMain && (
                        <span className="absolute top-1 right-1 text-xs px-2 py-1 bg-blue-500 text-white rounded-full">
                          Main
                        </span>
                      )}
                      
                      {/* Overlay Buttons */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        {!preview.isMain && (
                          <button
                            type="button"
                            onClick={() => setAsMainImage(index)}
                            className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                            title="Set as main image"
                          >
                            <Icons.star className="text-sm" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                          title="Remove image"
                        >
                          <Icons.trash className="text-sm" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Image Upload Tabs */}
            <div className="border rounded-lg overflow-hidden">
              <div className="flex border-b">
                <button
                  type="button"
                  onClick={() => setActiveTab('local')}
                  className={`flex-1 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium ${
                    activeTab === 'local'
                      ? 'bg-blue-500 text-white'
                      : `${currentTheme.colors.hover} ${currentTheme.colors.text}`
                  }`}
                >
                  📁 Local Upload
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('cloud')}
                  className={`flex-1 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium ${
                    activeTab === 'cloud'
                      ? 'bg-blue-500 text-white'
                      : `${currentTheme.colors.hover} ${currentTheme.colors.text}`
                  }`}
                >
                  ☁️ Cloudinary
                </button>
                <button
                  type="button"
                  onClick={startCamera}
                  className={`flex-1 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium ${
                    activeTab === 'camera'
                      ? 'bg-blue-500 text-white'
                      : `${currentTheme.colors.hover} ${currentTheme.colors.text}`
                  }`}
                >
                  📸 Camera
                </button>
              </div>

              <div className="p-3 sm:p-4">
                {activeTab === 'local' && (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLocalImagesUpload}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || saving}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex items-center justify-center gap-2 text-sm sm:text-base`}
                    >
                      <Icons.upload className="text-lg" />
                      Select Multiple Images
                    </button>
                    <p className="text-xs text-center mt-2 text-gray-500">
                      Supports multiple images (JPEG, PNG, GIF) - Max 5MB each
                    </p>
                  </div>
                )}

                {activeTab === 'cloud' && (
                  <CloudinaryUpload
                    onUploadComplete={handleCloudinaryUpload}
                    multiple={true}
                    buttonText="Upload to Cloudinary"
                    disabled={uploading || saving}
                  />
                )}

                {activeTab === 'camera' && !showCamera && (
                  <div className="text-center">
                    <p className="text-sm mb-3">Click the camera button to start</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={uploading || saving}
                      className={`px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white`}
                    >
                      Open Camera
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Product Name */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-1">
              <label className={`text-xs sm:text-sm ${currentTheme.colors.textSecondary} block mb-1`}>
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 text-sm sm:text-base rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} ${
                  validationErrors.name ? 'border-red-500' : ''
                }`}
                placeholder="Enter product name"
                disabled={saving}
              />
              {validationErrors.name && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.name}</p>
              )}
            </div>
            
            {/* SKU with Generate Button */}
            <div>
              <label className={`text-xs sm:text-sm ${currentTheme.colors.textSecondary} block mb-1`}>
                SKU <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className={`flex-1 px-3 py-2 text-sm sm:text-base rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} ${
                    validationErrors.sku ? 'border-red-500' : ''
                  }`}
                  placeholder="SKU"
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={handleGenerateSKU}
                  className={`px-3 py-2 rounded-lg ${currentTheme.colors.accentLight} ${currentTheme.colors.accentText} text-sm whitespace-nowrap`}
                  title="Generate unique SKU"
                >
                  <Icons.refresh className="text-lg" />
                </button>
              </div>
              {validationErrors.sku && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.sku}</p>
              )}
            </div>

            {/* Barcode */}
            <div>
              <label className={`text-xs sm:text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Barcode</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className={`flex-1 px-3 py-2 text-sm sm:text-base rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  placeholder="Enter or generate barcode"
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={() => setShowBarcodeGen(true)}
                  className={`px-3 py-2 rounded-lg ${currentTheme.colors.accentLight} ${currentTheme.colors.accentText}`}
                  title="Generate Barcode"
                  disabled={saving}
                >
                  <Icons.barcode className="text-lg" />
                </button>
              </div>
            </div>

            {/* Price */}
            <div>
              <label className={`text-xs sm:text-sm ${currentTheme.colors.textSecondary} block mb-1`}>
                Price ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0.01"
                value={formData.price}
                onChange={(e) => {
                  setFormData({ ...formData, price: e.target.value });
                  if (validationErrors.cost) {
                    setValidationErrors({ ...validationErrors, cost: null });
                  }
                }}
                className={`w-full px-3 py-2 text-sm sm:text-base rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} ${
                  validationErrors.price ? 'border-red-500' : ''
                }`}
                placeholder="0.00"
                disabled={saving}
              />
              {validationErrors.price && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.price}</p>
              )}
            </div>

            {/* Cost */}
            <div>
              <label className={`text-xs sm:text-sm ${currentTheme.colors.textSecondary} block mb-1`}>
                Cost ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className={`w-full px-3 py-2 text-sm sm:text-base rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} ${
                  validationErrors.cost ? 'border-red-500' : ''
                }`}
                placeholder="0.00"
                disabled={saving}
              />
              {validationErrors.cost && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.cost}</p>
              )}
              {formData.price && formData.cost && parseFloat(formData.cost) >= parseFloat(formData.price) && (
                <p className="text-xs text-red-500 mt-1">⚠️ Cost must be less than price</p>
              )}
            </div>

            {/* Stock */}
            <div>
              <label className={`text-xs sm:text-sm ${currentTheme.colors.textSecondary} block mb-1`}>
                Initial Stock <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className={`w-full px-3 py-2 text-sm sm:text-base rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} ${
                  validationErrors.stock ? 'border-red-500' : ''
                }`}
                placeholder="0"
                disabled={saving}
              />
              {validationErrors.stock && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.stock}</p>
              )}
            </div>

            {/* Category */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-1">
              <label className={`text-xs sm:text-sm ${currentTheme.colors.textSecondary} block mb-1`}>
                Category <span className="text-red-500">*</span>
              </label>
              
              {!isAddingNewCategory ? (
                <div className="flex gap-2">
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`flex-1 px-3 py-2 text-sm sm:text-base rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} ${
                      validationErrors.category ? 'border-red-500' : ''
                    }`}
                    disabled={saving}
                  >
                    <option value="">Select category</option>
                    {existingCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCategory(true)}
                    className={`px-3 py-2 rounded-lg ${currentTheme.colors.accentLight} ${currentTheme.colors.accentText} text-sm whitespace-nowrap`}
                    title="Add new category"
                  >
                    <Icons.add className="text-lg" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category name"
                    className={`flex-1 px-3 py-2 text-sm sm:text-base rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddNewCategory}
                    className="px-3 py-2 rounded-lg bg-green-500 text-white text-sm whitespace-nowrap hover:bg-green-600"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNewCategory(false);
                      setNewCategory('');
                    }}
                    className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm whitespace-nowrap"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {validationErrors.category && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.category}</p>
              )}
            </div>

            {/* Supplier */}
            <div>
              <label className={`text-xs sm:text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Supplier</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className={`w-full px-3 py-2 text-sm sm:text-base rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                placeholder="Supplier name"
                disabled={saving}
              />
            </div>

            {/* Location */}
            <div>
              <label className={`text-xs sm:text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className={`w-full px-3 py-2 text-sm sm:text-base rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                placeholder="Aisle-Bin"
                disabled={saving}
              />
            </div>

            {/* Reorder Point */}
            <div>
              <label className={`text-xs sm:text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Reorder Point</label>
              <input
                type="number"
                min="0"
                value={formData.reorderPoint}
                onChange={(e) => setFormData({ ...formData, reorderPoint: e.target.value })}
                className={`w-full px-3 py-2 text-sm sm:text-base rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                placeholder="5"
                disabled={saving}
              />
            </div>
          </div>

          {/* Description - Full Width */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-3">
            <label className={`text-xs sm:text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
              className={`w-full px-3 py-2 text-sm sm:text-base rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
              placeholder="Product description..."
              disabled={saving}
            />
          </div>

          {/* Footer */}
          <div className={`pt-4 sm:pt-6 border-t ${currentTheme.colors.border} flex flex-col sm:flex-row justify-end gap-3`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text} text-sm sm:text-base order-2 sm:order-1`}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white font-semibold flex items-center justify-center gap-2 text-sm sm:text-base order-1 sm:order-2 ${
                saving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {saving ? (
                <>
                  <Icons.refresh className="animate-spin text-lg" />
                  Saving...
                </>
              ) : (
                view === 'add' ? 'Add Product' : 'Update Product'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className={`w-full max-w-lg ${currentTheme.colors.card} rounded-xl p-4 sm:p-6`}>
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-semibold">Take Product Photo</h3>
              <button onClick={stopCamera} className="p-2 rounded-lg hover:bg-gray-100">
                <Icons.x className="text-xl" />
              </button>
            </div>
            
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full aspect-square bg-black rounded-lg"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="flex flex-col sm:flex-row gap-3 mt-3 sm:mt-4">
              <button
                type="button"
                onClick={stopCamera}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm sm:text-base order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm sm:text-base order-1 sm:order-2"
              >
                Capture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Generator Modal */}
      {showBarcodeGen && (
        <BarcodeGenerator
          product={product}
          onClose={() => setShowBarcodeGen(false)}
          onSave={(barcode) => {
            setFormData({ ...formData, barcode });
            setShowBarcodeGen(false);
          }}
        />
      )}
    </div>
  );
}