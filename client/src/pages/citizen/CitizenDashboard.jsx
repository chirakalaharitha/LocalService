import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlinePlusCircle,
  HiOutlineClipboardList,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamationCircle,
  HiOutlineUser,
  HiOutlineLocationMarker,
  HiOutlineRefresh,
  HiOutlineStar
} from 'react-icons/hi';

const CitizenDashboard = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get('/requests?limit=10');
      if (res.data.success) {
        setRequests(res.data.requests);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Unable to load your service requests. Please check connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const total = requests.length;
  const pending = requests.filter(r => r.status === 'PENDING' || r.status === 'UNDER_REVIEW').length;
  const inProgress = requests.filter(r => ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(r.status)).length;
  const awaitingVerification = requests.filter(r => r.status === 'RESOLVED' || r.status === 'RESOLUTION_SUBMITTED').length;
  const resolved = requests.filter(r => r.status === 'CITIZEN_VERIFIED').length;

  return (
    <div className="space-y-8">
      
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, <span className="text-blue-400">{user?.fullName || user?.name || 'Citizen'}</span> 👋
          </h1>
          <p className="text-xs text-slate-400">Track your local service requests and stay updated on field resolution progress</p>
        </div>

        <Link
          to="/requests/create"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition"
        >
          <HiOutlinePlusCircle className="text-lg" />
          <span>Report New Problem</span>
        </Link>
      </div>

      {/* Verification Required Section */}
      {requests.filter(r => ['RESOLVED', 'RESOLUTION_SUBMITTED', 'PENDING_VERIFICATION'].includes(r.status)).length > 0 && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-base">
              <HiOutlineCheckCircle className="text-2xl" />
              <span>Verification Required ({requests.filter(r => ['RESOLVED', 'RESOLUTION_SUBMITTED', 'PENDING_VERIFICATION'].includes(r.status)).length})</span>
            </div>
            <span className="text-[11px] text-slate-400">Action Needed: Inspect resolution proof & verify completion</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests
              .filter(r => ['RESOLVED', 'RESOLUTION_SUBMITTED', 'PENDING_VERIFICATION'].includes(r.status))
              .map(r => (
                <div key={r._id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-400">{r.requestId}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Pending Verification
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-100">{r.title}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>{r.category}</span>
                      <span>•</span>
                      <span>Resolved: {r.resolvedAt ? new Date(r.resolvedAt).toLocaleDateString() : 'Recently'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                    <Link
                      to={`/requests/${r._id}`}
                      className="flex-1 text-center py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition"
                    >
                      Verify Resolution →
                    </Link>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Feedback Pending Section */}
      {requests.filter(r => (r.status === 'CITIZEN_VERIFIED' || r.status === 'CLOSED') && !r.citizenVerification?.rating).length > 0 && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-amber-400 font-bold text-base">
              <HiOutlineStar className="text-2xl" />
              <span>Feedback Pending ({requests.filter(r => (r.status === 'CITIZEN_VERIFIED' || r.status === 'CLOSED') && !r.citizenVerification?.rating).length})</span>
            </div>
            <span className="text-[11px] text-slate-400">Share your 1-5 star service rating for resolved tickets</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests
              .filter(r => (r.status === 'CITIZEN_VERIFIED' || r.status === 'CLOSED') && !r.citizenVerification?.rating)
              .map(r => (
                <div key={r._id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-400">{r.requestId}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Closed / Verified
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-100">{r.title}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>{r.category}</span>
                      <span>•</span>
                      <span>Verified: {r.verifiedAt ? new Date(r.verifiedAt).toLocaleDateString() : 'Completed'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                    <Link
                      to={`/requests/${r._id}`}
                      className="flex-1 text-center py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/20 transition"
                    >
                      Rate This Service ⭐
                    </Link>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Submitted</span>
            <HiOutlineClipboardList className="text-blue-400 text-lg" />
          </div>
          <div className="text-3xl font-black text-white">{total}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Pending</span>
            <HiOutlineClock className="text-amber-400 text-lg" />
          </div>
          <div className="text-3xl font-black text-amber-400">{pending}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>In Progress</span>
            <HiOutlineExclamationCircle className="text-teal-400 text-lg" />
          </div>
          <div className="text-3xl font-black text-teal-400">{inProgress}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Awaiting Verify</span>
            <HiOutlineStar className="text-indigo-400 text-lg" />
          </div>
          <div className="text-3xl font-black text-indigo-400">{awaitingVerification}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Verified Fixed</span>
            <HiOutlineCheckCircle className="text-emerald-400 text-lg" />
          </div>
          <div className="text-3xl font-black text-emerald-400">{resolved}</div>
        </div>
      </div>

      {/* Main Content Grid: My Recent Requests + Profile Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Requests Table (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">My Submitted Complaints</h2>
            <Link to="/requests" className="text-xs text-blue-400 font-semibold hover:underline">
              View All History →
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div>Loading requests from database...</div>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-xs text-rose-400 bg-rose-500/10 rounded-xl border border-rose-500/20 space-y-3">
              <p>{error}</p>
              <button
                onClick={fetchRequests}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold inline-flex items-center gap-1"
              >
                <HiOutlineRefresh />
                <span>Retry</span>
              </button>
            </div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-3 bg-slate-950 rounded-xl border border-slate-800 p-6">
              <p className="text-slate-400">You haven't submitted any civic service requests yet.</p>
              <Link
                to="/requests/create"
                className="inline-block px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs"
              >
                Report Your First Issue
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="p-3 rounded-l-xl">ID</th>
                    <th className="p-3">Title & Category</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 rounded-r-xl text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {requests.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-blue-400">{r.requestId}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-100">{r.title}</div>
                        <div className="text-[10px] text-slate-500">{r.category} • {r.address}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                          r.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400' :
                          r.priority === 'MEDIUM' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {r.priority}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          r.status === 'CITIZEN_VERIFIED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          r.status === 'RESOLVED' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 animate-pulse' :
                          r.status === 'IN_PROGRESS' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {r.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          to={`/requests/${r._id}`}
                          className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-semibold transition"
                        >
                          Track →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Profile Summary Card (1 col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <HiOutlineUser className="text-teal-400" />
            <span>Citizen Profile</span>
          </h2>

          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold text-sm uppercase">
                {user?.name ? user.name.substring(0, 2) : 'US'}
              </div>
              <div>
                <div className="font-bold text-slate-100 text-sm">{user?.fullName || user?.name}</div>
                <div className="text-[10px] text-teal-400 font-semibold uppercase">{user?.role} ACCOUNT</div>
              </div>
            </div>

            <div className="space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Email:</span>
                <span className="font-semibold text-slate-200">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Phone:</span>
                <span className="font-mono text-slate-200">{user?.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">City:</span>
                <span className="text-slate-200">{user?.city || 'Metro City'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Account Status:</span>
                <span className="text-emerald-400 font-bold uppercase text-[10px]">Active</span>
              </div>
            </div>

            <Link
              to="/profile"
              className="block text-center py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-400 font-semibold border border-slate-800 transition mt-2"
            >
              Edit Profile Info
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
};

export default CitizenDashboard;
