import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import API from '../../services/api';
import IssueMap from '../../components/maps/IssueMap';
import { exportRequestsToExcel } from '../../services/excelExporter';
import { generateAdminRequestsPDF } from '../../services/pdfExporter';
import { toast } from 'react-toastify';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import {
  HiOutlineUserGroup,
  HiOutlineClipboardList,
  HiOutlineExclamationCircle,
  HiOutlineClock,
  HiOutlineDocumentDownload,
  HiOutlineMap,
  HiOutlineFire,
  HiOutlineStar,
  HiOutlineSearch,
  HiOutlineCheckCircle,
  HiOutlineOfficeBuilding,
  HiOutlineRefresh,
  HiOutlineExternalLink
} from 'react-icons/hi';
import { Link } from 'react-router-dom';

const COLORS = ['#3b82f6', '#10b981', '#eab308', '#ef4444', '#a855f7', '#06b6d4', '#64748b'];

const AdminDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCitizens: 0,
    totalStaff: 0,
    activeStaff: 0,
    totalRequests: 0,
    pendingRequests: 0,
    assignedRequests: 0,
    inProgressRequests: 0,
    resolvedRequests: 0,
    pendingVerificationRequests: 0,
    closedRequests: 0,
    reopenedRequests: 0,
    criticalRequests: 0,
    overdueCount: 0,
    pendingSlaRequests: 0,
    avgRating: 0
  });

  const [requests, setRequests] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [priorityStats, setPriorityStats] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isHeatmap, setIsHeatmap] = useState(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [wardFilter, setWardFilter] = useState('');

  // Export Loading States
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Assign Staff Modal State
  const [assignModalReq, setAssignModalReq] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('MEDIUM');
  const [selectedDept, setSelectedDept] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [dashRes, reqRes, staffRes, deptRes] = await Promise.all([
        API.get('/admin/dashboard'),
        API.get('/requests?limit=100&scope=admin'),
        API.get('/admin/users?role=STAFF'),
        API.get('/departments')
      ]);

      if (dashRes.data.success) {
        setStats(prev => ({ ...prev, ...(dashRes.data.stats || {}) }));
        setCategoryStats(dashRes.data.categoryStats || []);
        setPriorityStats(dashRes.data.priorityStats || []);
      }
      if (reqRes.data.success) {
        setRequests(reqRes.data.requests || []);
      }
      if (staffRes.data.success) {
        setStaffList(staffRes.data.users || []);
      }
      if (deptRes.data.success) {
        setDepartments(deptRes.data.departments || []);
      }
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;

    const handleRealtimeChange = () => {
      fetchDashboardData();
    };

    socket.on('request:created', handleRealtimeChange);
    socket.on('request:statusChanged', handleRealtimeChange);
    socket.on('request:assigned', handleRealtimeChange);
    socket.on('request:updated', handleRealtimeChange);

    return () => {
      socket.off('request:created', handleRealtimeChange);
      socket.off('request:statusChanged', handleRealtimeChange);
      socket.off('request:assigned', handleRealtimeChange);
      socket.off('request:updated', handleRealtimeChange);
    };
  }, [socket, fetchDashboardData]);

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignModalReq || !selectedStaff) return;
    setAssigning(true);
    try {
      const res = await API.post(`/admin/requests/${assignModalReq._id}/assign`, {
        staffId: selectedStaff,
        priority: selectedPriority,
        departmentId: selectedDept || undefined
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Staff assigned successfully!');
        setAssignModalReq(null);
        setSelectedStaff('');
        setSelectedDept('');
        fetchDashboardData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Staff assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  // Filter requests locally
  const filteredRequests = requests.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (categoryFilter && r.category !== categoryFilter) return false;
    if (priorityFilter && r.priority !== priorityFilter) return false;
    if (departmentFilter && (r.department?._id !== departmentFilter && r.department !== departmentFilter)) return false;
    if (wardFilter && r.ward?.toLowerCase() !== wardFilter.toLowerCase()) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTitle = r.title?.toLowerCase().includes(term);
      const matchId = r.requestId?.toLowerCase().includes(term);
      const matchAddr = r.address?.toLowerCase().includes(term);
      if (!matchTitle && !matchId && !matchAddr) return false;
    }
    return true;
  });

  // Extract unique wards from requests and staff
  const availableWards = Array.from(
    new Set([...requests.map(r => r.ward), ...staffList.map(s => s.ward)].filter(Boolean))
  ).sort();

  // Export to Excel with user feedback
  const handleExportExcel = async () => {
    if (isExportingExcel) return;
    setIsExportingExcel(true);
    toast.info('Preparing report...');
    try {
      const isFiltered = Boolean(searchTerm || statusFilter || categoryFilter || priorityFilter || departmentFilter || wardFilter);
      const items = isFiltered ? filteredRequests : requests;
      const dateStr = new Date().toISOString().split('T')[0];
      exportRequestsToExcel(items, `Municipal_Requests_Report_${dateStr}.xlsx`);
      toast.success('Report downloaded successfully.');
    } catch (err) {
      console.error('Excel Export Error:', err);
      toast.error('Unable to generate report. Please try again.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Export to PDF with user feedback
  const handleExportPDF = async () => {
    if (isExportingPDF) return;
    setIsExportingPDF(true);
    toast.info('Preparing report...');
    try {
      const isFiltered = Boolean(searchTerm || statusFilter || categoryFilter || priorityFilter || departmentFilter || wardFilter);
      const items = isFiltered ? filteredRequests : requests;
      const deptObj = departments.find(d => d._id === departmentFilter);
      generateAdminRequestsPDF(items, {
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        department: deptObj?.name || undefined,
        ward: wardFilter || undefined
      });
      toast.success('Report downloaded successfully.');
    } catch (err) {
      console.error('PDF Export Error:', err);
      toast.error('Unable to generate report. Please try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Determine center coordinates for map (defaulting to Guntur Municipal Corporation)
  const mapCenter = [16.3067, 80.4365];

  return (
    <div className="space-y-8">
      
      {/* Header Banner & Exports */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase flex items-center gap-1.5 shadow-sm">
              <span>🏛️</span>
              <span>{user?.municipality?.name || 'Municipal Control Area'}</span>
              {user?.municipality?.code && <span className="text-slate-400 font-mono">[{user.municipality.code}]</span>}
            </span>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Municipal Jurisdiction
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Executive Admin Operations Panel</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time municipal request management, live GIS map, SLA monitoring & workforce analytics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-semibold shadow transition disabled:opacity-50"
          >
            <HiOutlineDocumentDownload className="text-base" />
            <span>{isExportingExcel ? 'Exporting...' : 'Export Excel'}</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 text-xs font-semibold shadow transition disabled:opacity-50"
          >
            <HiOutlineDocumentDownload className="text-base" />
            <span>{isExportingPDF ? 'Exporting...' : 'Export PDF'}</span>
          </button>

          <Link
            to="/admin/reports"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition"
          >
            <HiOutlineExternalLink className="text-base" />
            <span>Reports Center</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Core Operational Metrics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Requests</span>
            <div className="text-2xl font-black text-white">{stats.totalRequests || 0}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Pending</span>
            <div className="text-2xl font-black text-amber-400">{stats.pendingRequests || 0}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Assigned</span>
            <div className="text-2xl font-black text-blue-400">{stats.assignedRequests || 0}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">In Progress</span>
            <div className="text-2xl font-black text-teal-400">{stats.inProgressRequests || 0}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Resolved</span>
            <div className="text-2xl font-black text-emerald-400">{stats.resolvedRequests || 0}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Pending Verification</span>
            <div className="text-2xl font-black text-indigo-400">{stats.pendingVerificationRequests || 0}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Closed</span>
            <div className="text-2xl font-black text-slate-200">{stats.closedRequests || 0}</div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics & Health Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Reopened Issues</span>
          <div className="text-xl font-black text-orange-400">{stats.reopenedRequests || 0}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Average Rating</span>
          <div className="text-xl font-black text-amber-400 flex items-center gap-1">
            <span>{stats.avgRating || 0}</span>
            <HiOutlineStar className="text-base" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">SLA On-Time</span>
          <div className="text-xl font-black text-emerald-400">{stats.pendingSlaRequests || 0}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">SLA Overdue</span>
          <div className="text-xl font-black text-rose-500">{stats.overdueCount || 0}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Citizens</span>
          <div className="text-xl font-black text-slate-300">{stats.totalCitizens || 0}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Active Field Staff</span>
          <div className="text-xl font-black text-teal-300">{stats.activeStaff || 0} / {stats.totalStaff || 0}</div>
        </div>
      </div>

      {/* Live Map & Heatmap Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <HiOutlineMap className="text-blue-400" />
              <span>Live Municipal Requests GIS Map</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualizing {filteredRequests.length} service request(s) within municipal boundaries
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsHeatmap(!isHeatmap)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                isHeatmap
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <HiOutlineFire className="text-base" />
              <span>{isHeatmap ? 'Density Mode' : 'Pin Mode'}</span>
            </button>
          </div>
        </div>

        <IssueMap requests={filteredRequests} center={mapCenter} height="480px" isHeatmapMode={isHeatmap} />
      </div>

      {/* Recharts Data Breakdown - With Clean Empty States & Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Requests by Domain Category</h2>
              <p className="text-xs text-slate-400">Distribution across municipal departments</p>
            </div>
            {categoryStats.length > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {categoryStats.reduce((sum, item) => sum + (item.count || 0), 0)} Total
              </span>
            )}
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center bg-slate-950/40 rounded-xl border border-slate-800/80 animate-pulse">
              <span className="text-xs text-slate-500">Loading category analytics...</span>
            </div>
          ) : categoryStats.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
              <HiOutlineClipboardList className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No Category Data Available</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                No service requests recorded in this municipal jurisdiction yet to generate a domain category breakdown.
              </p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="_id" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                    formatter={(val) => [`${val} requests`, 'Volume']}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Priority Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Severity Priority Distribution</h2>
              <p className="text-xs text-slate-400">Complaints classified by urgency</p>
            </div>
            {priorityStats.length > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {priorityStats.reduce((sum, item) => sum + (item.count || 0), 0)} Total
              </span>
            )}
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center bg-slate-950/40 rounded-xl border border-slate-800/80 animate-pulse">
              <span className="text-xs text-slate-500">Loading priority analytics...</span>
            </div>
          ) : priorityStats.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
              <HiOutlineFire className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No Priority Distribution Data</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                No service requests have been categorized by severity priority tier yet.
              </p>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityStats}
                    dataKey="count"
                    nameKey="_id"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={4}
                    label={({ _id, count }) => `${_id}: ${count}`}
                  >
                    {priorityStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                    formatter={(val, name) => [`${val} requests`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>

      {/* Requests Management Table with Search & Multi-Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Civic Request Management</h2>
            <p className="text-xs text-slate-400">
              Showing {filteredRequests.length} of {requests.length} total jurisdiction requests
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {(searchTerm || statusFilter || categoryFilter || priorityFilter || departmentFilter || wardFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setCategoryFilter('');
                  setPriorityFilter('');
                  setDepartmentFilter('');
                  setWardFilter('');
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition"
              >
                Clear Filters
              </button>
            )}

            <button
              onClick={fetchDashboardData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              <HiOutlineRefresh className="text-sm" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="relative">
            <HiOutlineSearch className="absolute left-3 top-3 text-slate-400 text-sm" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title, ID, address..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="PENDING_VERIFICATION">PENDING VERIFICATION</option>
            <option value="CITIZEN_VERIFIED">CITIZEN VERIFIED</option>
            <option value="CLOSED">CLOSED</option>
            <option value="REOPENED">REOPENED</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Categories</option>
            <option value="WATER">Water</option>
            <option value="ELECTRICITY">Electricity</option>
            <option value="ROAD">Roads</option>
            <option value="STREET_LIGHT">Street Lights</option>
            <option value="GARBAGE">Garbage</option>
            <option value="DRAINAGE">Drainage</option>
            <option value="PUBLIC_AREA">Public Area</option>
            <option value="OTHER">Other</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="CRITICAL">Critical Priority</option>
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
            ))}
          </select>

          <select
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Wards</option>
            {availableWards.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-slate-400">Loading municipal service requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center max-w-sm mx-auto space-y-2">
            <HiOutlineClipboardList className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300">No Service Requests Recorded</h4>
            <p className="text-xs text-slate-500">There are currently no civic service requests registered in this municipal jurisdiction.</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 text-center max-w-sm mx-auto space-y-3">
            <HiOutlineSearch className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300">No Matching Requests Found</h4>
            <p className="text-xs text-slate-500">No service requests match the currently applied filters or search keywords.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setCategoryFilter('');
                setPriorityFilter('');
                setDepartmentFilter('');
                setWardFilter('');
              }}
              className="px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-semibold hover:bg-blue-600/30 transition"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-3 rounded-l-xl">ID</th>
                  <th className="p-3">Title & Category</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Assigned Staff</th>
                  <th className="p-3">SLA Status</th>
                  <th className="p-3 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredRequests.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-blue-400">
                      <Link to={`/requests/${r.requestId || r._id}`} className="hover:underline flex items-center gap-1">
                        <span>{r.requestId}</span>
                        <HiOutlineExternalLink className="text-[10px]" />
                      </Link>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-100">{r.title}</div>
                      <div className="text-[10px] text-slate-500">{r.category} • {r.address}</div>
                    </td>
                    <td className="p-3 text-slate-400">
                      {r.department?.name || r.department?.code || '—'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                        r.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-200">
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-300">
                      {r.assignedStaff ? r.assignedStaff.name : <span className="text-amber-400 font-bold">Unassigned</span>}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.slaStatus === 'OVERDUE' ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {r.slaStatus || 'ON_TIME'}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setAssignModalReq(r);
                          setSelectedPriority(r.priority || 'MEDIUM');
                          setSelectedStaff(r.assignedStaff?._id || '');
                          setSelectedDept(r.department?._id || r.department || '');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition text-xs"
                      >
                        {r.assignedStaff ? 'Reassign' : 'Assign'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Staff Assignment Modal */}
      {assignModalReq && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAssignSubmit} className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Assign Staff to {assignModalReq.requestId}</h3>
            <p className="text-xs text-slate-400">{assignModalReq.title} ({assignModalReq.category})</p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Department (Optional):</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Keep Current Department --</option>
                {departments.map(d => (
                  <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">Select Field Staff Member * :</label>
                <span className="text-[10px] text-teal-400 font-semibold">Smart Match Active</span>
              </div>
              <select
                required
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Choose Field Staff --</option>
                {(() => {
                  const targetDeptId = selectedDept || assignModalReq?.department?._id || assignModalReq?.department;
                  const targetWard = assignModalReq?.ward;
                  
                  const activeStaff = staffList.filter(s => s.isActive !== false);
                  
                  // Score candidate staff: matching department +2, matching ward +1
                  const scored = activeStaff.map(s => {
                    const staffDeptId = s.department?._id || s.department;
                    const deptMatch = Boolean(targetDeptId && staffDeptId && staffDeptId.toString() === targetDeptId.toString());
                    const wardMatch = Boolean(targetWard && s.ward && s.ward.toLowerCase() === targetWard.toLowerCase());
                    const score = (deptMatch ? 2 : 0) + (wardMatch ? 1 : 0);
                    return { staff: s, score, deptMatch, wardMatch };
                  });

                  // Sort highest score first, then alphabetically
                  scored.sort((a, b) => b.score - a.score || a.staff.name.localeCompare(b.staff.name));

                  return scored.map(({ staff: s, deptMatch, wardMatch }) => {
                    let badge = '';
                    if (deptMatch && wardMatch) badge = ' ⭐ [Dept & Ward Match]';
                    else if (deptMatch) badge = ' ✓ [Dept Match]';
                    else if (wardMatch) badge = ' 📍 [Ward Match]';

                    return (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.department?.name || 'Field Staff'}) {s.ward ? `• ${s.ward}` : ''}{badge}
                      </option>
                    );
                  });
                })()}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Update Priority Level:</label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="LOW">LOW (SLA: 72 Hours)</option>
                <option value="MEDIUM">MEDIUM (SLA: 24 Hours)</option>
                <option value="HIGH">HIGH (SLA: 12 Hours)</option>
                <option value="CRITICAL">CRITICAL (SLA: 4 Hours)</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignModalReq(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assigning}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {assigning ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;


