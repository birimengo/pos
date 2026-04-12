// src/features/pos/settings/SystemSettings.jsx
import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { Icons } from '../../../components/ui/Icons';
import { db } from '../../pos/services/database';

const SafeIcon = ({ icon: Icon, className, fallback = '•' }) => {
  if (!Icon) return <span className={className}>{fallback}</span>;
  return <Icon className={className} />;
};

export default function SystemSettings() {
  const { theme, getTheme } = useTheme();
  const { state, dispatch } = useSettings();
  const currentTheme = getTheme(theme);
  const [clearing, setClearing] = useState(false);

  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear all cached data? This action cannot be undone.')) {
      setClearing(true);
      try {
        await db.clearAllStores();
        alert('Cache cleared successfully. The app will now reload.');
        setTimeout(() => window.location.reload(), 2000);
      } catch (error) {
        alert('Failed to clear cache: ' + error.message);
      } finally {
        setClearing(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>System Settings</h2>
        <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
          Configure system-wide settings and preferences
        </p>
      </div>

      {/* Session Settings */}
      <div className={`p-4 rounded-lg border ${currentTheme.colors.border}`}>
        <h3 className={`text-sm font-medium mb-3 ${currentTheme.colors.text}`}>Session Settings</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className={`text-sm ${currentTheme.colors.text}`}>Require Login</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={state.users.requireLogin}
                onChange={(e) => dispatch({ type: 'UPDATE_USERS', payload: { requireLogin: e.target.checked } })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </div>
          </label>

          <div>
            <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Session Timeout (minutes)</label>
            <input
              type="number"
              value={state.users.sessionTimeout}
              onChange={(e) => dispatch({ type: 'UPDATE_USERS', payload: { sessionTimeout: parseInt(e.target.value) || 0 } })}
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
              min="0"
              step="30"
            />
            <p className="text-xs text-gray-500 mt-1">Set to 0 for no timeout</p>
          </div>

          <div>
            <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Max Failed Login Attempts</label>
            <input
              type="number"
              value={state.users.maxFailedAttempts}
              onChange={(e) => dispatch({ type: 'UPDATE_USERS', payload: { maxFailedAttempts: parseInt(e.target.value) || 3 } })}
              className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
              min="1"
              max="10"
            />
          </div>
        </div>
      </div>

      {/* Database Settings */}
      <div className={`p-4 rounded-lg border ${currentTheme.colors.border}`}>
        <h3 className={`text-sm font-medium mb-3 ${currentTheme.colors.text}`}>Database</h3>
        <div className="space-y-3">
          <button
            onClick={handleClearCache}
            disabled={clearing}
            className={`w-full py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50`}
          >
            {clearing ? (
              <>
                <SafeIcon icon={Icons.refresh} className="animate-spin inline mr-2" fallback="⟳" />
                Clearing Cache...
              </>
            ) : (
              <>
                <SafeIcon icon={Icons.trash} className="inline mr-2" fallback="🗑" />
                Clear All Cached Data
              </>
            )}
          </button>
          <p className="text-xs text-gray-500">
            This will clear all locally stored data including products, customers, and transactions.
          </p>
        </div>
      </div>

      {/* Version Info */}
      <div className={`p-4 rounded-lg ${currentTheme.colors.accentLight} border ${currentTheme.colors.border}`}>
        <div className="flex items-center gap-2 mb-2">
          <SafeIcon icon={Icons.info} className="text-lg" fallback="ℹ️" />
          <h3 className={`text-sm font-medium ${currentTheme.colors.text}`}>System Information</h3>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className={currentTheme.colors.textSecondary}>Version:</span>
            <span className={currentTheme.colors.text}>2.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className={currentTheme.colors.textSecondary}>Environment:</span>
            <span className={currentTheme.colors.text}>{import.meta.env.MODE || 'development'}</span>
          </div>
          <div className="flex justify-between">
            <span className={currentTheme.colors.textSecondary}>API Status:</span>
            <span className="text-green-600">Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}