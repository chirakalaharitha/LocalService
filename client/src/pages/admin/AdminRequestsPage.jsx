import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import API from '../../services/api';
import { exportRequestsToExcel } from '../../services/excelExporter';
import { generateAdminRequestsPDF } from '../../services/pdfExporter';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import {
  HiOutlineClipboardList,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineRefresh,
  HiOutlineDocumentDownload,
  HiOutlineExternalLink,
  HiOutlineSwitchHorizontal,
  HiOutlineUserAdd,
  HiOutlinePhotograph,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineX,
  HiOutlineCalendar,
  HiOutlineInformationCircle,
  HiOutlineLocationMarker
} from 'react-icons/hi';

const AdminRequestsPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  // Requests Data & Master Lists
  const [requests, setRequests] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [municipalityFilter, setMunicipalityFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [slaFilter, setSlaFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Export Loading States
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Assign Staff Modal State
  const [assignModalReq, setAssignModalReq] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('MEDIUM');
  const [selectedDept, setSelectedDept] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Transfer Jurisdiction Modal State
  const [transferModalReq, setTransferModalReq] = useState(null);
  const [selectedToMuni, setSelectedToMuni] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Quick Evidence Modal State
  const [evidenceModalReq, setEvidenceModalReq] = useState(null);

  // Quick Status History Modal State
  const [historyModalReq, setHistoryModalReq] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyList, setHistoryList] = useState([]);

  // Priority Update In-flight State
  const [updatingPriorityId, setUpdatingPriorityId] = useState(null);

  // Fetch Master Data (Staff, Departments, Municipalities)
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [staffRes, deptRes, muniRes] = await Promise.all([
          API.get('/admin/users?role=STAFF'),
          API.get('/departments'),
          API.get('/municipalities')
        ]);
        if (staffRes.data.success) setStaffList(staffRes.data.users || []);
        if (deptRes.data.success) setDepartments(deptRes.data.departments || []);
        if (muniRes.data.success) setMunicipalities(muniRes.data.municipalities || []);
      } catch (err) {
        console.error('Failed to load master metadata:', err);
      }
    };
    fetchMasterData();
  }, []);

  // Fetch Filtered Requests from MongoDB
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        scope: 'admin',
        page: currentPage,
        limit: pageSize,
        sortBy,
        sortOrder
      };

      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (municipalityFilter) params.municipality = municipalityFilter;
      if (assignedFilter) params.assignedStatus = assignedFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await API.get('/requests', { params });
      if (res.data.success) {
        let reqs = res.data.requests || [];

        // Apply SLA client-side refinement if selected
        if (slaFilter === 'OVERDUE') {
          reqs = reqs.filter(r => r.slaStatus === 'OVERDUE');
        } else if (slaFilter === 'ON_TIME') {
          reqs = reqs.filter(r => r.slaStatus === 'ON_TIME');
        }

        setRequests(reqs);
        setTotalCount(res.data.total !== undefined ? res.data.total : reqs.length);
        setTotalPages(res.data.pages !== undefined ? res.data.pages : Math.ceil((res.data.total || reqs.length) / pageSize));
      }
    } catch (err) {
      console.error('Error fetching admin requests:', err);
      toast.error('Failed to load service requests.');
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
    searchTerm,
    statusFilter,
    categoryFilter,
    priorityFilter,
    municipalityFilter,
    assignedFilter,
    slaFilter,
    startDate,
    endDate
  ]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Real-time Socket.IO Listeners
  useEffect(() => {
    if (!socket) return;

    const handleRealtimeChange = () => {
      fetchRequests();
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
  }, [socket, fetchRequests]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setCategoryFilter('');
    setPriorityFilter('');
    setMunicipalityFilter('');
    setAssignedFilter('');
    setSlaFilter('');
    setStartDate('');
    setEndDate('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  // Export PDF Handler
  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      await generateAdminRequestsPDF(requests, {
        adminName: user?.name,
        municipality: user?.municipality?.name || 'Central Command'
      });
      toast.success('Requests Report PDF generated successfully.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export PDF.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Export Excel Handler
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportRequestsToExcel(requests, {
        adminName: user?.name,
        municipality: user?.municipality?.name || 'Central Command'
      });
      toast.success('Requests Excel export downloaded successfully.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Open Assign Staff Modal
  const openAssignModal = (req) => {
    setAssignModalReq(req);
    setSelectedStaff(req.assignedStaff?._id || req.assignedTo?._id || '');
    setSelectedPriority(req.priority || 'MEDIUM');
    setSelectedDept(req.department?._id || req.department || '');
  };

  // Submit Staff Assignment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStaff) {
      toast.error('Please choose a field staff member.');
      return;
    }

    setAssigning(true);
    try {
      const res = await API.post(`/requests/${assignModalReq._id}/assign`, {
        staffId: selectedStaff,
        departmentId: selectedDept || undefined,
        priority: selectedPriority
      });

      if (res.data.success) {
        toast.success(`Request ${assignModalReq.requestId} assigned successfully.`);
        setAssignModalReq(null);
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Assignment failed.');
    } finally {
      setAssigning(false);
    }
  };

  // Open Transfer Modal
  const openTransferModal = (req) => {
    setTransferModalReq(req);
    setSelectedToMuni('');
    setTransferReason('');
  };

  // Submit Jurisdiction Transfer
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!selectedToMuni) {
      toast.error('Please select the destination municipal authority.');
      return;
    }

    setTransferring(true);
    try {
      const res = await API.post(`/requests/${transferModalReq._id}/transfer-jurisdiction`, {
        toMunicipalityId: selectedToMuni,
        reason: transferReason.trim()
      });

      if (res.data.success) {
        toast.success(`Request ${transferModalReq.requestId} transferred successfully.`);
        setTransferModalReq(null);
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Transfer failed.');
    } finally {
      setTransferring(false);
    }
  };

  // Quick Priority Change
  const handlePriorityChange = async (reqId, newPriority) => {
    setUpdatingPriorityId(reqId);
    try {
      const res = await API.put(`/admin/requests/${reqId}/priority`, { priority: newPriority });
      if (res.data.success) {
        toast.success(`Priority updated to ${newPriority}`);
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update priority');
    } finally {
      setUpdatingPriorityId(null);
    }
  };

  // Open Status History Drawer / Modal
  const openHistoryModal = async (req) => {
    setHistoryModalReq(req);
    setHistoryLoading(true);
    try {
      const res = await API.get(`/requests/${req._id}`);
      if (res.data.success) {
        setHistoryList(res.data.history || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Active filters count indicator
  const activeFiltersCount = [
    searchTerm,
    statusFilter,
    categoryFilter,
    priorityFilter,
    municipalityFilter,
    assignedFilter,
    slaFilter,
    startDate,
    endDate
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 pb-12">

      {/* Header Banner & Exports */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-[#EFE7E0] p-6 sm:p-8 rounded-3xl shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider bg-[#FDECEF] text-[#C65F63] border border-[#C65F63]/20 uppercase flex items-center gap-1.5 shadow-xs">
              <span>📋</span>
              <span>Dedicated Request Workspace</span>
            </span>
            <span className="text-[10px] font-semibold text-[#6B4E71] bg-[#FAF5F0] px-2.5 py-0.5 rounded-full border border-[#EFE7E0]">
              {totalCount} Total Cases Logged
            </span>
            {activeFiltersCount > 0 && (
              <span className="text-[10px] font-bold text-[#C65F63] bg-[#FDECEF] px-2.5 py-0.5 rounded-full border border-[#C65F63]/30">
                {activeFiltersCount} Filter{activeFiltersCount > 1 ? 's' : ''} Active
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight">
            Admin Requests Management
          </h1>
          <p className="text-xs sm:text-sm text-[#6B666E] mt-1">
            Complete municipal request triage, staff assignment, priority controls, jurisdiction transfers, and export tools.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel || requests.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#FAF5F0] hover:bg-white text-[#5C9A72] border border-[#EFE7E0] text-xs font-bold shadow-xs transition disabled:opacity-50"
            title="Download full filtered list to Excel"
          >
            <HiOutlineDocumentDownload className="text-base" />
            <span>{isExportingExcel ? 'Exporting...' : 'Export Excel'}</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF || requests.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#FAF5F0] hover:bg-white text-[#6B4E71] border border-[#EFE7E0] text-xs font-bold shadow-xs transition disabled:opacity-50"
            title="Download formatted PDF report"
          >
            <HiOutlineDocumentDownload className="text-base" />
            <span>{isExportingPDF ? 'Exporting...' : 'Export PDF'}</span>
          </button>

          <button
            onClick={fetchRequests}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[#FAF5F0] hover:bg-white text-[#29252A] border border-[#EFE7E0] transition"
            title="Refresh requests list"
          >
            <HiOutlineRefresh className={`text-base ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Comprehensive Filtering & Search Workspace */}
      <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
          <div className="flex items-center gap-2">
            <HiOutlineFilter className="text-lg text-[#C65F63]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#29252A]">
              Filter & Search Workspace
            </h2>
          </div>
          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-[#C65F63] hover:text-[#B35256] transition"
            >
              Reset All Filters
            </button>
          )}
        </div>

        {/* Row 1: Search Bar & Primary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <HiOutlineSearch className="absolute left-3.5 top-3 text-[#9E98A2] text-sm" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Request ID, Title, Address, Citizen name..."
              className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 pl-9 pr-4 text-xs text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63] focus:bg-white transition"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Submitted / Pending</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ACCEPTED">Accepted by Staff</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLUTION_SUBMITTED">Resolution Submitted</option>
              <option value="RESOLVED">Resolved</option>
              <option value="PENDING_VERIFICATION">Pending Citizen Verification</option>
              <option value="CITIZEN_VERIFIED">Citizen Verified</option>
              <option value="CLOSED">Closed</option>
              <option value="REOPENED">Reopened / Issue Reported</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical (4h SLA)</option>
              <option value="HIGH">High (12h SLA)</option>
              <option value="MEDIUM">Medium (24h SLA)</option>
              <option value="LOW">Low (72h SLA)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Secondary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* Category Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#6B666E] mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-1.5 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
            >
              <option value="">All Categories</option>
              <option value="WATER">Water Supply</option>
              <option value="ELECTRICITY">Electricity & Power</option>
              <option value="ROAD">Roads & Potholes</option>
              <option value="STREET_LIGHT">Street Lights</option>
              <option value="GARBAGE">Garbage & Sanitation</option>
              <option value="DRAINAGE">Drainage & Sewage</option>
              <option value="PUBLIC_AREA">Public Facilities</option>
              <option value="OTHER">Other Issues</option>
            </select>
          </div>

          {/* Municipality / Location */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#6B666E] mb-1">Municipality</label>
            <select
              value={municipalityFilter}
              onChange={(e) => {
                setMunicipalityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-1.5 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
            >
              <option value="">All Jurisdictions</option>
              {municipalities.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned vs Unassigned */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#6B666E] mb-1">Staff Assignment</label>
            <select
              value={assignedFilter}
              onChange={(e) => {
                setAssignedFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-1.5 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
            >
              <option value="">All Assignment Statuses</option>
              <option value="ASSIGNED">Assigned to Staff</option>
              <option value="UNASSIGNED">Unassigned (Action Needed)</option>
            </select>
          </div>

          {/* SLA / Overdue Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#6B666E] mb-1">SLA Compliance</label>
            <select
              value={slaFilter}
              onChange={(e) => {
                setSlaFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-1.5 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
            >
              <option value="">All SLA Statuses</option>
              <option value="OVERDUE">Overdue Only</option>
              <option value="ON_TIME">On-Time Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#6B666E] mb-1">Sort By</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [fld, ord] = e.target.value.split('-');
                setSortBy(fld);
                setSortOrder(ord);
                setCurrentPage(1);
              }}
              className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-1.5 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="priority-desc">Priority (High to Low)</option>
              <option value="slaDeadline-asc">SLA Deadline (Urgent)</option>
            </select>
          </div>
        </div>

        {/* Row 3: Date Range Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-[#EFE7E0] text-xs">
          <span className="text-[10px] uppercase font-bold text-[#6B666E] flex items-center gap-1">
            <HiOutlineCalendar />
            <span>Date Range:</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#6B666E]">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-lg px-2.5 py-1 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#6B666E]">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-lg px-2.5 py-1 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-[11px] font-bold text-[#C65F63] hover:underline"
            >
              Clear Dates
            </button>
          )}

          <div className="ml-auto text-xs text-[#6B666E]">
            Showing <span className="font-bold text-[#29252A]">{requests.length}</span> of{' '}
            <span className="font-bold text-[#29252A]">{totalCount}</span> matching records
          </div>
        </div>
      </div>

      {/* Full Real MongoDB Requests Table */}
      <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-xs text-[#29252A]">
            <thead className="bg-[#FAF5F0] text-[#6B4E71] uppercase font-bold text-[10px] border-b border-[#EFE7E0]">
              <tr>
                <th className="p-3.5 rounded-l-xl">Request ID</th>
                <th className="p-3.5">Issue Title & Category</th>
                <th className="p-3.5">Citizen</th>
                <th className="p-3.5">Location & Authority</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Assigned Staff</th>
                <th className="p-3.5">SLA / Due</th>
                <th className="p-3.5">Created Date</th>
                <th className="p-3.5 rounded-r-xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE7E0]">
              {loading ? (
                <tr>
                  <td colSpan="10" className="py-16 text-center text-[#9E98A2]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <HiOutlineRefresh className="text-2xl animate-spin text-[#C65F63]" />
                      <span>Loading real service requests from MongoDB...</span>
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-16 text-center text-[#9E98A2] font-medium">
                    <div className="space-y-2">
                      <p>No requests found matching the current search & filter criteria.</p>
                      <button
                        onClick={handleResetFilters}
                        className="text-xs font-bold text-[#C65F63] underline"
                      >
                        Reset filters to view all requests
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const staffUser = r.assignedStaff || r.assignedTo;
                  const isOverdue = r.slaStatus === 'OVERDUE';

                  return (
                    <tr key={r._id} className="hover:bg-[#FAF5F0]/70 transition group">
                      {/* Request ID */}
                      <td className="p-3.5 font-mono font-bold text-[#C65F63]">
                        <Link to={`/requests/${r._id}`} className="hover:underline flex items-center gap-1">
                          <span>{r.requestId}</span>
                        </Link>
                      </td>

                      {/* Issue Title & Category */}
                      <td className="p-3.5 max-w-[220px]">
                        <div className="font-bold text-[#29252A] truncate" title={r.title}>
                          {r.title}
                        </div>
                        <div className="text-[10px] text-[#9E98A2] uppercase font-semibold flex items-center gap-1.5 mt-0.5">
                          <span>{r.category}</span>
                          {r.images && r.images.length > 0 && (
                            <button
                              onClick={() => setEvidenceModalReq(r)}
                              title={`${r.images.length} attachment(s)`}
                              className="text-[#C65F63] hover:underline flex items-center gap-0.5"
                            >
                              <HiOutlinePhotograph />
                              <span>{r.images.length}</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Citizen */}
                      <td className="p-3.5">
                        <div className="font-semibold text-[#29252A]">{r.citizen?.name || 'Citizen'}</div>
                        <div className="text-[10px] text-[#9E98A2]">{r.citizen?.phone || r.citizen?.email || 'N/A'}</div>
                      </td>

                      {/* Location & Authority */}
                      <td className="p-3.5 max-w-[200px]">
                        <div className="text-xs font-medium text-[#29252A] line-clamp-1" title={r.address}>
                          {r.address}
                        </div>
                        <div className="text-[10px] font-bold text-[#6B4E71] flex items-center gap-1 mt-0.5">
                          <span>🏛️</span>
                          <span className="truncate">
                            {r.municipalitySnapshot?.name || r.municipality?.name || 'Local Jurisdiction'}
                          </span>
                        </div>
                      </td>

                      {/* Priority (with quick update selector) */}
                      <td className="p-3.5">
                        <select
                          value={r.priority}
                          disabled={updatingPriorityId === r._id}
                          onChange={(e) => handlePriorityChange(r._id, e.target.value)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border cursor-pointer focus:outline-none ${
                            r.priority === 'CRITICAL'
                              ? 'bg-[#FDECEF] text-[#B85450] border-[#B85450]/20'
                              : r.priority === 'HIGH'
                              ? 'bg-amber-50 text-[#D49A4A] border-[#D49A4A]/20'
                              : 'bg-[#FAF5F0] text-[#6B4E71] border-[#EFE7E0]'
                          }`}
                        >
                          <option value="LOW">LOW</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="HIGH">HIGH</option>
                          <option value="CRITICAL">CRITICAL</option>
                        </select>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border whitespace-nowrap ${
                            r.status === 'RESOLVED' || r.status === 'CITIZEN_VERIFIED'
                              ? 'bg-emerald-50 text-[#5C9A72] border-emerald-200'
                              : r.status === 'IN_PROGRESS' || r.status === 'ACCEPTED'
                              ? 'bg-[#E8D7E6] text-[#6B4E71] border-[#6B4E71]/30'
                              : r.status === 'ASSIGNED'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : r.status === 'REOPENED'
                              ? 'bg-[#FDECEF] text-[#B85450] border-[#B85450]/30'
                              : 'bg-amber-50 text-[#D49A4A] border-amber-200'
                          }`}
                        >
                          {r.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Assigned Staff */}
                      <td className="p-3.5">
                        {staffUser ? (
                          <div>
                            <div className="font-semibold text-[#29252A] flex items-center gap-1">
                              <span>{staffUser.name}</span>
                            </div>
                            <div className="text-[10px] text-[#9E98A2]">{staffUser.email || staffUser.phone || 'Field Staff'}</div>
                          </div>
                        ) : (
                          <button
                            onClick={() => openAssignModal(r)}
                            className="text-[11px] font-bold text-[#C65F63] hover:underline flex items-center gap-1"
                          >
                            <HiOutlineUserAdd className="text-sm" />
                            <span>Assign Staff</span>
                          </button>
                        )}
                      </td>

                      {/* SLA / Due Information */}
                      <td className="p-3.5 whitespace-nowrap">
                        {r.slaDeadline ? (
                          <div className="space-y-0.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1 w-fit ${
                                isOverdue
                                  ? 'bg-[#FDECEF] text-[#B85450] border-[#B85450]/30'
                                  : 'bg-emerald-50 text-[#5C9A72] border-emerald-200'
                              }`}
                            >
                              <HiOutlineClock className="text-xs" />
                              <span>{isOverdue ? 'Overdue' : 'On Track'}</span>
                            </span>
                            <div className="text-[10px] text-[#9E98A2]">
                              {new Date(r.slaDeadline).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#9E98A2]">—</span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="p-3.5 text-[#6B666E] text-[11px] whitespace-nowrap">
                        <div>{new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div className="text-[10px] text-[#9E98A2]">
                          {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {/* Assign / Reassign */}
                        <button
                          onClick={() => openAssignModal(r)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#C65F63] hover:bg-[#B35256] text-white text-[11px] font-bold shadow-xs transition"
                          title="Assign or reassign field staff"
                        >
                          {staffUser ? 'Reassign' : 'Assign'}
                        </button>

                        {/* Transfer Municipality */}
                        <button
                          onClick={() => openTransferModal(r)}
                          title="Transfer Municipal Jurisdiction"
                          className="px-2 py-1.5 rounded-lg bg-[#FAF5F0] hover:bg-white text-[#6B4E71] border border-[#EFE7E0] text-[11px] font-bold transition shadow-xs"
                        >
                          <HiOutlineSwitchHorizontal className="inline" />
                        </button>

                        {/* Evidence Viewer */}
                        {r.images && r.images.length > 0 && (
                          <button
                            onClick={() => setEvidenceModalReq(r)}
                            title="View Incident Evidence Photos"
                            className="px-2 py-1.5 rounded-lg bg-[#FAF5F0] hover:bg-white text-[#29252A] border border-[#EFE7E0] text-[11px] font-bold transition shadow-xs"
                          >
                            <HiOutlinePhotograph className="inline" />
                          </button>
                        )}

                        {/* Status History */}
                        <button
                          onClick={() => openHistoryModal(r)}
                          title="View Status History & Audit Trail"
                          className="px-2 py-1.5 rounded-lg bg-[#FAF5F0] hover:bg-white text-[#6B4E71] border border-[#EFE7E0] text-[11px] font-bold transition shadow-xs"
                        >
                          <HiOutlineInformationCircle className="inline" />
                        </button>

                        {/* View Full Details Page */}
                        <Link
                          to={`/requests/${r._id}`}
                          className="px-2.5 py-1.5 rounded-lg bg-[#FAF5F0] hover:bg-white text-[#29252A] border border-[#EFE7E0] text-[11px] font-bold transition inline-flex items-center gap-1 shadow-xs"
                        >
                          <span>View</span>
                          <HiOutlineExternalLink className="text-xs" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#EFE7E0] text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#6B666E]">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-lg px-2 py-1 text-xs text-[#29252A] focus:outline-none"
            >
              <option value="10">10 per page</option>
              <option value="15">15 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
            </select>
            <span className="text-[#9E98A2] ml-2">
              Page {currentPage} of {totalPages || 1}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="px-3 py-1.5 rounded-lg bg-[#FAF5F0] hover:bg-white text-[#29252A] border border-[#EFE7E0] font-bold disabled:opacity-40 transition flex items-center gap-1"
            >
              <HiOutlineChevronLeft />
              <span>Previous</span>
            </button>

            <span className="px-3 py-1.5 rounded-lg bg-[#C65F63] text-white font-bold">
              {currentPage}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))}
              disabled={currentPage >= (totalPages || 1) || loading}
              className="px-3 py-1.5 rounded-lg bg-[#FAF5F0] hover:bg-white text-[#29252A] border border-[#EFE7E0] font-bold disabled:opacity-40 transition flex items-center gap-1"
            >
              <span>Next</span>
              <HiOutlineChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* Assign Staff Modal with STRICT Municipality Matching */}
      {assignModalReq && (
        <div className="fixed inset-0 bg-[#29252A]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form
            onSubmit={handleAssignSubmit}
            className="max-w-md w-full bg-white border border-[#EFE7E0] rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">👷</span>
                <h3 className="text-base font-bold text-[#29252A]">Assign Staff Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalReq(null)}
                className="text-[#9E98A2] hover:text-[#29252A]"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-[#FAF5F0] rounded-2xl border border-[#EFE7E0] space-y-1 text-xs">
              <div>Task ID: <span className="font-mono font-bold text-[#C65F63]">{assignModalReq.requestId}</span></div>
              <div className="font-bold text-[#29252A]">{assignModalReq.title}</div>
              <div className="text-[#6B666E]">📍 {assignModalReq.address}</div>
              <div className="text-[11px] font-bold text-[#6B4E71] pt-1">
                Authority: {assignModalReq.municipalitySnapshot?.name || assignModalReq.municipality?.name || 'Assigned Municipality'}
              </div>
            </div>

            {/* Department Selection */}
            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">Target Department:</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
              >
                <option value="">-- Auto-detect Department --</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Field Staff Selection - STRICTLY RESPECTS ISSUE LOCATION / MUNICIPALITY */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#29252A]">Field Staff Member * :</label>
                <span className="text-[10px] text-[#5C9A72] font-bold">Jurisdiction Filter Active</span>
              </div>

              {(() => {
                const reqMuniId = assignModalReq?.municipality?._id?.toString() || assignModalReq?.municipality?.toString();
                
                const matchingStaff = staffList.filter((s) => {
                  if (s.isActive === false) return false;
                  if (!reqMuniId) return true;
                  const staffMuniId = s.municipality?._id?.toString() || s.municipality?.toString();
                  return staffMuniId === reqMuniId;
                });

                if (matchingStaff.length === 0) {
                  return (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                        ⚠️ No matching staff available for this municipality ({assignModalReq?.municipalitySnapshot?.name || assignModalReq?.municipality?.name || 'Local Jurisdiction'}).
                      </div>
                      <select
                        disabled
                        className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#9E98A2]"
                      >
                        <option>No matching staff available for this municipality.</option>
                      </select>
                    </div>
                  );
                }

                return (
                  <select
                    required
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
                  >
                    <option value="">-- Choose Matching Field Staff --</option>
                    {matchingStaff.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.department?.name || 'Staff'}) {s.ward ? `• Ward: ${s.ward}` : ''}
                      </option>
                    ))}
                  </select>
                );
              })()}
            </div>

            {/* Priority Level */}
            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">Target Priority Level:</label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
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
                className="flex-1 py-2.5 rounded-xl border border-[#EFE7E0] text-[#6B666E] text-xs font-bold hover:bg-[#FAF5F0]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assigning}
                className="flex-1 py-2.5 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold shadow-md shadow-[#C65F63]/25 transition disabled:opacity-50"
              >
                {assigning ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transfer Jurisdiction Modal */}
      {transferModalReq && (
        <div className="fixed inset-0 bg-[#29252A]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form
            onSubmit={handleTransferSubmit}
            className="max-w-md w-full bg-white border border-[#EFE7E0] rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏛️</span>
                <h3 className="text-base font-bold text-[#29252A]">Transfer Municipal Jurisdiction</h3>
              </div>
              <button
                type="button"
                onClick={() => setTransferModalReq(null)}
                className="text-[#9E98A2] hover:text-[#29252A]"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-[#FAF5F0] rounded-2xl border border-[#EFE7E0] space-y-1 text-xs">
              <div>Task: <span className="font-mono font-bold text-[#C65F63]">{transferModalReq.requestId}</span></div>
              <div className="text-[#29252A] font-bold">{transferModalReq.title}</div>
              <div className="text-[#6B666E]">📍 {transferModalReq.address}</div>
              <div className="text-[#6B4E71] text-[11px] pt-1 font-bold">
                Current Authority: {transferModalReq.municipalitySnapshot?.name || transferModalReq.municipality?.name || 'Local Jurisdiction'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">
                Destination Municipal Authority * :
              </label>
              <select
                value={selectedToMuni}
                onChange={(e) => setSelectedToMuni(e.target.value)}
                required
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
              >
                <option value="">-- Choose Destination Authority --</option>
                {municipalities
                  .filter(m => m._id !== (transferModalReq.municipality?._id || transferModalReq.municipality))
                  .map(m => (
                    <option key={m._id} value={m._id}>
                      {m.name} ({m.city}, {m.district})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">
                Reason for Jurisdiction Transfer (Optional):
              </label>
              <textarea
                rows={2}
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="e.g. Incident physically located within neighbouring municipal ward boundary..."
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTransferModalReq(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#EFE7E0] text-[#6B666E] text-xs font-bold hover:bg-[#FAF5F0]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={transferring}
                className="flex-1 py-2.5 rounded-xl bg-[#6B4E71] hover:bg-[#583f5e] text-white text-xs font-bold shadow-md shadow-[#6B4E71]/25 transition disabled:opacity-50"
              >
                {transferring ? 'Transferring...' : 'Confirm Transfer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Evidence Photos Viewer Modal */}
      {evidenceModalReq && (
        <div className="fixed inset-0 bg-[#29252A]/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="max-w-2xl w-full bg-white border border-[#EFE7E0] rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
              <div className="flex items-center gap-2">
                <HiOutlinePhotograph className="text-xl text-[#C65F63]" />
                <h3 className="text-base font-bold text-[#29252A]">
                  Evidence Photos: <span className="font-mono text-[#C65F63]">{evidenceModalReq.requestId}</span>
                </h3>
              </div>
              <button
                onClick={() => setEvidenceModalReq(null)}
                className="text-[#9E98A2] hover:text-[#29252A]"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-[#6B666E]">
              {evidenceModalReq.title} · {evidenceModalReq.address}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
              {evidenceModalReq.images && evidenceModalReq.images.length > 0 ? (
                evidenceModalReq.images.map((img, idx) => (
                  <div key={idx} className="rounded-2xl overflow-hidden border border-[#EFE7E0] bg-[#FAF5F0] relative group">
                    <img
                      src={img.startsWith('http') ? img : `http://localhost:5000${img}`}
                      alt={`Evidence ${idx + 1}`}
                      className="w-full h-48 object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="p-2 text-center text-[11px] font-bold text-[#6B4E71] bg-white border-t border-[#EFE7E0]">
                      Photo Attachment #{idx + 1}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-8 text-center text-xs text-[#9E98A2]">
                  No photo attachments uploaded for this request.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setEvidenceModalReq(null)}
                className="px-4 py-2 rounded-xl bg-[#FAF5F0] hover:bg-white text-[#29252A] border border-[#EFE7E0] text-xs font-bold"
              >
                Close Gallery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Status History & Audit Trail Modal */}
      {historyModalReq && (
        <div className="fixed inset-0 bg-[#29252A]/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="max-w-lg w-full bg-white border border-[#EFE7E0] rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
              <div className="flex items-center gap-2">
                <HiOutlineInformationCircle className="text-xl text-[#6B4E71]" />
                <h3 className="text-base font-bold text-[#29252A]">
                  Request Audit & History: <span className="font-mono text-[#C65F63]">{historyModalReq.requestId}</span>
                </h3>
              </div>
              <button
                onClick={() => setHistoryModalReq(null)}
                className="text-[#9E98A2] hover:text-[#29252A]"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-[#FAF5F0] rounded-2xl border border-[#EFE7E0] text-xs space-y-1">
              <div className="font-bold text-[#29252A]">{historyModalReq.title}</div>
              <div className="text-[#6B666E]">Citizen: {historyModalReq.citizen?.name} · Priority: {historyModalReq.priority}</div>
              <div className="text-[11px] font-bold text-[#5C9A72]">Current Status: {historyModalReq.status}</div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-3 p-1">
              {historyLoading ? (
                <div className="py-8 text-center text-xs text-[#9E98A2]">
                  Loading timeline history...
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#9E98A2]">
                  Initial creation recorded on {new Date(historyModalReq.createdAt).toLocaleString()}.
                </div>
              ) : (
                historyList.map((h, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#FAF5F0]/70 border border-[#EFE7E0] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#6B4E71] uppercase text-[10px]">
                        {h.action || h.newStatus || 'Status Event'}
                      </span>
                      <span className="text-[10px] text-[#9E98A2]">
                        {new Date(h.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {h.notes && <div className="text-[#29252A]">{h.notes}</div>}
                    {h.user?.name && <div className="text-[10px] text-[#9E98A2]">By: {h.user.name} ({h.user.role || 'ADMIN'})</div>}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link
                to={`/requests/${historyModalReq._id}`}
                className="text-xs font-bold text-[#C65F63] hover:underline flex items-center gap-1"
              >
                <span>Open Full Request Page</span>
                <HiOutlineExternalLink />
              </Link>
              <button
                onClick={() => setHistoryModalReq(null)}
                className="px-4 py-2 rounded-xl bg-[#FAF5F0] hover:bg-white text-[#29252A] border border-[#EFE7E0] text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminRequestsPage;
