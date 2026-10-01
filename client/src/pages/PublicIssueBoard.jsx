import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import IssueMap from '../components/maps/IssueMap';
import { HiOutlineSearch, HiOutlineGlobe, HiOutlineThumbUp, HiOutlineMap, HiOutlineViewList } from 'react-icons/hi';

const PublicIssueBoard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'

  const fetchPublicIssues = async () => {
    setLoading(true);
    try {
      const res = await API.get('/requests/public', {
        params: { search, category }
      });
      if (res.data.success) {
        setRequests(res.data.requests);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicIssues();
  }, [category]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPublicIssues();
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="bg-white border border-[#EFE7E0] rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#29252A] tracking-tight flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#FDECEF] text-[#C65F63] flex items-center justify-center">
                <HiOutlineGlobe className="text-xl" />
              </div>
              <span>Public Civic Issue Board</span>
            </h1>
            <p className="text-xs text-[#6B4E71] mt-1">Explore live civic problems reported in your municipality and support community requests</p>
          </div>

          <div className="flex items-center gap-2 bg-[#FAF5F0] p-1 rounded-xl border border-[#EFE7E0]">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'list' ? 'bg-[#C65F63] text-white shadow-sm' : 'text-[#6B4E71] hover:text-[#29252A]'
              }`}
            >
              <HiOutlineViewList />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'map' ? 'bg-[#C65F63] text-white shadow-sm' : 'text-[#6B4E71] hover:text-[#29252A]'
              }`}
            >
              <HiOutlineMap />
              <span>Map View</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <HiOutlineSearch className="absolute left-3.5 top-3 text-[#6B4E71] text-base" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, location, or request ID..."
              className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 pl-10 pr-4 text-xs text-[#29252A] placeholder-[#6B4E71]/60 focus:outline-none focus:border-[#C65F63]"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
          >
            <option value="">All Categories</option>
            <option value="WATER">Water Leakage</option>
            <option value="ELECTRICITY">Electricity</option>
            <option value="ROAD">Road Damage</option>
            <option value="STREET_LIGHT">Street Lights</option>
            <option value="GARBAGE">Garbage</option>
            <option value="DRAINAGE">Drainage</option>
            <option value="PUBLIC_AREA">Public Area</option>
            <option value="OTHER">Other</option>
          </select>
        </form>
      </div>

      {/* Content View */}
      {viewMode === 'map' ? (
        <IssueMap requests={requests} height="550px" />
      ) : (
        loading ? (
          <div className="py-16 text-center text-xs text-[#6B4E71]">Loading public issues...</div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#6B4E71]">No public issues found matching search criteria.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((r) => (
              <div key={r._id} className="bg-white border border-[#EFE7E0] rounded-2xl p-5 space-y-3 hover:border-[#C65F63]/40 transition flex flex-col justify-between shadow-sm">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-[#C65F63]">{r.requestId}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      r.priority === 'CRITICAL' ? 'bg-red-50 text-red-600 border border-red-200' :
                      r.priority === 'HIGH' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-[#FAF5F0] text-[#6B4E71] border border-[#EFE7E0]'
                    }`}>
                      {r.priority}
                    </span>
                  </div>

                  <h3 className="font-bold text-[#29252A] text-sm line-clamp-1">{r.title}</h3>
                  <p className="text-xs text-[#6B4E71] line-clamp-2 leading-relaxed">{r.description}</p>
                  
                  <div className="text-[11px] text-[#6B4E71]/80 line-clamp-1">📍 {r.address}</div>
                </div>

                <div className="pt-3 border-t border-[#EFE7E0] flex items-center justify-between text-xs mt-2">
                  <div className="flex items-center gap-1.5 text-[#6B4E71]">
                    <HiOutlineThumbUp className="text-[#C65F63] text-base" />
                    <span className="font-bold text-[#29252A]">{r.upvoteCount || 0}</span>
                    <span>Affected</span>
                  </div>

                  <Link
                    to={`/requests/${r._id}`}
                    className="px-3 py-1.5 rounded-lg bg-[#FDECEF] hover:bg-[#FDECEF]/80 text-[#C65F63] font-semibold transition"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      )}

    </div>
  );
};

export default PublicIssueBoard;

