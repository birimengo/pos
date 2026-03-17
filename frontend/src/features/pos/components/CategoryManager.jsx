// src/features/pos/components/CategoryManager.jsx
import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Icons } from '../../../components/ui/Icons';

export default function CategoryManager({ categories, onAdd, onRemove, onClose }) {
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState('');
  
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  const handleAdd = () => {
    if (!newCategory.trim()) {
      setError('Category name cannot be empty');
      return;
    }
    
    if (categories.includes(newCategory.trim())) {
      setError('Category already exists');
      return;
    }
    
    onAdd(newCategory.trim());
    setNewCategory('');
    setError('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl`}>
        {/* Header */}
        <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center`}>
          <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Manage Categories</h2>
          <button onClick={onClose} className={`p-1 rounded-lg ${currentTheme.colors.hover}`}>
            <Icons.x className="text-xl" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {/* Add New Category */}
          <div className="mb-6">
            <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>
              Add New Category
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  setError('');
                }}
                onKeyPress={handleKeyPress}
                placeholder="Enter category name"
                className={`flex-1 px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                autoFocus
              />
              <button
                onClick={handleAdd}
                className={`px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white`}
              >
                Add
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
          </div>

          {/* Category List */}
          <div>
            <h3 className={`text-sm font-medium mb-2 ${currentTheme.colors.text}`}>
              Your Categories ({categories.length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.length === 0 ? (
                <p className={`text-sm ${currentTheme.colors.textMuted} text-center py-4`}>
                  No categories yet. Add your first category above.
                </p>
              ) : (
                categories.map(category => (
                  <div
                    key={category}
                    className="flex items-center justify-between p-2 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <span className={`text-sm ${currentTheme.colors.text}`}>{category}</span>
                    <button
                      onClick={() => onRemove(category)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="Remove category"
                    >
                      <Icons.trash className="text-sm" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tips */}
          <div className={`mt-4 p-3 ${currentTheme.colors.accentLight} rounded-lg text-xs`}>
            <p className={`flex items-center gap-1 ${currentTheme.colors.textSecondary}`}>
              <Icons.info className="text-sm" />
              Categories help organize your products. Removing a category won't affect existing products.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${currentTheme.colors.border} flex justify-end`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}