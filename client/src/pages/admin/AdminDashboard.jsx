import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import API from '../../services/api';
import IssueMap from '../../components/maps/IssueMap';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import {
  HiOutlineUserGroup,
  HiOutlineClipboardList,
  HiOutlineClock,
  HiOutlineMap,
  HiOutlineFire,
  HiOutlineCheckCircle,
  HiOutlineOfficeBuilding,
  HiOutlineRefresh,
  HiOutlineExternalLink,
  HiOutlineArrowRight,
  HiOutlineShieldCheck,
  HiOutlineUser,
  HiOutlineCog,
  HiOutlineDocumentReport,
  HiOutlineExclamation,
  HiOutlineBadgeCheck,
  HiOutlineTrendingUp
} from 'react-icons/hi';

const BRAND_CHART_COLORS = ['#C65F63', '#6B4E71', '#D49A4A', '#5C9A72', '#402A40', '#8E536F', '#B85450', '#7E6B8F'];

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
    submittedRequests: 0,
    assignedRequests: 0,
    inProgressRequests: 0,
    resolvedRequests: 0,
    pendingVerificationRequests: 0,
    closedRequests: 0,
    reopenedRequests: 0,
    criticalRequests: 0,
    overdueCount: 0,
    pendingSlaRequests: 0,
    avgRating: 0,
    totalFeedbacks: 0
  });

  const [categoryStats, setCategoryStats] = useState([]);
  const [priorityStats, setPriorityStats] = useState([]);
  const [statusStats, setStatusStats] = useState([]);
  const [slaOverview, setSlaOverview] = useState({
    totalActive: 0,
    overdue: 0,
    onTime: 0,
    complianceRate: 100
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [staffWorkload, setStaffWorkload] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isHeatmap, setIsHeatmap] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchDashboardOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/dashboard');
      if (res.data.success) {
        if (res.data.stats) setStats(prev => ({ ...prev, ...res.data.stats }));
        if (res.data.categoryStats) setCategoryStats(res.data.categoryStats);
        if (res.data.priorityStats) setPriorityStats(res.data.priorityStats);
        if (res.data.statusStats) setStatusStats(res.data.statusStats);
        if (res.data.slaOverview) setSlaOverview(res.data.slaOverview);
        if (res.data.recentRequests) setRecentRequests(res.data.recentRequests);
        if (res.data.recentActivity) setRecentActivity(res.data.recentActivity);
        if (res.data.staffWorkload) setStaffWorkload(res.data.staffWorkload);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error fetching admin dashboard overview:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardOverview();
  }, [fetchDashboardOverview]);

  // Real-time socket updates for live control center
  useEffect(() => {
    if (!socket) return;

    const handleRealtimeUpdate = () => {
      fetchDashboardOverview();
    };

    socket.on('request:created', handleRealtimeUpdate);
    socket.on('request:statusChanged', handleRealtimeUpdate);
    socket.on('request:assigned', handleRealtimeUpdate);
    socket.on('request:updated', handleRealtimeUpdate);

    return () => {
      socket.off('request:created', handleRealtimeUpdate);
      socket.off('request:statusChanged', handleRealtimeUpdate);
      socket.off('request:assigned', handleRealtimeUpdate);
      socket.off('request:updated', handleRealtimeUpdate);
    };
  }, [socket, fetchDashboardOverview]);

  // Combined resolved + closed for KPI
  const resolvedAndClosedCount = (stats.resolvedRequests || 0) + (stats.closedRequests || 0);

  return (
    <div className="space-y-6 pb-12">

      {/* Municipal Control Center Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-[#EFE7E0] p-6 sm:p-8 rounded-3xl shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider bg-[#FDECEF] text-[#C65F63] border border-[#C65F63]/20 uppercase flex items-center gap-1.5 shadow-xs">
              <span>🏛️</span>
              <span>{user?.municipality?.name || 'Municipal Control Center'}</span>
              {user?.municipality?.code && <span className="font-mono text-[#6B4E71]">[{user.municipality.code}]</span>}
            </span>
            <span className="text-[10px] font-semibold text-[#5C9A72] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5C9A72] animate-pulse"></span>
              Live Control Center
            </span>
            <span className="text-[10px] text-[#9E98A2]">
              Updated: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight">
            Admin Control Center Overview
          </h1>
          <p className="text-xs sm:text-sm text-[#6B666E] mt-1">
            High-level operational monitoring, real-time KPI telemetry, staff performance, and SLA compliance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
          <button
            onClick={fetchDashboardOverview}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#FAF5F0] hover:bg-white text-[#6B4E71] border border-[#EFE7E0] text-xs font-bold shadow-xs transition disabled:opacity-50"
            title="Refresh dashboard data"
          >
            <HiOutlineRefresh className={`text-base ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/admin/requests"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold shadow-md shadow-[#C65F63]/25 transition"
          >
            <HiOutlineClipboardList className="text-base" />
            <span>Manage All Requests</span>
            <HiOutlineArrowRight className="text-xs" />
          </Link>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B4E71]">
            Administrative Quick Actions
          </h2>
          <span className="text-[11px] text-[#9E98A2]">Direct navigation shortcuts</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            to="/admin/requests"
            className="group p-4 bg-white border border-[#EFE7E0] hover:border-[#C65F63] rounded-2xl shadow-xs transition hover:shadow-md flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FDECEF] text-[#C65F63] flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition">
              <HiOutlineClipboardList />
            </div>
            <div>
              <div className="text-xs font-bold text-[#29252A] group-hover:text-[#C65F63] transition flex items-center justify-between">
                <span>Manage Requests</span>
                <HiOutlineArrowRight className="text-[10px] opacity-0 group-hover:opacity-100 transition" />
              </div>
              <div className="text-[10px] text-[#9E98A2] mt-0.5">Triage, filter & assign</div>
            </div>
          </Link>

          <Link
            to="/admin/users?role=STAFF"
            className="group p-4 bg-white border border-[#EFE7E0] hover:border-[#6B4E71] rounded-2xl shadow-xs transition hover:shadow-md flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-[#E8D7E6] text-[#6B4E71] flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition">
              <HiOutlineUserGroup />
            </div>
            <div>
              <div className="text-xs font-bold text-[#29252A] group-hover:text-[#6B4E71] transition flex items-center justify-between">
                <span>Manage Staff</span>
                <HiOutlineArrowRight className="text-[10px] opacity-0 group-hover:opacity-100 transition" />
              </div>
              <div className="text-[10px] text-[#9E98A2] mt-0.5">{stats.totalStaff || 0} field personnel</div>
            </div>
          </Link>

          <Link
            to="/admin/users?role=CITIZEN"
            className="group p-4 bg-white border border-[#EFE7E0] hover:border-[#5C9A72] rounded-2xl shadow-xs transition hover:shadow-md flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#5C9A72] flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition">
              <HiOutlineUser />
            </div>
            <div>
              <div className="text-xs font-bold text-[#29252A] group-hover:text-[#5C9A72] transition flex items-center justify-between">
                <span>Manage Citizens</span>
                <HiOutlineArrowRight className="text-[10px] opacity-0 group-hover:opacity-100 transition" />
              </div>
              <div className="text-[10px] text-[#9E98A2] mt-0.5">{stats.totalCitizens || 0} registered</div>
            </div>
          </Link>

          <Link
            to="/admin/departments"
            className="group p-4 bg-white border border-[#EFE7E0] hover:border-[#D49A4A] rounded-2xl shadow-xs transition hover:shadow-md flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#D49A4A] flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition">
              <HiOutlineOfficeBuilding />
            </div>
            <div>
              <div className="text-xs font-bold text-[#29252A] group-hover:text-[#D49A4A] transition flex items-center justify-between">
                <span>Departments</span>
                <HiOutlineArrowRight className="text-[10px] opacity-0 group-hover:opacity-100 transition" />
              </div>
              <div className="text-[10px] text-[#9E98A2] mt-0.5">SLA & categories</div>
            </div>
          </Link>

          <Link
            to="/admin/reports"
            className="group p-4 bg-white border border-[#EFE7E0] hover:border-[#C65F63] rounded-2xl shadow-xs transition hover:shadow-md flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FDECEF] text-[#C65F63] flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition">
              <HiOutlineDocumentReport />
            </div>
            <div>
              <div className="text-xs font-bold text-[#29252A] group-hover:text-[#C65F63] transition flex items-center justify-between">
                <span>Reports</span>
                <HiOutlineArrowRight className="text-[10px] opacity-0 group-hover:opacity-100 transition" />
              </div>
              <div className="text-[10px] text-[#9E98A2] mt-0.5">Analytics & export</div>
            </div>
          </Link>

          <Link
            to="/admin/settings"
            className="group p-4 bg-white border border-[#EFE7E0] hover:border-[#6B4E71] rounded-2xl shadow-xs transition hover:shadow-md flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FAF5F0] text-[#6B4E71] flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition">
              <HiOutlineCog />
            </div>
            <div>
              <div className="text-xs font-bold text-[#29252A] group-hover:text-[#6B4E71] transition flex items-center justify-between">
                <span>Settings</span>
                <HiOutlineArrowRight className="text-[10px] opacity-0 group-hover:opacity-100 transition" />
              </div>
              <div className="text-[10px] text-[#9E98A2] mt-0.5">System & boundary</div>
            </div>
          </Link>
        </div>
      </div>

      {/* KPI Cards Using REAL MongoDB Data */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B4E71]">
            Core Telemetry & Operational KPIs
          </h2>
          <span className="text-[10px] font-bold text-[#5C9A72] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Real MongoDB Data
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          
          {/* 1. Total Requests */}
          <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 space-y-1 shadow-xs hover:border-[#29252A]/30 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#6B666E] font-bold uppercase">Total Requests</span>
              <HiOutlineClipboardList className="text-[#29252A] text-sm" />
            </div>
            <div className="text-2xl font-black text-[#29252A]">{stats.totalRequests || 0}</div>
            <div className="text-[10px] text-[#9E98A2]">All logged cases</div>
          </div>

          {/* 2. Submitted / Pending */}
          <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 space-y-1 shadow-xs hover:border-[#D49A4A]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#D49A4A] font-bold uppercase">Submitted / Pending</span>
              <span className="w-2 h-2 rounded-full bg-[#D49A4A]"></span>
            </div>
            <div className="text-2xl font-black text-[#D49A4A]">{stats.pendingRequests || stats.submittedRequests || 0}</div>
            <div className="text-[10px] text-[#9E98A2]">Awaiting assignment</div>
          </div>

          {/* 3. In Progress */}
          <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 space-y-1 shadow-xs hover:border-[#6B4E71]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#6B4E71] font-bold uppercase">In Progress</span>
              <HiOutlineClock className="text-[#6B4E71] text-sm" />
            </div>
            <div className="text-2xl font-black text-[#6B4E71]">
              {(stats.inProgressRequests || 0) + (stats.assignedRequests || 0)}
            </div>
            <div className="text-[10px] text-[#9E98A2]">{stats.inProgressRequests || 0} active in field</div>
          </div>

          {/* 4. Resolved / Closed */}
          <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 space-y-1 shadow-xs hover:border-[#5C9A72]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#5C9A72] font-bold uppercase">Resolved / Closed</span>
              <HiOutlineCheckCircle className="text-[#5C9A72] text-sm" />
            </div>
            <div className="text-2xl font-black text-[#5C9A72]">{resolvedAndClosedCount}</div>
            <div className="text-[10px] text-[#9E98A2]">{stats.resolvedRequests || 0} resolved · {stats.closedRequests || 0} verified</div>
          </div>

          {/* 5. Overdue */}
          <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 space-y-1 shadow-xs hover:border-[#B85450]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#B85450] font-bold uppercase">Overdue SLA</span>
              <HiOutlineExclamation className="text-[#B85450] text-sm" />
            </div>
            <div className="text-2xl font-black text-[#B85450]">{stats.overdueCount || 0}</div>
            <div className="text-[10px] text-[#9E98A2]">Breached target SLA</div>
          </div>

          {/* 6. Total Citizens */}
          <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 space-y-1 shadow-xs hover:border-[#6B4E71]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#6B4E71] font-bold uppercase">Total Citizens</span>
              <HiOutlineUser className="text-[#6B4E71] text-sm" />
            </div>
            <div className="text-2xl font-black text-[#29252A]">{stats.totalCitizens || 0}</div>
            <div className="text-[10px] text-[#9E98A2]">In this jurisdiction</div>
          </div>

          {/* 7. Total Staff */}
          <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 space-y-1 shadow-xs hover:border-[#C65F63]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#C65F63] font-bold uppercase">Total Staff</span>
              <HiOutlineUserGroup className="text-[#C65F63] text-sm" />
            </div>
            <div className="text-2xl font-black text-[#C65F63]">{stats.totalStaff || 0}</div>
            <div className="text-[10px] text-[#9E98A2]">{stats.activeStaff || 0} currently active</div>
          </div>

        </div>
      </div>

      {/* Analytics Row: Request Status Overview Chart & Requests by Category Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Request Status Overview Chart */}
        <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[#29252A] uppercase tracking-wider">
                Request Status Overview
              </h3>
              <p className="text-[11px] text-[#6B666E]">Lifecycle distribution across all active & resolved cases</p>
            </div>
            <span className="text-[10px] font-bold text-[#6B4E71] bg-[#FAF5F0] px-2.5 py-1 rounded-full border border-[#EFE7E0]">
              {stats.totalRequests || 0} Total
            </span>
          </div>

          <div className="h-64">
            {statusStats.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#9E98A2]">
                Loading status metrics...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusStats} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#6B666E', fontSize: 10 }}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    height={45}
                  />
                  <YAxis tick={{ fill: '#6B666E', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#EFE7E0',
                      borderRadius: '12px',
                      color: '#29252A',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {statusStats.map((entry, idx) => (
                      <Cell key={`status-cell-${idx}`} fill={entry.color || BRAND_CHART_COLORS[idx % BRAND_CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 2. Requests by Category Chart */}
        <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[#29252A] uppercase tracking-wider">
                Requests by Category
              </h3>
              <p className="text-[11px] text-[#6B666E]">Departmental workload by municipal service domain</p>
            </div>
            <span className="text-[10px] font-bold text-[#C65F63] bg-[#FDECEF] px-2.5 py-1 rounded-full border border-[#C65F63]/20">
              {categoryStats.length} Categories
            </span>
          </div>

          <div className="h-64">
            {categoryStats.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#9E98A2]">
                No category requests logged yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryStats} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="_id"
                    tick={{ fill: '#6B666E', fontSize: 10 }}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    height={45}
                  />
                  <YAxis tick={{ fill: '#6B666E', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#EFE7E0',
                      borderRadius: '12px',
                      color: '#29252A',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}
                  />
                  <Bar dataKey="count" fill="#C65F63" radius={[6, 6, 0, 0]}>
                    {categoryStats.map((entry, index) => (
                      <Cell key={`cat-cell-${index}`} fill={BRAND_CHART_COLORS[index % BRAND_CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Operational Monitoring: SLA Overview & Staff Workload Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* SLA Overview Panel */}
        <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
            <div className="flex items-center gap-2">
              <HiOutlineClock className="text-xl text-[#C65F63]" />
              <h3 className="font-bold text-sm text-[#29252A] uppercase tracking-wider">
                SLA Compliance Overview
              </h3>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                (slaOverview?.complianceRate || 100) >= 80
                  ? 'bg-emerald-50 text-[#5C9A72] border border-emerald-200'
                  : 'bg-amber-50 text-[#D49A4A] border border-amber-200'
              }`}
            >
              {slaOverview?.complianceRate || 100}% Met
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-[#FAF5F0] rounded-2xl border border-[#EFE7E0] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#6B666E]">Overall SLA Compliance</span>
                <span className="font-mono font-bold text-[#29252A]">{slaOverview?.complianceRate || 100}%</span>
              </div>
              <div className="w-full bg-[#EFE7E0] h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(0, slaOverview?.complianceRate || 100))}%`,
                    backgroundColor: (slaOverview?.complianceRate || 100) >= 80 ? '#5C9A72' : '#C65F63'
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1">
                <div className="text-[10px] uppercase font-bold text-[#5C9A72]">On-Time Active</div>
                <div className="text-xl font-black text-[#5C9A72]">{slaOverview?.onTime || 0}</div>
                <div className="text-[10px] text-[#6B666E]">Within legal deadline</div>
              </div>

              <div className="p-3.5 bg-[#FDECEF]/60 border border-[#FDECEF] rounded-xl space-y-1">
                <div className="text-[10px] uppercase font-bold text-[#B85450]">Overdue Cases</div>
                <div className="text-xl font-black text-[#B85450]">{slaOverview?.overdue || 0}</div>
                <div className="text-[10px] text-[#6B666E]">Requires escalation</div>
              </div>
            </div>

            <div className="p-3 bg-[#FAF5F0] rounded-xl border border-[#EFE7E0] text-[11px] text-[#6B666E] flex items-center justify-between">
              <span>Citizen Satisfaction Rating</span>
              <span className="font-bold text-[#D49A4A] flex items-center gap-1">
                <span>⭐</span>
                <span>{stats.avgRating > 0 ? `${stats.avgRating} / 5` : 'No reviews yet'}</span>
                {stats.totalFeedbacks > 0 && <span className="text-[#9E98A2]">({stats.totalFeedbacks})</span>}
              </span>
            </div>
          </div>
        </div>

        {/* Staff Workload / Performance Summary */}
        <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
            <div className="flex items-center gap-2">
              <HiOutlineUserGroup className="text-xl text-[#6B4E71]" />
              <div>
                <h3 className="font-bold text-sm text-[#29252A] uppercase tracking-wider">
                  Field Staff Workload & Performance Summary
                </h3>
                <p className="text-[11px] text-[#6B666E]">Active operational load & task completion rates</p>
              </div>
            </div>

            <Link
              to="/admin/users?role=STAFF"
              className="text-xs font-bold text-[#6B4E71] hover:text-[#C65F63] flex items-center gap-1 transition"
            >
              <span>Manage All Staff</span>
              <HiOutlineArrowRight className="text-[10px]" />
            </Link>
          </div>

          {staffWorkload.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#9E98A2]">
              No staff members registered for this jurisdiction yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#29252A]">
                <thead className="text-[10px] uppercase font-bold text-[#6B4E71] border-b border-[#EFE7E0] bg-[#FAF5F0]/50">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-lg">Staff Member</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-center">Active Load</th>
                    <th className="py-2.5 px-3 text-center">Resolved</th>
                    <th className="py-2.5 px-3 rounded-r-lg text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE7E0]">
                  {staffWorkload.map((staff) => (
                    <tr key={staff._id} className="hover:bg-[#FAF5F0]/60 transition">
                      <td className="py-2.5 px-3 font-semibold">
                        <div className="text-[#29252A] font-bold">{staff.name}</div>
                        <div className="text-[10px] text-[#9E98A2]">{staff.email}</div>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-[#6B666E]">
                        {staff.department}
                        {staff.ward && <span className="text-[#9E98A2] block text-[10px]">Ward: {staff.ward}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            staff.activeCount > 4
                              ? 'bg-amber-50 text-[#D49A4A] border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {staff.activeCount} active
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-[#5C9A72]">
                        {staff.completedCount}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            staff.isActive
                              ? 'bg-emerald-50 text-[#5C9A72] border border-emerald-200'
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}
                        >
                          {staff.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Recent Requests Preview (Limited Number - NOT the Full Table) */}
      <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFE7E0] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[#29252A] uppercase tracking-wider">
                Recent Requests Preview
              </h3>
              <span className="text-[10px] font-bold text-[#6B4E71] bg-[#FAF5F0] px-2 py-0.5 rounded-full border border-[#EFE7E0]">
                Latest {recentRequests.length}
              </span>
            </div>
            <p className="text-[11px] text-[#6B666E] mt-0.5">
              High-level glance at incoming service tickets. Open Requests Manager for full triage & filters.
            </p>
          </div>

          <Link
            to="/admin/requests"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold shadow-xs transition"
          >
            <span>View All Requests ({stats.totalRequests || 0})</span>
            <HiOutlineArrowRight className="text-xs" />
          </Link>
        </div>

        {recentRequests.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#9E98A2] font-medium">
            No service requests found in this jurisdiction.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#29252A]">
              <thead className="bg-[#FAF5F0] text-[#6B4E71] uppercase font-bold text-[10px] border-b border-[#EFE7E0]">
                <tr>
                  <th className="p-3 rounded-l-xl">Request ID</th>
                  <th className="p-3">Issue Title & Category</th>
                  <th className="p-3">Citizen</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                  <th className="p-3 rounded-r-xl text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE7E0]">
                {recentRequests.map((r) => (
                  <tr key={r._id} className="hover:bg-[#FAF5F0]/60 transition">
                    <td className="p-3 font-mono font-bold text-[#C65F63]">
                      <Link to={`/requests/${r._id}`} className="hover:underline">
                        {r.requestId}
                      </Link>
                    </td>

                    <td className="p-3 max-w-[220px]">
                      <div className="font-bold text-[#29252A] truncate">{r.title}</div>
                      <div className="text-[10px] text-[#9E98A2] uppercase font-semibold">{r.category}</div>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-[#29252A]">{r.citizen?.name || 'Citizen'}</div>
                    </td>

                    <td className="p-3 max-w-[180px]">
                      <div className="text-[11px] text-[#29252A] truncate">{r.address}</div>
                    </td>

                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.priority === 'CRITICAL'
                            ? 'bg-[#FDECEF] text-[#B85450] border border-[#B85450]/20'
                            : r.priority === 'HIGH'
                            ? 'bg-amber-50 text-[#D49A4A] border border-[#D49A4A]/20'
                            : 'bg-[#FAF5F0] text-[#6B4E71] border border-[#EFE7E0]'
                        }`}
                      >
                        {r.priority}
                      </span>
                    </td>

                    <td className="p-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          r.status === 'RESOLVED' || r.status === 'CITIZEN_VERIFIED'
                            ? 'bg-emerald-50 text-[#5C9A72] border-emerald-200'
                            : r.status === 'IN_PROGRESS'
                            ? 'bg-[#E8D7E6] text-[#6B4E71] border-[#6B4E71]/30'
                            : r.status === 'ASSIGNED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-[#D49A4A] border-amber-200'
                        }`}
                      >
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="p-3 text-[#6B666E] text-[11px] whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </td>

                    <td className="p-3 text-right">
                      <Link
                        to={`/requests/${r._id}`}
                        className="px-2.5 py-1.5 rounded-lg bg-[#FAF5F0] hover:bg-white text-[#6B4E71] border border-[#EFE7E0] text-[11px] font-bold transition inline-flex items-center gap-1 shadow-xs"
                      >
                        <span>View</span>
                        <HiOutlineExternalLink className="text-xs" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Navigation Link */}
        <div className="p-3 bg-[#FAF5F0] rounded-2xl border border-[#EFE7E0] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <span className="text-[#6B666E]">
            Showing latest {recentRequests.length} requests · Need to search, filter by priority, reassign staff, or export?
          </span>
          <Link
            to="/admin/requests"
            className="font-bold text-[#C65F63] hover:text-[#B35256] flex items-center gap-1 text-xs"
          >
            <span>Open Dedicated Requests Manager</span>
            <HiOutlineArrowRight />
          </Link>
        </div>
      </div>

      {/* Spatial GIS Field Map & Heatmap Preview */}
      <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFE7E0] pb-3">
          <div className="flex items-center gap-2">
            <HiOutlineMap className="text-xl text-[#C65F63]" />
            <div>
              <h3 className="font-bold text-sm text-[#29252A] uppercase tracking-wider">
                Geographic Incident Cluster Map
              </h3>
              <p className="text-[11px] text-[#6B666E]">Spatial pin distribution and density heat zones</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsHeatmap(!isHeatmap)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                isHeatmap
                  ? 'bg-[#FDECEF] border-[#C65F63]/30 text-[#C65F63]'
                  : 'bg-[#FAF5F0] border-[#EFE7E0] text-[#6B666E]'
              }`}
            >
              <HiOutlineFire className="text-base" />
              <span>{isHeatmap ? 'Standard Pin View' : 'Density Heatmap'}</span>
            </button>
          </div>
        </div>

        <div className="h-80 rounded-2xl overflow-hidden border border-[#EFE7E0]">
          <IssueMap requests={recentRequests} isHeatmap={isHeatmap} />
        </div>
      </div>

      {/* Recent Activity / Admin Activity Preview */}
      <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
          <div>
            <h3 className="font-bold text-sm text-[#29252A] uppercase tracking-wider">
              Recent Administrative Activity
            </h3>
            <p className="text-[11px] text-[#6B666E]">System audit trail and operational events</p>
          </div>

          <Link
            to="/admin/activity-logs"
            className="text-xs font-bold text-[#6B4E71] hover:text-[#C65F63] flex items-center gap-1 transition"
          >
            <span>View Full Audit Log</span>
            <HiOutlineArrowRight className="text-[10px]" />
          </Link>
        </div>

        {recentActivity.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#9E98A2]">
            No recent activity recorded.
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentActivity.map((log) => (
              <div
                key={log._id}
                className="flex items-start justify-between gap-3 p-3 bg-[#FAF5F0]/60 rounded-xl border border-[#EFE7E0] text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-[#29252A] flex items-center gap-2">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white border border-[#EFE7E0] text-[#6B4E71]">
                      {log.action}
                    </span>
                    <span>by {log.user?.name || 'System Authority'}</span>
                    <span className="text-[10px] text-[#9E98A2]">({log.user?.role || 'ADMIN'})</span>
                  </div>
                  {log.targetId && (
                    <div className="text-[11px] text-[#6B666E]">
                      Target: <span className="font-mono font-bold text-[#C65F63]">{log.targetId}</span>
                      {log.metadata?.status && ` · Status: ${log.metadata.status}`}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-[#9E98A2] whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminDashboard;
