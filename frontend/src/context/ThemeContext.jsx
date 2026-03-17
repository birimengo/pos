// src/context/ThemeContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
  light: {
    name: 'Light',
    colors: {
      bg: 'bg-white',
      bgSecondary: 'bg-gray-50',
      text: 'text-gray-900',
      textSecondary: 'text-gray-600',
      textMuted: 'text-gray-400',
      border: 'border-gray-200',
      sidebar: 'bg-white border-r border-gray-200',
      header: 'bg-white/80 backdrop-blur-md border-b border-gray-200',
      card: 'bg-white shadow-sm hover:shadow-md',
      accent: 'from-blue-500 to-blue-600',
      accentLight: 'bg-blue-50',
      accentText: 'text-blue-600',
      hover: 'hover:bg-gray-50'
    }
  },
  dark: {
    name: 'Dark',
    colors: {
      bg: 'bg-gray-900',
      bgSecondary: 'bg-gray-800',
      text: 'text-white',
      textSecondary: 'text-gray-300',
      textMuted: 'text-gray-500',
      border: 'border-gray-700',
      sidebar: 'bg-gray-900 border-r border-gray-800',
      header: 'bg-gray-900/80 backdrop-blur-md border-b border-gray-800',
      card: 'bg-gray-800 shadow-lg hover:shadow-xl',
      accent: 'from-blue-400 to-blue-500',
      accentLight: 'bg-blue-900/30',
      accentText: 'text-blue-400',
      hover: 'hover:bg-gray-700'
    }
  },
  ocean: {
    name: 'Ocean',
    colors: {
      bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
      bgSecondary: 'bg-white/50 backdrop-blur-sm',
      text: 'text-gray-900',
      textSecondary: 'text-gray-600',
      textMuted: 'text-gray-400',
      border: 'border-blue-200',
      sidebar: 'bg-white/70 backdrop-blur-md border-r border-blue-200',
      header: 'bg-white/60 backdrop-blur-md border-b border-blue-200',
      card: 'bg-white/70 backdrop-blur-sm shadow-lg hover:shadow-xl border border-blue-100',
      accent: 'from-cyan-500 to-blue-500',
      accentLight: 'bg-blue-100',
      accentText: 'text-blue-600',
      hover: 'hover:bg-blue-50'
    }
  }
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('pos-theme');
    return saved || 'light';
  });

  useEffect(() => {
    localStorage.setItem('pos-theme', theme);
    document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-ocean');
    document.documentElement.classList.add(`theme-${theme}`);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'ocean';
      return 'light';
    });
  };

  const getTheme = (themeName) => {
    return themes[themeName] || themes.light;
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, getTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};