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

const BRAND_COLORS = ['#C65F63', '#6B4E71', '#D49A4A', '#5C9A72', '#402A40', '#8E536F', '#E8D7E6', '#B85450'];

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
    <div className="space-y-6 pb-12">
      
      {/* Header Banner */}
      <div className="bg-white border border-[#EFE7E0] p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight flex items-center gap-2.5">
            <HiOutlineChartBar className="text-[#C65F63]" />
            <span>Executive Analytics & Performance Insights</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#6B666E] mt-1">
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
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#FAF5F0] hover:bg-white text-[#5C9A72] border border-[#EFE7E0] text-xs font-bold shadow-xs transition"
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
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#FAF5F0] hover:bg-white text-[#6B4E71] border border-[#EFE7E0] text-xs font-bold shadow-xs transition"
          >
            <HiOutlineDocumentDownload className="text-base" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#FAF5F0] hover:bg-white text-[#29252A] text-xs font-bold border border-[#EFE7E0] transition shadow-xs"
          >
            <HiOutlineRefresh className="text-sm" />
            <span>Refresh</span>
          </button>

          <Link
            to="/admin/reports"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold shadow-md shadow-[#C65F63]/25 transition"
          >
            <HiOutlineExternalLink className="text-base" />
            <span>Reports Hub</span>
          </Link>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#6B666E] font-bold uppercase">Total Volume</span>
            <HiOutlineChartBar className="text-[#C65F63] text-lg" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#29252A]">{ov.totalRequests || 0}</div>
          <div className="text-[10px] text-[#9E98A2]">Lifetime civic complaints</div>
        </div>

        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#5C9A72] font-bold uppercase">Resolved Rate</span>
            <HiOutlineCheckCircle className="text-[#5C9A72] text-lg" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#5C9A72]">
            {ov.totalRequests > 0 ? Math.round(((ov.resolvedRequests || 0) / ov.totalRequests) * 100) : 100}%
          </div>
          <div className="text-[10px] text-[#9E98A2]">{ov.resolvedRequests || 0} tasks resolved</div>
        </div>

        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#6B4E71] font-bold uppercase">SLA Compliance</span>
            <HiOutlineShieldCheck className="text-[#6B4E71] text-lg" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#6B4E71]">{ov.slaComplianceRate || 100}%</div>
          <div className="text-[10px] text-[#9E98A2]">{ov.overdueCount || 0} overdue tasks</div>
        </div>

        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#D49A4A] font-bold uppercase">Citizen Rating</span>
            <HiOutlineStar className="text-[#D49A4A] text-lg" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#D49A4A]">
            {ov.avgRating ? ov.avgRating.toFixed(1) : '5.0'} / 5
          </div>
          <div className="text-[10px] text-[#9E98A2]">{ov.totalFeedback || 0} citizen reviews</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center gap-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-[#6B4E71]">
          <HiOutlineFilter />
          <span>Filters:</span>
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-1.5 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
        >
          <option value="">All Categories</option>
          <option value="WATER">Water</option>
          <option value="ROAD">Road</option>
          <option value="STREET_LIGHT">Streetlights</option>
          <option value="DRAINAGE">Drainage</option>
          <option value="GARBAGE">Garbage</option>
          <option value="PUBLIC_AREA">Public Area</option>
          <option value="OTHER">Other</option>
        </select>

        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-1.5 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-1.5 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
        >
          <option value="">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <button
          onClick={() => {
            setCategoryFilter('');
            setDepartmentFilter('');
            setPriorityFilter('');
            setStatusFilter('');
            setStartDate('');
            setEndDate('');
          }}
          className="ml-auto text-xs font-bold text-[#C65F63] hover:underline"
        >
          Clear Filters
        </button>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown BarChart */}
        <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-[#29252A] uppercase tracking-wider">
            Issue Category Breakdown
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categoryDistribution || []}>
                <XAxis dataKey="_id" tick={{ fill: '#6B666E', fontSize: 10 }} />
                <YAxis tick={{ fill: '#6B666E', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#EFE7E0', borderRadius: '12px', color: '#29252A', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#C65F63" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Distribution PieChart */}
        <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-[#29252A] uppercase tracking-wider">
            Priority & Urgency Split
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.priorityDistribution || []}
                  dataKey="count"
                  nameKey="_id"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {(data.priorityDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#EFE7E0', borderRadius: '12px', color: '#29252A', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Request Inflow AreaChart */}
        <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 shadow-xs space-y-4 lg:col-span-2">
          <h3 className="font-bold text-sm text-[#29252A] uppercase tracking-wider">
            Municipal Request Trend (Monthly Velocity)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrend || []}>
                <defs>
                  <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C65F63" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#C65F63" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#6B666E', fontSize: 10 }} />
                <YAxis tick={{ fill: '#6B666E', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#EFE7E0', borderRadius: '12px', color: '#29252A', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="total" stroke="#C65F63" strokeWidth={2} fillOpacity={1} fill="url(#colorMonthly)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AnalyticsPage;
