import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { toast } from 'react-toastify';
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamationCircle,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlinePlay,
  HiOutlineUser,
  HiOutlineLocationMarker,
  HiOutlineRefresh,
  HiStar,
  HiOutlineStar
} from 'react-icons/hi';

const categories = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'WATER', label: 'Water Supply & Leakages' },
  { value: 'ELECTRICITY', label: 'Electricity & Power' },
  { value: 'ROAD', label: 'Road Damage & Potholes' },
  { value: 'STREET_LIGHT', label: 'Street Lighting' },
  { value: 'GARBAGE', label: 'Garbage & Sanitation' },
  { value: 'DRAINAGE', label: 'Drainage & Sewage' },
  { value: 'PUBLIC_AREA', label: 'Public Areas' },
  { value: 'OTHER', label: 'Other Civic Issues' }
];

const StaffDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [stats, setStats] = useState({
    totalAssigned: 0,
    pendingAcceptance: 0,
    inProgress: 0,
    resolved: 0,
    highPriority: 0
  });
  const [requests, setRequests] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('recently_updated');

  // Quick Action Modals
  const [startModalReq, setStartModalReq] = useState(null);
  const [beforeFile, setBeforeFile] = useState(null);
  const [starting, setStarting] = useState(false);

  const [resolveModalReq, setResolveModalReq] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchStaffRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/staff/requests', {
        params: {
          status: selectedStatus,
          priority: selectedPriority,
          category: selectedCategory,
          search: searchQuery,
          sortBy
        }
      });
      if (res.data.success) {
        setStats(res.data.stats || {
          totalAssigned: 0,
          pendingAcceptance: 0,
          inProgress: 0,
          resolved: 0,
          highPriority: 0
        });
        setRequests(res.data.requests || []);
      }
    } catch (err) {
      console.error('Fetch assigned requests failed:', err);
      setError(err.response?.data?.message || 'Unable to load assigned requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      setFeedbacksLoading(true);
      const res = await API.get('/feedback/staff/my');
      if (res.data.success) {
        setFeedbacks(res.data.feedbacks || []);
      }
    } catch (err) {
      console.error('Error fetching staff feedback:', err);
    } finally {
      setFeedbacksLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffRequests();
    fetchFeedbacks();
  }, [selectedStatus, selectedPriority, selectedCategory, sortBy]);

  // Real-time socket event listeners for staff dashboard
  useEffect(() => {
    if (!socket) return;

    const handleFeedback = (data) => {
      if (data?.feedback) {
        setFeedbacks((prev) => [data.feedback, ...prev]);
        toast.info(`Citizen submitted a ${data.feedback.rating}-star review for [${data.requestId || 'Request'}]!`);
      }
    };
    socket.on('feedback:submitted', handleFeedback);
    return () => socket.off('feedback:submitted', handleFeedback);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleStatusChanged = (payload) => {
      // Check if this request affects this staff member's view
      setRequests((prev) => {
        let isPresent = false;
        const updated = prev.map((item) => {
          const match =
            item.requestId === payload.requestId ||
            item._id?.toString() === payload.requestMongoId?.toString();
          if (!match) return item;
          isPresent = true;
          return {
            ...item,
            status: payload.status,
            resolutionNotes: payload.request?.resolutionNotes !== undefined
              ? payload.request.resolutionNotes
              : (payload.note || item.resolutionNotes),
            afterImage: payload.request?.afterImage || item.afterImage,
            resolutionProof: payload.resolutionProof || payload.request?.resolutionProof || item.resolutionProof,
            updatedAt: payload.changedAt || new Date().toISOString()
          };
        });

        if (isPresent) {
          // Update counters dynamically
          setStats((prevStats) => {
            let { totalAssigned, pendingAcceptance, inProgress, resolved, highPriority } = prevStats;
            const prevSt = payload.previousStatus;
            const newSt = payload.status;

            if (prevSt === 'ASSIGNED') pendingAcceptance = Math.max(0, pendingAcceptance - 1);
            if (prevSt === 'IN_PROGRESS' || prevSt === 'ACCEPTED') inProgress = Math.max(0, inProgress - 1);
            if (prevSt === 'RESOLVED' || prevSt === 'CITIZEN_VERIFIED' || prevSt === 'RESOLUTION_SUBMITTED') resolved = Math.max(0, resolved - 1);

            if (newSt === 'ASSIGNED') pendingAcceptance += 1;
            if (newSt === 'IN_PROGRESS' || newSt === 'ACCEPTED') inProgress += 1;
            if (newSt === 'RESOLVED' || newSt === 'CITIZEN_VERIFIED' || newSt === 'RESOLUTION_SUBMITTED') resolved += 1;
            if (newSt === 'PENDING') totalAssigned = Math.max(0, totalAssigned - 1);

            return { totalAssigned, pendingAcceptance, inProgress, resolved, highPriority };
          });

          // Filter out if selectedStatus is active and doesn't match
          if (selectedStatus && selectedStatus !== 'ALL') {
            return updated.filter((r) => r.status === selectedStatus);
          }
          return updated;
        }

        return prev;
      });
    };

    const handleUpdated = (payload) => {
      setRequests((prev) =>
        prev.map((item) => {
          const match =
            item.requestId === payload.requestId ||
            item._id?.toString() === payload.requestMongoId?.toString();
          if (!match) return item;
          return {
            ...item,
            ...(payload.changes || {}),
            ...(payload.request || {}),
            updatedAt: payload.updatedAt || new Date().toISOString()
          };
        })
      );
    };

    const handleAssigned = (payload) => {
      // Check if assigned to current staff
      const staffId = user?._id?.toString();
      const assignedToId = payload.assignedTo?._id?.toString() || payload.staffId?.toString();

      if (staffId && assignedToId === staffId) {
        if (payload.request) {
          setRequests((prev) => {
            const exists = prev.some(
              (r) => r.requestId === payload.requestId || r._id === payload.request._id
            );
            if (!exists) {
              return [payload.request, ...prev];
            }
            return prev;
          });
        }
        setStats((prev) => ({
          ...prev,
          totalAssigned: prev.totalAssigned + 1,
          pendingAcceptance: prev.pendingAcceptance + 1,
          highPriority:
            payload.request?.priority === 'HIGH' || payload.request?.priority === 'CRITICAL'
              ? prev.highPriority + 1
              : prev.highPriority
        }));
      }
    };

    socket.on('request:statusChanged', handleStatusChanged);
    socket.on('request:updated', handleUpdated);
    socket.on('request:assigned', handleAssigned);

    return () => {
      socket.off('request:statusChanged', handleStatusChanged);
      socket.off('request:updated', handleUpdated);
      socket.off('request:assigned', handleAssigned);
    };
  }, [socket, user, selectedStatus]);

  // Debounced search trigger
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStaffRequests();
  };

  const handleAccept = async (reqId) => {
    try {
      const res = await API.post(`/staff/requests/${reqId}/accept`);
      if (res.data.success) {
        toast.success('Task accepted and moved to in-progress.');
        fetchStaffRequests();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Accept failed');
    }
  };

  const handleReject = async (reqId) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason || !reason.trim()) return;
    try {
      const res = await API.post(`/staff/requests/${reqId}/reject`, { reason: reason.trim() });
      if (res.data.success) {
        toast.info('Assignment rejected.');
        fetchStaffRequests();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reject failed');
    }
  };

  const handleStartWorkSubmit = async (e) => {
    e.preventDefault();
    if (!startModalReq) return;
    setStarting(true);
    try {
      const formData = new FormData();
      if (beforeFile) formData.append('beforeImage', beforeFile);

      const res = await API.post(`/staff/requests/${startModalReq._id}/start`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        toast.success('Work commenced! Initial inspection recorded.');
        setStartModalReq(null);
        setBeforeFile(null);
        fetchStaffRequests();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Start work failed');
    } finally {
      setStarting(false);
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolveModalReq) return;
    if (!resolutionNotes.trim() || resolutionNotes.trim().length < 5) {
      toast.error('Please enter meaningful resolution notes (minimum 5 characters).');
      return;
    }
    setResolving(true);
    try {
      const formData = new FormData();
      if (afterFile) formData.append('afterImage', afterFile);
      formData.append('resolutionNotes', resolutionNotes.trim());

      const res = await API.patch(`/staff/requests/${resolveModalReq._id}/resolve`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        toast.success('Resolution submitted successfully! Awaiting citizen verification.');
        setResolveModalReq(null);
        setAfterFile(null);
        setResolutionNotes('');
        fetchStaffRequests();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Resolution failed');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>Field Operations Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome back, {user?.name || 'Staff Officer'}
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
            Here are the civic service requests currently assigned to you. Inspect locations, start repairs, and submit proof of completed work.
          </p>
        </div>

        <button
          onClick={fetchStaffRequests}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition shadow-sm"
        >
          <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
          <span>Refresh Workload</span>
        </button>
      </div>

      {/* Real Statistics KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            Total Assigned
          </span>
          <div className="text-2xl font-black text-white">{stats.totalAssigned}</div>
          <div className="text-[10px] text-slate-500">Your total backlog</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-sm">
          <span className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider">
            Pending Accept
          </span>
          <div className="text-2xl font-black text-amber-400">{stats.pendingAcceptance}</div>
          <div className="text-[10px] text-slate-500">Awaiting acknowledgement</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-sm">
          <span className="text-[11px] text-teal-400 font-semibold uppercase tracking-wider">
            In Progress
          </span>
          <div className="text-2xl font-black text-teal-400">{stats.inProgress}</div>
          <div className="text-[10px] text-slate-500">Repairs active on site</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-sm">
          <span className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">
            Resolved
          </span>
          <div className="text-2xl font-black text-emerald-400">{stats.resolved}</div>
          <div className="text-[10px] text-slate-500">Repaired & completed</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-sm">
          <span className="text-[11px] text-rose-400 font-semibold uppercase tracking-wider">
            High Priority
          </span>
          <div className="text-2xl font-black text-rose-400">{stats.highPriority}</div>
          <div className="text-[10px] text-slate-500">High / Critical urgency</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <HiOutlineSearch className="absolute left-3.5 top-3 text-slate-400 text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Request ID, title, or address..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
            />
          </form>

          {/* Status Filter */}
          <div className="w-full sm:w-auto flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Sorting */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="recently_updated">Recently Updated</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">Highest Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HiOutlineExclamationCircle className="text-base shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchStaffRequests}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Assigned Requests List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight">
            Assigned Service Requests ({requests.length})
          </h2>
          <span className="text-xs text-slate-400">
            Sorted by: {sortBy.replace(/_/g, ' ')}
          </span>
        </div>

        {loading ? (
          /* Skeleton Loader */
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="w-28 h-4 bg-slate-800 rounded" />
                  <div className="w-20 h-5 bg-slate-800 rounded-full" />
                </div>
                <div className="w-3/4 h-5 bg-slate-800 rounded" />
                <div className="w-1/2 h-3 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          /* Empty State */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3 shadow-inner">
            <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center text-xl mx-auto">
              ✓
            </div>
            <h3 className="text-base font-bold text-white">No requests assigned to you yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              New assignments made to your account will appear here automatically.
            </p>
          </div>
        ) : (
          /* Requests Cards */
          <div className="grid grid-cols-1 gap-4">
            {requests.map((r) => (
              <div
                key={r._id}
                className="bg-slate-900 hover:bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg transition-all"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-blue-400 text-xs">
                        {r.requestId}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.priority === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : r.priority === 'HIGH'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {r.priority} Priority
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {r.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-100 text-base mt-1.5">
                      {r.title}
                    </h3>
                  </div>

                  <div className="self-start sm:self-auto flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                        r.status === 'RESOLVED' || r.status === 'CITIZEN_VERIFIED'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : r.status === 'IN_PROGRESS'
                          ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                          : r.status === 'ACCEPTED'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                      }`}
                    >
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <HiOutlineUser className="text-blue-400" />
                      <span>Reporting Citizen:</span>
                      <span className="text-slate-200 font-semibold">{r.citizen?.name || 'Citizen'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <HiOutlineLocationMarker className="text-teal-400" />
                      <span className="text-slate-300 font-mono line-clamp-1">{r.address}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] text-slate-500 font-semibold uppercase">Description:</div>
                    <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed">
                      {r.description}
                    </p>
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <Link
                    to={`/staff/requests/${r._id}`}
                    className="text-xs text-teal-400 hover:text-teal-300 font-bold transition flex items-center gap-1"
                  >
                    <span>Inspect Details & Map</span>
                    <span>→</span>
                  </Link>

                  <div className="flex items-center gap-2">
                    {r.status === 'ASSIGNED' && (
                      <>
                        <button
                          onClick={() => handleAccept(r._id)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleReject(r._id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs border border-rose-500/20"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {r.status === 'ACCEPTED' && (
                      <button
                        onClick={() => setStartModalReq(r)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/20 flex items-center gap-1"
                      >
                        <HiOutlinePlay />
                        <span>Start Work</span>
                      </button>
                    )}

                    {r.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => setResolveModalReq(r)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-1"
                      >
                        <HiOutlineCheckCircle />
                        <span>Mark Resolved</span>
                      </button>
                    )}

                    {(r.status === 'RESOLVED' || r.status === 'CITIZEN_VERIFIED') && (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <HiOutlineCheckCircle />
                        <span>Resolved</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Citizen Feedback Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <HiStar className="text-amber-400 text-lg" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Recent Citizen Feedback ({feedbacks.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">Reviews for your completed repairs</span>
        </div>

        {feedbacksLoading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading citizen reviews...</div>
        ) : feedbacks.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 font-medium">
            No citizen feedback available yet. Once citizens verify your completed repairs, their ratings will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feedbacks.map((f) => (
              <div key={f._id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {f.request?.requestId || 'LF-REQ'}
                  </span>
                  <div className="flex items-center gap-1 text-amber-400 text-xs">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <HiStar key={s} className={s <= f.rating ? 'text-amber-400' : 'text-slate-700'} />
                    ))}
                    <span className="ml-1 text-slate-300 font-bold">{f.rating}/5</span>
                  </div>
                </div>

                {f.comment && (
                  <p className="text-xs text-slate-300 italic">
                    "{f.comment}"
                  </p>
                )}

                {f.suggestion && (
                  <div className="text-[11px] text-teal-300 bg-teal-950/40 border border-teal-900/60 p-2 rounded-lg">
                    <span className="font-semibold text-teal-400">Suggestion:</span> {f.suggestion}
                  </div>
                )}

                <div className="text-[10px] text-slate-500 pt-1">
                  Verified on: {new Date(f.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Start Work Modal */}
      {startModalReq && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleStartWorkSubmit}
            className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white">Start Work on {startModalReq.requestId}?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              This will transition the issue status to IN PROGRESS. You may optionally attach an arrival photo.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Before-Work Site Photo (Optional):
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setBeforeFile(e.target.files[0])}
                className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStartModalReq(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={starting}
                className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold"
              >
                {starting ? 'Starting...' : 'Confirm Start'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModalReq && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleResolveSubmit}
            className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white">Submit Resolution for {resolveModalReq.requestId}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Describe the completed work and upload after-work repair photos for citizen verification.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Resolution Notes (Required) * :
              </label>
              <textarea
                rows={3}
                required
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe actions taken, repaired parts, and tested results..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                After-Work Proof Image (Recommended) :
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setAfterFile(e.target.files[0])}
                className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResolveModalReq(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resolving || !resolutionNotes.trim()}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                {resolving ? 'Submitting...' : 'Submit Resolution'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
