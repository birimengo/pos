// src/components/OfflineFallback.jsx
import { useTheme } from '../context/ThemeContext';
import { Icons } from './ui/Icons';

export default function OfflineFallback() {
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className={`max-w-md w-full ${currentTheme.colors.card} rounded-xl shadow-2xl p-8 text-center`}>
        <div className={`w-20 h-20 mx-auto rounded-full ${currentTheme.colors.accentLight} flex items-center justify-center mb-4`}>
          <Icons.cloud className={`text-4xl ${currentTheme.accentText}`} />
        </div>
        <h1 className={`text-2xl font-bold mb-2 ${currentTheme.colors.text}`}>You're Offline</h1>
        <p className={`mb-6 ${currentTheme.colors.textSecondary}`}>
          Don't worry! BizPOS is designed to work offline. 
          Your transactions will be saved and synced when you're back online.
        </p>
        <div className={`p-4 rounded-lg ${currentTheme.colors.accentLight} mb-6`}>
          <div className="flex justify-between text-sm mb-2">
            <span className={currentTheme.colors.textSecondary}>Offline Mode Active</span>
            <span className={`${currentTheme.accentText} font-medium`}>✓ Ready</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full w-full bg-green-500 rounded-full`} />
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className={`w-full py-3 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white font-semibold flex items-center justify-center gap-2`}
        >
          <Icons.refresh className="text-lg" />
          Try Again
        </button>
      </div>
    </div>
  );
}