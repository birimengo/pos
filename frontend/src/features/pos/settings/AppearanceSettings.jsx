// src/features/pos/settings/AppearanceSettings.jsx
import { useTheme } from '../../../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { Icons } from '../../../components/ui/Icons';

const SafeIcon = ({ icon: Icon, className, fallback = '•' }) => {
  if (!Icon) return <span className={className}>{fallback}</span>;
  return <Icon className={className} />;
};

export default function AppearanceSettings() {
  const { theme, setTheme, getTheme } = useTheme();
  const { state, dispatch } = useSettings();
  const currentTheme = getTheme(theme);

  const themes = [
    { id: 'light', name: 'Light', icon: Icons.sun, bgColor: 'bg-white', textColor: 'text-gray-900' },
    { id: 'dark', name: 'Dark', icon: Icons.moon, bgColor: 'bg-gray-900', textColor: 'text-white' },
    { id: 'ocean', name: 'Ocean', icon: Icons.cloud, bgColor: 'bg-cyan-900', textColor: 'text-white' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Theme Selection</h2>
        <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
          Choose your preferred color theme for the POS system
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {themes.map(themeOption => (
          <button
            key={themeOption.id}
            onClick={() => setTheme(themeOption.id)}
            className={`p-4 rounded-lg border-2 transition-all ${
              theme === themeOption.id
                ? `border-blue-500 ${currentTheme.colors.accentLight}`
                : `${currentTheme.colors.border} ${currentTheme.colors.hover}`
            }`}
          >
            <div className={`w-12 h-12 mx-auto rounded-full ${themeOption.bgColor} flex items-center justify-center mb-2`}>
              <SafeIcon icon={themeOption.icon} className={`text-xl ${themeOption.textColor}`} fallback="●" />
            </div>
            <p className={`text-sm font-medium ${currentTheme.colors.text}`}>{themeOption.name}</p>
          </button>
        ))}
      </div>

      <div className={`border-t ${currentTheme.colors.border} pt-4`}>
        <h3 className={`text-sm font-medium mb-3 ${currentTheme.colors.text}`}>Display Options</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className={`text-sm ${currentTheme.colors.text}`}>Compact Mode</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={state.appearance.compactMode}
                onChange={(e) => dispatch({ type: 'UPDATE_APPEARANCE', payload: { compactMode: e.target.checked } })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </div>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className={`text-sm ${currentTheme.colors.text}`}>Show Product Images</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={state.appearance.showProductImages}
                onChange={(e) => dispatch({ type: 'UPDATE_APPEARANCE', payload: { showProductImages: e.target.checked } })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </div>
          </label>

          <div>
            <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-2`}>Default View</label>
            <div className="flex gap-2">
              <button
                onClick={() => dispatch({ type: 'UPDATE_APPEARANCE', payload: { defaultView: 'grid' } })}
                className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                  state.appearance.defaultView === 'grid'
                    ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white`
                    : `${currentTheme.colors.border} ${currentTheme.colors.hover}`
                }`}
              >
                <SafeIcon icon={Icons.grid} className="text-sm" fallback="⊞" />
                Grid View
              </button>
              <button
                onClick={() => dispatch({ type: 'UPDATE_APPEARANCE', payload: { defaultView: 'list' } })}
                className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                  state.appearance.defaultView === 'list'
                    ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white`
                    : `${currentTheme.colors.border} ${currentTheme.colors.hover}`
                }`}
              >
                <SafeIcon icon={Icons.list} className="text-sm" fallback="☰" />
                List View
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}