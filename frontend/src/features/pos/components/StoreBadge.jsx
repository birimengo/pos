// src/features/pos/components/StoreBadge.jsx
import { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Icons } from '../../../components/ui/Icons';

export default function StoreBadge() {
  const { activeStore } = useStore();
  const [currentStore, setCurrentStore] = useState(null);

  useEffect(() => {
    setCurrentStore(activeStore);
  }, [activeStore]);

  if (!currentStore) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <Icons.store className="text-sm text-gray-500" />
      <span className="text-sm font-medium">{currentStore.name}</span>
      {currentStore.isDefault && (
        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">
          Main
        </span>
      )}
    </div>
  );
}