// src/features/pos/components/StoreBadge.jsx
import { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Icons } from '../../../components/ui/Icons';
import { api } from '../services/api';

export default function StoreBadge() {
  const { activeStore, refreshStores, forceRefreshStore } = useStore();
  const [currentStore, setCurrentStore] = useState(null);
  const [storeStatus, setStoreStatus] = useState(null);

  useEffect(() => {
    if (activeStore) {
      setCurrentStore(activeStore);
      setStoreStatus(activeStore.open);
      console.log(`📊 Store badge updated: ${activeStore.name} is ${activeStore.open ? 'Open' : 'Closed'}`);
    }
  }, [activeStore]);

  // Listen for status changes
  useEffect(() => {
    const handleStatusChange = async (event) => {
      console.log('🔄 Store badge received status change:', event.detail);
      if (event.detail?.storeId === currentStore?._id) {
        setStoreStatus(event.detail.isOpen);
        if (currentStore) {
          setCurrentStore({ ...currentStore, open: event.detail.isOpen });
        }
        // Force refresh to ensure data is consistent
        if (forceRefreshStore) {
          await forceRefreshStore(event.detail.storeId);
        }
      }
      if (refreshStores) await refreshStores();
    };
    
    window.addEventListener('store-status-changed', handleStatusChange);
    
    return () => {
      window.removeEventListener('store-status-changed', handleStatusChange);
    };
  }, [currentStore, refreshStores, forceRefreshStore]);

  if (!currentStore) return null;

  const isOpen = storeStatus !== null ? storeStatus : currentStore.open;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <Icons.store className="text-sm text-gray-500" />
      <span className="text-sm font-medium">{currentStore.name}</span>
      <div className="flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
        <span className={`text-[10px] ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
          {isOpen ? 'Open' : 'Closed'}
        </span>
      </div>
      {currentStore.isDefault && (
        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">
          Main
        </span>
      )}
    </div>
  );
}