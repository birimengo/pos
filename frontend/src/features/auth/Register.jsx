// src/features/auth/Register.jsx
import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Icons } from '../../components/ui/Icons';

// Safe icon wrapper component
const SafeIcon = ({ icon: Icon, className, fallback = '•' }) => {
  if (!Icon) {
    console.warn('Icon component is undefined, using fallback');
    return <span className={className}>{fallback}</span>;
  }
  return <Icon className={className} />;
};

export default function Register({ onSuccess, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'cashier'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { register } = useAuth();
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    const { confirmPassword, ...registerData } = formData;
    const result = await register(registerData);
    
    if (result.success) {
      if (onSuccess) onSuccess(result.user);
    } else {
      setErrors({ general: result.error });
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: currentTheme.colors.bg }}>
      <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto`}>
        <div className="text-center mb-6">
          <div className={`w-16 h-16 mx-auto rounded-full ${currentTheme.colors.accentLight} flex items-center justify-center mb-3`}>
            <SafeIcon icon={Icons.userPlus} className="text-2xl" fallback="👤+" />
          </div>
          <h1 className={`text-2xl font-bold ${currentTheme.colors.text}`}>Create Account</h1>
          <p className={`text-sm ${currentTheme.colors.textMuted} mt-1`}>Sign up to get started</p>
        </div>

        {errors.general && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${currentTheme.colors.text} mb-1`}>Full Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : ''}`}
              placeholder="John Doe"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className={`block text-sm font-medium ${currentTheme.colors.text} mb-1`}>Email Address *</label>
            <div className="relative">
              <SafeIcon icon={Icons.mail} className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" fallback="📧" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-10 pr-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : ''}`}
                placeholder="you@example.com"
              />
            </div>
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className={`block text-sm font-medium ${currentTheme.colors.text} mb-1`}>Password *</label>
            <div className="relative">
              <SafeIcon icon={Icons.lock} className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" fallback="🔒" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full pl-10 pr-10 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-500' : ''}`}
                placeholder="••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <SafeIcon icon={Icons.eye} className="text-sm" fallback="👁️" />
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className={`block text-sm font-medium ${currentTheme.colors.text} mb-1`}>Confirm Password *</label>
            <div className="relative">
              <SafeIcon icon={Icons.lock} className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" fallback="🔒" />
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full pl-10 pr-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                placeholder="••••••"
              />
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
          </div>

          <div>
            <label className={`block text-sm font-medium ${currentTheme.colors.text} mb-1`}>Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="cashier">Cashier</option>
              <option value="inventory_manager">Inventory Manager</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2`}
          >
            {loading ? (
              <>
                <SafeIcon icon={Icons.refresh} className="animate-spin text-sm" fallback="⟳" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className={`text-sm ${currentTheme.colors.textMuted}`}>
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className={`${currentTheme.accentText} font-medium hover:underline`}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}