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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <HiOutlineGlobe className="text-teal-400" />
              <span>Public Civic Issue Board</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">Explore live civic problems reported in your municipality and support community requests</p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'list' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <HiOutlineViewList />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'map' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
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
            <HiOutlineSearch className="absolute left-3.5 top-3 text-slate-400 text-base" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, location, or request ID..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
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
          <div className="py-16 text-center text-xs text-slate-500">Loading public issues...</div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No public issues found matching search criteria.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((r) => (
              <div key={r._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition flex flex-col justify-between shadow-xl">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-blue-400">{r.requestId}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      r.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                      r.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {r.priority}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-100 text-sm line-clamp-1">{r.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{r.description}</p>
                  
                  <div className="text-[11px] text-slate-500 line-clamp-1">📍 {r.address}</div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs mt-2">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <HiOutlineThumbUp className="text-blue-400 text-base" />
                    <span className="font-bold text-white">{r.upvoteCount || 0}</span>
                    <span>Affected</span>
                  </div>

                  <Link
                    to={`/requests/${r._id}`}
                    className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-semibold transition"
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

