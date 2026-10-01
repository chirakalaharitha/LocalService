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
  HiOutlineArrowRight,
  HiOutlineLocationMarker,
  HiOutlineSparkles
} from 'react-icons/hi';

const QUICK_SERVICES = [
  { id: 'road', category: 'ROAD', title: 'Road & Pothole', icon: '🛣️', color: 'bg-orange-50 text-orange-600' },
  { id: 'water', category: 'WATER', title: 'Water Supply', icon: '💧', color: 'bg-blue-50 text-blue-600' },
  { id: 'streetlight', category: 'STREET_LIGHT', title: 'Streetlight', icon: '💡', color: 'bg-amber-50 text-amber-600' },
  { id: 'drainage', category: 'DRAINAGE', title: 'Drainage', icon: '🌊', color: 'bg-cyan-50 text-cyan-600' },
  { id: 'garbage', category: 'GARBAGE', title: 'Garbage & Sanitation', icon: '🗑️', color: 'bg-emerald-50 text-emerald-600' },
  { id: 'parks', category: 'PUBLIC_AREA', title: 'Parks & Greenery', icon: '🌳', color: 'bg-green-50 text-green-600' },
  { id: 'traffic', category: 'OTHER', title: 'Traffic & Signs', icon: '🚦', color: 'bg-purple-50 text-purple-600' }
];

const CitizenDashboard = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [reqRes, notifRes] = await Promise.all([
        API.get('/requests?limit=10'),
        API.get('/notifications?limit=5')
      ]);

      if (reqRes.data.success) {
        setRequests(reqRes.data.requests || []);
      }
      if (notifRes.data.success) {
        setNotifications(notifRes.data.notifications || []);
      }
    } catch (err) {
      console.error('Citizen Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const total = requests.length;
  const inProgress = requests.filter((r) => ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(r.status)).length;
  const resolved = requests.filter((r) => ['CITIZEN_VERIFIED', 'CLOSED'].includes(r.status)).length;
  const pendingVerification = requests.filter((r) =>
    ['RESOLVED', 'RESOLUTION_SUBMITTED', 'PENDING_VERIFICATION'].includes(r.status)
  ).length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner matching Reference Screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight">
            Welcome back, {user?.name || 'Citizen'}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-[#6B666E] mt-0.5">
            Let's keep our city clean, safe and beautiful.
          </p>
        </div>

        {/* Location & Weather Widget Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#EFE7E0] shadow-sm text-xs font-semibold text-[#29252A]">
          <span className="text-[#C65F63]">📍</span>
          <span>{user?.city || user?.municipality?.city || 'Tenali'}</span>
          <span className="text-[#9E98A2]">•</span>
          <span className="text-[#6B666E]">Partly Cloudy 32°C</span>
        </div>
      </div>

      {/* 4 Stats Cards Grid matching Reference Screenshot */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl border border-[#EFE7E0] p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B666E]">Total Requests</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#C65F63] flex items-center justify-center text-base">
              📊
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#29252A]">{total}</span>
            <span className="text-[11px] font-semibold text-emerald-600">↑ active</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EFE7E0] p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B666E]">In Progress</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-base">
              ⏱️
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#29252A]">{inProgress}</span>
            <span className="text-[11px] font-semibold text-amber-600">assigned</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EFE7E0] p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B666E]">Resolved</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base">
              ✅
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#29252A]">{resolved}</span>
            <span className="text-[11px] font-semibold text-emerald-600">verified</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EFE7E0] p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B666E]">Pending Verification</span>
            <div className="w-8 h-8 rounded-xl bg-[#FDECEF] text-[#C65F63] flex items-center justify-center text-base">
              🔍
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#C65F63]">{pendingVerification}</span>
            <span className="text-[11px] font-semibold text-[#C65F63]">needs review</span>
          </div>
        </div>
      </div>

      {/* Quick Services Section matching Reference Screenshot */}
      <div className="bg-white rounded-3xl border border-[#EFE7E0] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[#29252A] tracking-tight">
            Quick Services
          </h2>
          <Link
            to="/services"
            className="text-xs font-bold text-[#C65F63] hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <span>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {QUICK_SERVICES.map((s) => (
            <Link
              key={s.id}
              to={`/requests/create?category=${s.category}`}
              className="p-4 rounded-2xl bg-[#FAF5F0] hover:bg-[#FDECEF] border border-[#EFE7E0] hover:border-[#C65F63]/30 transition text-center flex flex-col items-center justify-center gap-2 group"
            >
              <div className="text-3xl group-hover:scale-110 transition">{s.icon}</div>
              <span className="text-xs font-bold text-[#29252A] group-hover:text-[#C65F63] line-clamp-1 leading-tight">
                {s.title}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Grid: My Recent Requests & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Complaints Table/Cards (8 cols on lg) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-[#EFE7E0] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-[#29252A] tracking-tight">
              My Active Requests
            </h3>
            <Link
              to="/requests"
              className="text-xs font-bold text-[#C65F63] hover:underline"
            >
              See All History →
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-[#6B666E]">
              Loading your requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="text-4xl">🌱</div>
              <p className="text-xs text-[#6B666E]">You haven't reported any civic problems yet.</p>
              <Link
                to="/requests/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C65F63] text-white text-xs font-bold shadow-md shadow-[#C65F63]/25"
              >
                Report Your First Issue
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#EFE7E0]">
              {requests.slice(0, 4).map((r) => (
                <div key={r._id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#C65F63]">
                        {r.requestId}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF5F0] text-[#6B4E71] border border-[#EFE7E0]">
                        {r.category}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[#29252A] truncate">
                      {r.title}
                    </div>
                    <div className="text-[11px] text-[#6B666E] truncate">
                      🏛️ {r.municipalitySnapshot?.name || r.municipality?.name || 'Local Authority'} • {r.address}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#FAF5F0] border border-[#EFE7E0] text-[#29252A]">
                      {r.status?.replace(/_/g, ' ')}
                    </span>
                    <Link
                      to={`/requests/${r._id || r.requestId}`}
                      className="px-3 py-1.5 rounded-xl bg-[#C65F63]/10 hover:bg-[#C65F63]/20 text-[#C65F63] text-xs font-bold transition"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Recent Activity Card (4 cols on lg) matching Reference Screenshot */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-[#EFE7E0] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-[#29252A] tracking-tight">
              Recent Activity
            </h3>
          </div>

          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#9E98A2]">
                No recent activity recorded yet.
              </div>
            ) : (
              notifications.slice(0, 4).map((n) => (
                <div
                  key={n._id}
                  className="p-3.5 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0] space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔔</span>
                    <span className="text-xs font-bold text-[#29252A] line-clamp-1">{n.title}</span>
                  </div>
                  <p className="text-[11px] text-[#6B666E] line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                  <div className="text-[9px] text-[#9E98A2] pt-1">
                    {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;
