import React, { useState, useEffect, useCallback } from 'react';
import API from '../../services/api';
import { exportRequestsToExcel, exportSummaryToExcel } from '../../services/excelExporter';
import { generateAdminRequestsPDF, generateAdminSummaryPDF } from '../../services/pdfExporter';
import { toast } from 'react-toastify';
import {
  HiOutlineDocumentDownload,
  HiOutlineFilter,
  HiOutlineRefresh,
  HiOutlineClipboardList,
  HiOutlineChartBar,
  HiOutlineOfficeBuilding,
  HiOutlineUserGroup,
  HiOutlineStar,
  HiOutlineShieldCheck,
  HiOutlineSearch
} from 'react-icons/hi';

const REPORT_TABS = [
  { id: 'REQUESTS', label: 'Service Requests', icon: HiOutlineClipboardList, desc: 'Detailed request logs with locations, citizens, staff & timestamps' },
  { id: 'STATUS', label: 'Status Summary', icon: HiOutlineChartBar, desc: 'Breakdown of municipal requests across all lifecycle stages' },
  { id: 'CATEGORY', label: 'Category Analysis', icon: HiOutlineChartBar, desc: 'Volume, resolution rate, and turnaround hours by civic domain' },
  { id: 'DEPARTMENT', label: 'Department Operations', icon: HiOutlineOfficeBuilding, desc: 'Workload, active field teams & completion rates per department' },
  { id: 'STAFF', label: 'Staff Performance', icon: HiOutlineUserGroup, desc: 'Individual productivity, turnaround speed & citizen satisfaction' },
  { id: 'FEEDBACK', label: 'Citizen Reviews', icon: HiOutlineStar, desc: 'Audited citizen ratings and field resolution satisfaction remarks' },
  { id: 'SLA', label: 'SLA Compliance', icon: HiOutlineShieldCheck, desc: 'On-time performance, breach metrics & resolution compliance rate' }
];

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('REQUESTS');
  const [loading, setLoading] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Data states
  const [departments, setDepartments] = useState([]);
  const [requestsData, setRequestsData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);

  // Fetch departments list
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await API.get('/departments');
        if (res.data.success) {
          setDepartments(res.data.departments || []);
        }
      } catch (err) {
        console.error('Failed to load departments:', err.message);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch Report Data based on active filters
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (departmentFilter) params.department = departmentFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (searchTerm) params.search = searchTerm;

      if (activeTab === 'REQUESTS') {
        const res = await API.get('/admin/reports/requests', { params });
        if (res.data.success) {
          setRequestsData(res.data.data || []);
        }
      } else {
        const res = await API.get('/admin/reports/summary', { params });
        if (res.data.success) {
          setSummaryData(res.data.summary || null);
        }
      }
    } catch (err) {
      toast.error('Failed to load report data from server.');
      console.error('Report fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, categoryFilter, statusFilter, priorityFilter, departmentFilter, startDate, endDate, searchTerm]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleResetFilters = () => {
    setCategoryFilter('');
    setStatusFilter('');
    setPriorityFilter('');
    setDepartmentFilter('');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  // Export handlers
  const handleExportExcel = () => {
    if (activeTab === 'REQUESTS') {
      if (!requestsData || requestsData.length === 0) {
        toast.info('No requests match the selected filters to export.');
        return;
      }
      exportRequestsToExcel(requestsData, `LocalFix_Requests_Report_${Date.now()}.xlsx`);
      toast.success(`Exported ${requestsData.length} records to Excel.`);
    } else {
      if (!summaryData) {
        toast.info('No summary data available to export.');
        return;
      }
      exportSummaryToExcel(summaryData, activeTab, `LocalFix_${activeTab}_Report_${Date.now()}.xlsx`);
      toast.success(`Exported ${activeTab} summary report to Excel.`);
    }
  };

  const handleExportPDF = () => {
    const filterMetadata = {
      category: categoryFilter || undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      department: departmentFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    };

    if (activeTab === 'REQUESTS') {
      if (!requestsData || requestsData.length === 0) {
        toast.info('No requests match the selected filters to export.');
        return;
      }
      generateAdminRequestsPDF(requestsData, filterMetadata);
      toast.success(`Exported ${requestsData.length} records to PDF.`);
    } else {
      if (!summaryData) {
        toast.info('No summary data available to export.');
        return;
      }
      generateAdminSummaryPDF(summaryData, activeTab, filterMetadata);
      toast.success(`Exported ${activeTab} summary report to PDF.`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-[#EFE7E0] p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#29252A] tracking-tight flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#FDECEF] text-[#C65F63] flex items-center justify-center">
              <HiOutlineDocumentDownload className="text-xl" />
            </div>
            <span>Executive Reports & Data Export Center</span>
          </h1>
          <p className="text-xs text-[#6B4E71] mt-1">
            Generate audited, filter-aware PDF and Excel (.xlsx) reports directly from live municipal database records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold shadow-sm transition"
          >
            <HiOutlineDocumentDownload className="text-base" />
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#C65F63] hover:bg-[#b25155] text-white text-xs font-semibold shadow-sm transition"
          >
            <HiOutlineDocumentDownload className="text-base" />
            <span>Export PDF (.pdf)</span>
          </button>
        </div>
      </div>

      {/* Report Types Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-start p-3 rounded-2xl border text-left transition ${
                isActive
                  ? 'bg-[#FDECEF] border-[#C65F63] text-[#C65F63] shadow-sm font-semibold'
                  : 'bg-white border-[#EFE7E0] text-[#6B4E71] hover:bg-[#FAF5F0] hover:text-[#29252A]'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Icon className={isActive ? 'text-[#C65F63]' : 'text-[#6B4E71]'} />
                <span>{tab.label}</span>
              </div>
              <span className="text-[10px] text-[#6B4E71]/70 mt-1 line-clamp-1">{tab.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#EFE7E0] rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#29252A] uppercase tracking-wider">
            <HiOutlineFilter className="text-[#C65F63] text-base" />
            <span>Report Filter Parameters</span>
          </div>

          <button
            onClick={handleResetFilters}
            className="text-xs text-[#6B4E71] hover:text-[#C65F63] flex items-center gap-1 transition"
          >
            <HiOutlineRefresh className="text-xs" />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {activeTab === 'REQUESTS' && (
            <div className="relative">
              <HiOutlineSearch className="absolute left-3 top-3 text-[#6B4E71] text-sm" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search keyword / ID..."
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 pl-9 pr-3 text-xs text-[#29252A] placeholder-[#6B4E71]/60 focus:outline-none focus:border-[#C65F63]"
              />
            </div>
          )}

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
          >
            <option value="">All Categories</option>
            <option value="WATER">Water Supply</option>
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
            className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
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
            className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="REOPENED">Reopened</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Start Date"
            className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="End Date"
            className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
          />
        </div>
      </div>

      {/* Live Data Table Preview */}
      <div className="bg-white border border-[#EFE7E0] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#EFE7E0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#29252A]">Live Data Preview</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FAF5F0] text-[#6B4E71] font-semibold border border-[#EFE7E0]">
              {activeTab === 'REQUESTS' ? `${requestsData.length} records` : 'Aggregated View'}
            </span>
          </div>
          {loading && <span className="text-xs text-[#C65F63] animate-pulse font-medium">Fetching real records...</span>}
        </div>

        <div className="overflow-x-auto">
          {/* TAB 1: Service Requests */}
          {activeTab === 'REQUESTS' && (
            <table className="w-full text-left text-xs text-[#29252A]">
              <thead className="bg-[#FAF5F0] text-[11px] uppercase tracking-wider text-[#6B4E71] font-semibold">
                <tr>
                  <th className="p-3.5">Request ID</th>
                  <th className="p-3.5">Title</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Citizen</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Assigned Staff</th>
                  <th className="p-3.5">Submitted</th>
                  <th className="p-3.5">Resolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE7E0]">
                {requestsData.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-12 text-[#6B4E71]/70">
                      No service requests match the applied filter criteria.
                    </td>
                  </tr>
                ) : (
                  requestsData.map((r) => (
                    <tr key={r._id} className="hover:bg-[#FAF5F0]/60 transition">
                      <td className="p-3.5 font-bold text-[#C65F63]">{r.requestId}</td>
                      <td className="p-3.5 font-medium max-w-[180px] truncate text-[#29252A]">{r.title}</td>
                      <td className="p-3.5 text-[#6B4E71]">{r.category}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.priority === 'CRITICAL' ? 'bg-red-50 text-red-600 border border-red-200' :
                          r.priority === 'HIGH' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-[#FAF5F0] text-[#6B4E71] border border-[#EFE7E0]'
                        }`}>
                          {r.priority}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          r.status === 'RESOLVED' || r.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          r.status === 'IN_PROGRESS' ? 'bg-[#FDECEF] text-[#C65F63] border border-[#C65F63]/30' : 'bg-[#FAF5F0] text-[#6B4E71] border border-[#EFE7E0]'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-[#29252A]">{r.citizenName}</td>
                      <td className="p-3.5 text-[#6B4E71]">{r.departmentName}</td>
                      <td className="p-3.5 text-[#6B4E71]">{r.staffName}</td>
                      <td className="p-3.5 text-[#6B4E71]">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="p-3.5 text-[#6B4E71]">{r.resolvedDate ? new Date(r.resolvedDate).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TAB 2: Status Summary */}
          {activeTab === 'STATUS' && (
            <table className="w-full text-left text-xs text-[#29252A]">
              <thead className="bg-[#FAF5F0] text-[11px] uppercase tracking-wider text-[#6B4E71] font-semibold">
                <tr>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Total Requests</th>
                  <th className="p-3.5">Percentage of Workload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE7E0]">
                {summaryData?.statusReport?.length ? (
                  summaryData.statusReport.map((s, idx) => (
                    <tr key={idx} className="hover:bg-[#FAF5F0]/60 transition">
                      <td className="p-3.5 font-bold text-[#29252A]">{s.status}</td>
                      <td className="p-3.5 text-[#C65F63] font-semibold text-sm">{s.count}</td>
                      <td className="p-3.5 text-[#6B4E71]">{s.percentage}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center py-8 text-[#6B4E71]/70">No status data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* TAB 3: Category Performance */}
          {activeTab === 'CATEGORY' && (
            <table className="w-full text-left text-xs text-[#29252A]">
              <thead className="bg-[#FAF5F0] text-[11px] uppercase tracking-wider text-[#6B4E71] font-semibold">
                <tr>
                  <th className="p-3.5">Civic Category</th>
                  <th className="p-3.5">Total Requests</th>
                  <th className="p-3.5">Resolved</th>
                  <th className="p-3.5">Pending</th>
                  <th className="p-3.5">Avg Turnaround (Hours)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE7E0]">
                {summaryData?.categoryReport?.length ? (
                  summaryData.categoryReport.map((c, idx) => (
                    <tr key={idx} className="hover:bg-[#FAF5F0]/60 transition">
                      <td className="p-3.5 font-bold text-[#29252A]">{c.category}</td>
                      <td className="p-3.5 font-semibold text-[#29252A]">{c.total}</td>
                      <td className="p-3.5 text-emerald-600 font-semibold">{c.resolved}</td>
                      <td className="p-3.5 text-amber-600">{c.pending}</td>
                      <td className="p-3.5 font-semibold text-[#6B4E71]">{c.avgResolutionHours}h</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-[#6B4E71]/70">No category data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* TAB 4: Department Operations */}
          {activeTab === 'DEPARTMENT' && (
            <table className="w-full text-left text-xs text-[#29252A]">
              <thead className="bg-[#FAF5F0] text-[11px] uppercase tracking-wider text-[#6B4E71] font-semibold">
                <tr>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Total Requests</th>
                  <th className="p-3.5">Resolved</th>
                  <th className="p-3.5">Pending</th>
                  <th className="p-3.5">Active Staff</th>
                  <th className="p-3.5">Resolution Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE7E0]">
                {summaryData?.departmentReport?.length ? (
                  summaryData.departmentReport.map((d, idx) => (
                    <tr key={idx} className="hover:bg-[#FAF5F0]/60 transition">
                      <td className="p-3.5 font-bold text-[#29252A]">{d.name}</td>
                      <td className="p-3.5 font-mono text-[#6B4E71]">{d.code}</td>
                      <td className="p-3.5 font-semibold text-[#29252A]">{d.totalRequests}</td>
                      <td className="p-3.5 text-emerald-600 font-semibold">{d.resolvedRequests}</td>
                      <td className="p-3.5 text-amber-600">{d.pendingRequests}</td>
                      <td className="p-3.5 font-semibold text-[#C65F63]">{d.activeStaffCount}</td>
                      <td className="p-3.5 font-bold text-emerald-600">{d.resolutionRate}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-[#6B4E71]/70">No department data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* TAB 5: Staff Performance */}
          {activeTab === 'STAFF' && (
            <table className="w-full text-left text-xs text-[#29252A]">
              <thead className="bg-[#FAF5F0] text-[11px] uppercase tracking-wider text-[#6B4E71] font-semibold">
                <tr>
                  <th className="p-3.5">Staff Officer</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Assigned</th>
                  <th className="p-3.5">Completed</th>
                  <th className="p-3.5">Pending</th>
                  <th className="p-3.5">Avg Speed</th>
                  <th className="p-3.5">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE7E0]">
                {summaryData?.staffReport?.length ? (
                  summaryData.staffReport.map((s, idx) => (
                    <tr key={idx} className="hover:bg-[#FAF5F0]/60 transition">
                      <td className="p-3.5 font-bold text-[#29252A]">{s.name}</td>
                      <td className="p-3.5 text-[#6B4E71]">{s.email}</td>
                      <td className="p-3.5 text-[#6B4E71]">{s.department}</td>
                      <td className="p-3.5 font-semibold text-[#29252A]">{s.totalAssigned}</td>
                      <td className="p-3.5 text-emerald-600 font-semibold">{s.completedRequests}</td>
                      <td className="p-3.5 text-amber-600">{s.pendingRequests}</td>
                      <td className="p-3.5 font-semibold text-[#6B4E71]">{s.avgResolutionHours}h</td>
                      <td className="p-3.5">
                        {s.avgRating > 0 ? (
                          <span className="text-amber-500 font-bold">★ {s.avgRating}/5</span>
                        ) : (
                          <span className="text-[#6B4E71]/60">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-[#6B4E71]/70">No staff performance data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* TAB 6: Feedback Audit */}
          {activeTab === 'FEEDBACK' && (
            <table className="w-full text-left text-xs text-[#29252A]">
              <thead className="bg-[#FAF5F0] text-[11px] uppercase tracking-wider text-[#6B4E71] font-semibold">
                <tr>
                  <th className="p-3.5">Request ID</th>
                  <th className="p-3.5">Title</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Rating</th>
                  <th className="p-3.5">Citizen Comment</th>
                  <th className="p-3.5">Citizen Name</th>
                  <th className="p-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE7E0]">
                {summaryData?.feedbackReport?.length ? (
                  summaryData.feedbackReport.map((f, idx) => (
                    <tr key={idx} className="hover:bg-[#FAF5F0]/60 transition">
                      <td className="p-3.5 font-bold text-[#C65F63]">{f.requestId}</td>
                      <td className="p-3.5 text-[#29252A] max-w-[150px] truncate">{f.title}</td>
                      <td className="p-3.5 text-[#6B4E71]">{f.category}</td>
                      <td className="p-3.5 text-[#6B4E71]">{f.department}</td>
                      <td className="p-3.5 font-bold text-amber-500">★ {f.rating}/5</td>
                      <td className="p-3.5 italic text-[#6B4E71] max-w-[200px] truncate">"{f.comment || '—'}"</td>
                      <td className="p-3.5 text-[#29252A]">{f.citizenName}</td>
                      <td className="p-3.5 text-[#6B4E71]">{new Date(f.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-[#6B4E71]/70">No feedback reviews recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* TAB 7: SLA Compliance */}
          {activeTab === 'SLA' && (
            <table className="w-full text-left text-xs text-[#29252A]">
              <thead className="bg-[#FAF5F0] text-[11px] uppercase tracking-wider text-[#6B4E71] font-semibold">
                <tr>
                  <th className="p-3.5">Priority Tier</th>
                  <th className="p-3.5">Total Volume</th>
                  <th className="p-3.5">SLA Met</th>
                  <th className="p-3.5">SLA Breached</th>
                  <th className="p-3.5">Active / Pending</th>
                  <th className="p-3.5">Compliance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE7E0]">
                {summaryData?.slaReport?.length ? (
                  summaryData.slaReport.map((sla, idx) => (
                    <tr key={idx} className="hover:bg-[#FAF5F0]/60 transition">
                      <td className="p-3.5 font-bold text-[#29252A]">{sla.priority}</td>
                      <td className="p-3.5 font-semibold text-[#29252A]">{sla.total}</td>
                      <td className="p-3.5 text-emerald-600 font-semibold">{sla.met}</td>
                      <td className="p-3.5 text-red-600 font-semibold">{sla.breached}</td>
                      <td className="p-3.5 text-amber-600">{sla.pending}</td>
                      <td className="p-3.5">
                        <span className={`font-bold ${sla.complianceRate >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {sla.complianceRate}%
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-[#6B4E71]/70">No SLA compliance data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
};

export default ReportsPage;
