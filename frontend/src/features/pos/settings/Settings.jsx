// src/features/pos/settings/Settings.jsx
import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { Icons } from '../../../components/ui/Icons';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('store');
  const { theme, getTheme } = useTheme();
  const { state, dispatch } = useSettings();
  const currentTheme = getTheme(theme);

  const tabs = [
    { id: 'store', name: 'Store', icon: Icons.home },
    { id: 'receipt', name: 'Receipt', icon: Icons.printer },
    { id: 'hardware', name: 'Hardware', icon: Icons.settings },
    { id: 'users', name: 'Users', icon: Icons.users },
    { id: 'backup', name: 'Backup', icon: Icons.download },
    { id: 'appearance', name: 'Appearance', icon: Icons.star },
  ];

  const handleSave = () => {
    // Settings are auto-saved via localStorage, but we can show a message
    alert('Settings saved successfully!');
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to default?')) {
      dispatch({ type: 'RESET_SETTINGS' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className={`text-xl font-bold ${currentTheme.colors.text}`}>Settings</h1>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className={`px-3 py-1.5 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text}`}
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className={`px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white`}
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-t-lg text-sm flex items-center gap-2 transition-all ${
                isActive
                  ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white`
                  : `${currentTheme.colors.hover} ${currentTheme.colors.textSecondary}`
              }`}
            >
              <Icon className="text-sm" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Settings Content */}
      <div className={`${currentTheme.colors.card} rounded-lg p-6 border ${currentTheme.colors.border}`}>
        {activeTab === 'store' && (
          <div className="space-y-4">
            <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Store Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Store Name</label>
                <input
                  type="text"
                  value={state.store.name}
                  onChange={(e) => dispatch({ type: 'UPDATE_STORE', payload: { name: e.target.value } })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Email</label>
                <input
                  type="email"
                  value={state.store.email}
                  onChange={(e) => dispatch({ type: 'UPDATE_STORE', payload: { email: e.target.value } })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Phone</label>
                <input
                  type="tel"
                  value={state.store.phone}
                  onChange={(e) => dispatch({ type: 'UPDATE_STORE', payload: { phone: e.target.value } })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.001"
                  value={state.store.taxRate}
                  onChange={(e) => dispatch({ type: 'UPDATE_STORE', payload: { taxRate: parseFloat(e.target.value) } })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>
              <div className="col-span-2">
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Address</label>
                <input
                  type="text"
                  value={state.store.address}
                  onChange={(e) => dispatch({ type: 'UPDATE_STORE', payload: { address: e.target.value } })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>City</label>
                <input
                  type="text"
                  value={state.store.city}
                  onChange={(e) => dispatch({ type: 'UPDATE_STORE', payload: { city: e.target.value } })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>State</label>
                <input
                  type="text"
                  value={state.store.state}
                  onChange={(e) => dispatch({ type: 'UPDATE_STORE', payload: { state: e.target.value } })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'receipt' && (
          <div className="space-y-4">
            <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Receipt Settings</h2>
            <div className="space-y-4">
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Header Message</label>
                <input
                  type="text"
                  value={state.receipt.header}
                  onChange={(e) => dispatch({ type: 'UPDATE_RECEIPT', payload: { header: e.target.value } })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Footer Message</label>
                <input
                  type="text"
                  value={state.receipt.footer}
                  onChange={(e) => dispatch({ type: 'UPDATE_RECEIPT', payload: { footer: e.target.value } })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Paper Size</label>
                <select
                  value={state.receipt.paperSize}
                  onChange={(e) => dispatch({ type: 'UPDATE_RECEIPT', payload: { paperSize: e.target.value } })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                >
                  <option value="80mm">80mm (Thermal)</option>
                  <option value="58mm">58mm (Small Thermal)</option>
                  <option value="A4">A4 (Standard)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className={`text-sm ${currentTheme.colors.textSecondary} block`}>Display Options</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.receipt.showLogo}
                    onChange={(e) => dispatch({ type: 'UPDATE_RECEIPT', payload: { showLogo: e.target.checked } })}
                    className="rounded border-gray-300"
                  />
                  <span className={`text-sm ${currentTheme.colors.text}`}>Show Logo</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.receipt.showTax}
                    onChange={(e) => dispatch({ type: 'UPDATE_RECEIPT', payload: { showTax: e.target.checked } })}
                    className="rounded border-gray-300"
                  />
                  <span className={`text-sm ${currentTheme.colors.text}`}>Show Tax</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.receipt.showDiscount}
                    onChange={(e) => dispatch({ type: 'UPDATE_RECEIPT', payload: { showDiscount: e.target.checked } })}
                    className="rounded border-gray-300"
                  />
                  <span className={`text-sm ${currentTheme.colors.text}`}>Show Discount</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.receipt.showCustomerInfo}
                    onChange={(e) => dispatch({ type: 'UPDATE_RECEIPT', payload: { showCustomerInfo: e.target.checked } })}
                    className="rounded border-gray-300"
                  />
                  <span className={`text-sm ${currentTheme.colors.text}`}>Show Customer Info</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hardware' && (
          <div className="space-y-4">
            <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Hardware Settings</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Printer</label>
                <select
                  value={state.hardware.printer}
                  onChange={(e) => dispatch({ type: 'UPDATE_HARDWARE', payload: { printer: e.target.value } })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                >
                  <option value="USB">USB Thermal Printer</option>
                  <option value="Network">Network Printer</option>
                  <option value="Bluetooth">Bluetooth Printer</option>
                  <option value="None">No Printer</option>
                </select>
              </div>
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Cash Drawer</label>
                <select
                  value={state.hardware.cashDrawer}
                  onChange={(e) => dispatch({ type: 'UPDATE_HARDWARE', payload: { cashDrawer: e.target.value } })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                >
                  <option value="COM1">COM1</option>
                  <option value="COM2">COM2</option>
                  <option value="USB">USB</option>
                  <option value="None">No Cash Drawer</option>
                </select>
              </div>
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Barcode Scanner</label>
                <select
                  value={state.hardware.barcodeScanner}
                  onChange={(e) => dispatch({ type: 'UPDATE_HARDWARE', payload: { barcodeScanner: e.target.value } })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                >
                  <option value="USB">USB Scanner</option>
                  <option value="Bluetooth">Bluetooth Scanner</option>
                  <option value="None">No Scanner</option>
                </select>
              </div>
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Customer Display</label>
                <select
                  value={state.hardware.customerDisplay ? 'Yes' : 'No'}
                  onChange={(e) => dispatch({ type: 'UPDATE_HARDWARE', payload: { customerDisplay: e.target.value === 'Yes' } })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>User Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.users.requireLogin}
                  onChange={(e) => dispatch({ type: 'UPDATE_USERS', payload: { requireLogin: e.target.checked } })}
                  className="rounded border-gray-300"
                />
                <span className={`text-sm ${currentTheme.colors.text}`}>Require login to use POS</span>
              </div>
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Session Timeout (minutes)</label>
                <input
                  type="number"
                  value={state.users.sessionTimeout}
                  onChange={(e) => dispatch({ type: 'UPDATE_USERS', payload: { sessionTimeout: parseInt(e.target.value) } })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Max Failed Login Attempts</label>
                <input
                  type="number"
                  value={state.users.maxFailedAttempts}
                  onChange={(e) => dispatch({ type: 'UPDATE_USERS', payload: { maxFailedAttempts: parseInt(e.target.value) } })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="space-y-4">
            <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Backup Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.backup.autoBackup}
                  onChange={(e) => dispatch({ type: 'UPDATE_BACKUP', payload: { autoBackup: e.target.checked } })}
                  className="rounded border-gray-300"
                />
                <span className={`text-sm ${currentTheme.colors.text}`}>Enable automatic backup</span>
              </div>
              {state.backup.autoBackup && (
                <>
                  <div>
                    <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Backup Frequency</label>
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
                </>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.backup.cloudBackup}
                  onChange={(e) => dispatch({ type: 'UPDATE_BACKUP', payload: { cloudBackup: e.target.checked } })}
                  className="rounded border-gray-300"
                />
                <span className={`text-sm ${currentTheme.colors.text}`}>Enable cloud backup</span>
              </div>
              <button
                onClick={() => alert('Manual backup started...')}
                className={`px-4 py-2 rounded-lg ${currentTheme.colors.accentLight} ${currentTheme.colors.accentText} text-sm`}
              >
                Backup Now
              </button>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="space-y-4">
            <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Appearance Settings</h2>
            <div className="space-y-4">
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Default View</label>
                <select
                  value={state.appearance.defaultView}
                  onChange={(e) => dispatch({ type: 'UPDATE_APPEARANCE', payload: { defaultView: e.target.value } })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                >
                  <option value="grid">Grid View</option>
                  <option value="list">List View</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.appearance.compactMode}
                  onChange={(e) => dispatch({ type: 'UPDATE_APPEARANCE', payload: { compactMode: e.target.checked } })}
                  className="rounded border-gray-300"
                />
                <span className={`text-sm ${currentTheme.colors.text}`}>Compact Mode</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.appearance.showProductImages}
                  onChange={(e) => dispatch({ type: 'UPDATE_APPEARANCE', payload: { showProductImages: e.target.checked } })}
                  className="rounded border-gray-300"
                />
                <span className={`text-sm ${currentTheme.colors.text}`}>Show Product Images</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}