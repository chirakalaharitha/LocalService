import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import { HiOutlineUserAdd, HiOutlineUserGroup, HiOutlineSearch, HiOutlineBan, HiOutlineCheck } from 'react-icons/hi';
import { toast } from 'react-toastify';

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Create Staff Modal State
  const initialStaffForm = {
    name: '',
    email: '',
    phone: '',
    department: '',
    ward: '',
    serviceArea: '',
    city: user?.municipality?.city || user?.city || '',
    state: user?.municipality?.state || user?.state || '',
    pincode: user?.pincode || '',
    password: '',
    confirmPassword: ''
  };
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState(initialStaffForm);
  const [staffCreating, setStaffCreating] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await API.get('/admin/users', {
        params: { role: roleFilter, status: statusFilter, search }
      });
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    API.get('/departments').then(res => setDepartments(res.data.departments || []));
  }, [roleFilter, statusFilter]);

  const handleToggleStatus = async (userId) => {
    try {
      const res = await API.put(`/admin/users/${userId}/status`);
      if (res.data.success) {
        toast.success(res.data.message || 'User status updated successfully.');
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status toggle failed');
    }
  };

  const handleCreateStaffSubmit = async (e) => {
    e.preventDefault();
    if (staffForm.password.length < 6) {
      toast.error('Temporary password must be at least 6 characters.');
      return;
    }
    if (staffForm.password !== staffForm.confirmPassword) {
      toast.error('Passwords do not match. Please verify.');
      return;
    }
    setStaffCreating(true);
    try {
      const payload = {
        ...staffForm,
        municipalityId: user?.municipality?._id || user?.municipality
      };
      const res = await API.post('/admin/users/staff', payload);
      if (res.data.success) {
        toast.success(res.data.message || 'Field staff registered successfully!');
        setShowStaffModal(false);
        setStaffForm(initialStaffForm);
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Staff creation failed');
    } finally {
      setStaffCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner & Modal CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <HiOutlineUserGroup className="text-blue-400" />
            <span>User & Staff Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage citizen accounts, register field staff, and control authorization status</p>
        </div>

        <button
          onClick={() => setShowStaffModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition"
        >
          <HiOutlineUserAdd className="text-lg" />
          <span>+ Create Staff</span>
        </button>
      </div>

      {/* Search & Role Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={(e) => { e.preventDefault(); fetchUsers(); }} className="relative flex-1 w-full">
          <HiOutlineSearch className="absolute left-3.5 top-3 text-slate-400 text-base" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </form>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 w-full sm:w-auto"
          >
            <option value="">All User Roles</option>
            <option value="CITIZEN">Citizens Only</option>
            <option value="STAFF">Field Staff Only</option>
            <option value="ADMIN">Admins Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 w-full sm:w-auto"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading user records...</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 font-medium">
            {roleFilter === 'STAFF' ? 'No staff members found' : 'No users found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-3 rounded-l-xl">User Info</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Ward / Area</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3">
                      <div className="font-bold text-slate-100">{u.name}</div>
                      <div className="text-[10px] text-slate-500">{u.email}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' :
                        u.role === 'STAFF' ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">
                      {u.department?.name || '—'}
                    </td>
                    <td className="p-3 text-slate-400">
                      {u.ward || u.serviceArea || (u.city ? `${u.city}` : '—')}
                    </td>
                    <td className="p-3 font-mono text-slate-400">{u.phone}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleToggleStatus(u._id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            u.isActive
                              ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {u.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateStaffSubmit} className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <HiOutlineUserAdd className="text-teal-400" />
                  <span>Create Field Staff Account</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {user?.municipality?.name ? `Provisioning under ${user.municipality.name}` : 'Admin provisioning for municipal field officers'}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold">
                STAFF
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name * :</label>
              <input
                type="text"
                required
                value={staffForm.name}
                onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                placeholder="e.g. Rajesh Kumar"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address * :</label>
                <input
                  type="email"
                  required
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  placeholder="staff.name@localfix.gov.in"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number * :</label>
                <input
                  type="tel"
                  required
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  placeholder="9876543211"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Department * :</label>
              <select
                required
                value={staffForm.department}
                onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Choose Department --</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Ward / Assigned Service Area :</label>
              {user?.municipality?.wards && user.municipality.wards.length > 0 ? (
                <select
                  value={staffForm.ward}
                  onChange={(e) => setStaffForm({ ...staffForm, ward: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Central / All Municipal Wards --</option>
                  {user.municipality.wards.map((w) => (
                    <option key={w.wardNumber} value={w.wardNumber}>
                      {w.wardNumber} - {w.name} ({w.zone || 'Zone'})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={staffForm.ward}
                  onChange={(e) => setStaffForm({ ...staffForm, ward: e.target.value })}
                  placeholder="e.g. Ward 1 (Brodipet)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              )}
            </div>

            {/* City, State, Pincode Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">City :</label>
                <input
                  type="text"
                  value={staffForm.city}
                  onChange={(e) => setStaffForm({ ...staffForm, city: e.target.value })}
                  placeholder="City"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">State :</label>
                <input
                  type="text"
                  value={staffForm.state}
                  onChange={(e) => setStaffForm({ ...staffForm, state: e.target.value })}
                  placeholder="State"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Pincode :</label>
                <input
                  type="text"
                  value={staffForm.pincode}
                  onChange={(e) => setStaffForm({ ...staffForm, pincode: e.target.value })}
                  placeholder="400001"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Password & Confirm Password Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Temporary Password * :</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password * :</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={staffForm.confirmPassword}
                  onChange={(e) => setStaffForm({ ...staffForm, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowStaffModal(false);
                  setStaffForm(initialStaffForm);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={staffCreating}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
              >
                {staffCreating ? 'Creating Staff...' : 'Create Staff Account'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default UserManagement;

