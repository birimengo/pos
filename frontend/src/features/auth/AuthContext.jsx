// src/features/auth/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../pos/services/api';
import { db } from '../pos/services/database';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [userStores, setUserStores] = useState([]);

  // Initialize token from storage on mount
  useEffect(() => {
    const initAuth = () => {
      const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
      const storedRememberMe = localStorage.getItem('rememberMe') === 'true';
      
      if (storedToken) {
        setToken(storedToken);
        setRememberMe(storedRememberMe);
        api.setAuthToken(storedToken);
      }
      setLoading(false);
    };
    
    initAuth();
  }, []);

  // Load user data when token is set
  useEffect(() => {
    if (token && !user) {
      loadUser();
    }
  }, [token]);

  // Clear all user-specific local data (IndexedDB + localStorage)
  const clearUserLocalData = useCallback(async () => {
    try {
      console.log('🧹 Clearing user-specific local data...');
      
      // Clear all IndexedDB stores
      await db.clearAllStores();
      
      // Clear all user-specific localStorage items
      const keysToRemove = [
        'currentStoreId',
        'pos-settings',
        'pos-customers',
        'lastCloudSync',
        'activeStoreId',
        'savedEmail'
      ];
      
      // Also clear any user-specific settings keys
      if (user?.id) {
        keysToRemove.push(`pos-settings-${user.id}`);
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      console.log('✅ User local data cleared');
    } catch (error) {
      console.error('Failed to clear local data:', error);
    }
  }, [user?.id]);

  // Save user's stores to IndexedDB with user ID
  const saveUserStores = useCallback(async (stores, userId) => {
    if (!stores || stores.length === 0) return;
    if (!userId) userId = user?.id;
    
    try {
      await db.ensureInitialized();
      
      // Set current user in database for filtering
      if (userId) {
        db.setCurrentUser(userId);
      }
      
      // Clear existing stores first to avoid mixing users
      const allStores = await db.getAllStores();
      for (const store of allStores) {
        // Only delete stores belonging to this user
        if (store.userId === userId || !store.userId) {
          await db.delete('stores', store.id);
        }
      }
      
      // Save each store with userId
      for (const store of stores) {
        const storeId = store._id || store.id;
        const localStore = {
          id: storeId,
          _id: storeId,
          cloudId: storeId,
          name: store.name,
          address: store.address || '',
          city: store.city || '',
          state: store.state || '',
          zip: store.zip || '',
          phone: store.phone || '',
          email: store.email || '',
          manager: store.manager || '',
          openTime: store.openTime || '09:00',
          closeTime: store.closeTime || '21:00',
          taxRate: store.taxRate || 0,
          open: store.open !== false,
          isDefault: store.isDefault || false,
          synced: true,
          userId: userId,
          createdAt: store.createdAt || new Date().toISOString(),
          updatedAt: store.updatedAt || new Date().toISOString()
        };
        
        await db.saveStore(localStore);
        console.log(`✅ Store saved: ${store.name} (${storeId}) for user ${userId}`);
      }
      
      setUserStores(stores);
      
      // Set current store if available
      const defaultStore = stores.find(s => s.isDefault) || stores[0];
      if (defaultStore) {
        const storeId = defaultStore._id || defaultStore.id;
        localStorage.setItem('currentStoreId', storeId);
        api.setCurrentStore(storeId);
        console.log(`📌 Current store set to: ${defaultStore.name}`);
      }
      
    } catch (error) {
      console.error('Failed to save user stores:', error);
    }
  }, [user?.id]);

  // Load user data from API
  const loadUser = async () => {
    try {
      const response = await api.getCurrentUser();
      if (response.success && response.user) {
        // Set current user in database for filtering
        db.setCurrentUser(response.user.id);
        
        setUser(response.user);
        
        // Save user's stores to IndexedDB
        if (response.user.stores && response.user.stores.length > 0) {
          await saveUserStores(response.user.stores, response.user.id);
        } else if (response.user.defaultStore) {
          await saveUserStores([response.user.defaultStore], response.user.id);
        }
        
        // Load user-specific settings from backend
        await loadUserSettings(response.user.id);
        
      } else {
        await handleInvalidToken();
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      if (error.response?.status === 401) {
        await handleInvalidToken();
      }
    }
  };

  // Load user-specific settings from backend
  const loadUserSettings = async (userId) => {
    try {
      const response = await api.get('/settings/store');
      if (response.success && response.settings) {
        // Save to user-specific localStorage key
        const userSettingsKey = `pos-settings-${userId}`;
        localStorage.setItem(userSettingsKey, JSON.stringify({
          store: response.settings,
          lastUpdated: new Date().toISOString(),
          userId: userId
        }));
        console.log(`✅ Settings loaded for user ${userId}`);
      }
    } catch (error) {
      console.error('Failed to load user settings:', error);
    }
  };

  const handleInvalidToken = async () => {
    await clearUserLocalData();
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('rememberMe');
    setToken(null);
    setUser(null);
    setRememberMe(false);
    setUserStores([]);
    api.setAuthToken(null);
    db.setCurrentUser(null);
  };

  const login = async (email, password, remember = false) => {
    setError(null);
    
    try {
      const response = await api.login(email, password);
      
      if (response.success && response.token) {
        // Clear any existing local data first (from previous user)
        await clearUserLocalData();
        
        if (remember) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('rememberMe', 'true');
        } else {
          sessionStorage.setItem('token', response.token);
          localStorage.removeItem('rememberMe');
        }
        
        setToken(response.token);
        setRememberMe(remember);
        setUser(response.user);
        api.setAuthToken(response.token);
        
        // Set current user in database
        db.setCurrentUser(response.user.id);
        
        // Save user's stores to IndexedDB
        if (response.user.stores && response.user.stores.length > 0) {
          await saveUserStores(response.user.stores, response.user.id);
        } else if (response.user.defaultStore) {
          await saveUserStores([response.user.defaultStore], response.user.id);
        }
        
        // Load user-specific settings
        await loadUserSettings(response.user.id);
        
        return { 
          success: true, 
          user: response.user,
          message: 'Login successful'
        };
      } else {
        const errorMsg = response.error || 'Login failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Login failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const register = async (userData) => {
    setError(null);
    
    try {
      const response = await api.register(userData);
      
      if (response.success && response.token) {
        // Clear any existing local data first
        await clearUserLocalData();
        
        sessionStorage.setItem('token', response.token);
        setToken(response.token);
        setRememberMe(false);
        setUser(response.user);
        api.setAuthToken(response.token);
        
        // Set current user in database
        db.setCurrentUser(response.user.id);
        
        // Save user's stores to IndexedDB
        if (response.user.stores && response.user.stores.length > 0) {
          await saveUserStores(response.user.stores, response.user.id);
        } else if (response.user.defaultStore) {
          await saveUserStores([response.user.defaultStore], response.user.id);
        }
        
        // Load user-specific settings
        await loadUserSettings(response.user.id);
        
        return { 
          success: true, 
          user: response.user,
          message: response.message || 'Registration successful'
        };
      } else {
        const errorMsg = response.error || 'Registration failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Registration failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = useCallback(async () => {
    try {
      if (token) {
        await api.logout().catch(() => {});
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all user data on logout
      await clearUserLocalData();
      
      // Clear auth tokens
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('savedEmail');
      
      // Clear user-specific settings
      if (user?.id) {
        localStorage.removeItem(`pos-settings-${user.id}`);
      }
      
      // Reset state
      setToken(null);
      setUser(null);
      setRememberMe(false);
      setUserStores([]);
      setError(null);
      
      // Reset API and database
      api.setAuthToken(null);
      db.setCurrentUser(null);
      db.setCurrentStore(null);
    }
  }, [token, user?.id, clearUserLocalData]);

  const updateProfile = async (profileData) => {
    setError(null);
    
    try {
      const response = await api.updateProfile(profileData);
      
      if (response.success) {
        setUser(prev => ({ ...prev, ...response.user }));
        return { 
          success: true, 
          user: response.user,
          message: 'Profile updated successfully'
        };
      } else {
        const errorMsg = response.error || 'Update failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to update profile';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Refresh user's stores (call after store creation/deletion)
  const refreshUserStores = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await api.getCurrentUser();
      if (response.success && response.user) {
        if (response.user.stores && response.user.stores.length > 0) {
          await saveUserStores(response.user.stores, user.id);
        }
        setUser(response.user);
      }
    } catch (error) {
      console.error('Failed to refresh user stores:', error);
    }
  }, [user, saveUserStores]);

  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions?.includes(permission) || false;
  }, [user]);

  const hasRole = useCallback((...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  const value = {
    user,
    token,
    loading,
    error,
    rememberMe,
    userStores,
    isAuthenticated: !!user && !!token,
    login,
    register,
    logout,
    updateProfile,
    refreshUserStores,
    hasPermission,
    hasRole,
    // Helper to get user's default store
    getDefaultStoreId: () => user?.defaultStoreId || null,
    getDefaultStore: () => user?.defaultStore || null,
    // Get all user's stores
    getUserStores: () => userStores,
    // Check if user is admin
    isAdmin: user?.role === 'admin',
    // Check if user has any stores
    hasStore: userStores.length > 0 || !!user?.defaultStoreId,
    // Get current user ID
    getUserId: () => user?.id || null
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;