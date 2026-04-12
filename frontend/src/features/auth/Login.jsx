// src/features/auth/Login.jsx
import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Icons } from '../../components/ui/Icons';
import { cloudSync } from '../pos/services/cloudSyncService';
import { db } from '../pos/services/database';
import { api } from '../pos/services/api';

// Helper function to validate MongoDB ObjectId
const isValidMongoId = (id) => {
  return id && /^[0-9a-fA-F]{24}$/.test(id);
};

// Safe icon wrapper component
const SafeIcon = ({ icon: Icon, className, fallback = '•' }) => {
  if (!Icon) {
    console.warn('Icon component is undefined, using fallback');
    return <span className={className}>{fallback}</span>;
  }
  return <Icon className={className} />;
};

export default function Login({ onSuccess, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [setupStep, setSetupStep] = useState('');
  
  const { login } = useAuth();
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  // Load saved email if remember me was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Setup stores for the logged-in user
  const setupUserStores = async (userData) => {
    setSetupStep('Loading your stores...');
    
    try {
      // Clear any existing local stores first (to avoid mixing users)
      await db.clearAllStores();
      console.log('🧹 Cleared existing local stores');
      
      // Get stores from user data (already fetched during login)
      const stores = userData.stores || [];
      
      if (stores && stores.length > 0) {
        console.log(`📦 Found ${stores.length} stores for user`);
        setSetupStep(`Found ${stores.length} store(s)`);
        
        let currentStoreId = null;
        
        for (const store of stores) {
          const mongoId = store._id || store.id;
          
          if (isValidMongoId(mongoId)) {
            const localStore = {
              id: mongoId,
              _id: mongoId,
              cloudId: mongoId,
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
              createdAt: store.createdAt || new Date().toISOString(),
              updatedAt: store.updatedAt || new Date().toISOString()
            };
            
            await db.saveStore(localStore);
            
            if (store.isDefault || (!currentStoreId && stores.indexOf(store) === 0)) {
              currentStoreId = mongoId;
            }
          }
        }
        
        if (currentStoreId) {
          db.setCurrentStore(currentStoreId);
          api.setCurrentStore(currentStoreId);
          console.log(`📌 Current store set to ID: ${currentStoreId}`);
        }
        
        setSetupStep('Store ready!');
        return true;
      }
      
      // If user has no stores but is admin, create a default store
      if (userData.role === 'admin') {
        setSetupStep('Creating your store...');
        console.log('🏪 Creating default store for admin user');
        
        const storeData = {
          name: `${userData.name.split('@')[0] || userData.name}'s Store`,
          address: '',
          city: '',
          state: '',
          zip: '',
          phone: '',
          email: userData.email,
          manager: userData.name,
          openTime: '09:00',
          closeTime: '21:00',
          taxRate: 0,
          open: true,
          isDefault: true
        };
        
        const createResult = await api.createStore(storeData);
        
        if (createResult.success && createResult.store) {
          const mongoId = createResult.store._id || createResult.store.id;
          
          if (isValidMongoId(mongoId)) {
            const newStore = {
              id: mongoId,
              _id: mongoId,
              cloudId: mongoId,
              name: createResult.store.name,
              address: createResult.store.address || '',
              city: createResult.store.city || '',
              state: createResult.store.state || '',
              zip: createResult.store.zip || '',
              phone: createResult.store.phone || '',
              email: createResult.store.email || userData.email,
              manager: createResult.store.manager || userData.name,
              openTime: createResult.store.openTime || '09:00',
              closeTime: createResult.store.closeTime || '21:00',
              taxRate: createResult.store.taxRate || 0,
              open: true,
              isDefault: true,
              synced: true
            };
            
            await db.saveStore(newStore);
            db.setCurrentStore(mongoId);
            api.setCurrentStore(mongoId);
            
            setSetupStep('Store created!');
            return true;
          }
        }
      }
      
      // If user is not admin and has no stores, they need to be assigned to a store
      if (userData.role !== 'admin' && stores.length === 0) {
        setSetupStep('No stores assigned');
        console.warn('⚠️ User has no stores assigned');
        setError('You have not been assigned to any stores. Please contact your administrator.');
        return false;
      }
      
      // Fallback: create temporary local store
      console.warn('⚠️ No stores found, creating temporary local store');
      setSetupStep('Creating local store...');
      
      const tempStoreId = `temp_${Date.now()}`;
      const tempStore = {
        id: tempStoreId,
        name: 'My Store',
        address: '',
        city: '',
        state: '',
        zip: '',
        phone: '',
        email: userData.email,
        manager: userData.name,
        openTime: '09:00',
        closeTime: '21:00',
        taxRate: 0,
        open: true,
        isDefault: true,
        synced: false
      };
      
      await db.saveStore(tempStore);
      db.setCurrentStore(tempStoreId);
      api.setCurrentStore(tempStoreId);
      
      setSetupStep('Store ready (offline mode)');
      return true;
      
    } catch (error) {
      console.error('❌ Store setup error:', error);
      setSetupStep('Store setup failed');
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSetupStep('');

    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    const result = await login(email, password, rememberMe);
    
    if (result.success && result.user) {
      // Save email if remember me
      if (rememberMe) {
        localStorage.setItem('savedEmail', email);
      } else {
        localStorage.removeItem('savedEmail');
      }
      
      // Setup stores for this user
      const storeSetupSuccess = await setupUserStores(result.user);
      
      if (!storeSetupSuccess) {
        setError('Failed to setup stores. Please contact administrator.');
        setLoading(false);
        return;
      }
      
      // Trigger background sync AFTER navigation (don't wait)
      setTimeout(() => {
        cloudSync.fullSync().catch(err => {
          console.warn('Background sync error:', err);
        });
      }, 3000);
      
      if (onSuccess) onSuccess(result.user);
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: currentTheme.colors.bg }}>
      <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl p-8`}>
        <div className="text-center mb-8">
          <div className={`w-20 h-20 mx-auto rounded-full ${currentTheme.colors.accentLight} flex items-center justify-center mb-4`}>
            <SafeIcon icon={Icons.shoppingBag} className="text-3xl" fallback="🛍️" />
          </div>
          <h1 className={`text-2xl font-bold ${currentTheme.colors.text}`}>BizCore POS</h1>
          <p className={`text-sm ${currentTheme.colors.textMuted} mt-1`}>Sign in to your account</p>
        </div>

        {/* Setup Step Indicator */}
        {setupStep && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-center gap-2">
              <SafeIcon icon={Icons.refresh} className="animate-spin text-sm text-blue-500" fallback="⟳" />
              <p className="text-xs text-blue-600 dark:text-blue-400">{setupStep}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <SafeIcon icon={Icons.alert} className="text-sm text-red-500 mt-0.5" fallback="⚠️" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={`block text-sm font-medium ${currentTheme.colors.text} mb-1`}>Email Address</label>
            <div className="relative">
              <SafeIcon icon={Icons.mail} className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" fallback="📧" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 pr-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                placeholder="you@example.com"
                autoFocus
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium ${currentTheme.colors.text} mb-1`}>Password</label>
            <div className="relative">
              <SafeIcon icon={Icons.lock} className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" fallback="🔒" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-10 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                placeholder="••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                disabled={loading}
              >
                <SafeIcon icon={Icons.eye} className="text-sm" fallback="👁️" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded cursor-pointer"
                disabled={loading}
              />
              <span className={`text-sm ${currentTheme.colors.textMuted}`}>Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => alert('Password reset functionality would be implemented here')}
              className={`text-sm ${currentTheme.accentText} hover:underline transition-all`}
              disabled={loading}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {loading ? (
              <>
                <SafeIcon icon={Icons.refresh} className="animate-spin text-sm" fallback="⟳" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className={`text-sm ${currentTheme.colors.textMuted}`}>
            Don't have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              className={`${currentTheme.accentText} font-medium hover:underline transition-all`}
              disabled={loading}
            >
              Sign up
            </button>
          </p>
        </div>

        <div className={`mt-6 p-3 rounded-lg ${currentTheme.colors.accentLight}`}>
          <div className="flex items-start gap-2">
            <SafeIcon icon={Icons.info} className="text-sm mt-0.5" fallback="ℹ️" />
            <div>
              <p className={`text-xs ${currentTheme.colors.textSecondary} text-center`}>
                <span className="font-semibold">Demo Credentials:</span><br />
                Email: demo@bizcore.com<br />
                Password: demo123
              </p>
            </div>
          </div>
        </div>
        
        {/* Offline Mode Notice */}
        {!navigator.onLine && (
          <div className="mt-4 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center justify-center gap-2">
              <SafeIcon icon={Icons.alert} className="text-sm text-yellow-500" fallback="⚠️" />
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                You are offline. You can still use the POS, but cloud sync will be unavailable.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}