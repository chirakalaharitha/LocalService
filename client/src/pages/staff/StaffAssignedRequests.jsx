import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  StaffCategoryBadge,
  StaffPriorityBadge,
  StaffStatusBadge,
  StaffSlaBadge,
  formatAssignedDate,
  exportRequestsToCSV
} from './staffUiHelpers';
import {
  HiOutlineSearch,
  HiOutlineCalendar,
  HiOutlineDownload,
  HiOutlineUserGroup,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineRefresh
} from 'react-icons/hi';
import { RiPieChartLine } from 'react-icons/ri';

const categories = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'WATER', label: 'Water Supply' },
  { value: 'STREET_LIGHT', label: 'Streetlights' },
  { value: 'ROAD', label: 'Roads & Potholes' },
  { value: 'GARBAGE', label: 'Garbage & Sanitation' },
  { value: 'PUBLIC_AREA', label: 'Parks & Greenery' },
  { value: 'DRAINAGE', label: 'Drainage & Sewage' },
  { value: 'ELECTRICITY', label: 'Electricity & Power' }
];

const statuses = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'RESOLVED', label: 'Resolved' }
];

const StaffAssignedRequests = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [stats, setStats] = useState({
    totalAssigned: 0,
    inProgress: 0,
    pending: 0,
    completed: 0,
    overdue: 0
  });

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState('ALL');

  const fetchAssignedRequests = async () => {
    try {
      setLoading(true);
      const res = await API.get('/staff/requests', {
        params: {
          category: selectedCategory,
          status: selectedStatus,
          search: searchQuery
        }
      });

      if (res.data?.success) {
        setRequests(res.data.requests || []);

        if (res.data.stats) {
          setStats({
            totalAssigned: res.data.stats.totalAssigned || 0,
            inProgress: res.data.stats.inProgress || 0,
            pending: res.data.stats.pending || res.data.stats.pendingCount || 0,
            completed: res.data.stats.completed || res.data.stats.resolved || 0,
            overdue: res.data.stats.overdue || res.data.stats.overdueCount || 0
          });
        }
      }
    } catch (err) {
      console.warn('API get assigned requests error:', err.message);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedRequests();
  }, [selectedCategory, selectedStatus]);

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchAssignedRequests();
    };
    socket.on('request:statusChanged', handleUpdate);
    socket.on('request:assigned', handleUpdate);
    return () => {
      socket.off('request:statusChanged', handleUpdate);
      socket.off('request:assigned', handleUpdate);
    };
  }, [socket]);

  // Client-side filtering when searching
  const filteredRequests = requests.filter((r) => {
    if (selectedCategory !== 'ALL' && (r.category || '').toUpperCase() !== selectedCategory) {
      return false;
    }
    if (selectedStatus !== 'ALL') {
      const st = (r.status || '').toUpperCase();
      if (selectedStatus === 'IN_PROGRESS' && !['IN_PROGRESS', 'ACCEPTED'].includes(st)) return false;
      if (selectedStatus === 'PENDING' && !['PENDING', 'ASSIGNED'].includes(st)) return false;
      if (selectedStatus === 'RESOLVED' && !['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED'].includes(st)) return false;
      if (selectedStatus === 'ASSIGNED' && st !== 'ASSIGNED') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = (r.requestId || '').toLowerCase().includes(q);
      const matchTitle = (r.title || r.issue || '').toLowerCase().includes(q);
      const matchLoc = (r.address || r.location || '').toLowerCase().includes(q);
      const matchMun = (r.municipality?.name || r.municipalityName || '').toLowerCase().includes(q);
      if (!matchId && !matchTitle && !matchLoc && !matchMun) return false;
    }
    return true;
  });

  const handleExport = () => {
    exportRequestsToCSV(filteredRequests, 'Assigned_Requests.csv');
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn font-sans">
      {/* Header Section */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-[#59395D] text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
          <HiOutlineUserGroup />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#29252A] tracking-tight">
            Assigned Requests
          </h1>
          <p className="text-xs sm:text-sm text-[#7D7682] font-medium">
            View and manage requests assigned to you.
          </p>
        </div>
      </div>

      {/* 5 KPI Stat Cards in Horizontal Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {/* Total Assigned */}
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:border-[#C65F63]/30 transition">
          <div className="w-11 h-11 rounded-full bg-[#F3E8FF] text-[#7E22CE] flex items-center justify-center text-xl shrink-0">
            <HiOutlineUserGroup />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8C8490]">Total Assigned</div>
            <div className="text-2xl font-black text-[#29252A] leading-tight">{stats.totalAssigned}</div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:border-[#C65F63]/30 transition">
          <div className="w-11 h-11 rounded-full bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center text-xl shrink-0">
            <RiPieChartLine />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8C8490]">In Progress</div>
            <div className="text-2xl font-black text-[#29252A] leading-tight">{stats.inProgress}</div>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:border-[#C65F63]/30 transition">
          <div className="w-11 h-11 rounded-full bg-[#FEF3E2] text-[#D97706] flex items-center justify-center text-xl shrink-0">
            <HiOutlineClock />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8C8490]">Pending</div>
            <div className="text-2xl font-black text-[#29252A] leading-tight">{stats.pending}</div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:border-[#C65F63]/30 transition">
          <div className="w-11 h-11 rounded-full bg-[#E6F7ED] text-[#15803D] flex items-center justify-center text-xl shrink-0">
            <HiOutlineCheckCircle />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8C8490]">Completed</div>
            <div className="text-2xl font-black text-[#29252A] leading-tight">{stats.completed}</div>
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:border-[#C65F63]/30 transition col-span-2 sm:col-span-1">
          <div className="w-11 h-11 rounded-full bg-[#FDECEF] text-[#C65F63] flex items-center justify-center text-xl shrink-0">
            <HiOutlineExclamationCircle />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8C8490]">Overdue</div>
            <div className="text-2xl font-black text-[#29252A] leading-tight">{stats.overdue}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute left-3.5 top-3 text-[#9E98A2] text-base" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by request ID, title, or location..."
            className="w-full bg-white border border-[#EFE7E0] rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63] focus:ring-1 focus:ring-[#C65F63]/20 shadow-xs transition"
          />
        </div>

        {/* Dropdowns & Export */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-[#EFE7E0] rounded-xl py-2.5 px-3.5 text-xs text-[#29252A] font-medium focus:outline-none focus:border-[#C65F63] shadow-xs cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-[#EFE7E0] rounded-xl py-2.5 px-3.5 text-xs text-[#29252A] font-medium focus:outline-none focus:border-[#C65F63] shadow-xs cursor-pointer"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Date Range Dropdown */}
          <div className="relative">
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="bg-white border border-[#EFE7E0] rounded-xl py-2.5 pl-8 pr-4 text-xs text-[#29252A] font-medium focus:outline-none focus:border-[#C65F63] shadow-xs cursor-pointer appearance-none"
            >
              <option value="ALL">Select Date Range</option>
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
            </select>
            <HiOutlineCalendar className="absolute left-2.5 top-3 text-[#9E98A2] text-sm pointer-events-none" />
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C65F63] to-[#B35256] text-white text-xs font-bold hover:shadow-md hover:opacity-95 transition shadow-xs shrink-0 cursor-pointer"
          >
            <HiOutlineDownload className="text-sm" />
            <span>Export +</span>
          </button>
        </div>
      </div>

      {/* Requests Table Container */}
      <div className="bg-white border border-[#EFE7E0] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#EFE7E0] text-[11px] font-bold text-[#8C8490] tracking-wider bg-white">
                <th className="py-4 px-5">Request ID</th>
                <th className="py-4 px-5">Issue</th>
                <th className="py-4 px-5">Category</th>
                <th className="py-4 px-5">Location</th>
                <th className="py-4 px-5">Municipality</th>
                <th className="py-4 px-5">Priority</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5">SLA</th>
                <th className="py-4 px-5">Assigned Date</th>
                <th className="py-4 px-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2ECE6]">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-xs text-[#9E98A2]">
                    No requests found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr
                    key={req._id || req.requestId}
                    className="hover:bg-[#FAF6F2] transition duration-150 text-[#29252A]"
                  >
                    <td className="py-4 px-5 font-medium text-[#402A40] whitespace-nowrap">
                      {req.requestId}
                    </td>
                    <td className="py-4 px-5 font-semibold text-[#29252A] max-w-[220px] truncate">
                      {req.title || req.issue}
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <StaffCategoryBadge category={req.category} />
                    </td>
                    <td className="py-4 px-5 text-[#6B666E] whitespace-nowrap">
                      {req.address || req.location || req.city || '—'}
                    </td>
                    <td className="py-4 px-5 text-[#6B666E] whitespace-nowrap">
                      {req.municipality?.name || req.municipalityName || req.city || '—'}
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <StaffPriorityBadge priority={req.priority} />
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <StaffStatusBadge status={req.status} />
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <StaffSlaBadge sla={req.humanSla || req.sla} status={req.status} />
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap text-[#6B666E] text-[11px]">
                      {req.assignedDate || formatAssignedDate(req.createdAt)}
                    </td>
                    <td className="py-4 px-5 text-center whitespace-nowrap">
                      <Link
                        to={`/staff/requests/${req.requestId || req._id}`}
                        className="inline-block px-3.5 py-1 rounded-md text-[11px] font-bold text-[#C65F63] border border-[#EAAFB3] hover:bg-[#FDECEF] hover:border-[#C65F63] transition"
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
    </div>
  );
};

export default StaffAssignedRequests;
