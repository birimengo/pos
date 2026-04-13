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
      return response.data;
    } catch (error) {
      console.error('❌ Registration error:', error.response?.data?.error || error.message);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const response = await this.client.get('/auth/me');
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
      return { success: true, users: response.data };
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
      
      // ✅ FIX: If no store is selected, return empty array instead of making the request
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
      const response = await this.client.get(`/customers/${customerId}/transactions`, { params: { storeId } });
      return { success: true, transactions: response.data };
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

  // ==================== CUSTOMER ENDPOINTS ====================

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
        email: customerData.email || '',
        phone: customerData.phone || '',
        loyaltyPoints: customerData.loyaltyPoints || 0,
        totalSpent: customerData.totalSpent || 0,
        notes: customerData.notes || '',
        storeId
      };
      
      if (customerData.address) cleanData.address = customerData.address;
      if (customerData.joinDate) cleanData.joinDate = customerData.joinDate;
      if (customerData.lastVisit) cleanData.lastVisit = customerData.lastVisit;
      
      delete cleanData.id;
      delete cleanData._id;
      
      console.log('📤 Sending clean customer data:', cleanData);
      
      const response = await this.client.post('/customers', cleanData);
      console.log('✅ Customer created:', response.data._id);
      return { success: true, customer: response.data };
    } catch (error) {
      console.error('❌ Create customer error:', error.message);
      if (error.response) console.error('Server response:', error.response.data);
      return { success: false, error: error.message };
    }
  }

  async updateCustomer(id, customerData) {
    try {
      const storeId = this.getCurrentStoreId();
      console.log('📤 Updating customer:', id, 'for store:', storeId);
      
      const cleanData = {
        name: customerData.name,
        email: customerData.email || '',
        phone: customerData.phone || '',
        loyaltyPoints: customerData.loyaltyPoints || 0,
        totalSpent: customerData.totalSpent || 0,
        notes: customerData.notes || '',
        storeId
      };
      
      if (customerData.address) cleanData.address = customerData.address;
      if (customerData.joinDate) cleanData.joinDate = customerData.joinDate;
      if (customerData.lastVisit) cleanData.lastVisit = customerData.lastVisit;
      
      delete cleanData.id;
      delete cleanData._id;
      
      const response = await this.client.put(`/customers/${id}`, cleanData);
      console.log('✅ Customer updated:', id);
      return { success: true, customer: response.data };
    } catch (error) {
      console.error('❌ Update customer error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async deleteCustomer(id) {
    try {
      const storeId = this.getCurrentStoreId();
      await this.client.delete(`/customers/${id}`, { params: { storeId } });
      return { success: true };
    } catch (error) {
      console.error('❌ Delete customer error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getAllCustomers() {
    try {
      const storeId = this.getCurrentStoreId();
      const response = await this.client.get('/customers', { params: { storeId } });
      return { success: true, customers: response.data };
    } catch (error) {
      console.error('❌ Get customers error:', error.message);
      return { success: false, error: error.message, customers: [] };
    }
  }

  async getCustomer(id) {
    try {
      const storeId = this.getCurrentStoreId();
      console.log(`🔍 Fetching customer by ID: ${id}`);
      const response = await this.client.get(`/customers/${id}`, { params: { storeId } });
      return { success: true, customer: response.data };
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
      console.log(`🔍 Searching for customer by email: ${email}`);
      const response = await this.client.get(`/customers/email/${encodeURIComponent(email)}`, { params: { storeId } });
      return { success: true, customer: response.data };
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
      console.log(`🔍 Searching for customers by email: ${email}`);
      const response = await this.client.get(`/customers/email/${encodeURIComponent(email)}`, { params: { storeId } });
      return { success: true, customers: [response.data] };
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('⚠️ No customers found with this email');
        return { success: true, customers: [] };
      }
      console.error('❌ Get customers by email error:', error.message);
      return { success: false, error: error.message, customers: [] };
    }
  }

  async searchCustomers(query) {
    try {
      const storeId = this.getCurrentStoreId();
      console.log(`🔍 Searching customers with query: ${query}`);
      const response = await this.client.get('/customers/search', {
        params: { q: query, storeId }
      });
      return { success: true, customers: response.data };
    } catch (error) {
      console.error('❌ Search customers error:', error.message);
      return { success: false, error: error.message, customers: [] };
    }
  }

  // ==================== STOCK HISTORY METHODS ====================

  async addStockHistory(productId, historyData) {
    try {
      const storeId = this.getCurrentStoreId();
      console.log(`📝 Adding stock history for product: ${productId}`);
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
      const response = await this.client.get('/stores');
      return { success: true, stores: response.data };
    } catch (error) {
      console.error('❌ Get stores error:', error.message);
      return { success: false, error: error.message, stores: [] };
    }
  }

  async getStore(id) {
    try {
      const response = await this.client.get(`/stores/${id}`);
      return { success: true, store: response.data };
    } catch (error) {
      console.error('❌ Get store error:', error.message);
      return { success: false, error: error.message, store: null };
    }
  }

  async createStore(storeData) {
    try {
      console.log('📤 Creating store:', storeData.name);
      const response = await this.client.post('/stores', storeData);
      
      // Extract the MongoDB _id from response - try multiple paths
      const storeId = response.data._id || response.data.id || response.data.store?._id;
      
      console.log('✅ Store created successfully');
      console.log('📦 Store ID:', storeId);
      console.log('📦 Full response:', JSON.stringify(response.data, null, 2));
      
      if (!storeId) {
        console.error('⚠️ Warning: No _id returned from store creation');
      }
      
      return { 
        success: true, 
        store: response.data,
        _id: storeId,
        id: storeId
      };
    } catch (error) {
      console.error('❌ Create store error:', error.message);
      console.error('Response:', error.response?.data);
      return { success: false, error: error.message };
    }
  }

  async updateStore(id, storeData) {
    try {
      console.log('📤 Updating store:', id);
      const response = await this.client.put(`/stores/${id}`, storeData);
      console.log('✅ Store updated:', id);
      return { success: true, store: response.data };
    } catch (error) {
      console.error('❌ Update store error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async deleteStore(id) {
    try {
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
      const response = await this.client.get('/stores/default');
      return { success: true, store: response.data.store || response.data };
    } catch (error) {
      console.error('❌ Get default store error:', error.message);
      return { success: false, error: error.message, store: null };
    }
  }

  async setDefaultStore(id) {
    try {
      const response = await this.client.put(`/stores/${id}/default`);
      return { success: true, store: response.data.store || response.data };
    } catch (error) {
      console.error('❌ Set default store error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== TRANSFER ENDPOINTS ====================

  async createTransfer(transferData) {
    try {
      const storeId = this.getCurrentStoreId();
      console.log('📤 Creating transfer:', transferData.product, 'from store:', transferData.fromStore);
      const response = await this.client.post('/stores/transfers', { ...transferData, storeId });
      console.log('✅ Transfer created:', response.data._id);
      return { success: true, transfer: response.data };
    } catch (error) {
      console.error('❌ Create transfer error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getAllTransfers() {
    try {
      const storeId = this.getCurrentStoreId();
      const response = await this.client.get('/stores/transfers', { params: { storeId } });
      return { success: true, transfers: response.data };
    } catch (error) {
      console.error('❌ Get transfers error:', error.message);
      return { success: false, error: error.message, transfers: [] };
    }
  }

  async getTransfer(id) {
    try {
      const storeId = this.getCurrentStoreId();
      const response = await this.client.get(`/stores/transfers/${id}`, { params: { storeId } });
      return { success: true, transfer: response.data };
    } catch (error) {
      console.error('❌ Get transfer error:', error.message);
      return { success: false, error: error.message, transfer: null };
    }
  }

  async approveTransfer(id) {
    try {
      const storeId = this.getCurrentStoreId();
      console.log('📤 Approving transfer:', id);
      const response = await this.client.put(`/stores/transfers/${id}/approve`, {}, { params: { storeId } });
      console.log('✅ Transfer approved:', id);
      return { success: true, transfer: response.data };
    } catch (error) {
      console.error('❌ Approve transfer error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async completeTransfer(id) {
    try {
      const storeId = this.getCurrentStoreId();
      console.log('📤 Completing transfer:', id);
      const response = await this.client.put(`/stores/transfers/${id}/complete`, {}, { params: { storeId } });
      console.log('✅ Transfer completed:', id);
      return { success: true, transfer: response.data };
    } catch (error) {
      console.error('❌ Complete transfer error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async cancelTransfer(id) {
    try {
      const storeId = this.getCurrentStoreId();
      console.log('📤 Cancelling transfer:', id);
      const response = await this.client.put(`/stores/transfers/${id}/cancel`, {}, { params: { storeId } });
      console.log('✅ Transfer cancelled:', id);
      return { success: true, transfer: response.data };
    } catch (error) {
      console.error('❌ Cancel transfer error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async deleteTransfer(id) {
    try {
      const storeId = this.getCurrentStoreId();
      await this.client.delete(`/stores/transfers/${id}`, { params: { storeId } });
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