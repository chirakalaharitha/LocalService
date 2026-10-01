import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  StaffCategoryBadge,
  StaffPriorityBadge,
  StaffStatusBadge
} from './staffUiHelpers';
import {
  HiOutlineDocumentText,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineSearch,
  HiOutlineCalendar,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineRefresh,
  HiOutlineClipboardList,
  HiOutlineViewGrid,
  HiOutlinePlus,
  HiOutlineMinus
} from 'react-icons/hi';

// Helper to create colored teardrop map pin matching screenshot
const createStatusPin = (status) => {
  const s = (status || '').toUpperCase();
  let pinColor = '#38BDF8'; // In Progress blue
  if (s === 'PENDING' || s === 'ASSIGNED' || s === 'UNDER_REVIEW') {
    pinColor = '#FBBF24'; // Pending yellow
  } else if (s === 'IN_PROGRESS' || s === 'ACCEPTED') {
    pinColor = '#38BDF8'; // In Progress blue
  } else if (s === 'OVERDUE') {
    pinColor = '#EF4444'; // Overdue red
  } else if (s === 'COMPLETED' || s === 'RESOLVED' || s === 'CITIZEN_VERIFIED' || s === 'CLOSED') {
    pinColor = '#10B981'; // Completed green
  }

  const svg = `<svg width="22" height="30" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37258 18.6274 0 12 0Z" fill="${pinColor}"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`;

  return L.divIcon({
    className: 'custom-status-pin',
    html: `<div style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); transform: translate(-50%, -100%); cursor: pointer;">${svg}</div>`,
    iconSize: [22, 30],
    iconAnchor: [11, 30],
    popupAnchor: [0, -30]
  });
};

// Map controller to adjust view bounds
const MapBoundsController = ({ requests = [], defaultCenter = [16.3067, 80.4365] }) => {
  const map = useMap();

  useEffect(() => {
    const validCoords = requests
      .filter((r) => (
        r.location?.coordinates &&
        Array.isArray(r.location.coordinates) &&
        r.location.coordinates.length === 2 &&
        typeof r.location.coordinates[0] === 'number' &&
        typeof r.location.coordinates[1] === 'number' &&
        !isNaN(r.location.coordinates[0]) &&
        !isNaN(r.location.coordinates[1])
      ))
      .map((r) => [r.location.coordinates[1], r.location.coordinates[0]]);

    if (validCoords.length > 1) {
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    } else if (validCoords.length === 1) {
      map.setView(validCoords[0], 13, { animate: true });
    } else if (defaultCenter) {
      map.setView(defaultCenter, 12, { animate: true });
    }
  }, [requests, defaultCenter, map]);

  return null;
};

// Map zoom control helper
const MapZoomController = () => {
  const map = useMap();
  return (
    <div className="absolute bottom-3 right-3 z-[400] flex flex-col bg-white border border-[#EFE7E0] rounded-lg shadow-md overflow-hidden">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="p-1.5 hover:bg-[#FAF6F2] text-[#29252A] border-b border-[#EFE7E0] transition"
        title="Zoom in"
      >
        <HiOutlinePlus className="text-xs" />
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="p-1.5 hover:bg-[#FAF6F2] text-[#29252A] transition"
        title="Zoom out"
      >
        <HiOutlineMinus className="text-xs" />
      </button>
    </div>
  );
};

const StaffDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  // Real KPI stats from MongoDB
  const [stats, setStats] = useState({
    totalAssigned: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    pending: 0
  });

  // Real assigned requests & dynamic category distribution (ONLY assigned categories with count > 0)
  const [requests, setRequests] = useState([]);
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [dateRange, setDateRange] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Fetch real staff data from MongoDB
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get('/staff/requests', {
        params: {
          category: selectedCategory,
          status: selectedStatus,
          search: searchQuery
        }
      });

      if (res.data?.success) {
        setRequests(res.data.requests || []);
        if (res.data.stats) {
          setStats({
            totalAssigned: res.data.stats.totalAssigned || 0,
            inProgress: res.data.stats.inProgress || 0,
            completed: res.data.stats.completed || res.data.stats.resolved || 0,
            overdue: res.data.stats.overdue || res.data.stats.overdueCount || 0,
            pending: res.data.stats.pending || res.data.stats.pendingCount || 0
          });
        }
        setCategoryDistribution(res.data.categoryDistribution || []);
        setStatusDistribution(res.data.statusDistribution || []);
      }
    } catch (err) {
      console.error('Staff dashboard fetch error:', err);
      setRequests([]);
      setCategoryDistribution([]);
      setStatusDistribution([]);
      setStats({
        totalAssigned: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
        pending: 0
      });
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedStatus, searchQuery]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time update via Socket.IO (No polling, instant re-fetch on assignment or status change)
  useEffect(() => {
    if (!socket) return;

    const handleRealtimeUpdate = (data) => {
      // Re-fetch immediately when request is assigned to or updated by admin/system
      fetchDashboardData();
    };

    socket.on('request:assigned', handleRealtimeUpdate);
    socket.on('request:statusChanged', handleRealtimeUpdate);
    socket.on('notification:new', handleRealtimeUpdate);
    socket.on('newNotification', handleRealtimeUpdate);

    return () => {
      socket.off('request:assigned', handleRealtimeUpdate);
      socket.off('request:statusChanged', handleRealtimeUpdate);
      socket.off('notification:new', handleRealtimeUpdate);
      socket.off('newNotification', handleRealtimeUpdate);
    };
  }, [socket, fetchDashboardData]);

  // Donut chart status data
  const donutData = useMemo(() => {
    if (stats.totalAssigned === 0) return [];
    return [
      { name: 'Pending', value: stats.pending, color: '#38BDF8' },
      { name: 'In Progress', value: stats.inProgress, color: '#FB923C' },
      { name: 'Completed', value: stats.completed, color: '#4ADE80' },
      { name: 'Overdue', value: stats.overdue, color: '#F87171' }
    ].filter((item) => item.value > 0);
  }, [stats]);

  // Filter requests by Date Range if selected
  const filteredRequests = useMemo(() => {
    if (dateRange === 'ALL') return requests;
    const now = new Date();
    return requests.filter((r) => {
      if (!r.createdAt) return true;
      const created = new Date(r.createdAt);
      if (dateRange === 'TODAY') {
        return created.toDateString() === now.toDateString();
      }
      if (dateRange === '7DAYS') {
        return (now.getTime() - created.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      }
      if (dateRange === '30DAYS') {
        return (now.getTime() - created.getTime()) <= 30 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [requests, dateRange]);

  // Paginated table requests
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(start, start + itemsPerPage);
  }, [filteredRequests, currentPage, itemsPerPage]);

  // Determine map center from assigned requests or default
  const mapCenter = useMemo(() => {
    const withCoords = requests.find(
      (r) =>
        r.location?.coordinates &&
        Array.isArray(r.location.coordinates) &&
        r.location.coordinates.length === 2 &&
        typeof r.location.coordinates[0] === 'number' &&
        typeof r.location.coordinates[1] === 'number'
    );
    if (withCoords) {
      return [withCoords.location.coordinates[1], withCoords.location.coordinates[0]];
    }
    return [16.3067, 80.4365]; // Guntur / Tenali central coordinate
  }, [requests]);

  const primaryCity = useMemo(() => {
    const firstWithCity = requests.find((r) => r.city || r.municipality?.name);
    return firstWithCity?.city || firstWithCity?.municipality?.name?.split(' ')[0] || 'Guntur';
  }, [requests]);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn font-sans">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#29252A] tracking-tight">
            Staff Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#7D7682] font-medium mt-0.5">
            Manage your assigned requests and keep your municipality clean and safe.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#EFE7E0] bg-white text-[#6B4E71] hover:bg-[#FAF6F2] text-xs font-semibold shadow-2xs transition"
          title="Refresh dashboard data"
        >
          <HiOutlineRefresh className={`text-sm ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 2. Top 4 KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Assigned */}
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-5 flex items-center gap-4 shadow-xs hover:border-[#C65F63]/30 transition">
          <div className="w-12 h-12 rounded-2xl bg-[#F3E8FF] text-[#7E22CE] flex items-center justify-center text-xl shrink-0">
            <HiOutlineDocumentText />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#8C8490]">Total Assigned</div>
            <div className="text-2xl font-black text-[#29252A] leading-tight mt-0.5">
              {stats.totalAssigned}
            </div>
            <div className="text-[11px] text-[#8C8490] mt-0.5">Requests assigned to you</div>
          </div>
        </div>

        {/* Card 2: In Progress */}
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-5 flex items-center gap-4 shadow-xs hover:border-[#C65F63]/30 transition">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF3E2] text-[#D97706] flex items-center justify-center text-xl shrink-0">
            <HiOutlineClock />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#8C8490]">In Progress</div>
            <div className="text-2xl font-black text-[#29252A] leading-tight mt-0.5">
              {stats.inProgress}
            </div>
            <div className="text-[11px] text-[#8C8490] mt-0.5">Currently being worked on</div>
          </div>
        </div>

        {/* Card 3: Completed */}
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-5 flex items-center gap-4 shadow-xs hover:border-[#C65F63]/30 transition">
          <div className="w-12 h-12 rounded-2xl bg-[#E6F7ED] text-[#15803D] flex items-center justify-center text-xl shrink-0">
            <HiOutlineCheckCircle />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#8C8490]">Completed</div>
            <div className="text-2xl font-black text-[#29252A] leading-tight mt-0.5">
              {stats.completed}
            </div>
            <div className="text-[11px] text-[#8C8490] mt-0.5">Successfully resolved</div>
          </div>
        </div>

        {/* Card 4: Overdue */}
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-5 flex items-center gap-4 shadow-xs hover:border-[#C65F63]/30 transition">
          <div className="w-12 h-12 rounded-2xl bg-[#FDECEF] text-[#C65F63] flex items-center justify-center text-xl shrink-0">
            <HiOutlineExclamationCircle />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#8C8490]">Overdue</div>
            <div className="text-2xl font-black text-[#29252A] leading-tight mt-0.5">
              {stats.overdue}
            </div>
            <div className="text-[11px] text-[#8C8490] mt-0.5">Past SLA deadline</div>
          </div>
        </div>
      </div>

      {/* 3. Middle 3 Cards Grid (Status Overview | Requests by Category | Assigned Requests Map) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Card 1: Request Status Overview (Donut Chart) */}
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <h2 className="text-sm font-bold text-[#29252A] mb-3">
            Request Status Overview
          </h2>

          {stats.totalAssigned === 0 ? (
            <div className="py-12 text-center space-y-2 my-auto">
              <div className="w-12 h-12 rounded-full bg-[#FAF6F2] text-[#8C8490] flex items-center justify-center mx-auto text-xl border border-[#EFE7E0]">
                <HiOutlineClipboardList />
              </div>
              <div className="text-xs font-bold text-[#29252A]">No requests assigned yet</div>
              <p className="text-[11px] text-[#8C8490]">Status overview will appear once requests are assigned.</p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 my-auto">
              {/* Donut Chart */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={64}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`status-cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [`${val} requests`, name]}
                      contentStyle={{ borderRadius: '12px', fontSize: '11px', border: '1px solid #EFE7E0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-[#29252A] leading-none">{stats.totalAssigned}</span>
                  <span className="text-[10px] font-semibold text-[#8C8490] mt-0.5">Total</span>
                </div>
              </div>

              {/* Legend on Right matching Image 2 */}
              <div className="flex-1 space-y-2 text-xs pl-2">
                <div className="flex items-center justify-between text-[#6B666E]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] shrink-0" />
                    <span className="font-medium text-[#29252A]">Pending</span>
                  </div>
                  <span className="font-bold text-[#29252A]">{stats.pending}</span>
                </div>

                <div className="flex items-center justify-between text-[#6B666E]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FB923C] shrink-0" />
                    <span className="font-medium text-[#29252A]">In Progress</span>
                  </div>
                  <span className="font-bold text-[#29252A]">{stats.inProgress}</span>
                </div>

                <div className="flex items-center justify-between text-[#6B666E]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80] shrink-0" />
                    <span className="font-medium text-[#29252A]">Completed</span>
                  </div>
                  <span className="font-bold text-[#29252A]">{stats.completed}</span>
                </div>

                <div className="flex items-center justify-between text-[#6B666E]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F87171] shrink-0" />
                    <span className="font-medium text-[#29252A]">Overdue</span>
                  </div>
                  <span className="font-bold text-[#29252A]">{stats.overdue}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Requests by Category (ONLY Assigned Categories with count > 0) */}
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <h2 className="text-sm font-bold text-[#29252A] mb-3">
            Requests by Category
          </h2>

          {categoryDistribution.length === 0 ? (
            <div className="py-12 text-center space-y-2 my-auto">
              <div className="w-12 h-12 rounded-full bg-[#FAF6F2] text-[#8C8490] flex items-center justify-center mx-auto text-xl border border-[#EFE7E0]">
                <HiOutlineViewGrid />
              </div>
              <div className="text-xs font-bold text-[#29252A]">No requests assigned yet</div>
              <p className="text-[11px] text-[#8C8490]">Only categories assigned to you will be displayed here.</p>
            </div>
          ) : (
            <div className="h-44 w-full my-auto">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryDistribution}
                  margin={{ top: 22, right: 15, left: -25, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2ECE6" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={{ stroke: '#EFE7E0' }}
                    tick={{ fontSize: 11, fill: '#6B666E', fontWeight: 500 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#8C8490' }}
                    domain={[0, (dataMax) => Math.max(4, Math.ceil(dataMax * 1.25))]}
                  />
                  <Tooltip
                    formatter={(val) => [`${val} requests`, 'Assigned']}
                    contentStyle={{ borderRadius: '12px', fontSize: '11px', border: '1px solid #EFE7E0' }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[6, 6, 0, 0]}
                    barSize={40}
                  >
                    <LabelList
                      dataKey="count"
                      position="top"
                      fill="#29252A"
                      fontSize={11}
                      fontWeight={700}
                    />
                    {categoryDistribution.map((entry, index) => (
                      <Cell
                        key={`bar-cell-${index}`}
                        fill={entry.color || (index === 0 ? '#38BDF8' : '#FB923C')}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Card 3: Assigned Requests Map (Leaflet Map with Status Colored Pins) */}
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-5 shadow-xs flex flex-col justify-between md:col-span-2 lg:col-span-1">
          <h2 className="text-sm font-bold text-[#29252A] mb-3">
            Assigned Requests Map
          </h2>

          <div className="relative h-44 w-full rounded-xl overflow-hidden border border-[#EFE7E0] bg-[#FAF8F6]">
            <MapContainer
              center={mapCenter}
              zoom={12}
              zoomControl={false}
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapBoundsController requests={requests} defaultCenter={mapCenter} />
              <MapZoomController />

              {/* Render status-colored pins for assigned requests */}
              {requests.map((r) => {
                if (
                  !r.location?.coordinates ||
                  !Array.isArray(r.location.coordinates) ||
                  r.location.coordinates.length !== 2
                ) {
                  return null;
                }
                const [lng, lat] = r.location.coordinates;
                if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
                  return null;
                }

                return (
                  <Marker
                    key={r._id || r.requestId}
                    position={[lat, lng]}
                    icon={createStatusPin(r.status)}
                  >
                    <Popup>
                      <div className="p-1 min-w-[170px] text-xs">
                        <div className="font-bold text-[#29252A]">{r.requestId}</div>
                        <div className="text-[11px] text-[#6B666E] font-medium line-clamp-1">{r.title}</div>
                        <div className="text-[10px] text-[#8C8490] mt-1">
                          Status: <span className="font-bold">{r.status}</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* City watermark badge */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-base font-extrabold text-[#29252A]/85 z-[400] drop-shadow-sm select-none">
              {primaryCity}
            </div>

            {/* Map Legend Overlay matching Image 2 */}
            <div className="absolute top-2 right-2 z-[400] bg-white/95 backdrop-blur-xs p-2 rounded-xl border border-[#EFE7E0] shadow-sm text-[10px] space-y-1 select-none pointer-events-none">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                <span className="font-semibold text-[#29252A]">In Progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FBBF24]" />
                <span className="font-semibold text-[#29252A]">Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <span className="font-semibold text-[#29252A]">Overdue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="font-semibold text-[#29252A]">Completed</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Bottom Card: Assigned Requests Table */}
      <div className="bg-white border border-[#EFE7E0] rounded-2xl shadow-xs overflow-hidden">
        {/* Card Header & Filter Bar */}
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#EFE7E0]">
          <h2 className="text-base font-bold text-[#29252A]">
            Assigned Requests
          </h2>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter: Shows ONLY categories assigned to this staff member */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1.5 px-3 rounded-xl border border-[#EFE7E0] bg-[#FAF6F2] text-xs font-semibold text-[#29252A] hover:border-[#C65F63] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categoryDistribution.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name} ({c.count})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1.5 px-3 rounded-xl border border-[#EFE7E0] bg-[#FAF6F2] text-xs font-semibold text-[#29252A] hover:border-[#C65F63] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="OVERDUE">Overdue</option>
            </select>

            {/* Date Range Filter */}
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1.5 px-3 rounded-xl border border-[#EFE7E0] bg-[#FAF6F2] text-xs font-semibold text-[#29252A] hover:border-[#C65F63] focus:outline-none cursor-pointer"
            >
              <option value="ALL">Select Date Range</option>
              <option value="TODAY">Today</option>
              <option value="7DAYS">Last 7 Days</option>
              <option value="30DAYS">Last 30 Days</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <HiOutlineSearch className="absolute left-3 top-2.5 text-[#9E98A2] text-sm" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by ID, location..."
                className="py-1.5 pl-8 pr-3 rounded-xl border border-[#EFE7E0] bg-[#FAF6F2] text-xs text-[#29252A] placeholder-[#9E98A2] hover:border-[#C65F63] focus:outline-none focus:bg-white w-48 sm:w-56 transition"
              />
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#EFE7E0] text-[11px] font-bold text-[#8C8490] tracking-wider bg-white">
                <th className="py-3.5 px-4">Request ID</th>
                <th className="py-3.5 px-4">Issue</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Municipality</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Assigned Date</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2ECE6]">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-xs text-[#8C8490]">
                    <div className="w-6 h-6 border-2 border-[#C65F63] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading assigned requests...
                  </td>
                </tr>
              ) : paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-14 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#FAF6F2] text-[#8C8490] flex items-center justify-center mx-auto text-xl border border-[#EFE7E0] mb-2">
                      <HiOutlineClipboardList />
                    </div>
                    <div className="text-sm font-bold text-[#29252A]">No requests assigned yet</div>
                    <p className="text-xs text-[#8C8490] mt-0.5">
                      {selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || searchQuery
                        ? 'No requests match your current filters.'
                        : 'You currently have no assigned service requests.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((req) => (
                  <tr
                    key={req._id || req.requestId}
                    className="hover:bg-[#FAF6F2] transition duration-150 text-[#29252A]"
                  >
                    <td className="py-3.5 px-4 font-semibold text-[#402A40] whitespace-nowrap">
                      {req.requestId}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#29252A] max-w-[200px] truncate">
                      {req.title}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StaffCategoryBadge category={req.category} />
                    </td>
                    <td className="py-3.5 px-4 text-[#6B666E] whitespace-nowrap max-w-[150px] truncate">
                      {req.address || req.city || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-[#6B666E] whitespace-nowrap">
                      {req.municipality?.name || req.municipalityName || req.city || '—'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StaffPriorityBadge priority={req.priority} />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StaffStatusBadge status={req.status} />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#6B666E] text-[11px]">
                      {req.assignedDate || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <Link
                        to={`/staff/requests/${req.requestId || req._id}`}
                        className="inline-block px-3 py-1 rounded-md text-[11px] font-bold text-[#C65F63] border border-[#EAAFB3] hover:bg-[#FDECEF] hover:border-[#C65F63] transition cursor-pointer shadow-2xs"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Showing X of Y requests & Pagination */}
        {!loading && filteredRequests.length > 0 && (
          <div className="p-4 bg-white border-t border-[#EFE7E0] flex items-center justify-between text-xs text-[#8C8490]">
            <div>
              Showing {Math.min(filteredRequests.length, (currentPage - 1) * itemsPerPage + 1)} to{' '}
              {Math.min(filteredRequests.length, currentPage * itemsPerPage)} of {filteredRequests.length} requests
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-[#EFE7E0] text-[#29252A] hover:bg-[#FAF6F2] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                title="Previous page"
              >
                <HiOutlineChevronLeft className="text-sm" />
              </button>
              <span className="px-2.5 py-1 rounded-lg bg-[#C65F63] text-white font-bold text-xs">
                {currentPage}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-[#EFE7E0] text-[#29252A] hover:bg-[#FAF6F2] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                title="Next page"
              >
                <HiOutlineChevronRight className="text-sm" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;
