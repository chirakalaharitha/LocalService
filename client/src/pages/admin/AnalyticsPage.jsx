import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import {
  HiOutlineChartBar,
  HiOutlineFilter,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineStar,
  HiOutlineShieldCheck,
  HiOutlineRefresh,
  HiOutlineDocumentDownload,
  HiOutlineExternalLink
} from 'react-icons/hi';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { exportSummaryToExcel } from '../../services/excelExporter';
import { generateAdminSummaryPDF } from '../../services/pdfExporter';

const COLORS = ['#3b82f6', '#10b981', '#eab308', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#64748b'];

const AnalyticsPage = () => {
  const [data, setData] = useState({
    overview: {
      totalRequests: 0,
      resolvedRequests: 0,
      closedRequests: 0,
      reopenedRequests: 0,
      criticalRequests: 0,
      overdueCount: 0,
      pendingSlaCount: 0,
      slaComplianceRate: 100,
      avgResolutionHours: 0,
      avgCompletionHours: 0,
      avgRating: 0,
      totalFeedback: 0
    },
    categoryDistribution: [],
    statusBreakdown: [],
    priorityDistribution: [],
    departmentDistribution: [],
    monthlyTrend: [],
    feedbackAnalytics: {
      totalFeedback: 0,
      avgRating: 0,
      ratingDistribution: {}
    },
    staffPerformance: []
  });

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (departmentFilter) params.department = departmentFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (statusFilter) params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [res, deptRes] = await Promise.all([
        API.get('/admin/analytics', { params }),
        API.get('/departments')
      ]);

      if (res.data.success) {
        setData(res.data);
      }
      if (deptRes.data.success) {
        setDepartments(deptRes.data.departments || []);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [categoryFilter, departmentFilter, priorityFilter, statusFilter, startDate, endDate]);

  const ov = data.overview || {};

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <HiOutlineChartBar className="text-blue-400" />
            <span>Executive Analytics & Performance Insights</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time analytics on resolution turnaround, SLA compliance rate, municipal department workload, and citizen satisfaction ratings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (!data || !data.overview || data.overview.totalRequests === 0) {
                toast.info('No analytics data available to export.');
                return;
              }
              const reportPayload = {
                totalRequests: data.overview.totalRequests,
                statusReport: data.statusBreakdown?.map(s => ({ status: s._id, count: s.count, percentage: s.percentage })) || [],
                categoryReport: data.categoryDistribution?.map(c => ({ category: c._id, total: c.count, resolved: c.resolved, pending: c.pending, avgResolutionHours: c.avgHours })) || [],
                departmentReport: data.departmentDistribution?.map(d => ({ name: d.name, code: d.code, totalRequests: d.count, resolvedRequests: d.resolved, pendingRequests: d.pending, activeStaffCount: d.activeStaffCount, resolutionRate: d.resolutionRate })) || [],
                staffReport: data.staffPerformance?.map(s => ({ name: s.name, email: s.email, department: s.department, isActive: s.isActive, totalAssigned: s.totalAssigned, completedRequests: s.completedRequests, pendingRequests: s.pendingRequests, avgResolutionHours: s.avgResolutionHours, avgRating: s.avgRating })) || [],
                slaReport: [
                  { priority: 'OVERALL', total: data.overview.totalRequests, met: data.slaMetrics?.met || 0, breached: data.slaMetrics?.breached || 0, pending: data.slaMetrics?.pending || 0, complianceRate: data.slaMetrics?.complianceRate || 100 }
                ]
              };
              exportSummaryToExcel(reportPayload, 'ALL', `LocalFix_Executive_Analytics_${Date.now()}.xlsx`);
              toast.success('Analytics workbook exported to Excel successfully.');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-semibold shadow transition"
          >
            <HiOutlineDocumentDownload className="text-base" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => {
              if (!data || !data.overview || data.overview.totalRequests === 0) {
                toast.info('No analytics data available to export.');
                return;
              }
              const reportPayload = {
                totalRequests: data.overview.totalRequests,
                statusReport: data.statusBreakdown?.map(s => ({ status: s._id, count: s.count, percentage: s.percentage })) || [],
                categoryReport: data.categoryDistribution?.map(c => ({ category: c._id, total: c.count, resolved: c.resolved, pending: c.pending, avgResolutionHours: c.avgHours })) || [],
                departmentReport: data.departmentDistribution?.map(d => ({ name: d.name, code: d.code, totalRequests: d.count, resolvedRequests: d.resolved, pendingRequests: d.pending, activeStaffCount: d.activeStaffCount, resolutionRate: d.resolutionRate })) || [],
                staffReport: data.staffPerformance?.map(s => ({ name: s.name, email: s.email, department: s.department, isActive: s.isActive, totalAssigned: s.totalAssigned, completedRequests: s.completedRequests, pendingRequests: s.pendingRequests, avgResolutionHours: s.avgResolutionHours, avgRating: s.avgRating })) || [],
                slaReport: [
                  { priority: 'OVERALL', total: data.overview.totalRequests, met: data.slaMetrics?.met || 0, breached: data.slaMetrics?.breached || 0, pending: data.slaMetrics?.pending || 0, complianceRate: data.slaMetrics?.complianceRate || 100 }
                ]
              };
              generateAdminSummaryPDF(reportPayload, 'OVERVIEW', {
                category: categoryFilter || undefined,
                department: departmentFilter || undefined,
                status: statusFilter || undefined,
                priority: priorityFilter || undefined
              });
              toast.success('Analytics summary exported to PDF successfully.');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 text-xs font-semibold shadow transition"
          >
            <HiOutlineDocumentDownload className="text-base" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <HiOutlineRefresh className="text-sm" />
            <span>Refresh</span>
          </button>

          <Link
            to="/admin/reports"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition"
          >
            <HiOutlineExternalLink className="text-base" />
            <span>Reports Hub</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <HiOutlineFilter className="text-blue-400 text-base" />
          <span>Analytics Filter Controls</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
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
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="REOPENED">Reopened</option>
          </select>

          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Empty State Banner if insufficient data */}
      {ov.totalRequests === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
            <HiOutlineChartBar className="text-2xl text-blue-400" />
          </div>
          <h3 className="text-base font-bold text-slate-200">Not enough data available for analytics.</h3>
          <p className="text-xs text-slate-400">Analytics and trends will automatically populate once municipal service requests are logged in the system.</p>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Volume</span>
          <div className="text-2xl font-black text-white">{ov.totalRequests || 0}</div>
          <span className="text-[10px] text-slate-500">Filtered Complaints</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">SLA Compliance</span>
          <div className="text-2xl font-black text-emerald-400">{ov.slaComplianceRate || 100}%</div>
          <span className="text-[10px] text-slate-500">{ov.overdueCount || 0} Overdue Tickets</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Avg Resolution Time</span>
          <div className="text-2xl font-black text-blue-400">{ov.avgResolutionHours || 0}h</div>
          <span className="text-[10px] text-slate-500">Field work duration</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Avg Completion Time</span>
          <div className="text-2xl font-black text-teal-400">{ov.avgCompletionHours || 0}h</div>
          <span className="text-[10px] text-slate-500">To Citizen Verification</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Closed & Verified</span>
          <div className="text-2xl font-black text-indigo-400">{ov.closedRequests || 0}</div>
          <span className="text-[10px] text-slate-500">Completed Lifecycle</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Citizen Rating</span>
          <div className="text-2xl font-black text-amber-400 flex items-center gap-1">
            <span>{ov.avgRating || 0}</span>
            <HiOutlineStar className="text-lg" />
          </div>
          <span className="text-[10px] text-slate-500">{ov.totalFeedback || 0} Reviews Logged</span>
        </div>
      </div>

      {/* Monthly Trend Area Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white">Monthly Service Volume & Resolution Trend</h2>
        <div className="h-72">
          {data.monthlyTrend && data.monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrend.map(m => ({ ...m, label: `${m._id.month}/${m._id.year}` }))}>
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                <Legend />
                <Area type="monotone" dataKey="total" name="Total Filed" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                <Area type="monotone" dataKey="resolved" name="Resolved / Closed" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No trend data available for the selected filters.
            </div>
          )}
        </div>
      </div>

      {/* Charts Grid: Categories, Departments, Status, Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Requests by Category</h2>
          <div className="h-64">
            {data.categoryDistribution && data.categoryDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categoryDistribution}>
                  <XAxis dataKey="_id" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                  <Bar dataKey="count" name="Complaints" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No category data available for the active filters.
              </div>
            )}
          </div>
        </div>

        {/* Department Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Departmental Workload & Completion</h2>
          <div className="h-64">
            {data.departmentDistribution && data.departmentDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.departmentDistribution}>
                  <XAxis dataKey="code" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="count" name="Total Assigned" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolvedCount" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No departmental data available.
              </div>
            )}
          </div>
        </div>

        {/* Status Breakdown Donut */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Lifecycle Status Breakdown</h2>
          <div className="h-64 flex items-center justify-center">
            {data.statusBreakdown && data.statusBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusBreakdown}
                    dataKey="count"
                    nameKey="_id"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    label={({ _id, count }) => `${_id}: ${count}`}
                  >
                    {data.statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500">No status data available.</div>
            )}
          </div>
        </div>

        {/* Priority Distribution Donut */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Severity Priority Distribution</h2>
          <div className="h-64 flex items-center justify-center">
            {data.priorityDistribution && data.priorityDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.priorityDistribution}
                    dataKey="count"
                    nameKey="_id"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ _id, count }) => `${_id}: ${count}`}
                  >
                    {data.priorityDistribution.map((entry, index) => (
                      <Cell key={`cell-prio-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500">No priority data available.</div>
            )}
          </div>
        </div>

      </div>

      {/* Staff Performance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white">Field Staff Workload & Performance Table</h2>
        {data.staffPerformance && data.staffPerformance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-3 rounded-l-xl">Staff Member</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Assigned Tasks</th>
                  <th className="p-3">Completed Tasks</th>
                  <th className="p-3">Pending Tasks</th>
                  <th className="p-3 rounded-r-xl text-right">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {data.staffPerformance.map((s) => {
                  const rate = s.assignedCount > 0 ? ((s.completedCount / s.assignedCount) * 100).toFixed(0) : 0;
                  return (
                    <tr key={s._id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-bold text-slate-100">{s.name}</td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">{s.email}</td>
                      <td className="p-3 font-bold text-blue-400">{s.assignedCount}</td>
                      <td className="p-3 font-bold text-emerald-400">{s.completedCount}</td>
                      <td className="p-3 font-bold text-amber-400">{s.pendingCount || 0}</td>
                      <td className="p-3 font-bold text-teal-300 text-right">{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">No staff members found.</div>
        )}
      </div>

    </div>
  );
};

export default AnalyticsPage;


