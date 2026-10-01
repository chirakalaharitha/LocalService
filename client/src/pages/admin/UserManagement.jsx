import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import { HiOutlineUserAdd, HiOutlineUserGroup, HiOutlineSearch, HiOutlineBan, HiOutlineCheck, HiOutlinePencilAlt } from 'react-icons/hi';
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
    assignedCategory: '',
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

  // Edit / Configure Staff Modal State
  const [editingStaff, setEditingStaff] = useState(null);
  const [editStaffForm, setEditStaffForm] = useState({
    name: '',
    phone: '',
    department: '',
    assignedCategory: '',
    ward: '',
    city: '',
    state: '',
    pincode: '',
    isActive: true
  });
  const [savingEdit, setSavingEdit] = useState(false);

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

  const openEditStaffModal = (u) => {
    setEditingStaff(u);
    setEditStaffForm({
      name: u.name || '',
      phone: u.phone || '',
      department: u.department?._id || u.department || '',
      assignedCategory: u.assignedCategory || u.category || u.department?.category || '',
      ward: u.ward || '',
      city: u.city || user?.municipality?.city || '',
      state: u.state || user?.municipality?.state || '',
      pincode: u.pincode || '',
      isActive: u.isActive !== false
    });
  };

  const handleEditStaffSubmit = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    setSavingEdit(true);
    try {
      const res = await API.put(`/admin/users/${editingStaff._id}`, editStaffForm);
      if (res.data.success) {
        toast.success(res.data.message || 'Staff profile and configuration updated successfully!');
        setEditingStaff(null);
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update staff configuration.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header Banner & Modal CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-[#EFE7E0] p-6 sm:p-8 rounded-3xl shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight flex items-center gap-2.5">
            <HiOutlineUserGroup className="text-[#C65F63]" />
            <span>User & Staff Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#6B666E] mt-1">
            Manage citizen accounts, register municipal field staff, and control authorization status.
          </p>
        </div>

        <button
          onClick={() => setShowStaffModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-xs shadow-md shadow-[#C65F63]/25 transition"
        >
          <HiOutlineUserAdd className="text-lg" />
          <span>+ Create Field Staff</span>
        </button>
      </div>

      {/* Search & Role Filters */}
      <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <form onSubmit={(e) => { e.preventDefault(); fetchUsers(); }} className="relative flex-1 w-full">
          <HiOutlineSearch className="absolute left-3.5 top-3 text-[#9E98A2] text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 pl-9 pr-4 text-xs text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63] focus:bg-white transition"
          />
        </form>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] w-full sm:w-auto"
          >
            <option value="">All User Roles</option>
            <option value="CITIZEN">Citizens Only</option>
            <option value="STAFF">Field Staff Only</option>
            <option value="ADMIN">Admins Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] w-full sm:w-auto"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#9E98A2]">Loading user records...</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#9E98A2] font-medium">
            {roleFilter === 'STAFF' ? 'No staff members found' : 'No users found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs text-[#29252A]">
              <thead className="bg-[#FAF5F0] text-[#6B4E71] uppercase font-bold text-[10px] border-b border-[#EFE7E0]">
                <tr>
                  <th className="p-3.5 rounded-l-xl">User Info</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Ward / Area</th>
                  <th className="p-3.5">Phone</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE7E0] font-medium">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-[#FAF5F0]/60 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-[#29252A]">{u.name}</div>
                      <div className="text-[11px] text-[#6B666E]">{u.email}</div>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'ADMIN'
                            ? 'bg-[#FDECEF] text-[#C65F63] border border-[#C65F63]/20'
                            : u.role === 'STAFF'
                            ? 'bg-[#E8D7E6] text-[#6B4E71] border border-[#6B4E71]/20'
                            : 'bg-emerald-50 text-[#5C9A72] border border-emerald-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="p-3.5">
                      {u.department?.name ? (
                        <span className="font-semibold text-[#29252A]">{u.department.name}</span>
                      ) : (
                        <span className="text-[#9E98A2]">—</span>
                      )}
                    </td>

                    <td className="p-3.5 text-xs text-[#6B666E]">
                      {u.ward ? `Ward ${u.ward}` : u.city || '—'}
                    </td>

                    <td className="p-3.5 font-mono text-xs text-[#29252A]">
                      {u.phone || '—'}
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.isActive !== false
                            ? 'bg-emerald-50 text-[#5C9A72] border border-emerald-200'
                            : 'bg-rose-50 text-[#B85450] border border-rose-200'
                        }`}
                      >
                        {u.isActive !== false ? 'Active' : 'Suspended'}
                      </span>
                    </td>

                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      {u.role === 'STAFF' && (
                        <button
                          onClick={() => openEditStaffModal(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-[#FAF5F0] hover:bg-[#FDECEF] text-[#C65F63] border border-[#EFE7E0] transition cursor-pointer"
                          title="Configure staff department, service category, and jurisdiction"
                        >
                          <HiOutlinePencilAlt className="text-xs" />
                          <span>Configure</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleStatus(u._id)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                          u.isActive !== false
                            ? 'bg-rose-50 hover:bg-rose-100 text-[#B85450] border border-rose-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-[#5C9A72] border border-emerald-200'
                        }`}
                      >
                        {u.isActive !== false ? (
                          <>
                            <HiOutlineBan />
                            <span>Suspend</span>
                          </>
                        ) : (
                          <>
                            <HiOutlineCheck />
                            <span>Activate</span>
                          </>
                        )}
                      </button>
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
        <div className="fixed inset-0 bg-[#29252A]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form
            onSubmit={handleCreateStaffSubmit}
            className="max-w-md w-full bg-white border border-[#EFE7E0] rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
              <div className="flex items-center gap-2">
                <HiOutlineUserAdd className="text-xl text-[#C65F63]" />
                <h3 className="text-base font-bold text-[#29252A]">Register Field Staff</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowStaffModal(false);
                  setStaffForm(initialStaffForm);
                }}
                className="text-[#9E98A2] hover:text-[#29252A]"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">Full Name * :</label>
              <input
                type="text"
                required
                value={staffForm.name}
                onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                placeholder="Staff Member Name"
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">Official Email Address * :</label>
              <input
                type="email"
                required
                value={staffForm.email}
                onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                placeholder="staff@localfix.gov"
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">Phone Number * :</label>
              <input
                type="tel"
                required
                value={staffForm.phone}
                onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                placeholder="10-digit contact number"
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">Assigned Department * :</label>
              <select
                required
                value={staffForm.department}
                onChange={(e) => {
                  const deptId = e.target.value;
                  const matched = departments.find((d) => d._id === deptId);
                  setStaffForm({
                    ...staffForm,
                    department: deptId,
                    assignedCategory: matched?.category || matched?.name || staffForm.assignedCategory
                  });
                }}
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
              >
                <option value="">-- Choose Municipal Department --</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.category || 'General'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">Service Category :</label>
              <input
                type="text"
                value={staffForm.assignedCategory}
                onChange={(e) => setStaffForm({ ...staffForm, assignedCategory: e.target.value })}
                placeholder="e.g. Water Supply, Streetlights"
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">Ward / Assigned Service Area :</label>
              {user?.municipality?.wards && user.municipality.wards.length > 0 ? (
                <select
                  value={staffForm.ward}
                  onChange={(e) => setStaffForm({ ...staffForm, ward: e.target.value })}
                  className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
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
                  className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
                />
              )}
            </div>

            {/* City, State, Pincode Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-[#29252A] mb-1">City :</label>
                <input
                  type="text"
                  value={staffForm.city}
                  onChange={(e) => setStaffForm({ ...staffForm, city: e.target.value })}
                  placeholder="City"
                  className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#29252A] mb-1">State :</label>
                <input
                  type="text"
                  value={staffForm.state}
                  onChange={(e) => setStaffForm({ ...staffForm, state: e.target.value })}
                  placeholder="State"
                  className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#29252A] mb-1">Pincode :</label>
                <input
                  type="text"
                  value={staffForm.pincode}
                  onChange={(e) => setStaffForm({ ...staffForm, pincode: e.target.value })}
                  placeholder="522201"
                  className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
                />
              </div>
            </div>

            {/* Password & Confirm Password Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#29252A] mb-1">Temporary Password * :</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#29252A] mb-1">Confirm Password * :</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={staffForm.confirmPassword}
                  onChange={(e) => setStaffForm({ ...staffForm, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
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
                className="flex-1 py-2.5 rounded-xl border border-[#EFE7E0] text-[#6B666E] text-xs font-bold hover:bg-[#FAF5F0]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={staffCreating}
                className="flex-1 py-2.5 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold shadow-md shadow-[#C65F63]/25 transition disabled:opacity-50"
              >
                {staffCreating ? 'Creating Staff...' : 'Create Staff Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Configure / Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-[#29252A]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form
            onSubmit={handleEditStaffSubmit}
            className="max-w-md w-full bg-white border border-[#EFE7E0] rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
              <div className="flex items-center gap-2">
                <HiOutlinePencilAlt className="text-xl text-[#C65F63]" />
                <h3 className="text-base font-bold text-[#29252A]">Configure Field Staff</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-[#9E98A2] hover:text-[#29252A] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#6B666E]">
              Configure departmental assignment, category scope, and jurisdiction for <strong>{editingStaff.name}</strong> ({editingStaff.email}).
            </p>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">Full Name * :</label>
              <input
                type="text"
                required
                value={editStaffForm.name}
                onChange={(e) => setEditStaffForm({ ...editStaffForm, name: e.target.value })}
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">Contact Phone Number :</label>
              <input
                type="tel"
                value={editStaffForm.phone}
                onChange={(e) => setEditStaffForm({ ...editStaffForm, phone: e.target.value })}
                placeholder="10-digit mobile number"
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">Assigned Department :</label>
              <select
                value={editStaffForm.department}
                onChange={(e) => {
                  const deptId = e.target.value;
                  const matched = departments.find((d) => d._id === deptId);
                  setEditStaffForm({
                    ...editStaffForm,
                    department: deptId,
                    assignedCategory: matched?.category || matched?.name || editStaffForm.assignedCategory
                  });
                }}
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
              >
                <option value="">-- No Department Assigned --</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} {d.category ? `(${d.category})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">Service Category :</label>
              <input
                type="text"
                value={editStaffForm.assignedCategory}
                onChange={(e) => setEditStaffForm({ ...editStaffForm, assignedCategory: e.target.value })}
                placeholder="e.g. Water Supply, Streetlights"
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">Ward / Assigned Area :</label>
              <input
                type="text"
                value={editStaffForm.ward}
                onChange={(e) => setEditStaffForm({ ...editStaffForm, ward: e.target.value })}
                placeholder="e.g. Ward 4 / Brodipet"
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-[#29252A] mb-1">City / Municipality :</label>
                <input
                  type="text"
                  value={editStaffForm.city}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, city: e.target.value })}
                  placeholder="Guntur"
                  className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#29252A] mb-1">State :</label>
                <input
                  type="text"
                  value={editStaffForm.state}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, state: e.target.value })}
                  placeholder="Andhra Pradesh"
                  className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#EFE7E0] text-[#6B666E] text-xs font-bold hover:bg-[#FAF5F0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="flex-1 py-2.5 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold shadow-md shadow-[#C65F63]/25 transition disabled:opacity-50 cursor-pointer"
              >
                {savingEdit ? 'Saving Changes...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default UserManagement;
