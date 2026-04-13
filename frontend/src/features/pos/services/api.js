// src/features/pos/services/api.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

class API {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    this.currentStoreId = null;
    this.currentUserId = null;

    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.code === 'ERR_NETWORK') {
          console.error('🌐 Network error - backend may be down');
        } else if (error.response) {
          if (error.response.status >= 500) {
            console.error(`❌ Server Error ${error.response.status}:`, error.response.data);
          } else if (error.response.status >= 400 && error.response.status < 500) {
            if (error.response.status !== 404) {
              console.warn(`⚠️ Client Error ${error.response.status}:`, error.response.data);
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token) {
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }

  setCurrentUser(userId) {
    this.currentUserId = userId;
    console.log('👤 Current user set to:', userId);
  }

  setCurrentStore(storeId) {
    this.currentStoreId = storeId;
    if (storeId) {
      localStorage.setItem('currentStoreId', storeId);
      this.client.defaults.params = { ...this.client.defaults.params, storeId };
    } else {
      localStorage.removeItem('currentStoreId');
      delete this.client.defaults.params?.storeId;
    }
    console.log('📌 Current store set to:', storeId);
  }

  getCurrentStoreId() {
    if (this.currentStoreId) return this.currentStoreId;
    const storedId = localStorage.getItem('currentStoreId');
    if (storedId) {
      this.currentStoreId = storedId;
      return storedId;
    }
    return null;
  }

  getCurrentUserId() {
    return this.currentUserId;
  }

  // ==================== BASE HTTP METHODS ====================

  async get(url, config = {}) {
    const storeId = this.getCurrentStoreId();
    const params = { ...config.params };
    if (storeId && !url.includes('/auth') && !url.includes('/stores') && !url.includes('/health')) {
      params.storeId = storeId;
    }
    try {
      const response = await this.client.get(url, { ...config, params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async post(url, data, config = {}) {
    const storeId = this.getCurrentStoreId();
    let requestData = { ...data };
    
    if (storeId && !url.includes('/auth') && !url.includes('/stores') && !url.includes('/health') && !url.includes('/cloudinary')) {
      requestData.storeId = storeId;
    }
    
    try {
      const response = await this.client.post(url, requestData, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async put(url, data, config = {}) {
    const storeId = this.getCurrentStoreId();
    let requestData = { ...data };
    
    if (storeId && !url.includes('/auth') && !url.includes('/stores')) {
      requestData.storeId = storeId;
    }
    
    try {
      const response = await this.client.put(url, requestData, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async delete(url, config = {}) {
    const storeId = this.getCurrentStoreId();
    const params = { ...config.params };
    if (storeId && !url.includes('/auth') && !url.includes('/stores')) {
      params.storeId = storeId;
    }
    
    try {
      const response = await this.client.delete(url, { ...config, params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async patch(url, data, config = {}) {
    const storeId = this.getCurrentStoreId();
    let requestData = { ...data };
    
    if (storeId && !url.includes('/auth')) {
      requestData.storeId = storeId;
    }
    
    try {
      const response = await this.client.patch(url, requestData, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ==================== AUTH ENDPOINTS ====================

  async login(email, password) {
    try {
      console.log('🔐 Logging in user:', email);
      const response = await this.client.post('/auth/login', { email, password });
      console.log('✅ Login successful');
      
      if (response.data.user?.id) {
        this.setCurrentUser(response.data.user.id);
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Login error:', error.response?.data?.error || error.message);
      throw error;
    }
  }

  async register(userData) {
    try {
      console.log('📝 Registering new user:', userData.email);
      const response = await this.client.post('/auth/register', userData);
      console.log('✅ Registration successful');
      
      if (response.data.user?.id) {
        this.setCurrentUser(response.data.user.id);
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Registration error:', error.response?.data?.error || error.message);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const response = await this.client.get('/auth/me');
      
      if (response.data.user?.id) {
        this.setCurrentUser(response.data.user.id);
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Get current user error:', error.message);
      throw error;
    }
  }

  async updateProfile(profileData) {
    try {
      console.log('📝 Updating user profile');
      const response = await this.client.put('/auth/profile', profileData);
      console.log('✅ Profile updated successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Update profile error:', error.message);
      throw error;
    }
  }

  async logout() {
    try {
      const response = await this.client.post('/auth/logout');
      console.log('✅ Logout successful');
      this.currentUserId = null;
      return response.data;
    } catch (error) {
      console.error('❌ Logout error:', error.message);
      throw error;
    }
  }

  async forgotPassword(email) {
    try {
      console.log('🔐 Password reset requested for:', email);
      const response = await this.client.post('/auth/forgot-password', { email });
      console.log('✅ Password reset email sent');
      return response.data;
    } catch (error) {
      console.error('❌ Forgot password error:', error.message);
      throw error;
    }
  }

  async resetPassword(token, newPassword) {
    try {
      console.log('🔐 Resetting password with token');
      const response = await this.client.post('/auth/reset-password', { token, newPassword });
      console.log('✅ Password reset successful');
      return response.data;
    } catch (error) {
      console.error('❌ Reset password error:', error.message);
      throw error;
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      console.log('🔐 Changing password');
      const response = await this.client.put('/auth/change-password', { currentPassword, newPassword });
      console.log('✅ Password changed successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Change password error:', error.message);
      throw error;
    }
  }

  // ==================== USER MANAGEMENT ENDPOINTS ====================

  async getAllUsers() {
    try {
      console.log('👥 Fetching all users');
      const response = await this.client.get('/auth/users');
      return { success: true, users: response.data.users || response.data };
    } catch (error) {
      console.error('❌ Get users error:', error.message);
      return { success: false, error: error.message, users: [] };
    }
  }

  async getUser(id) {
    try {
      console.log(`👤 Fetching user: ${id}`);
      const response = await this.client.get(`/auth/users/${id}`);
      return { success: true, user: response.data };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: false, user: null, notFound: true };
      }
      console.error('❌ Get user error:', error.message);
      return { success: false, error: error.message, user: null };
    }
  }

  async createUser(userData) {
    try {
      console.log('📝 Creating new user:', userData.email);
      const response = await this.client.post('/auth/users', userData);
      console.log('✅ User created:', response.data._id);
      return { success: true, user: response.data };
    } catch (error) {
      console.error('❌ Create user error:', error.message);
      if (error.response) console.error('Server response:', error.response.data);
      return { success: false, error: error.message };
    }
  }

  async updateUser(id, userData) {
    try {
      console.log('📝 Updating user:', id);
      const response = await this.client.put(`/auth/users/${id}`, userData);
      console.log('✅ User updated:', id);
      return { success: true, user: response.data };
    } catch (error) {
      console.error('❌ Update user error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async deleteUser(id) {
    try {
      console.log('🗑️ Deleting user:', id);
      await this.client.delete(`/auth/users/${id}`);
      console.log('✅ User deleted:', id);
      return { success: true };
    } catch (error) {
      console.error('❌ Delete user error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== CLOUDINARY METHODS ====================

  async uploadImageToCloudinary(file, folder = 'pos-products', retryCount = 0) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);
    formData.append('public_id', `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

    try {
      console.log('☁️ Uploading to Cloudinary...', {
        fileName: file.name,
        fileSize: file.size,
        folder
      });

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            if (percentCompleted % 25 === 0) {
              console.log(`📤 Upload progress: ${percentCompleted}%`);
            }
          }
        }
      );

      console.log('✅ Image uploaded to Cloudinary:', {
        url: response.data.secure_url,
        publicId: response.data.public_id
      });

      return response.data;
    } catch (error) {
      console.error('❌ Cloudinary upload error:', {
        status: error.response?.status,
        message: error.response?.data?.error?.message || error.message
      });

      if (retryCount < 3) {
        console.log(`🔄 Retrying upload (${retryCount + 1}/3)...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.uploadImageToCloudinary(file, folder, retryCount + 1);
      }

      throw error;
    }
  }

  // ==================== PRODUCT ENDPOINTS ====================

  async createProduct(productData) {
    try {
      const storeId = this.getCurrentStoreId();
      if (!storeId) {
        console.error('❌ Cannot create product: No store selected');
        return { success: false, error: 'No store selected. Please select a store first.' };
      }
      
      console.log('📤 Creating product:', productData.name, 'for store:', storeId);
      const response = await this.client.post('/products', { ...productData, storeId });
      console.log('✅ Product created:', response.data._id);
      return { success: true, product: response.data, _id: response.data._id };
    } catch (error) {
      console.error('❌ Create product error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async updateProduct(id, productData) {
    try {
      const storeId = this.getCurrentStoreId();
      if (!storeId) {
        console.error('❌ Cannot update product: No store selected');
        return { success: false, error: 'No store selected. Please select a store first.' };
      }
      
      console.log('📤 Updating product:', id, 'for store:', storeId);
      const response = await this.client.put(`/products/${id}`, { ...productData, storeId });
      console.log('✅ Product updated:', id);
      return { success: true, product: response.data };
    } catch (error) {
      console.error('❌ Update product error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async deleteProduct(id) {
    try {
      const storeId = this.getCurrentStoreId();
      await this.client.delete(`/products/${id}`, { params: { storeId } });
      console.log('✅ Product deleted:', id);
      return { success: true };
    } catch (error) {
      console.error('❌ Delete product error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getAllProducts() {
    try {
      const storeId = this.getCurrentStoreId();
      if (!storeId) {
        console.warn('⚠️ No store selected, returning empty products');
        return { success: true, products: [] };
      }
      
      const response = await this.client.get('/products', { params: { storeId } });
      return { success: true, products: response.data };
    } catch (error) {
      console.error('❌ Get products error:', error.message);
      return { success: false, error: error.message, products: [] };
    }
  }

  async getProduct(id) {
    try {
      const storeId = this.getCurrentStoreId();
      const response = await this.client.get(`/products/${id}`, { params: { storeId } });
      return { success: true, product: response.data };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: false, product: null, notFound: true };
      }
      console.error('❌ Get product error:', error.message);
      return { success: false, error: error.message, product: null };
    }
  }

  async getProductsByCategory(category) {
    try {
      const storeId = this.getCurrentStoreId();
      const response = await this.client.get(`/products/category/${category}`, { params: { storeId } });
      return { success: true, products: response.data };
    } catch (error) {
      console.error('❌ Get products by category error:', error.message);
      return { success: false, error: error.message, products: [] };
    }
  }

  // ==================== TRANSACTION ENDPOINTS ====================

  async createTransaction(transactionData) {
    try {
      const storeId = this.getCurrentStoreId();
      if (!storeId) {
        console.error('❌ Cannot create transaction: No store selected');
        return { success: false, error: 'No store selected. Please select a store first.' };
      }
      
      console.log('📤 Creating transaction:', transactionData.receiptNumber, 'for store:', storeId);
      const response = await this.client.post('/transactions', { ...transactionData, storeId });
      console.log('✅ Transaction created:', response.data._id);
      return { success: true, transaction: response.data };
    } catch (error) {
      console.error('❌ Create transaction error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async syncTransaction(transactionData) {
    try {
      const storeId = this.getCurrentStoreId();
      if (!storeId) {
        console.error('❌ Cannot sync transaction: No store selected');
        return { success: false, error: 'No store selected. Please select a store first.' };
      }
      
      console.log('🔄 Syncing transaction:', transactionData.receiptNumber, 'for store:', storeId);
      
      const cleanData = JSON.parse(JSON.stringify(transactionData));
      
      delete cleanData.id;
      delete cleanData.syncRequired;
      delete cleanData.syncError;
      delete cleanData.lastSyncAttempt;
      
      if (cleanData.customer) {
        delete cleanData.customer.id;
        delete cleanData.customer._id;
        
        const validCustomer = {};
        if (cleanData.customer.name) validCustomer.name = cleanData.customer.name;
        if (cleanData.customer.email) validCustomer.email = cleanData.customer.email;
        if (cleanData.customer.loyaltyPoints) validCustomer.loyaltyPoints = cleanData.customer.loyaltyPoints;
        cleanData.customer = validCustomer;
      }
      
      if (cleanData.items && Array.isArray(cleanData.items)) {
        cleanData.items = cleanData.items.map(item => {
          const { productId, id, ...rest } = item;
          return rest;
        });
      }

      cleanData.storeId = storeId;

      console.log('📤 Sending clean transaction data to cloud:', {
        receiptNumber: cleanData.receiptNumber,
        storeId: cleanData.storeId,
        hasCustomer: !!cleanData.customer,
        customerName: cleanData.customer?.name,
        itemsCount: cleanData.items?.length
      });

      const response = await this.client.post('/transactions/sync', cleanData);
      console.log('✅ Transaction synced:', response.data.id);
      return { 
        success: true, 
        id: response.data.id, 
        transaction: response.data.transaction,
        alreadyExists: response.data.alreadyExists || false
      };
    } catch (error) {
      console.error('❌ Sync transaction error:', error.message);
      if (error.response) {
        console.error('Server response:', error.response.data);
      }
      return { success: false, error: error.message };
    }
  }

  async getAllTransactions(params = {}) {
    try {
      const storeId = this.getCurrentStoreId();
      
      if (!storeId) {
        console.warn('⚠️ No store selected, returning empty transactions');
        return { success: true, transactions: [] };
      }
      
      const response = await this.client.get('/transactions', { params: { ...params, storeId } });
      return { success: true, transactions: response.data };
    } catch (error) {
      console.error('❌ Get transactions error:', error.message);
      return { success: false, error: error.message, transactions: [] };
    }
  }

  async getTransaction(id) {
    try {
      const storeId = this.getCurrentStoreId();
      const response = await this.client.get(`/transactions/${id}`, { params: { storeId } });
      return { success: true, transaction: response.data };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: false, transaction: null, notFound: true };
      }
      console.error('❌ Get transaction error:', error.message);
      return { success: false, error: error.message, transaction: null };
    }
  }

  async getTransactionByReceipt(receiptNumber) {
    try {
      const storeId = this.getCurrentStoreId();
      const response = await this.client.get(`/transactions/receipt/${receiptNumber}`, { params: { storeId } });
      return { success: true, transaction: response.data };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: false, transaction: null, notFound: true };
      }
      console.error('❌ Get transaction by receipt error:', error.message);
      return { success: false, error: error.message, transaction: null };
    }
  }

  async updateTransaction(id, transactionData) {
    try {
      const storeId = this.getCurrentStoreId();
      console.log(`📤 Updating transaction: ${id}`, 'for store:', storeId);
      const response = await this.client.put(`/transactions/${id}`, { ...transactionData, storeId });
      console.log('✅ Transaction updated:', id);
      return { success: true, transaction: response.data };
    } catch (error) {
      console.error('❌ Update transaction error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async deleteTransaction(transactionId) {
    try {
      const storeId = this.getCurrentStoreId();
      console.log(`🗑️ Deleting transaction from cloud: ${transactionId}`);
      const response = await this.client.delete(`/transactions/${transactionId}`, { params: { storeId } });
      console.log('✅ Transaction deleted from cloud');
      return { success: true };
    } catch (error) {
      console.error('❌ Delete transaction error:', error.message);
      if (error.response?.status === 404) {
        return { success: true, alreadyDeleted: true };
      }
      return { success: false, error: error.message };
    }
  }

  async getTransactionsByDateRange(startDate, endDate) {
    try {
      const storeId = this.getCurrentStoreId();
      const response = await this.client.get('/transactions/range', {
        params: { startDate, endDate, storeId }
      });
      return { success: true, transactions: response.data };
    } catch (error) {
      console.error('❌ Get transactions by date error:', error.message);
      return { success: false, error: error.message, transactions: [] };
    }
  }

  async getTransactionsByCustomer(customerId) {
    try {
      const storeId = this.getCurrentStoreId();
      console.log(`🔍 Fetching transactions for customer: ${customerId}, store: ${storeId}`);
      const response = await this.client.get(`/customers/${customerId}/transactions`, { params: { storeId } });
      return { success: true, transactions: response.data.transactions || response.data };
    } catch (error) {
      console.error('❌ Get customer transactions error:', error.message);
      return { success: false, error: error.message, transactions: [] };
    }
  }

  async getDailySales(date) {
    try {
      const storeId = this.getCurrentStoreId();
      const response = await this.client.get('/transactions/daily', {
        params: { date: date || new Date().toISOString().split('T')[0], storeId }
      });
      return { success: true, sales: response.data };
    } catch (error) {
      console.error('❌ Get daily sales error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getSalesSummary(startDate, endDate) {
    try {
      const storeId = this.getCurrentStoreId();
      const response = await this.client.get('/transactions/summary', {
        params: { startDate, endDate, storeId }
      });
      return { success: true, summary: response.data };
    } catch (error) {
      console.error('❌ Get sales summary error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== CUSTOMER ENDPOINTS (WITH STORE & USER ISOLATION) ====================

  async createCustomer(customerData) {
    try {
      const storeId = this.getCurrentStoreId();
      if (!storeId) {
        console.error('❌ Cannot create customer: No store selected');
        return { success: false, error: 'No store selected. Please select a store first.' };
      }
      
      console.log('📤 Creating customer:', customerData.name, 'for store:', storeId);
      
      const cleanData = {
        name: customerData.name,
        email: customerData.email || undefined,
        phone: customerData.phone || undefined,
        address: customerData.address || '',
        loyaltyPoints: customerData.loyaltyPoints || 0,
        totalSpent: customerData.totalSpent || 0,
        totalPaid: customerData.totalPaid || 0,
        totalOutstanding: customerData.totalOutstanding || 0,
        notes: customerData.notes || '',
        tags: customerData.tags || [],
        storeId: storeId
      };
      
      if (customerData.address) cleanData.address = customerData.address;
      if (customerData.joinDate) cleanData.joinDate = customerData.joinDate;
      if (customerData.lastVisit) cleanData.lastVisit = customerData.lastVisit;
      if (customerData.birthDate) cleanData.birthDate = customerData.birthDate;
      
      if (!cleanData.email) delete cleanData.email;
      if (!cleanData.phone) delete cleanData.phone;
      
      console.log('📤 Sending clean customer data:', cleanData);
      
      const response = await this.client.post('/customers', cleanData);
      console.log('✅ Customer created:', response.data.customer?._id || response.data._id);
      return { success: true, customer: response.data.customer || response.data };
    } catch (error) {
      console.error('❌ Create customer error:', error.message);
      if (error.response) console.error('Server response:', error.response.data);
      return { success: false, error: error.message };
    }
  }

  async updateCustomer(id, customerData) {
    try {
      const storeId = this.getCurrentStoreId();
      if (!storeId) {
        console.error('❌ Cannot update customer: No store selected');
        return { success: false, error: 'No store selected. Please select a store first.' };
      }
      
      console.log('📤 Updating customer:', id, 'for store:', storeId);
      
      const cleanData = {
        name: customerData.name,
        email: customerData.email || undefined,
        phone: customerData.phone || undefined,
        address: customerData.address,
        loyaltyPoints: customerData.loyaltyPoints,
        totalSpent: customerData.totalSpent,
        totalPaid: customerData.totalPaid,
        totalOutstanding: customerData.totalOutstanding,
        notes: customerData.notes,
        tags: customerData.tags,
        storeId: storeId
      };
      
      if (customerData.birthDate) cleanData.birthDate = customerData.birthDate;
      if (customerData.joinDate) cleanData.joinDate = customerData.joinDate;
      if (customerData.lastVisit) cleanData.lastVisit = customerData.lastVisit;
      
      Object.keys(cleanData).forEach(key => 
        cleanData[key] === undefined && delete cleanData[key]
      );
      
      if (cleanData.email === '') delete cleanData.email;
      if (cleanData.phone === '') delete cleanData.phone;
      
      const response = await this.client.put(`/customers/${id}`, cleanData);
      console.log('✅ Customer updated:', id);
      return { success: true, customer: response.data.customer || response.data };
    } catch (error) {
      console.error('❌ Update customer error:', error.message);
      if (error.response) console.error('Server response:', error.response.data);
      return { success: false, error: error.message };
    }
  }

  async deleteCustomer(id) {
    try {
      const storeId = this.getCurrentStoreId();
      console.log(`🗑️ Deleting customer: ${id} from store: ${storeId}`);
      const response = await this.client.delete(`/customers/${id}`, { params: { storeId } });
      return { success: true, message: response.data.message || 'Customer deleted successfully' };
    } catch (error) {
      console.error('❌ Delete customer error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getAllCustomers() {
    try {
      const storeId = this.getCurrentStoreId();
      if (!storeId) {
        console.warn('⚠️ No store selected, returning empty customers');
        return { success: true, customers: [] };
      }
      
      console.log(`📤 Fetching all customers for store: ${storeId}`);
      const response = await this.client.get('/customers', { params: { storeId } });
      
      let customers = [];
      if (response.data.success && response.data.customers) {
        customers = response.data.customers;
      } else if (Array.isArray(response.data)) {
        customers = response.data;
      } else if (response.data.customers) {
        customers = response.data.customers;
      }
      
      console.log(`📦 Retrieved ${customers.length} customers for store ${storeId}`);
      return { success: true, customers };
    } catch (error) {
      console.error('❌ Get customers error:', error.message);
      return { success: false, error: error.message, customers: [] };
    }
  }

  async getCustomer(id) {
    try {
      const storeId = this.getCurrentStoreId();
      console.log(`🔍 Fetching customer by ID: ${id} for store: ${storeId}`);
      const response = await this.client.get(`/customers/${id}`, { params: { storeId } });
      return { success: true, customer: response.data.customer || response.data };
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('⚠️ Customer not found by ID');
        return { success: false, error: 'Customer not found', customer: null, notFound: true };
      }
      console.error('❌ Get customer error:', error.message);
      return { success: false, error: error.message, customer: null };
    }
  }

  async getCustomerByEmail(email) {
    try {
      const storeId = this.getCurrentStoreId();
      console.log(`🔍 Searching for customer by email: ${email} in store: ${storeId}`);
      const response = await this.client.get(`/customers/email/${encodeURIComponent(email)}`, { params: { storeId } });
      return { success: true, customer: response.data.customer || response.data };
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('⚠️ No customer found with this email');
        return { success: true, customer: null, notFound: true };
      }
      console.error('❌ Get customer by email error:', error.message);
      return { success: false, error: error.message, customer: null };
    }
  }

  async getCustomersByEmail(email) {
    try {
      const storeId = this.getCurrentStoreId();
      console.log(`🔍 Searching for customers by email: ${email} in store: ${storeId}`);
      const response = await this.client.get(`/customers/email/${encodeURIComponent(email)}`, { params: { storeId } });
      
      let customers = [];
      if (response.data.customers) {
        customers = response.data.customers;
      } else if (response.data.customer) {
        customers = [response.data.customer];
      }
      
      return { success: true, customers };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: true, customers: [] };
      }
      console.error('❌ Get customers by email error:', error.message);
      return { success: false, error: error.message, customers: [] };
    }
  }

  async searchCustomers(query) {
    try {
      const storeId = this.getCurrentStoreId();
      console.log(`🔍 Searching customers with query: "${query}" in store: ${storeId}`);
      const response = await this.client.get('/customers/search', {
        params: { q: query, storeId }
      });
      
      let customers = [];
      if (response.data.success && response.data.customers) {
        customers = response.data.customers;
      } else if (Array.isArray(response.data)) {
        customers = response.data;
      } else if (response.data.customers) {
        customers = response.data.customers;
      }
      
      console.log(`📦 Found ${customers.length} customers matching "${query}"`);
      return { success: true, customers };
    } catch (error) {
      console.error('❌ Search customers error:', error.message);
      return { success: false, error: error.message, customers: [] };
    }
  }

  async getCustomerStats() {
    try {
      const storeId = this.getCurrentStoreId();
      if (!storeId) {
        return { success: true, stats: {} };
      }
      
      console.log(`📊 Fetching customer stats for store: ${storeId}`);
      const response = await this.client.get('/customers/stats', { params: { storeId } });
      return { success: true, stats: response.data.stats || {} };
    } catch (error) {
      console.error('❌ Get customer stats error:', error.message);
      return { success: false, error: error.message, stats: {} };
    }
  }

  // ==================== STORE STATUS MANAGEMENT ====================

  async toggleStoreStatus(storeId) {
    try {
      console.log(`🔄 Toggling store status: ${storeId}`);
      const response = await this.client.patch(`/stores/${storeId}/toggle-status`);
      
      console.log('📦 Toggle response:', response.data);
      
      const isOpen = response.data.isOpen !== undefined 
        ? response.data.isOpen 
        : response.data.store?.open;
      
      console.log(`✅ Store status toggled: ${isOpen ? 'Open' : 'Closed'}`);
      
      return { 
        success: true, 
        store: response.data.store, 
        isOpen: isOpen, 
        message: response.data.message 
      };
    } catch (error) {
      console.error('❌ Toggle store status error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async updateStoreHours(storeId, openTime, closeTime) {
    try {
      console.log(`📤 Updating store hours: ${storeId} - ${openTime} to ${closeTime}`);
      const response = await this.client.put(`/stores/${storeId}/hours`, { openTime, closeTime });
      console.log('✅ Store hours updated');
      return { 
        success: true, 
        store: response.data.store, 
        message: response.data.message 
      };
    } catch (error) {
      console.error('❌ Update store hours error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== STOCK HISTORY METHODS ====================

  async addStockHistory(productId, historyData) {
    try {
      const storeId = this.getCurrentStoreId();
      console.log(`📝 Adding stock history for product: ${productId} in store: ${storeId}`);
      const response = await this.client.post(`/products/${productId}/stock-history`, { ...historyData, storeId });
      return { success: true, history: response.data.history };
    } catch (error) {
      console.error('❌ Add stock history error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getStockHistory(productId, params = {}) {
    try {
      const storeId = this.getCurrentStoreId();
      const response = await this.client.get(`/products/${productId}/stock-history`, { params: { ...params, storeId } });
      return { success: true, history: response.data.history, total: response.data.total };
    } catch (error) {
      console.error('❌ Get stock history error:', error.message);
      return { success: false, error: error.message, history: [] };
    }
  }

  // ==================== SYNC ENDPOINTS ====================

  async getSyncData(since) {
    try {
      const storeId = this.getCurrentStoreId();
      const response = await this.client.get(`/sync/data`, { params: { since, storeId } });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Get sync data error:', error.message);
      return { success: false, data: { products: [], customers: [], transactions: [] }, error: error.message };
    }
  }

  async syncAll(data) {
    try {
      const storeId = this.getCurrentStoreId();
      const response = await this.client.post('/sync/all', { ...data, storeId });
      return { success: true, result: response.data };
    } catch (error) {
      console.error('❌ Sync all error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== HEALTH CHECK ====================

  async checkConnection() {
    try {
      const response = await this.client.get('/health');
      const isConnected = response.data.status === 'ok';
      console.log(`🌐 Backend connection: ${isConnected ? '✅' : '❌'}`);
      return isConnected;
    } catch (error) {
      console.error('🌐 Backend connection: ❌', error.message);
      return false;
    }
  }

  // ==================== STORE ENDPOINTS ====================

  async getAllStores() {
    try {
      console.log('📤 Fetching stores for current user...');
      const response = await this.client.get('/stores');
      
      let stores = [];
      if (response.data.success && Array.isArray(response.data.stores)) {
        stores = response.data.stores;
      } else if (Array.isArray(response.data)) {
        stores = response.data;
      } else if (response.data.stores && Array.isArray(response.data.stores)) {
        stores = response.data.stores;
      }
      
      console.log(`📦 Retrieved ${stores.length} stores for current user`);
      
      stores.forEach(store => {
        console.log(`  - Store: ${store.name} (ID: ${store._id}, Open: ${store.open})`);
      });
      
      return { success: true, stores };
    } catch (error) {
      console.error('❌ Get stores error:', error.message);
      return { success: false, error: error.message, stores: [] };
    }
  }

  async getStore(id) {
    try {
      console.log(`📤 Fetching store: ${id}`);
      const response = await this.client.get(`/stores/${id}`);
      return { success: true, store: response.data.store || response.data };
    } catch (error) {
      console.error('❌ Get store error:', error.message);
      return { success: false, error: error.message, store: null };
    }
  }

  async createStore(storeData) {
    try {
      console.log('📤 Creating store:', storeData.name);
      const response = await this.client.post('/stores', storeData);
      
      const storeId = response.data._id || response.data.id || response.data.store?._id;
      
      console.log('✅ Store created successfully');
      console.log('📦 Store ID:', storeId);
      
      return { 
        success: true, 
        store: response.data.store || response.data,
        _id: storeId,
        id: storeId
      };
    } catch (error) {
      console.error('❌ Create store error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async updateStore(id, storeData) {
    try {
      console.log('📤 Updating store:', id);
      const response = await this.client.put(`/stores/${id}`, storeData);
      console.log('✅ Store updated:', id);
      return { success: true, store: response.data.store || response.data };
    } catch (error) {
      console.error('❌ Update store error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async deleteStore(id) {
    try {
      console.log('📤 Deleting store:', id);
      await this.client.delete(`/stores/${id}`);
      console.log('✅ Store deleted:', id);
      return { success: true };
    } catch (error) {
      console.error('❌ Delete store error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getDefaultStore() {
    try {
      console.log('📤 Fetching default store for current user...');
      const response = await this.client.get('/stores/default');
      return { success: true, store: response.data.store || response.data };
    } catch (error) {
      console.error('❌ Get default store error:', error.message);
      return { success: false, error: error.message, store: null };
    }
  }

  async setDefaultStore(id) {
    try {
      console.log('📤 Setting default store:', id);
      const response = await this.client.put(`/stores/${id}/default`);
      console.log('✅ Default store set:', id);
      return { success: true, store: response.data.store || response.data };
    } catch (error) {
      console.error('❌ Set default store error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== STORE USER ASSIGNMENT ENDPOINTS ====================

  async getStoreUsers(storeId) {
    try {
      console.log(`📤 Fetching users for store: ${storeId}`);
      const response = await this.client.get(`/stores/${storeId}/users`);
      return { success: true, users: response.data.users || [] };
    } catch (error) {
      console.error('❌ Get store users error:', error.message);
      return { success: false, error: error.message, users: [] };
    }
  }

  async assignUserToStore(storeId, userId) {
    try {
      console.log(`📤 Assigning user ${userId} to store ${storeId}`);
      const response = await this.client.post(`/stores/${storeId}/users/${userId}`);
      console.log('✅ User assigned to store');
      return { success: true, store: response.data.store, message: response.data.message };
    } catch (error) {
      console.error('❌ Assign user to store error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async removeUserFromStore(storeId, userId) {
    try {
      console.log(`📤 Removing user ${userId} from store ${storeId}`);
      const response = await this.client.delete(`/stores/${storeId}/users/${userId}`);
      console.log('✅ User removed from store');
      return { success: true, store: response.data.store, message: response.data.message };
    } catch (error) {
      console.error('❌ Remove user from store error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getAllUsersForAssignment() {
    try {
      console.log('📤 Fetching all users for assignment...');
      const response = await this.client.get('/stores/users/all');
      return { success: true, users: response.data.users || [] };
    } catch (error) {
      console.error('❌ Get all users for assignment error:', error.message);
      return { success: false, error: error.message, users: [] };
    }
  }

  async getUserStores(userId) {
    try {
      console.log(`📤 Fetching stores for user: ${userId}`);
      const response = await this.client.get(`/stores/user/${userId}/stores`);
      return { success: true, stores: response.data.stores || [] };
    } catch (error) {
      console.error('❌ Get user stores error:', error.message);
      return { success: false, error: error.message, stores: [] };
    }
  }

  // ==================== TRANSFER ENDPOINTS ====================

  async createTransfer(transferData) {
    try {
      console.log('📤 Creating transfer:', transferData.product);
      const response = await this.client.post('/stores/transfers', transferData);
      console.log('✅ Transfer created:', response.data._id);
      return { success: true, transfer: response.data.transfer || response.data };
    } catch (error) {
      console.error('❌ Create transfer error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getAllTransfers(storeId = null) {
    try {
      let url = '/stores/transfers';
      if (storeId) {
        url += `?storeId=${storeId}`;
      }
      console.log(`📤 Fetching transfers from: ${url}`);
      const response = await this.client.get(url);
      
      let transfers = [];
      if (response.data.success && response.data.transfers) {
        transfers = response.data.transfers;
      } else if (Array.isArray(response.data)) {
        transfers = response.data;
      } else if (response.data.transfers) {
        transfers = response.data.transfers;
      }
      
      console.log(`📦 Retrieved ${transfers.length} transfers`);
      return { success: true, transfers };
    } catch (error) {
      console.error('❌ Get transfers error:', error.message);
      return { success: true, transfers: [] };
    }
  }

  async getTransfersByStore(storeId) {
    try {
      console.log(`📤 Fetching transfers for store: ${storeId}`);
      const response = await this.client.get(`/stores/transfers/store/${storeId}`);
      return { success: true, transfers: response.data.transfers || [] };
    } catch (error) {
      console.error('❌ Get transfers by store error:', error.message);
      return { success: true, transfers: [] };
    }
  }

  async getTransfer(id) {
    try {
      console.log(`📤 Fetching transfer: ${id}`);
      const response = await this.client.get(`/stores/transfers/${id}`);
      return { success: true, transfer: response.data.transfer || response.data };
    } catch (error) {
      console.error('❌ Get transfer error:', error.message);
      return { success: false, error: error.message, transfer: null };
    }
  }

  async approveTransfer(id) {
    try {
      console.log('📤 Approving transfer:', id);
      const response = await this.client.put(`/stores/transfers/${id}/approve`);
      console.log('✅ Transfer approved:', id);
      return { success: true, transfer: response.data.transfer || response.data };
    } catch (error) {
      console.error('❌ Approve transfer error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async completeTransfer(id) {
    try {
      console.log('📤 Completing transfer:', id);
      const response = await this.client.put(`/stores/transfers/${id}/complete`);
      console.log('✅ Transfer completed:', id);
      return { success: true, transfer: response.data.transfer || response.data };
    } catch (error) {
      console.error('❌ Complete transfer error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async cancelTransfer(id) {
    try {
      console.log('📤 Cancelling transfer:', id);
      const response = await this.client.put(`/stores/transfers/${id}/cancel`);
      console.log('✅ Transfer cancelled:', id);
      return { success: true, transfer: response.data.transfer || response.data };
    } catch (error) {
      console.error('❌ Cancel transfer error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async deleteTransfer(id) {
    try {
      console.log('📤 Deleting transfer:', id);
      await this.client.delete(`/stores/transfers/${id}`);
      console.log('✅ Transfer deleted:', id);
      return { success: true };
    } catch (error) {
      console.error('❌ Delete transfer error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export const api = new API();
export default api;