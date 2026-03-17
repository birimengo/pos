// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // CSS must be imported first

// Initialize offline sync manager after CSS loads
const initApp = async () => {
  // Initialize offline sync manager
  try {
    const { offlineSyncManager } = await import('./features/pos/services/offlineSyncManager');
    await offlineSyncManager.init();
    console.log('✅ Offline sync manager ready');
  } catch (error) {
    console.error('❌ Failed to initialize offline sync manager:', error);
  }

  // Register service worker for PWA (after CSS loads)
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered successfully:', registration);
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🔄 New service worker installing...');
      });
    } catch (error) {
      console.log('❌ Service Worker registration failed:', error);
    }
  }
};

// Render app first, then initialize other features
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize after render
initApp();