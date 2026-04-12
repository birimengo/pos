// src/features/pos/settings/UserManagement.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../features/auth/AuthContext';
import { Icons } from '../../../components/ui/Icons';
import { api } from '../../pos/services/api';

const SafeIcon = ({ icon: Icon, className, fallback = '•' }) => {
  if (!Icon) return <span className={className}>{fallback}</span>;
  return <Icon className={className} />;
};

export default function UserManagement() {
  const { theme, getTheme } = useTheme();
  const { user: currentUser } = useAuth();
  const currentTheme = getTheme(theme);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cashier'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getAllUsers();
      console.log('Load users response:', response);
      
      // Handle different response formats
      let usersArray = [];
      if (response.success) {
        // Check if response.users is an array
        if (Array.isArray(response.users)) {
          usersArray = response.users;
        } 
        // Check if response.data is an array (alternative format)
        else if (Array.isArray(response.data)) {
          usersArray = response.data;
        }
        // Check if response itself is an array
        else if (Array.isArray(response)) {
          usersArray = response;
        }
        // Check if response has users in a nested property
        else if (response.data && Array.isArray(response.data.users)) {
          usersArray = response.data.users;
        }
      }
      
      setUsers(usersArray);
    } catch (error) {
      console.error('Failed to load users:', error);
      setError('Failed to load users. Please try again.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      const response = await api.createUser(formData);
      if (response.success) {
        alert('User added successfully');
        setShowAddModal(false);
        setFormData({ name: '', email: '', password: '', role: 'cashier' });
        await loadUsers(); // Reload users after adding
      } else {
        alert(response.error || 'Failed to add user');
      }
    } catch (error) {
      console.error('Add user error:', error);
      alert('Failed to add user: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      const response = await api.updateUser(userId, { isActive: !currentStatus });
      if (response.success) {
        await loadUsers(); // Reload users after status change
      } else {
        alert('Failed to update user status');
      }
    } catch (error) {
      console.error('Toggle status error:', error);
      alert('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      try {
        const response = await api.deleteUser(userId);
        if (response.success) {
          alert('User deleted successfully');
          await loadUsers(); // Reload users after deletion
        } else {
          alert(response.error || 'Failed to delete user');
        }
      } catch (error) {
        console.error('Delete user error:', error);
        alert('Failed to delete user');
      }
    }
  };

  const handleResetPassword = async (userId, userName) => {
    const newPassword = prompt(`Enter new password for ${userName}:`);
    if (newPassword && newPassword.length >= 6) {
      try {
        // Use the auth endpoint for password reset
        const response = await api.post(`/auth/users/${userId}/password`, { newPassword });
        if (response.success) {
          alert('Password reset successfully');
        } else {
          alert(response.error || 'Failed to reset password');
        }
      } catch (error) {
        console.error('Reset password error:', error);
        alert('Failed to reset password');
      }
    } else if (newPassword) {
      alert('Password must be at least 6 characters long');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <SafeIcon icon={Icons.refresh} className="animate-spin text-2xl" fallback="⟳" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded-lg ${currentTheme.colors.accentLight} border ${currentTheme.colors.border}`}>
        <div className="flex items-center gap-2 text-red-500">
          <SafeIcon icon={Icons.alert} className="text-lg" fallback="⚠️" />
          <p>{error}</p>
        </div>
        <button
          onClick={loadUsers}
          className="mt-2 px-3 py-1 text-sm rounded-lg bg-blue-500 text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>User Management</h2>
          <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
            Manage system users and their permissions
          </p>
        </div>
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setShowAddModal(true)}
            className={`px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white flex items-center gap-2`}
          >
            <SafeIcon icon={Icons.add} className="text-sm" fallback="+" />
            Add User
          </button>
        )}
      </div>

      {users.length === 0 ? (
        <div className={`p-8 text-center rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card}`}>
          <SafeIcon icon={Icons.users} className="text-4xl mx-auto mb-2 text-gray-400" fallback="👥" />
          <p className={`text-sm ${currentTheme.colors.textMuted}`}>No users found</p>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 px-3 py-1 text-sm rounded-lg bg-blue-500 text-white"
            >
              Add your first user
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(user => (
            <div key={user._id || user.id} className={`p-4 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-medium ${currentTheme.colors.text}`}>{user.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                      user.role === 'inventory_manager' ? 'bg-cyan-100 text-cyan-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {user.role?.replace('_', ' ') || 'Cashier'}
                    </span>
                    {!user.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        Inactive
                      </span>
                    )}
                    {user._id === currentUser?._id && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        You
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${currentTheme.colors.textMuted} mt-1`}>{user.email}</p>
                  <div className="flex gap-4 mt-1">
                    <p className={`text-xs ${currentTheme.colors.textMuted}`}>
                      Joined: {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                    {user.lastLogin && (
                      <p className={`text-xs ${currentTheme.colors.textMuted}`}>
                        Last login: {new Date(user.lastLogin).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {user.permissions && user.permissions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {user.permissions.slice(0, 3).map(perm => (
                        <span key={perm} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          {perm.replace('_', ' ')}
                        </span>
                      ))}
                      {user.permissions.length > 3 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          +{user.permissions.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {currentUser?.role === 'admin' && user._id !== currentUser?._id && (
                    <>
                      <button
                        onClick={() => handleResetPassword(user._id, user.name)}
                        className={`p-2 rounded-lg ${currentTheme.colors.hover} text-blue-500`}
                        title="Reset Password"
                      >
                        <SafeIcon icon={Icons.lock} className="text-sm" fallback="🔒" />
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(user._id, user.isActive)}
                        className={`p-2 rounded-lg ${currentTheme.colors.hover} ${
                          user.isActive ? 'text-orange-500' : 'text-green-500'
                        }`}
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <SafeIcon icon={user.isActive ? Icons.userX : Icons.userCheck} className="text-sm" fallback={user.isActive ? '⛔' : '✓'} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user._id, user.name)}
                        className={`p-2 rounded-lg ${currentTheme.colors.hover} text-red-500`}
                        title="Delete User"
                      >
                        <SafeIcon icon={Icons.trash} className="text-sm" fallback="🗑️" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl p-6`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Add New User</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <SafeIcon icon={Icons.x} className="text-xl" fallback="✕" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="•••••• (min. 6 characters)"
                />
                <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>
                  Password must be at least 6 characters long
                </p>
              </div>

              <div>
                <label className={`text-sm font-medium ${currentTheme.colors.text} block mb-1`}>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="cashier">Cashier</option>
                  <option value="inventory_manager">Inventory Manager</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}