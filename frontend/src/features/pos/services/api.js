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

    // Add response interceptor for better error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.code === 'ERR_NETWORK') {
          console.error('🌐 Network error - backend may be down');
        } else if (error.response) {
          // Only log actual errors (500+), not client errors (4xx)
          if (error.response.status >= 500) {
            console.error(`❌ Server Error ${error.response.status}:`, error.response.data);
          } else if (error.response.status >= 400 && error.response.status < 500) {
            // Client errors (4xx) - log as warnings only for non-404
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
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
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
          headers: {
            'Content-Type': 'multipart/form-data'
          },
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
      console.log('📤 Creating product:', productData.name);
      const response = await this.client.post('/products', productData);
      console.log('✅ Product created:', response.data._id);
      return { success: true, product: response.data };
    } catch (error) {
      console.error('❌ Create product error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async updateProduct(id, productData) {
    try {
      console.log('📤 Updating product:', id);
      const response = await this.client.put(`/products/${id}`, productData);
      console.log('✅ Product updated:', id);
      return { success: true, product: response.data };
    } catch (error) {
      console.error('❌ Update product error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async deleteProduct(id) {
    try {
      await this.client.delete(`/products/${id}`);
      console.log('✅ Product deleted:', id);
      return { success: true };
    } catch (error) {
      console.error('❌ Delete product error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getAllProducts() {
    try {
      const response = await this.client.get('/products');
      return { success: true, products: response.data };
    } catch (error) {
      console.error('❌ Get products error:', error.message);
      return { success: false, error: error.message, products: [] };
    }
  }

  async getProduct(id) {
    try {
      const response = await this.client.get(`/products/${id}`);
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
      const response = await this.client.get(`/products/category/${category}`);
      return { success: true, products: response.data };
    } catch (error) {
      console.error('❌ Get products by category error:', error.message);
      return { success: false, error: error.message, products: [] };
    }
  }

  // ==================== TRANSACTION ENDPOINTS ====================

  async createTransaction(transactionData) {
    try {
      console.log('📤 Creating transaction:', transactionData.receiptNumber);
      const response = await this.client.post('/transactions', transactionData);
      console.log('✅ Transaction created:', response.data._id);
      return { success: true, transaction: response.data };
    } catch (error) {
      console.error('❌ Create transaction error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async syncTransaction(transactionData) {
    try {
      console.log('🔄 Syncing transaction:', transactionData.receiptNumber);
      
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

      console.log('📤 Sending clean transaction data to cloud:', {
        receiptNumber: cleanData.receiptNumber,
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
      const response = await this.client.get('/transactions', { params });
      return { success: true, transactions: response.data };
    } catch (error) {
      console.error('❌ Get transactions error:', error.message);
      return { success: false, error: error.message, transactions: [] };
    }
  }

  async getTransaction(id) {
    try {
      const response = await this.client.get(`/transactions/${id}`);
      return { success: true, transaction: response.data };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: false, transaction: null, notFound: true };
      }
      console.error('❌ Get transaction error:', error.message);
      return { success: false, error: error.message, transaction: null };
    }
  }

  async updateTransaction(id, transactionData) {
    try {
      console.log(`📤 Updating transaction: ${id}`);
      const response = await this.client.put(`/transactions/${id}`, transactionData);
      console.log('✅ Transaction updated:', id);
      return { success: true, transaction: response.data };
    } catch (error) {
      console.error('❌ Update transaction error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getTransactionsByDateRange(startDate, endDate) {
    try {
      const response = await this.client.get('/transactions/range', {
        params: { startDate, endDate }
      });
      return { success: true, transactions: response.data };
    } catch (error) {
      console.error('❌ Get transactions by date error:', error.message);
      return { success: false, error: error.message, transactions: [] };
    }
  }

  async getTransactionsByCustomer(customerId) {
    try {
      const response = await this.client.get(`/customers/${customerId}/transactions`);
      return { success: true, transactions: response.data };
    } catch (error) {
      console.error('❌ Get customer transactions error:', error.message);
      return { success: false, error: error.message, transactions: [] };
    }
  }

  async getDailySales(date) {
    try {
      const response = await this.client.get('/transactions/daily', {
        params: { date: date || new Date().toISOString().split('T')[0] }
      });
      return { success: true, sales: response.data };
    } catch (error) {
      console.error('❌ Get daily sales error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getSalesSummary(startDate, endDate) {
    try {
      const response = await this.client.get('/transactions/summary', {
        params: { startDate, endDate }
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
      console.log('📤 Creating customer:', customerData.name);
      
      const cleanData = {
        name: customerData.name,
        email: customerData.email || '',
        phone: customerData.phone || '',
        loyaltyPoints: customerData.loyaltyPoints || 0,
        totalSpent: customerData.totalSpent || 0,
        notes: customerData.notes || ''
      };
      
      if (customerData.address) {
        cleanData.address = customerData.address;
      }
      
      if (customerData.joinDate) {
        cleanData.joinDate = customerData.joinDate;
      }
      
      if (customerData.lastVisit) {
        cleanData.lastVisit = customerData.lastVisit;
      }
      
      delete cleanData.id;
      delete cleanData._id;
      
      console.log('📤 Sending clean customer data:', cleanData);
      
      const response = await this.client.post('/customers', cleanData);
      console.log('✅ Customer created:', response.data._id);
      return { success: true, customer: response.data };
    } catch (error) {
      console.error('❌ Create customer error:', error.message);
      if (error.response) {
        console.error('Server response:', error.response.data);
      }
      return { success: false, error: error.message };
    }
  }

  async updateCustomer(id, customerData) {
    try {
      console.log('📤 Updating customer:', id);
      
      const cleanData = {
        name: customerData.name,
        email: customerData.email || '',
        phone: customerData.phone || '',
        loyaltyPoints: customerData.loyaltyPoints || 0,
        totalSpent: customerData.totalSpent || 0,
        notes: customerData.notes || ''
      };
      
      if (customerData.address) {
        cleanData.address = customerData.address;
      }
      
      if (customerData.joinDate) {
        cleanData.joinDate = customerData.joinDate;
      }
      
      if (customerData.lastVisit) {
        cleanData.lastVisit = customerData.lastVisit;
      }
      
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
      await this.client.delete(`/customers/${id}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Delete customer error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getAllCustomers() {
    try {
      const response = await this.client.get('/customers');
      return { success: true, customers: response.data };
    } catch (error) {
      console.error('❌ Get customers error:', error.message);
      return { success: false, error: error.message, customers: [] };
    }
  }

  async getCustomer(id) {
    try {
      console.log(`🔍 Fetching customer by ID: ${id}`);
      const response = await this.client.get(`/customers/${id}`);
      return { 
        success: true, 
        customer: response.data 
      };
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
      console.log(`🔍 Searching for customer by email: ${email}`);
      const response = await this.client.get(`/customers/email/${encodeURIComponent(email)}`);
      return { 
        success: true, 
        customer: response.data 
      };
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
      console.log(`🔍 Searching for customers by email: ${email}`);
      const response = await this.client.get(`/customers/email/${encodeURIComponent(email)}`);
      return { 
        success: true, 
        customers: [response.data]
      };
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
      console.log(`🔍 Searching customers with query: ${query}`);
      const response = await this.client.get('/customers/search', {
        params: { q: query }
      });
      return { 
        success: true, 
        customers: response.data 
      };
    } catch (error) {
      console.error('❌ Search customers error:', error.message);
      return { success: false, error: error.message, customers: [] };
    }
  }

  // ==================== SYNC ENDPOINTS ====================

  async getSyncData(since) {
    try {
      const response = await this.client.get(`/sync/data?since=${since}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Get sync data error:', error.message);
      return { 
        success: false, 
        data: { products: [], customers: [], transactions: [] },
        error: error.message 
      };
    }
  }

  async syncAll(data) {
    try {
      const response = await this.client.post('/sync/all', data);
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
}

export const api = new API();