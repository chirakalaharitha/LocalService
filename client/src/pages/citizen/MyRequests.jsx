import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import {
  HiOutlinePlusCircle,
  HiOutlineSearch,
  HiOutlineEye,
  HiOutlineRefresh,
  HiOutlineClipboardList
} from 'react-icons/hi';

const CATEGORY_OPTIONS = ['ALL', 'WATER', 'ELECTRICITY', 'ROAD', 'STREET_LIGHT', 'GARBAGE', 'DRAINAGE', 'PUBLIC_AREA', 'OTHER'];
const PRIORITY_OPTIONS = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUS_OPTIONS = ['ALL', 'PENDING', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'PENDING_VERIFICATION', 'CITIZEN_VERIFIED', 'CLOSED', 'REJECTED'];

const MyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedMuni, setSelectedMuni] = useState('ALL');

  const fetchMyRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqRes, muniRes] = await Promise.all([
        API.get('/requests/my'),
        API.get('/municipalities')
      ]);
      if (reqRes.data.success) {
        setRequests(reqRes.data.requests || []);
      }
      if (muniRes.data.success) {
        setMunicipalities(muniRes.data.municipalities || []);
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

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title?.toLowerCase().includes(query) ||
          r.requestId?.toLowerCase().includes(query) ||
          r.address?.toLowerCase().includes(query) ||
          (r.municipalitySnapshot?.name || r.municipality?.name || '').toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'ALL') {
      result = result.filter((r) => (r.category || '').toUpperCase() === selectedCategory);
    }

    if (selectedPriority !== 'ALL') {
      result = result.filter((r) => (r.priority || '').toUpperCase() === selectedPriority);
    }

    if (selectedStatus !== 'ALL') {
      result = result.filter((r) => (r.status || '').toUpperCase() === selectedStatus);
    }

    if (selectedMuni !== 'ALL') {
      result = result.filter((r) => {
        const mId = r.municipality?._id || r.municipality;
        return mId === selectedMuni;
      });
    }

    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [requests, search, selectedCategory, selectedPriority, selectedStatus, selectedMuni]);

  return (
    <div className="space-y-6">
      {/* Top Header & + New Request Button matching Reference Screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight">
            My Requests
          </h1>
          <p className="text-xs sm:text-sm text-[#6B666E] mt-0.5">
            Monitor real-time status and resolutions of your submitted civic issues.
          </p>
        </div>

        <Link
          to="/requests/create"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-xs shadow-lg shadow-[#C65F63]/25 transition self-start sm:self-auto"
        >
          <span>+ New Request</span>
        </Link>
      </div>

      {/* Filter Row */}
      <div className="bg-white rounded-3xl border border-[#EFE7E0] p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <HiOutlineSearch className="absolute left-3.5 top-3 text-[#9E98A2] text-sm" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, ID, location..."
              className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 pl-10 pr-4 text-xs text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63]"
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
          >
            <option value="ALL">All Status</option>
            {STATUS_OPTIONS.filter((s) => s !== 'ALL').map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
          >
            <option value="ALL">All Categories</option>
            {CATEGORY_OPTIONS.filter((c) => c !== 'ALL').map((c) => (
              <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
            ))}
          </select>

          {/* Municipalities Dropdown */}
          <select
            value={selectedMuni}
            onChange={(e) => setSelectedMuni(e.target.value)}
            className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
          >
            <option value="ALL">All Municipalities</option>
            {municipalities.map((m) => (
              <option key={m._id} value={m._id}>{m.name} ({m.city})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table View matching Reference Screenshot */}
      <div className="bg-white rounded-3xl border border-[#EFE7E0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#6B666E]">
            Loading your service requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <HiOutlineClipboardList className="w-12 h-12 text-[#9E98A2] mx-auto" />
            <h4 className="text-sm font-bold text-[#29252A]">No Matching Requests</h4>
            <p className="text-xs text-[#6B666E]">Try adjusting your search keywords or filter options.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-[#FAF5F0] text-[#6B666E] uppercase font-bold text-[10px] border-b border-[#EFE7E0]">
                <tr>
                  <th className="p-4">ID</th>
                  <th className="p-4">Title</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Municipality</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE7E0] font-medium text-[#29252A]">
                {filteredRequests.map((r) => (
                  <tr key={r._id} className="hover:bg-[#FAF5F0]/60 transition">
                    <td className="p-4 font-mono font-bold text-[#C65F63]">
                      <Link to={`/requests/${r.requestId || r._id}`} className="hover:underline">
                        #{r.requestId}
                      </Link>
                    </td>
                    <td className="p-4 font-bold max-w-[200px] truncate">
                      {r.title}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF5F0] text-[#6B4E71] border border-[#EFE7E0]">
                        {r.category}
                      </span>
                    </td>
                    <td className="p-4 text-[#6B4E71] font-semibold">
                      🏛️ {r.municipalitySnapshot?.name || r.municipality?.name || 'Local Authority'}
                    </td>
                    <td className="p-4 text-[#6B666E] max-w-[160px] truncate">
                      {r.city || r.district ? `${r.city || ''}, ${r.district || ''}` : r.address}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          r.priority === 'CRITICAL'
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : r.priority === 'HIGH'
                            ? 'bg-amber-50 text-amber-600 border border-amber-200'
                            : 'bg-blue-50 text-blue-600 border border-blue-200'
                        }`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          r.status === 'CITIZEN_VERIFIED' || r.status === 'CLOSED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : r.status === 'RESOLVED' || r.status === 'PENDING_VERIFICATION'
                            ? 'bg-[#FDECEF] text-[#C65F63] border border-[#C65F63]/20'
                            : 'bg-[#FAF5F0] text-[#29252A] border border-[#EFE7E0]'
                        }`}
                      >
                        {r.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-[11px] text-[#6B666E]">
                      {new Date(r.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        to={`/requests/${r.requestId || r._id}`}
                        className="p-2 rounded-xl bg-[#FAF5F0] hover:bg-[#FDECEF] text-[#C65F63] border border-[#EFE7E0] transition inline-flex items-center justify-center"
                        title="View Details"
                      >
                        <HiOutlineEye className="text-sm" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyRequests;
