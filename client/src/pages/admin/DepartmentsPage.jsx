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

  // Assign Staff to Department
  const handleAssignStaff = async () => {
    if (!selectedStaffToAssign) {
      toast.error('Please select a staff member to assign.');
      return;
    }
    try {
      const res = await API.post(`/departments/${selectedDept._id}/staff`, {
        staffId: selectedStaffToAssign
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Staff assigned successfully.');
        setSelectedStaffToAssign('');
        // Refresh staff list
        const refreshed = await API.get(`/departments/${selectedDept._id}/staff`);
        if (refreshed.data.success) {
          setDeptStaff(refreshed.data.staff || []);
        }
        fetchDepartments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Staff assignment failed.');
    }
  };

  // Remove Staff from Department
  const handleRemoveStaff = async (staffId) => {
    if (!window.confirm('Remove this staff member from the department?')) return;
    try {
      const res = await API.delete(`/departments/${selectedDept._id}/staff/${staffId}`);
      if (res.data.success) {
        toast.success(res.data.message || 'Staff member unassigned.');
        setDeptStaff((prev) => prev.filter((s) => s._id !== staffId));
        fetchDepartments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove staff.');
    }
  };

  // Handle Add Department
  const handleCreateDepartment = async (e) => {
    e.preventDefault();
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

  // Handle Edit Department
  const handleOpenEdit = (dept) => {
    setSelectedDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      icon: dept.icon || 'HiOfficeBuilding'
    });
    setShowEditModal(true);
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    try {
      const res = await API.put(`/departments/${selectedDept._id}`, formData);
      if (res.data.success) {
        toast.success('Department updated successfully.');
        setShowEditModal(false);
        fetchDepartments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update department.');
    }
  };

  // Handle Toggle Active/Inactive
  const handleToggleStatus = async (dept) => {
    const action = dept.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} the ${dept.name} department?`)) return;
    try {
      const res = await API.patch(`/departments/${dept._id}/toggle-status`);
      if (res.data.success) {
        toast.success(`Department ${action}d successfully.`);
        fetchDepartments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} department.`);
    }
  };

  const filteredDepts = departments.filter((d) =>
    (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.code || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalStaffCount = departments.reduce((acc, d) => acc + (d.staffCount || 0), 0);
  const totalActiveRequests = departments.reduce((acc, d) => acc + (d.activeRequestCount || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header Banner */}
      <div className="bg-white border border-[#EFE7E0] p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight flex items-center gap-2.5">
            <HiOutlineOfficeBuilding className="text-[#C65F63] text-3xl" />
            <span>Municipal Department Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#6B666E] mt-1">
            Configure municipal service divisions, manage field personnel assignments, and track departmental workloads.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({ name: '', code: '', description: '', icon: 'HiOfficeBuilding' });
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold shadow-md shadow-[#C65F63]/25 transition"
        >
          <HiOutlinePlus className="text-base" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-[#6B666E] font-bold uppercase">Total Departments</span>
          <div className="text-2xl font-black text-[#29252A] mt-1">{departments.length}</div>
        </div>

        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-[#5C9A72] font-bold uppercase">Active Divisions</span>
          <div className="text-2xl font-black text-[#5C9A72] mt-1">
            {departments.filter(d => d.isActive).length}
          </div>
        </div>

        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-[#6B4E71] font-bold uppercase">Total Field Staff</span>
          <div className="text-2xl font-black text-[#6B4E71] mt-1">{totalStaffCount}</div>
        </div>

        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-[#D49A4A] font-bold uppercase">Active Requests</span>
          <div className="text-2xl font-black text-[#D49A4A] mt-1">{totalActiveRequests}</div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <HiOutlineSearch className="absolute left-3 top-3 text-[#9E98A2] text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search department by name or code..."
            className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 pl-9 pr-3 text-xs text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63] focus:bg-white"
          />
        </div>

        <button
          onClick={fetchDepartments}
          className="flex items-center gap-1 text-xs font-bold text-[#6B4E71] hover:text-[#C65F63] transition"
        >
          <HiOutlineRefresh className="text-sm" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-[#9E98A2]">
            Loading municipal departments...
          </div>
        ) : departments.length === 0 ? (
          <div className="col-span-full py-12 text-center text-[#9E98A2] font-medium">
            No departments found
          </div>
        ) : filteredDepts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-[#9E98A2] font-medium">
            No departments match your search.
          </div>
        ) : (
          filteredDepts.map((d) => (
            <div
              key={d._id}
              className={`bg-white border rounded-2xl p-5 space-y-4 shadow-xs transition hover:shadow-md ${
                d.isActive ? 'border-[#EFE7E0] hover:border-[#C65F63]/30' : 'border-rose-200 opacity-75'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-[#29252A] text-base">{d.name}</h3>
                    <span className="px-2 py-0.5 rounded bg-[#FAF5F0] text-[#6B4E71] font-mono text-[10px] font-bold border border-[#EFE7E0]">
                      {d.code}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B666E] mt-1 line-clamp-2">
                    {d.description || 'No description provided.'}
                  </p>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  d.isActive ? 'bg-emerald-50 text-[#5C9A72] border border-emerald-200' : 'bg-rose-50 text-[#B85450] border border-rose-200'
                }`}>
                  {d.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Workload Stats */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="bg-[#FAF5F0] p-2.5 rounded-xl border border-[#EFE7E0] flex items-center gap-2">
                  <HiOutlineUserGroup className="text-[#6B4E71] text-base" />
                  <div>
                    <div className="text-[10px] text-[#9E98A2] uppercase font-semibold">Staff</div>
                    <div className="font-bold text-[#29252A]">{d.staffCount || 0} Members</div>
                  </div>
                </div>

                <div className="bg-[#FAF5F0] p-2.5 rounded-xl border border-[#EFE7E0] flex items-center gap-2">
                  <HiOutlineClipboardList className="text-[#C65F63] text-base" />
                  <div>
                    <div className="text-[10px] text-[#9E98A2] uppercase font-semibold">Active Tasks</div>
                    <div className="font-bold text-[#29252A]">{d.activeRequestCount || 0} Open</div>
                  </div>
                </div>
              </div>

              {/* Card Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#EFE7E0]">
                <button
                  onClick={() => handleOpenStaffModal(d)}
                  className="flex items-center gap-1 text-xs font-bold text-[#6B4E71] hover:text-[#C65F63] transition"
                >
                  <HiOutlineUserGroup className="text-base" />
                  <span>Personnel ({d.staffCount || 0})</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(d)}
                    title="Edit details"
                    className="p-1.5 text-[#6B666E] hover:text-[#29252A] rounded-lg hover:bg-[#FAF5F0] transition"
                  >
                    <HiOutlinePencil className="text-base" />
                  </button>

                  <button
                    onClick={() => handleToggleStatus(d)}
                    title={d.isActive ? 'Deactivate' : 'Activate'}
                    className={`p-1.5 rounded-lg transition ${
                      d.isActive
                        ? 'text-[#B85450] hover:bg-rose-50'
                        : 'text-[#5C9A72] hover:bg-emerald-50'
                    }`}
                  >
                    {d.isActive ? <HiOutlineXCircle className="text-base" /> : <HiOutlineCheckCircle className="text-base" />}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL 1: Add Department */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#29252A]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-[#EFE7E0] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-[#29252A]">Add Municipal Department</h3>
            <form onSubmit={handleCreateDepartment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#29252A] mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parks & Greenery"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#29252A] mb-1">Unique Code * (Uppercase)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PARKS"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] font-mono focus:outline-none focus:border-[#C65F63] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#29252A] mb-1">Description</label>
                <textarea
                  rows="3"
                  placeholder="Operational scope of this municipal division..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#EFE7E0] text-[#6B666E] text-xs font-bold hover:bg-[#FAF5F0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold shadow-md shadow-[#C65F63]/25"
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
        <div className="fixed inset-0 bg-[#29252A]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-[#EFE7E0] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-[#29252A]">Edit Department Details</h3>
            <form onSubmit={handleUpdateDepartment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#29252A] mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#29252A] mb-1">Code (Fixed)</label>
                <input
                  type="text"
                  disabled
                  value={formData.code}
                  className="w-full bg-[#FAF5F0]/60 border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#9E98A2] font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#29252A] mb-1">Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#EFE7E0] text-[#6B666E] text-xs font-bold hover:bg-[#FAF5F0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold shadow-md shadow-[#C65F63]/25"
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
        <div className="fixed inset-0 bg-[#29252A]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-[#EFE7E0] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#29252A]">Department Personnel</h3>
                <p className="text-xs text-[#6B666E] mt-0.5">{selectedDept.name} ({selectedDept.code})</p>
              </div>

              <button
                type="button"
                onClick={() => setShowStaffModal(false)}
                className="text-[#9E98A2] hover:text-[#29252A] text-sm"
              >
                ✕
              </button>
            </div>

            {/* Assign Staff Bar */}
            <div className="flex items-center gap-2 pt-2">
              <select
                value={selectedStaffToAssign}
                onChange={(e) => setSelectedStaffToAssign(e.target.value)}
                className="flex-1 bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
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
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#5C9A72] hover:bg-emerald-600 text-white text-xs font-bold transition shadow-xs"
              >
                <HiOutlineUserAdd className="text-base" />
                <span>Assign</span>
              </button>
            </div>

            {/* Assigned Staff List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pt-2">
              {staffLoading ? (
                <div className="py-6 text-center text-xs text-[#9E98A2]">Loading personnel...</div>
              ) : deptStaff.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#9E98A2]">
                  No staff members currently assigned to this division.
                </div>
              ) : (
                deptStaff.map((s) => (
                  <div
                    key={s._id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#FAF5F0] border border-[#EFE7E0] text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#29252A]">{s.name}</div>
                      <div className="text-[11px] text-[#6B666E]">{s.email} • {s.phone || 'No phone'}</div>
                    </div>

                    <button
                      onClick={() => handleRemoveStaff(s._id)}
                      className="flex items-center gap-1 text-[#B85450] hover:text-rose-700 font-bold text-[11px]"
                    >
                      <HiOutlineUserRemove className="text-sm" />
                      <span>Remove</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#EFE7E0] flex justify-end">
              <button
                onClick={() => setShowStaffModal(false)}
                className="px-4 py-2 rounded-xl border border-[#EFE7E0] text-[#6B666E] text-xs font-bold hover:bg-[#FAF5F0]"
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
