// src/features/pos/employees/EmployeeManagement.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Icons } from '../../../components/ui/Icons';

export default function EmployeeManagement() {
  const [view, setView] = useState('list');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showClockModal, setShowClockModal] = useState(false);
  const [clockPin, setClockPin] = useState('');
  const [clockError, setClockError] = useState('');
  
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  // Debug: Check which icons are available
  useEffect(() => {
    console.log('Available icons:', {
      userPlus: !!Icons.userPlus,
      eye: !!Icons.eye,
      edit: !!Icons.edit,
      userX: !!Icons.userX,
      userCheck: !!Icons.userCheck,
      user: !!Icons.user
    });
  }, []);

  // Safe icon wrapper component
  const SafeIcon = ({ icon: Icon, className, style, fallback = '•' }) => {
    if (!Icon) {
      console.warn('Icon component is undefined');
      return <span className={className} style={style}>{fallback}</span>;
    }
    return <Icon className={className} style={style} />;
  };

  // Mock employees data
  const [employees, setEmployees] = useState([
    { 
      id: 1, 
      name: 'John Smith', 
      role: 'Cashier', 
      email: 'john.smith@store.com',
      phone: '555-0101',
      pin: '1234',
      permissions: ['checkout', 'returns'],
      hourlyRate: 15.50,
      employeeId: 'EMP001',
      startDate: '2024-01-15',
      active: true,
      address: '123 Main St, Apt 4B',
      emergencyContact: 'Jane Smith (555-0199)',
      department: 'Sales'
    },
    { 
      id: 2, 
      name: 'Sarah Johnson', 
      role: 'Manager', 
      email: 'sarah.johnson@store.com',
      phone: '555-0102',
      pin: '5678',
      permissions: ['checkout', 'returns', 'inventory', 'employees', 'reports'],
      hourlyRate: 22.00,
      employeeId: 'EMP002',
      startDate: '2023-11-20',
      active: true,
      address: '456 Oak Ave',
      emergencyContact: 'Mike Johnson (555-0198)',
      department: 'Management'
    },
    { 
      id: 3, 
      name: 'Mike Wilson', 
      role: 'Cashier', 
      email: 'mike.wilson@store.com',
      phone: '555-0103',
      pin: '9012',
      permissions: ['checkout'],
      hourlyRate: 15.50,
      employeeId: 'EMP003',
      startDate: '2024-02-01',
      active: true,
      address: '789 Pine St',
      emergencyContact: 'Lisa Wilson (555-0197)',
      department: 'Sales'
    },
    { 
      id: 4, 
      name: 'Emily Davis', 
      role: 'Inventory Specialist', 
      email: 'emily.davis@store.com',
      phone: '555-0104',
      pin: '3456',
      permissions: ['inventory', 'receiving'],
      hourlyRate: 18.00,
      employeeId: 'EMP004',
      startDate: '2024-01-10',
      active: true,
      address: '321 Elm St',
      emergencyContact: 'Tom Davis (555-0196)',
      department: 'Operations'
    },
  ]);

  // Mock time entries
  const [timeEntries, setTimeEntries] = useState([
    { id: 1, employeeId: 1, clockIn: '2024-03-16T08:00:00', clockOut: '2024-03-16T16:30:00' },
    { id: 2, employeeId: 2, clockIn: '2024-03-16T09:00:00', clockOut: null },
    { id: 3, employeeId: 3, clockIn: '2024-03-16T08:30:00', clockOut: '2024-03-16T17:00:00' },
    { id: 4, employeeId: 4, clockIn: '2024-03-16T07:00:00', clockOut: '2024-03-16T15:30:00' },
    { id: 5, employeeId: 1, clockIn: '2024-03-15T08:00:00', clockOut: '2024-03-15T16:30:00' },
    { id: 6, employeeId: 2, clockIn: '2024-03-15T09:00:00', clockOut: '2024-03-15T17:30:00' },
  ]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Cashier',
    pin: '',
    hourlyRate: '',
    employeeId: '',
    department: 'Sales',
    address: '',
    emergencyContact: '',
    permissions: []
  });

  const getEmployeeStatus = (employeeId) => {
    const today = new Date().toISOString().split('T')[0];
    return timeEntries.some(e => 
      e.employeeId === employeeId && 
      e.clockIn.startsWith(today) && 
      !e.clockOut
    );
  };

  const handleClockInOut = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    setSelectedEmployee(employee);
    setShowClockModal(true);
    setClockPin('');
    setClockError('');
  };

  const verifyClockPin = () => {
    if (selectedEmployee && clockPin === selectedEmployee.pin) {
      const now = new Date().toISOString();
      const today = now.split('T')[0];
      
      const existingEntry = timeEntries.find(
        e => e.employeeId === selectedEmployee.id && 
        e.clockIn.startsWith(today) && 
        !e.clockOut
      );

      if (existingEntry) {
        setTimeEntries(prev =>
          prev.map(e =>
            e.id === existingEntry.id ? { ...e, clockOut: now } : e
          )
        );
        alert(`Goodbye, ${selectedEmployee.name}! You've clocked out.`);
      } else {
        const newEntry = {
          id: timeEntries.length + 1,
          employeeId: selectedEmployee.id,
          clockIn: now,
          clockOut: null
        };
        setTimeEntries([...timeEntries, newEntry]);
        alert(`Welcome, ${selectedEmployee.name}! You've clocked in.`);
      }

      setShowClockModal(false);
      setSelectedEmployee(null);
      setClockPin('');
    } else {
      setClockError('Invalid PIN. Please try again.');
    }
  };

  const calculateHoursWorked = (clockIn, clockOut) => {
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    const hours = (end - start) / (1000 * 60 * 60);
    return hours.toFixed(1);
  };

  const getTodayHours = (employeeId) => {
    const today = new Date().toISOString().split('T')[0];
    const entry = timeEntries.find(e => 
      e.employeeId === employeeId && 
      e.clockIn.startsWith(today)
    );
    
    if (entry) {
      return calculateHoursWorked(entry.clockIn, entry.clockOut);
    }
    return '0.0';
  };

  const getWeekHours = (employeeId) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekEntries = timeEntries.filter(e => 
      e.employeeId === employeeId && 
      new Date(e.clockIn) > weekAgo
    );
    
    const totalHours = weekEntries.reduce((sum, entry) => {
      return sum + parseFloat(calculateHoursWorked(entry.clockIn, entry.clockOut));
    }, 0);
    
    return totalHours.toFixed(1);
  };

  const handleAddEmployee = () => {
    if (!formData.name || !formData.email || !formData.pin || !formData.hourlyRate) {
      alert('Please fill in all required fields');
      return;
    }

    const newEmployee = {
      id: employees.length + 1,
      ...formData,
      employeeId: `EMP${String(employees.length + 1).padStart(3, '0')}`,
      startDate: new Date().toISOString().split('T')[0],
      active: true,
      hourlyRate: parseFloat(formData.hourlyRate),
      permissions: formData.permissions.length ? formData.permissions : ['checkout']
    };

    setEmployees([...employees, newEmployee]);
    setView('list');
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'Cashier',
      pin: '',
      hourlyRate: '',
      employeeId: '',
      department: 'Sales',
      address: '',
      emergencyContact: '',
      permissions: []
    });
    
    alert('Employee added successfully!');
  };

  const handleToggleActive = (employeeId) => {
    setEmployees(prev =>
      prev.map(emp =>
        emp.id === employeeId ? { ...emp, active: !emp.active } : emp
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className={`text-xl font-bold ${currentTheme.colors.text}`}>Employee Management</h1>
        {view === 'list' && (
          <button
            onClick={() => setView('add')}
            className={`px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white flex items-center gap-2`}
          >
            <SafeIcon icon={Icons.userPlus} className="text-sm" fallback="+" /> Add Employee
          </button>
        )}
      </div>

      {view === 'list' && (
        <>
          {/* Quick Clock In/Out */}
          <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
            <h2 className={`font-semibold mb-3 ${currentTheme.colors.text}`}>Quick Clock In/Out</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {employees.filter(e => e.active).map(emp => {
                const isClocked = getEmployeeStatus(emp.id);
                return (
                  <button
                    key={emp.id}
                    onClick={() => handleClockInOut(emp.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isClocked
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-500 hover:bg-green-100'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <p className={`text-sm font-medium ${currentTheme.colors.text}`}>{emp.name}</p>
                    <p className={`text-xs ${currentTheme.colors.textMuted}`}>{emp.role}</p>
                    <p className={`text-xs mt-1 flex items-center gap-1 ${
                      isClocked ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${isClocked ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {isClocked ? 'Clocked In' : 'Clocked Out'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
              <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Active Employees</p>
              <p className={`text-2xl font-bold ${currentTheme.colors.text}`}>
                {employees.filter(e => e.active).length}
              </p>
            </div>
            <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
              <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Clocked In Now</p>
              <p className={`text-2xl font-bold ${currentTheme.accentText}`}>
                {timeEntries.filter(e => {
                  const today = new Date().toISOString().split('T')[0];
                  return e.clockIn.startsWith(today) && !e.clockOut;
                }).length}
              </p>
            </div>
            <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
              <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Total Payroll Today</p>
              <p className={`text-2xl font-bold ${currentTheme.colors.text}`}>
                ${timeEntries
                  .filter(e => {
                    const today = new Date().toISOString().split('T')[0];
                    return e.clockIn.startsWith(today);
                  })
                  .reduce((sum, entry) => {
                    const emp = employees.find(e => e.id === entry.employeeId);
                    const hours = parseFloat(calculateHoursWorked(entry.clockIn, entry.clockOut));
                    return sum + (hours * (emp?.hourlyRate || 0));
                  }, 0)
                  .toFixed(2)}
              </p>
            </div>
            <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
              <p className={`text-xs ${currentTheme.colors.textSecondary}`}>Departments</p>
              <p className={`text-2xl font-bold ${currentTheme.colors.text}`}>
                {new Set(employees.map(e => e.department)).size}
              </p>
            </div>
          </div>

          {/* Employee List */}
          <div className="grid gap-3">
            {employees.map(emp => (
              <div
                key={emp.id}
                className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border} hover:shadow-md transition-all`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={`font-semibold ${currentTheme.colors.text}`}>{emp.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        emp.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {emp.active ? 'Active' : 'Inactive'}
                      </span>
                      {getEmployeeStatus(emp.id) && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                          On Clock
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-2">
                      <div>
                        <p className={`text-xs ${currentTheme.colors.textMuted}`}>ID</p>
                        <p className={currentTheme.colors.text}>{emp.employeeId}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${currentTheme.colors.textMuted}`}>Role</p>
                        <p className={currentTheme.colors.text}>{emp.role}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${currentTheme.colors.textMuted}`}>Rate</p>
                        <p className={currentTheme.colors.text}>${emp.hourlyRate}/hr</p>
                      </div>
                      <div>
                        <p className={`text-xs ${currentTheme.colors.textMuted}`}>Today</p>
                        <p className={currentTheme.colors.text}>{getTodayHours(emp.id)} hrs</p>
                      </div>
                    </div>

                    <div className="flex gap-3 text-xs">
                      <span className={currentTheme.colors.textSecondary}>{emp.email}</span>
                      <span className={currentTheme.colors.textSecondary}>{emp.phone}</span>
                      <span className={currentTheme.colors.textSecondary}>Week: {getWeekHours(emp.id)} hrs</span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {emp.permissions.map(p => (
                        <span key={p} className={`text-xs px-2 py-0.5 rounded-full ${currentTheme.colors.accentLight} ${currentTheme.colors.accentText}`}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setView('details');
                      }}
                      className={`p-2 rounded-lg ${currentTheme.colors.hover}`}
                      title="View Details"
                    >
                      <SafeIcon icon={Icons.eye} className="text-sm" fallback="👁" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setFormData(emp);
                        setView('edit');
                      }}
                      className={`p-2 rounded-lg ${currentTheme.colors.hover}`}
                      title="Edit"
                    >
                      <SafeIcon icon={Icons.edit} className="text-sm" fallback="✎" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(emp.id)}
                      className={`p-2 rounded-lg ${currentTheme.colors.hover}`}
                      title={emp.active ? 'Deactivate' : 'Activate'}
                    >
                      {emp.active ? 
                        <SafeIcon icon={Icons.userX} className="text-sm text-red-500" fallback="✗" /> : 
                        <SafeIcon icon={Icons.userCheck} className="text-sm text-green-500" fallback="✓" />
                      }
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Today's Time Sheet */}
          <div className={`${currentTheme.colors.card} rounded-lg p-4 border ${currentTheme.colors.border}`}>
            <h2 className={`font-semibold mb-3 ${currentTheme.colors.text}`}>Today's Time Sheet</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 text-xs">Employee</th>
                    <th className="text-left py-2 text-xs">Clock In</th>
                    <th className="text-left py-2 text-xs">Clock Out</th>
                    <th className="text-left py-2 text-xs">Hours</th>
                    <th className="text-left py-2 text-xs">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries
                    .filter(e => e.clockIn.startsWith(new Date().toISOString().split('T')[0]))
                    .map(entry => {
                      const emp = employees.find(e => e.id === entry.employeeId);
                      const clockIn = new Date(entry.clockIn);
                      const clockOut = entry.clockOut ? new Date(entry.clockOut) : null;
                      const hours = parseFloat(calculateHoursWorked(entry.clockIn, entry.clockOut));
                      const earnings = hours * (emp?.hourlyRate || 0);

                      return (
                        <tr key={entry.id} className="border-b last:border-0 border-gray-200 dark:border-gray-700">
                          <td className="py-2 text-sm">{emp?.name}</td>
                          <td className="py-2 text-sm">{clockIn.toLocaleTimeString()}</td>
                          <td className="py-2 text-sm">{clockOut?.toLocaleTimeString() || '—'}</td>
                          <td className="py-2 text-sm">{hours.toFixed(1)}</td>
                          <td className="py-2 text-sm">${earnings.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {view === 'add' && (
        <div className={`${currentTheme.colors.card} rounded-lg p-6 border ${currentTheme.colors.border}`}>
          <h2 className={`text-lg font-semibold mb-4 ${currentTheme.colors.text}`}>Add New Employee</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary}`}
              />
            </div>
            <div>
              <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary}`}
              />
            </div>
            <div>
              <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary}`}
              />
            </div>
            <div>
              <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary}`}
              >
                <option value="Cashier">Cashier</option>
                <option value="Manager">Manager</option>
                <option value="Inventory Specialist">Inventory Specialist</option>
                <option value="Supervisor">Supervisor</option>
              </select>
            </div>
            <div>
              <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>PIN *</label>
              <input
                type="password"
                maxLength="4"
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary}`}
              />
            </div>
            <div>
              <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Hourly Rate *</label>
              <input
                type="number"
                step="0.01"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary}`}
              />
            </div>
            <div>
              <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary}`}
              >
                <option value="Sales">Sales</option>
                <option value="Management">Management</option>
                <option value="Operations">Operations</option>
              </select>
            </div>
            <div>
              <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Employee ID</label>
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary}`}
                placeholder="Auto-generated if empty"
              />
            </div>
            <div className="col-span-2">
              <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary}`}
              />
            </div>
            <div className="col-span-2">
              <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Emergency Contact</label>
              <input
                type="text"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary}`}
              />
            </div>
            <div className="col-span-2">
              <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Permissions</label>
              <div className="grid grid-cols-4 gap-2">
                {['checkout', 'returns', 'inventory', 'employees', 'reports', 'receiving'].map(perm => (
                  <label key={perm} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(perm)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            permissions: [...formData.permissions, perm]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            permissions: formData.permissions.filter(p => p !== perm)
                          });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm capitalize">{perm}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setView('list')}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddEmployee}
              className={`px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white`}
            >
              Add Employee
            </button>
          </div>
        </div>
      )}

      {/* Clock In/Out Modal */}
      {showClockModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md ${currentTheme.colors.card} rounded-xl shadow-2xl p-6`}>
            <div className="text-center mb-4">
              <div className={`w-16 h-16 mx-auto rounded-full ${currentTheme.colors.accentLight} flex items-center justify-center mb-3`}>
                <SafeIcon icon={Icons.user} className={`text-3xl ${currentTheme.accentText}`} fallback="👤" />
              </div>
              <h3 className={`text-lg font-semibold ${currentTheme.colors.text}`}>{selectedEmployee.name}</h3>
              <p className={`text-sm ${currentTheme.colors.textSecondary}`}>{selectedEmployee.role}</p>
            </div>

            <div className="mb-4">
              <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>Enter PIN</label>
              <input
                type="password"
                value={clockPin}
                onChange={(e) => setClockPin(e.target.value)}
                maxLength="4"
                className={`w-full px-3 py-2 text-center text-2xl tracking-widest rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary}`}
                placeholder="••••"
                autoFocus
              />
              {clockError && (
                <p className="text-xs text-red-500 mt-1">{clockError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowClockModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={verifyClockPin}
                className={`flex-1 px-4 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white`}
              >
                {getEmployeeStatus(selectedEmployee.id) ? 'Clock Out' : 'Clock In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}