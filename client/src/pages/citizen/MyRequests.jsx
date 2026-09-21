import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import RequestCard from '../../components/requests/RequestCard';
import {
  HiOutlinePlusCircle,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineRefresh,
  HiOutlineClipboardList,
  HiOutlineSortAscending
} from 'react-icons/hi';

const CATEGORY_OPTIONS = ['ALL', 'WATER', 'ELECTRICITY', 'ROAD', 'STREET_LIGHT', 'GARBAGE', 'DRAINAGE', 'PUBLIC_AREA', 'OTHER'];
const PRIORITY_OPTIONS = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUS_OPTIONS = ['ALL', 'PENDING', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CITIZEN_VERIFIED', 'REJECTED'];

const MyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');

  const fetchMyRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get('/requests/my');
      if (res.data.success) {
        setRequests(res.data.requests || []);
      }
    } catch (err) {
      console.error('Fetch My Requests Error:', err);
      setError('Unable to load your service requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  // Filter and Sort Logic
  const filteredRequests = useMemo(() => {
    let result = [...requests];

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title?.toLowerCase().includes(query) ||
          r.requestId?.toLowerCase().includes(query) ||
          r.address?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'ALL') {
      result = result.filter((r) => (r.category || '').toUpperCase() === selectedCategory);
    }

    // Priority filter
    if (selectedPriority !== 'ALL') {
      result = result.filter((r) => (r.priority || '').toUpperCase() === selectedPriority);
    }

    // Status filter
    if (selectedStatus !== 'ALL') {
      result = result.filter((r) => (r.status || '').toUpperCase() === selectedStatus);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'NEWEST') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (sortBy === 'OLDEST') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      if (sortBy === 'RECENTLY_UPDATED') {
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      }
      return 0;
    });

    return result;
  }, [requests, search, selectedCategory, selectedPriority, selectedStatus, sortBy]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Service Requests</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track real-time progress, status updates, and field resolution history for all your reported civic issues.
          </p>
        </div>

        <Link
          to="/requests/create"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition shrink-0"
        >
          <HiOutlinePlusCircle className="text-lg" />
          <span>Report New Problem</span>
        </Link>
      </div>

      {/* Search, Filter & Sort Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <HiOutlineSearch className="absolute left-3.5 top-3 text-slate-400 text-base" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or Request ID (e.g. LF-2026)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Categories</option>
              {CATEGORY_OPTIONS.filter((c) => c !== 'ALL').map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              {STATUS_OPTIONS.filter((s) => s !== 'ALL').map((st) => (
                <option key={st} value={st}>
                  {st.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
              <option value="RECENTLY_UPDATED">Recently Updated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Request Grid / States */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-1/3" />
              <div className="h-6 bg-slate-800 rounded w-3/4" />
              <div className="h-10 bg-slate-800/60 rounded w-full" />
              <div className="h-4 bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="py-12 text-center text-xs text-rose-400 bg-rose-500/10 rounded-2xl border border-rose-500/20 space-y-4 max-w-md mx-auto">
          <p>{error}</p>
          <button
            onClick={fetchMyRequests}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold inline-flex items-center gap-2"
          >
            <HiOutlineRefresh />
            <span>Retry</span>
          </button>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="py-16 text-center space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-950 text-slate-500 flex items-center justify-center text-3xl mx-auto border border-slate-800">
            <HiOutlineClipboardList />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No service requests found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {requests.length === 0
                ? "You haven't submitted any local service requests yet. Report an issue to start tracking."
                : 'No requests matched your current search/filter criteria. Try clearing filters.'}
            </p>
          </div>

          {requests.length === 0 ? (
            <Link
              to="/requests/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition"
            >
              <HiOutlinePlusCircle className="text-base" />
              <span>Create Service Request</span>
            </Link>
          ) : (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('ALL');
                setSelectedPriority('ALL');
                setSelectedStatus('ALL');
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map((req) => (
            <RequestCard key={req._id} request={req} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyRequests;

