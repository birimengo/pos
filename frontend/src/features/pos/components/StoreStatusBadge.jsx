// src/features/pos/components/StoreStatusBadge.jsx
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useStore } from '../context/StoreContext';
import { Icons } from '../../../components/ui/Icons';
import { api } from '../services/api';

export default function StoreStatusBadge() {
  const [toggling, setToggling] = useState(false);
  const [localStatus, setLocalStatus] = useState(null);
  const { activeStore, refreshStores, refreshStoreStatus, loadStores } = useStore();
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);
  const isMountedRef = useRef(true);

  // Update local status when activeStore changes
  useEffect(() => {
    if (activeStore) {
      setLocalStatus(activeStore.open);
      console.log(`📊 Store status updated: ${activeStore.name} is ${activeStore.open ? 'Open' : 'Closed'}`);
    }
  }, [activeStore]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleToggleStatus = async () => {
    if (!activeStore) return;
    
    const action = activeStore.open ? 'close' : 'open';
    if (!confirm(`Are you sure you want to ${action} "${activeStore.name}"?`)) return;
    
    setToggling(true);
    try {
      const response = await api.toggleStoreStatus(activeStore._id);
      if (response.success && isMountedRef.current) {
        console.log(`✅ Store status toggled: ${response.isOpen ? 'Open' : 'Closed'}`);
        
        // Update local status immediately for UI responsiveness
        setLocalStatus(response.isOpen);
        
        // Force refresh the store data from backend
        const freshStore = await api.getStore(activeStore._id);
        if (freshStore.success && freshStore.store) {
          console.log(`🔄 Fresh store data: ${freshStore.store.name} is ${freshStore.store.open ? 'Open' : 'Closed'}`);
          setLocalStatus(freshStore.store.open);
        }
        
        // Refresh all stores in context
        if (refreshStores) {
          await refreshStores();
        }
        
        if (loadStores) {
          await loadStores();
        }
        
        // Dispatch event to notify all components
        window.dispatchEvent(new CustomEvent('store-status-changed', { 
          detail: { 
            storeId: activeStore._id, 
            isOpen: response.isOpen, 
            store: response.store,
            timestamp: Date.now()
          }
        }));
        
        alert(response.message);
      } else {
        alert(response.error || 'Failed to update store status');
      }
    } catch (error) {
      console.error('Failed to toggle store status:', error);
      alert('Failed to update store status');
    } finally {
      if (isMountedRef.current) setToggling(false);
    }
  };

  if (!activeStore) return null;

  const isOpen = localStatus !== null ? localStatus : activeStore.open;

  // Check if store should be open based on hours
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const [openHour, openMinute] = (activeStore.openTime || '09:00').split(':').map(Number);
  const [closeHour, closeMinute] = (activeStore.closeTime || '21:00').split(':').map(Number);
  
  const isWithinHours = () => {
    const currentTotal = currentHour * 60 + currentMinute;
    const openTotal = openHour * 60 + openMinute;
    const closeTotal = closeHour * 60 + closeMinute;
    return currentTotal >= openTotal && currentTotal <= closeTotal;
  };

  const shouldBeOpen = isWithinHours();

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${currentTheme.colors.accentLight} border ${currentTheme.colors.border}`}>
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
        <span className={`text-[10px] font-medium ${isOpen ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {isOpen ? 'Open' : 'Closed'}
        </span>
      </div>
      
      {!isOpen && shouldBeOpen && (
        <span className="text-[8px] text-yellow-600 flex items-center gap-0.5">
          <Icons.alert className="text-[8px]" />
          Should be open
        </span>
      )}
      
      {isOpen && !shouldBeOpen && (
        <span className="text-[8px] text-yellow-600 flex items-center gap-0.5">
          <Icons.alert className="text-[8px]" />
          Outside hours
        </span>
      )}
      
      <button
        onClick={handleToggleStatus}
        disabled={toggling}
        className={`text-[9px] px-1.5 py-0.5 rounded transition-all ${
          isOpen 
            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
            : 'bg-green-100 text-green-600 hover:bg-green-200'
        } disabled:opacity-50`}
      >
        {toggling ? (
          <Icons.refresh className="animate-spin text-[9px]" />
        ) : (
          isOpen ? 'Close' : 'Open'
        )}
      </button>
    </div>
  );
}