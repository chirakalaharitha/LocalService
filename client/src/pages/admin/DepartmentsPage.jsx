import React, { useState, useEffect, useCallback } from 'react';
import API from '../../services/api';
import { toast } from 'react-toastify';
import {
  HiOutlineOfficeBuilding,
  HiOutlineUserGroup,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineClipboardList,
  HiOutlineSearch,
  HiOutlineRefresh,
  HiOutlineUserAdd,
  HiOutlineUserRemove
} from 'react-icons/hi';

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);

  // Selected Department for Modals
  const [selectedDept, setSelectedDept] = useState(null);
  const [deptStaff, setDeptStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [allStaffUsers, setAllStaffUsers] = useState([]);
  const [selectedStaffToAssign, setSelectedStaffToAssign] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    icon: 'HiOfficeBuilding'
  });

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/departments/admin');
      if (res.data.success) {
        setDepartments(res.data.departments || []);
      }
    } catch (err) {
      toast.error('Failed to load municipal departments.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Fetch all staff users for assignment dropdown
  const fetchAllStaff = async () => {
    try {
      const res = await API.get('/admin/users?role=STAFF');
      if (res.data.success) {
        setAllStaffUsers(res.data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch staff list:', err.message);
    }
  };

  // Open Manage Staff Modal
  const handleOpenStaffModal = async (dept) => {
    setSelectedDept(dept);
    setShowStaffModal(true);
    setStaffLoading(true);
    try {
      await fetchAllStaff();
      const res = await API.get(`/departments/${dept._id}/staff`);
      if (res.data.success) {
        setDeptStaff(res.data.staff || []);
      }
    } catch (err) {
      toast.error('Failed to load department staff.');
      console.error(err);
    } finally {
      setStaffLoading(false);
    }
  };

  // Assign Staff
  const handleAssignStaff = async () => {
    if (!selectedStaffToAssign) {
      toast.info('Please select a staff member to assign.');
      return;
    }
    try {
      const res = await API.post(`/departments/${selectedDept._id}/staff`, { staffId: selectedStaffToAssign });
      if (res.data.success) {
        toast.success(res.data.message);
        setSelectedStaffToAssign('');
        // Refresh department staff
        const sRes = await API.get(`/departments/${selectedDept._id}/staff`);
        if (sRes.data.success) setDeptStaff(sRes.data.staff || []);
        fetchDepartments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign staff.');
    }
  };

  // Remove Staff
  const handleRemoveStaff = async (staffId) => {
    try {
      const res = await API.delete(`/departments/${selectedDept._id}/staff/${staffId}`);
      if (res.data.success) {
        toast.success(res.data.message);
        setDeptStaff(prev => prev.filter(s => s._id !== staffId));
        fetchDepartments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove staff.');
    }
  };

  // Create Department
  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Department name and unique code are required.');
      return;
    }
    try {
      const res = await API.post('/departments', formData);
      if (res.data.success) {
        toast.success('Department created successfully!');
        setShowAddModal(false);
        setFormData({ name: '', code: '', description: '', icon: 'HiOfficeBuilding' });
        fetchDepartments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create department.');
    }
  };

  // Update Department
  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Department name cannot be empty.');
      return;
    }
    try {
      const res = await API.put(`/departments/${selectedDept._id}`, formData);
      if (res.data.success) {
        toast.success('Department updated successfully!');
        setShowEditModal(false);
        fetchDepartments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update department.');
    }
  };

  // Toggle Status
  const handleToggleStatus = async (dept) => {
    try {
      const res = await API.put(`/departments/${dept._id}/status`);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchDepartments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle department status.');
    }
  };

  // Delete Department
  const handleDeleteDepartment = async (dept) => {
    if (!window.confirm(`Are you sure you want to delete the "${dept.name}" department?`)) {
      return;
    }
    try {
      const res = await API.delete(`/departments/${dept._id}`);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchDepartments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete department.');
    }
  };

  const filteredDepts = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase())
  );

  const totalStaffCount = departments.reduce((acc, d) => acc + (d.staffCount || 0), 0);
  const totalActiveRequests = departments.reduce((acc, d) => acc + (d.activeRequestCount || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <HiOutlineOfficeBuilding className="text-blue-400 text-3xl" />
            <span>Municipal Department Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure municipal service divisions, manage field personnel assignments, and track departmental workloads.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({ name: '', code: '', description: '', icon: 'HiOfficeBuilding' });
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition"
        >
          <HiOutlinePlus className="text-base" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Departments</span>
          <div className="text-2xl font-black text-white mt-1">{departments.length}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Active Divisions</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {departments.filter(d => d.isActive).length}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Field Staff</span>
          <div className="text-2xl font-black text-blue-400 mt-1">{totalStaffCount}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Active Requests</span>
          <div className="text-2xl font-black text-amber-400 mt-1">{totalActiveRequests}</div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <HiOutlineSearch className="absolute left-3 top-3 text-slate-500 text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search department by name or code..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          onClick={fetchDepartments}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
        >
          <HiOutlineRefresh className="text-sm" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500 animate-pulse">
            Loading municipal departments...
          </div>
        ) : departments.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 font-medium">
            No departments found
          </div>
        ) : filteredDepts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 font-medium">
            No departments match your search.
          </div>
        ) : (
          filteredDepts.map((d) => (
            <div
              key={d._id}
              className={`bg-slate-900 border rounded-2xl p-5 space-y-4 shadow-lg transition ${
                d.isActive ? 'border-slate-800 hover:border-slate-700' : 'border-rose-900/30 opacity-75'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">{d.name}</h3>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-mono text-[10px] font-bold">
                      {d.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {d.description || 'No description provided.'}
                  </p>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  d.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {d.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950/60 rounded-xl p-3 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Staff</span>
                  <div className="text-sm font-bold text-white mt-0.5">{d.staffCount || 0}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Req</span>
                  <div className="text-sm font-bold text-slate-300 mt-0.5">{d.requestCount || 0}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Active Req</span>
                  <div className="text-sm font-bold text-amber-400 mt-0.5">{d.activeRequestCount || 0}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => handleOpenStaffModal(d)}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
                >
                  <HiOutlineUserGroup className="text-sm" />
                  <span>Staff ({d.staffCount || 0})</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedDept(d);
                      setFormData({
                        name: d.name,
                        code: d.code,
                        description: d.description || '',
                        icon: d.icon || 'HiOfficeBuilding'
                      });
                      setShowEditModal(true);
                    }}
                    title="Edit Department"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  >
                    <HiOutlinePencil className="text-sm" />
                  </button>

                  <button
                    onClick={() => handleToggleStatus(d)}
                    title={d.isActive ? 'Deactivate Department' : 'Activate Department'}
                    className={`p-1.5 rounded-lg transition ${
                      d.isActive ? 'bg-slate-800 hover:bg-rose-900/30 text-amber-400' : 'bg-slate-800 hover:bg-emerald-900/30 text-emerald-400'
                    }`}
                  >
                    {d.isActive ? <HiOutlineXCircle className="text-sm" /> : <HiOutlineCheckCircle className="text-sm" />}
                  </button>

                  <button
                    onClick={() => handleDeleteDepartment(d)}
                    title="Delete Department"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-rose-400 transition"
                  >
                    <HiOutlineTrash className="text-sm" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL 1: Add Department */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Create Municipal Department</h3>
            <form onSubmit={handleCreateDepartment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parks & Recreation"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Unique Code * (Uppercase)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PARKS"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description</label>
                <textarea
                  rows="3"
                  placeholder="Operational scope of this municipal department..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  Create Division
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Department */}
      {showEditModal && selectedDept && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Edit Department Details</h3>
            <form onSubmit={handleUpdateDepartment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Code (Fixed)</label>
                <input
                  type="text"
                  disabled
                  value={formData.code}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-500 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Manage Department Staff */}
      {showStaffModal && selectedDept && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Department Personnel</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedDept.name} ({selectedDept.code})</p>
              </div>

              <button
                onClick={() => setShowStaffModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Assign Staff Bar */}
            <div className="flex items-center gap-2 pt-2">
              <select
                value={selectedStaffToAssign}
                onChange={(e) => setSelectedStaffToAssign(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Field Staff to assign...</option>
                {allStaffUsers
                  .filter(u => u.department?._id !== selectedDept._id)
                  .map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
              </select>

              <button
                onClick={handleAssignStaff}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
              >
                <HiOutlineUserAdd className="text-base" />
                <span>Assign</span>
              </button>
            </div>

            {/* Assigned Staff List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pt-2">
              {staffLoading ? (
                <div className="py-6 text-center text-xs text-slate-500">Loading personnel...</div>
              ) : deptStaff.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No staff members currently assigned to this division.
                </div>
              ) : (
                deptStaff.map((s) => (
                  <div
                    key={s._id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{s.name}</div>
                      <div className="text-[11px] text-slate-400">{s.email} • {s.phone || 'No phone'}</div>
                    </div>

                    <button
                      onClick={() => handleRemoveStaff(s._id)}
                      className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold text-[11px]"
                    >
                      <HiOutlineUserRemove className="text-sm" />
                      <span>Remove</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowStaffModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DepartmentsPage;
