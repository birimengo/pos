// src/components/PWAInstallPrompt.jsx
import { useState, useEffect } from 'react';
import { Icons } from './ui/Icons';
import { useTheme } from '../context/ThemeContext';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className={`${currentTheme.colors.card} rounded-lg shadow-xl border ${currentTheme.colors.border} p-4 flex items-center gap-4`}>
        <div className={`p-2 rounded-lg ${currentTheme.colors.accentLight}`}>
          <Icons.download className={`text-xl ${currentTheme.accentText}`} />
        </div>
        <div>
          <h3 className={`text-sm font-semibold ${currentTheme.colors.text}`}>Install POS App</h3>
          <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Install for offline access</p>
        </div>
        <button
          onClick={handleInstall}
          className={`px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white text-sm font-medium`}
        >
          Install
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className={`p-2 rounded-lg ${currentTheme.colors.hover}`}
        >
          <Icons.x className="text-sm" />
        </button>
      </div>
    </div>
  );
}