import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { toast } from 'react-toastify';
import {
  StaffCategoryBadge,
  StaffPriorityBadge,
  StaffStatusBadge,
  StaffSlaBadge,
  formatAssignedDate,
  exportRequestsToCSV
} from './staffUiHelpers';
import cleanerCommunitiesBanner from '../../assets/cleaner-communities-banner.jpg';
import {
  HiOutlineSearch,
  HiOutlineCalendar,
  HiOutlineArrowRight,
  HiOutlinePencilAlt,
  HiOutlineLocationMarker,
  HiOutlineX,
  HiOutlineUpload,
  HiOutlineRefresh
} from 'react-icons/hi';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix default leaflet marker icon in react
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

const statuses = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'RESOLVED', label: 'Resolved / Completed' }
];

const StaffMyWork = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState('ALL');
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    totalAssigned: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0
  });
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedMunicipality, setSelectedMunicipality] = useState('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState('ALL');

  // Modals for Quick Actions
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedReqForAction, setSelectedReqForAction] = useState(null);
  const [newStatus, setNewStatus] = useState('IN_PROGRESS');
  const [statusNote, setStatusNote] = useState('');
  const [statusFile, setStatusFile] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [showNotesModal, setShowNotesModal] = useState(false);
  const [workNoteText, setWorkNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const [showMapModal, setShowMapModal] = useState(false);

  // Fetch Assigned Requests for logged-in Staff from MongoDB
  const fetchMyWorkRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get('/staff/requests', {
        params: {
          category: selectedCategory,
          status: selectedStatus,
          municipality: selectedMunicipality,
          tab: activeTab,
          search: searchQuery
        }
      });

      if (res.data?.success) {
        setRequests(res.data.requests || []);
        if (res.data.stats) {
          setStats({
            totalAssigned: res.data.stats.totalAssigned || 0,
            pending: res.data.stats.pending || 0,
            inProgress: res.data.stats.inProgress || 0,
            completed: res.data.stats.completed || 0,
            overdue: res.data.stats.overdue || 0
          });
        }
        if (Array.isArray(res.data.categoryDistribution)) {
          setCategoryDistribution(res.data.categoryDistribution);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch My Work requests:', err.message);
      setRequests([]);
      setStats({
        totalAssigned: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0
      });
      setCategoryDistribution([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedStatus, selectedMunicipality, activeTab, searchQuery]);

  useEffect(() => {
    fetchMyWorkRequests();
  }, [fetchMyWorkRequests]);

  // Real-time updates via Socket.IO (instant update without polling or fake timers)
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchMyWorkRequests();
    };

    socket.on('request:statusChanged', handleUpdate);
    socket.on('request:assigned', handleUpdate);
    socket.on('request:updated', handleUpdate);
    socket.on('notification:new', handleUpdate);
    socket.on('newNotification', handleUpdate);

    return () => {
      socket.off('request:statusChanged', handleUpdate);
      socket.off('request:assigned', handleUpdate);
      socket.off('request:updated', handleUpdate);
      socket.off('notification:new', handleUpdate);
      socket.off('newNotification', handleUpdate);
    };
  }, [socket, fetchMyWorkRequests]);

  // Build dynamic categories list matching staff assignment and real assigned work
  const availableCategories = useMemo(() => {
    const list = [{ value: 'ALL', label: 'All Categories' }];
    const seen = new Set();

    // 1. From real assigned requests category distribution
    categoryDistribution.forEach((cat) => {
      if (cat.key && !seen.has(cat.key.toUpperCase())) {
        seen.add(cat.key.toUpperCase());
        list.push({ value: cat.key.toUpperCase(), label: cat.name || cat.key });
      }
    });

    // 2. From staff's configured department / category
    const staffDept = user?.department?.name || user?.assignedCategory || '';
    if (staffDept) {
      let mappedKey = staffDept.toUpperCase().replace(/\s+/g, '_');
      if (staffDept.toLowerCase().includes('water')) mappedKey = 'WATER';
      else if (staffDept.toLowerCase().includes('light')) mappedKey = 'STREET_LIGHT';
      else if (staffDept.toLowerCase().includes('road')) mappedKey = 'ROAD';
      else if (staffDept.toLowerCase().includes('sanitation') || staffDept.toLowerCase().includes('garbage')) mappedKey = 'GARBAGE';
      else if (staffDept.toLowerCase().includes('drainage')) mappedKey = 'DRAINAGE';
      else if (staffDept.toLowerCase().includes('park')) mappedKey = 'PUBLIC_AREA';
      else if (staffDept.toLowerCase().includes('electric')) mappedKey = 'ELECTRICITY';

      if (!seen.has(mappedKey)) {
        seen.add(mappedKey);
        list.push({ value: mappedKey, label: staffDept });
      }
    }

    return list;
  }, [categoryDistribution, user]);

  // Build dynamic municipalities list from actual assigned requests
  const availableMunicipalities = useMemo(() => {
    const list = [{ value: 'ALL', label: 'All Municipalities' }];
    const seen = new Set();

    // From loaded requests
    requests.forEach((r) => {
      const name = r.municipality?.name || r.municipalityName || r.city;
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({ value: name, label: name });
      }
    });

    // From user's assigned municipality if configured
    if (user?.municipality?.name && !seen.has(user.municipality.name.toLowerCase())) {
      seen.add(user.municipality.name.toLowerCase());
      list.push({ value: user.municipality.name, label: user.municipality.name });
    }

    return list;
  }, [requests, user]);

  // Client-side date filter if selected
  const filteredRequests = useMemo(() => {
    if (selectedDateRange === 'ALL') return requests;
    const now = new Date();
    return requests.filter((r) => {
      if (!r.createdAt) return true;
      const created = new Date(r.createdAt);
      if (selectedDateRange === 'TODAY') {
        return created.toDateString() === now.toDateString();
      }
      if (selectedDateRange === 'WEEK') {
        return (now.getTime() - created.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      }
      if (selectedDateRange === 'MONTH') {
        return (now.getTime() - created.getTime()) <= 30 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [requests, selectedDateRange]);

  // Real Dynamic Tab Counts directly from MongoDB stats
  const countAll = stats.totalAssigned;
  const countPending = stats.pending;
  const countInProgress = stats.inProgress;
  const countCompleted = stats.completed;
  const countOverdue = stats.overdue;

  // Real Work Progress Calculation
  const progressPercentage = countAll > 0 ? Math.round((countCompleted / countAll) * 100) : 0;

  // Handle Quick Action: Update Status
  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReqForAction) {
      toast.warning('Please select a request to update.');
      return;
    }
    setUpdatingStatus(true);
    try {
      if (newStatus === 'RESOLVED') {
        const formData = new FormData();
        if (statusFile) formData.append('afterImage', statusFile);
        formData.append('resolutionNotes', statusNote || 'Resolved on site according to standard specifications.');
        await API.patch(`/staff/requests/${selectedReqForAction._id || selectedReqForAction.requestId}/resolve`, formData);
        toast.success('Task marked as resolved with proof submitted!');
      } else {
        await API.patch(`/staff/requests/${selectedReqForAction._id || selectedReqForAction.requestId}/status`, {
          status: newStatus,
          note: statusNote || `Status updated to ${newStatus}`
        });
        toast.success(`Task status updated to ${newStatus}`);
      }
      setShowStatusModal(false);
      setStatusNote('');
      setStatusFile(null);
      fetchMyWorkRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Quick Action: Add Work Notes
  const handleAddNotesSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReqForAction) {
      toast.warning('Please select a request.');
      return;
    }
    if (!workNoteText.trim()) {
      toast.warning('Please write note details.');
      return;
    }
    setAddingNote(true);
    try {
      await API.post(`/staff/requests/${selectedReqForAction._id || selectedReqForAction.requestId}/notes`, {
        note: workNoteText.trim()
      });
      toast.success('Work note logged successfully!');
      setShowNotesModal(false);
      setWorkNoteText('');
      fetchMyWorkRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save note.');
    } finally {
      setAddingNote(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn font-sans">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#29252A] tracking-tight">
            My Work
          </h1>
          <p className="text-xs sm:text-sm text-[#7D7682] font-medium mt-0.5">
            View and manage the service requests assigned to you by administrators.
          </p>
        </div>
        <button
          onClick={fetchMyWorkRequests}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#EFE7E0] bg-white text-[#6B4E71] hover:bg-[#FAF6F2] text-xs font-semibold shadow-2xs transition"
          title="Refresh assigned requests"
        >
          <HiOutlineRefresh className={`text-sm ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Top Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute left-3.5 top-3 text-[#9E98A2] text-base" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by request ID, issue, or location..."
            className="w-full bg-white border border-[#EFE7E0] rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63] focus:ring-1 focus:ring-[#C65F63]/20 shadow-xs transition"
          />
        </div>

        {/* Dropdowns & Export */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* Dynamic Categories Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-[#EFE7E0] rounded-xl py-2.5 px-3 text-xs text-[#29252A] font-medium focus:outline-none focus:border-[#C65F63] shadow-xs cursor-pointer"
          >
            {availableCategories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Statuses */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-[#EFE7E0] rounded-xl py-2.5 px-3 text-xs text-[#29252A] font-medium focus:outline-none focus:border-[#C65F63] shadow-xs cursor-pointer"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Dynamic Municipalities Dropdown */}
          <select
            value={selectedMunicipality}
            onChange={(e) => setSelectedMunicipality(e.target.value)}
            className="bg-white border border-[#EFE7E0] rounded-xl py-2.5 px-3 text-xs text-[#29252A] font-medium focus:outline-none focus:border-[#C65F63] shadow-xs cursor-pointer"
          >
            {availableMunicipalities.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Date Range */}
          <div className="relative">
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="bg-white border border-[#EFE7E0] rounded-xl py-2.5 pl-8 pr-4 text-xs text-[#29252A] font-medium focus:outline-none focus:border-[#C65F63] shadow-xs cursor-pointer appearance-none"
            >
              <option value="ALL">Select Date Range</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">This Week</option>
              <option value="MONTH">This Month</option>
            </select>
            <HiOutlineCalendar className="absolute left-2.5 top-3 text-[#9E98A2] text-sm pointer-events-none" />
          </div>

          {/* Export Button */}
          <button
            onClick={() => exportRequestsToCSV(filteredRequests, 'My_Work_Requests.csv')}
            disabled={filteredRequests.length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C65F63] to-[#B35256] text-white text-xs font-bold hover:shadow-md hover:opacity-95 transition shadow-xs shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Export</span>
            <HiOutlineArrowRight className="text-xs" />
          </button>
        </div>
      </div>

      {/* Dynamic Status Filter Tabs / Pills with Real MongoDB Counts */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
            activeTab === 'ALL'
              ? 'bg-[#C65F63] text-white shadow-[#C65F63]/30'
              : 'bg-white border border-[#EFE7E0] text-[#6B666E] hover:bg-[#FAF6F2]'
          }`}
        >
          All ({countAll})
        </button>

        <button
          onClick={() => setActiveTab('PENDING')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
            activeTab === 'PENDING'
              ? 'bg-[#C65F63] text-white shadow-[#C65F63]/30'
              : 'bg-white border border-[#EFE7E0] text-[#6B666E] hover:bg-[#FAF6F2]'
          }`}
        >
          Pending ({countPending})
        </button>

        <button
          onClick={() => setActiveTab('IN_PROGRESS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
            activeTab === 'IN_PROGRESS'
              ? 'bg-[#C65F63] text-white shadow-[#C65F63]/30'
              : 'bg-white border border-[#EFE7E0] text-[#6B666E] hover:bg-[#FAF6F2]'
          }`}
        >
          In Progress ({countInProgress})
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
            activeTab === 'COMPLETED'
              ? 'bg-[#C65F63] text-white shadow-[#C65F63]/30'
              : 'bg-white border border-[#EFE7E0] text-[#6B666E] hover:bg-[#FAF6F2]'
          }`}
        >
          Completed ({countCompleted})
        </button>

        <button
          onClick={() => setActiveTab('OVERDUE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
            activeTab === 'OVERDUE'
              ? 'bg-[#C65F63] text-white shadow-[#C65F63]/30'
              : 'bg-white border border-[#EFE7E0] text-[#6B666E] hover:bg-[#FAF6F2]'
          }`}
        >
          Overdue ({countOverdue})
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Requests Table (~72% width) */}
        <div className="lg:col-span-8 bg-white border border-[#EFE7E0] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EFE7E0] text-[11px] font-bold text-[#8C8490] tracking-wider bg-white">
                  <th className="py-4 px-4">Request ID</th>
                  <th className="py-4 px-4">Issue</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">Municipality</th>
                  <th className="py-4 px-4">Location</th>
                  <th className="py-4 px-4">Priority</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">SLA</th>
                  <th className="py-4 px-4">Assigned</th>
                  <th className="py-4 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2ECE6]">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-xs text-[#9E98A2]">
                      Loading assigned requests...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-xs text-[#9E98A2]">
                      {countAll === 0 ? 'No requests assigned yet.' : 'No tasks found in this tab.'}
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr
                      key={req._id || req.requestId}
                      className="hover:bg-[#FAF6F2] transition duration-150 text-[#29252A]"
                    >
                      <td className="py-4 px-4 font-medium text-[#402A40] whitespace-nowrap">
                        {req.requestId}
                      </td>
                      <td className="py-4 px-4 font-semibold text-[#29252A] max-w-[170px] truncate">
                        {req.title || req.issue || req.description}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <StaffCategoryBadge category={req.category} />
                      </td>
                      <td className="py-4 px-4 text-[#6B666E] whitespace-nowrap">
                        {req.municipality?.name || req.municipalityName || req.city || '—'}
                      </td>
                      <td className="py-4 px-4 text-[#6B666E] whitespace-nowrap">
                        {req.address || req.location?.address || req.city || '—'}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <StaffPriorityBadge priority={req.priority} />
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <StaffStatusBadge status={req.status} />
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <StaffSlaBadge sla={req.humanSla || req.sla} status={req.status} />
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-[#6B666E] text-[11px]">
                        {req.assignedDate || formatAssignedDate(req.createdAt)}
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <Link
                          to={`/staff/requests/${req.requestId || req._id}`}
                          className="inline-block px-3 py-1 rounded-md text-[11px] font-bold text-[#C65F63] border border-[#EAAFB3] hover:bg-[#FDECEF] hover:border-[#C65F63] transition"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Real Work Progress, Quick Actions & Civic Banner (~28% width) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Real Work Progress Circular Gauge */}
          <div className="bg-white border border-[#EFE7E0] rounded-2xl p-5 shadow-xs">
            <h2 className="text-sm font-bold text-[#29252A] mb-3">
              Work Progress
            </h2>

            <div className="flex items-center gap-5">
              {/* Dynamic Circular Gauge */}
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Track */}
                  <path
                    className="text-[#EFE7E0]"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Real Dynamic Progress Fill */}
                  <path
                    className="text-[#6B4E71] transition-all duration-700 ease-out"
                    strokeDasharray={`${progressPercentage}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-black text-[#29252A]">{progressPercentage}%</span>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-[#29252A]">
                  {countAll === 0 ? '0 of 0' : `${countCompleted} of ${countAll}`}
                </div>
                <div className="text-[11px] font-semibold text-[#8C8490]">
                  {countAll === 0 ? 'No assigned work yet' : 'Completed'}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Quick Actions */}
          <div className="bg-white border border-[#EFE7E0] rounded-2xl p-5 shadow-xs space-y-2.5">
            <h2 className="text-sm font-bold text-[#29252A] mb-3">
              Quick Actions
            </h2>

            {/* Action 1: Update Status */}
            <button
              onClick={() => {
                if (requests.length === 0) {
                  toast.info('No requests assigned yet to update.');
                  return;
                }
                setSelectedReqForAction(requests[0]);
                setShowStatusModal(true);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <HiOutlineUpload className="text-sm" />
              <span>Update Status</span>
            </button>

            {/* Action 2: Add Work Notes */}
            <button
              onClick={() => {
                if (requests.length === 0) {
                  toast.info('No requests assigned yet to add notes.');
                  return;
                }
                setSelectedReqForAction(requests[0]);
                setShowNotesModal(true);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-white border border-[#EFE7E0] hover:bg-[#FAF6F2] text-[#29252A] text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <HiOutlinePencilAlt className="text-sm text-[#8C8490]" />
              <span>Add Work Notes</span>
            </button>

            {/* Action 3: View Map */}
            <button
              onClick={() => setShowMapModal(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-white border border-[#EFE7E0] hover:bg-[#FAF6F2] text-[#29252A] text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <HiOutlineLocationMarker className="text-sm text-[#8C8490]" />
              <span>View Map</span>
            </button>
          </div>

          {/* Card 3: Civic Banner */}
          <div className="relative rounded-2xl overflow-hidden shadow-xs border border-[#EFE7E0] group">
            <img
              src={cleanerCommunitiesBanner}
              alt="Cleaner Communities Stronger Together"
              className="w-full h-36 sm:h-40 object-cover object-center group-hover:scale-102 transition duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-4">
              <span className="text-xs font-bold text-white tracking-wide drop-shadow-sm">
                Cleaner Communities
              </span>
              <span className="text-[11px] font-semibold text-[#FDECEF] drop-shadow-sm">
                Stronger Together
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Update Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-[#29252A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EFE7E0] space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE7E0]">
              <h3 className="text-base font-bold text-[#29252A]">Update Request Status</h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <HiOutlineX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#6B666E] uppercase mb-1">
                  Select Request
                </label>
                <select
                  value={selectedReqForAction?.requestId || ''}
                  onChange={(e) => {
                    const found = requests.find((r) => r.requestId === e.target.value);
                    if (found) setSelectedReqForAction(found);
                  }}
                  className="w-full p-2.5 rounded-xl border border-[#EFE7E0] bg-[#FAF5F0] font-medium"
                >
                  {requests.map((r) => (
                    <option key={r.requestId} value={r.requestId}>
                      {r.requestId} - {r.title || r.issue}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#6B666E] uppercase mb-1">
                  Target Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EFE7E0] bg-[#FAF5F0] font-medium"
                >
                  <option value="IN_PROGRESS">In Progress (Active On Site)</option>
                  <option value="RESOLVED">Resolved (Work Completed)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#6B666E] uppercase mb-1">
                  Work / Resolution Notes
                </label>
                <textarea
                  rows="3"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Describe progress made, parts replaced, or completion notes..."
                  className="w-full p-2.5 rounded-xl border border-[#EFE7E0] bg-[#FAF5F0] placeholder-[#9E98A2]"
                />
              </div>

              {newStatus === 'RESOLVED' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#6B666E] uppercase mb-1">
                    Proof of Work Photo (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setStatusFile(e.target.files[0])}
                    className="w-full text-xs text-[#6B666E]"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EFE7E0]">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#EFE7E0] text-xs font-bold text-[#6B666E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-5 py-2 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold shadow-sm disabled:opacity-50"
                >
                  {updatingStatus ? 'Updating...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Work Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 bg-[#29252A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EFE7E0] space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE7E0]">
              <h3 className="text-base font-bold text-[#29252A]">Add Field Work Notes</h3>
              <button
                onClick={() => setShowNotesModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <HiOutlineX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleAddNotesSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#6B666E] uppercase mb-1">
                  Select Request
                </label>
                <select
                  value={selectedReqForAction?.requestId || ''}
                  onChange={(e) => {
                    const found = requests.find((r) => r.requestId === e.target.value);
                    if (found) setSelectedReqForAction(found);
                  }}
                  className="w-full p-2.5 rounded-xl border border-[#EFE7E0] bg-[#FAF5F0] font-medium"
                >
                  {requests.map((r) => (
                    <option key={r.requestId} value={r.requestId}>
                      {r.requestId} - {r.title || r.issue}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#6B666E] uppercase mb-1">
                  Inspection / Activity Notes
                </label>
                <textarea
                  rows="4"
                  value={workNoteText}
                  onChange={(e) => setWorkNoteText(e.target.value)}
                  placeholder="Record site inspection findings, materials ordered, or crew assignments..."
                  className="w-full p-2.5 rounded-xl border border-[#EFE7E0] bg-[#FAF5F0] placeholder-[#9E98A2]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EFE7E0]">
                <button
                  type="button"
                  onClick={() => setShowNotesModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#EFE7E0] text-xs font-bold text-[#6B666E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingNote}
                  className="px-5 py-2 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold shadow-sm disabled:opacity-50"
                >
                  {addingNote ? 'Saving...' : 'Add Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: View Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 bg-[#29252A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-[#EFE7E0] space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE7E0]">
              <div>
                <h3 className="text-base font-bold text-[#29252A]">Assigned Tasks Geospatial Map</h3>
                <p className="text-xs text-[#8C8490]">Pins represent your assigned municipal service requests.</p>
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <HiOutlineX className="text-xl" />
              </button>
            </div>

            <div className="w-full h-[400px] rounded-2xl overflow-hidden border border-[#EFE7E0]">
              <MapContainer
                center={[16.2437, 80.6400]}
                zoom={12}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {requests.map((r, idx) => {
                  const lat = r.location?.coordinates ? r.location.coordinates[1] : 16.2437 + (idx * 0.015 - 0.03);
                  const lng = r.location?.coordinates ? r.location.coordinates[0] : 80.6400 + (idx * 0.012 - 0.02);
                  return (
                    <Marker key={r.requestId || idx} position={[lat, lng]}>
                      <Popup>
                        <div className="p-1 space-y-1 text-xs">
                          <div className="font-bold text-[#C65F63]">{r.requestId}</div>
                          <div className="font-semibold text-[#29252A]">{r.title || r.issue}</div>
                          <div className="text-[11px] text-[#6B666E]">{r.address || r.location}</div>
                          <div className="text-[10px] font-bold text-[#5C9A72]">{r.status}</div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowMapModal(false)}
                className="px-5 py-2 rounded-xl bg-[#C65F63] text-white text-xs font-bold shadow-xs hover:bg-[#B35256]"
              >
                Close Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffMyWork;
