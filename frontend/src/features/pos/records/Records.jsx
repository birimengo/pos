import React from 'react';
import { useTheme } from '../../../context/ThemeContext';

export default function Records() {
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  return (
    <div className="p-4">
      <h1 className={`text-xl font-bold ${currentTheme.colors.text}`}>Records</h1>
      <p className={`${currentTheme.colors.textSecondary} mt-2`}>Records management coming soon...</p>
    </div>
  );
}