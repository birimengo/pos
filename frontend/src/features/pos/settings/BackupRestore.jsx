// src/features/pos/settings/BackupRestore.jsx
import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { Icons } from '../../../components/ui/Icons';
import { opfs } from '../../pos/services/opfsService';
import { db } from '../../pos/services/database';

const SafeIcon = ({ icon: Icon, className, fallback = '•' }) => {
  if (!Icon) return <span className={className}>{fallback}</span>;
  return <Icon className={className} />;
};

export default function BackupRestore() {
  const { theme, getTheme } = useTheme();
  const { state, dispatch } = useSettings();
  const currentTheme = getTheme(theme);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);

  const handleBackupNow = async () => {
    setBackupInProgress(true);
    try {
      const backup = await opfs.exportDatabase();
      alert(`Backup created successfully!\nFile: ${backup.fileName}`);
    } catch (error) {
      alert('Backup failed: ' + error.message);
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleRestore = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      setRestoreInProgress(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await opfs.importDatabase(file.name);
        alert('Restore completed! The app will now reload.');
        setTimeout(() => window.location.reload(), 2000);
      } catch (error) {
        alert('Restore failed: ' + error.message);
      } finally {
        setRestoreInProgress(false);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Backup & Restore</h2>
        <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
          Backup your data or restore from a previous backup
        </p>
      </div>

      <div className={`p-4 rounded-lg ${currentTheme.colors.accentLight} border ${currentTheme.colors.border}`}>
        <div className="flex items-start gap-3">
          <SafeIcon icon={Icons.info} className="text-lg text-blue-500 mt-0.5" fallback="ℹ️" />
          <div className="flex-1">
            <p className={`text-sm ${currentTheme.colors.text}`}>
              Regular backups help protect your data. We recommend backing up daily.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleBackupNow}
          disabled={backupInProgress}
          className={`p-4 rounded-lg border-2 text-center transition-all ${
            backupInProgress
              ? 'opacity-50 cursor-not-allowed'
              : `hover:border-blue-500 ${currentTheme.colors.hover}`
          }`}
        >
          <SafeIcon icon={Icons.download} className={`text-3xl mx-auto mb-2 ${currentTheme.accentText}`} fallback="💾" />
          <p className={`font-medium ${currentTheme.colors.text}`}>Backup Now</p>
          <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
            {backupInProgress ? 'Creating backup...' : 'Export all data to a JSON file'}
          </p>
        </button>

        <button
          onClick={handleRestore}
          disabled={restoreInProgress}
          className={`p-4 rounded-lg border-2 text-center transition-all ${
            restoreInProgress
              ? 'opacity-50 cursor-not-allowed'
              : `hover:border-blue-500 ${currentTheme.colors.hover}`
          }`}
        >
          <SafeIcon icon={Icons.upload} className={`text-3xl mx-auto mb-2 ${currentTheme.accentText}`} fallback="📁" />
          <p className={`font-medium ${currentTheme.colors.text}`}>Restore from Backup</p>
          <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
            {restoreInProgress ? 'Restoring...' : 'Import data from a backup file'}
          </p>
        </button>
      </div>

      {/* Auto Backup Settings */}
      <div className={`border-t ${currentTheme.colors.border} pt-4`}>
        <h3 className={`text-sm font-medium mb-3 ${currentTheme.colors.text}`}>Auto Backup Settings</h3>
        
        <label className="flex items-center justify-between cursor-pointer mb-4">
          <span className={`text-sm ${currentTheme.colors.text}`}>Enable Automatic Backup</span>
          <div className="relative">
            <input
              type="checkbox"
              checked={state.backup.autoBackup}
              onChange={(e) => dispatch({ type: 'UPDATE_BACKUP', payload: { autoBackup: e.target.checked } })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
          </div>
        </label>

        {state.backup.autoBackup && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Frequency</label>
              <select
                value={state.backup.backupFrequency}
                onChange={(e) => dispatch({ type: 'UPDATE_BACKUP', payload: { backupFrequency: e.target.value } })}
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Backup Time</label>
              <input
                type="time"
                value={state.backup.backupTime}
                onChange={(e) => dispatch({ type: 'UPDATE_BACKUP', payload: { backupTime: e.target.value } })}
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
              />
            </div>
          </div>
        )}

        <label className="flex items-center justify-between cursor-pointer mt-4">
          <span className={`text-sm ${currentTheme.colors.text}`}>Cloud Backup</span>
          <div className="relative">
            <input
              type="checkbox"
              checked={state.backup.cloudBackup}
              onChange={(e) => dispatch({ type: 'UPDATE_BACKUP', payload: { cloudBackup: e.target.checked } })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
          </div>
        </label>
      </div>
    </div>
  );
}