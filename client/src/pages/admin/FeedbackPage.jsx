import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { toast } from 'react-toastify';
import {
  HiOutlineStar,
  HiStar,
  HiOutlineOfficeBuilding,
  HiOutlineTag,
  HiOutlineUser,
  HiOutlineFilter
} from 'react-icons/hi';

const categories = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'WATER', label: 'Water Supply' },
  { value: 'ELECTRICITY', label: 'Electricity' },
  { value: 'ROAD', label: 'Road & Potholes' },
  { value: 'STREET_LIGHT', label: 'Street Light' },
  { value: 'GARBAGE', label: 'Garbage' },
  { value: 'DRAINAGE', label: 'Drainage' },
  { value: 'PUBLIC_AREA', label: 'Public Area' },
  { value: 'OTHER', label: 'Other' }
];

const FeedbackPage = () => {
  const { socket } = useSocket();
  const [stats, setStats] = useState({ total: 0, avgRating: 0, ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const fetchFeedback = () => {
    setLoading(true);
    const params = {};
    if (ratingFilter !== 'ALL') params.rating = ratingFilter;
    if (categoryFilter !== 'ALL') params.category = categoryFilter;

    API.get('/feedback', { params })
      .then((res) => {
        if (res.data.success) {
          setStats(res.data.stats || { total: 0, avgRating: 0, ratingDistribution: {} });
          setFeedbacks(res.data.feedbacks || []);
        }
      })
      .catch((err) => console.error('Error fetching admin feedback:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFeedback();
  }, [ratingFilter, categoryFilter]);

  // Real-time socket listener for incoming citizen feedback
  useEffect(() => {
    if (!socket) return;

    const handleNewFeedback = (data) => {
      if (data?.feedback) {
        setFeedbacks((prev) => [data.feedback, ...prev]);
        setStats((prev) => {
          const newTotal = (prev.total || 0) + 1;
          const r = data.feedback.rating || 5;
          const prevDist = prev.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
          return {
            ...prev,
            total: newTotal,
            ratingDistribution: {
              ...prevDist,
              [r]: (prevDist[r] || 0) + 1
            }
          };
        });
        toast.info(`New ${data.feedback.rating}★ feedback received for ${data.requestId || 'Request'}!`);
      }
    };

    socket.on('feedback:submitted', handleNewFeedback);
    return () => socket.off('feedback:submitted', handleNewFeedback);
  }, [socket]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <HiOutlineStar className="text-amber-400" />
          <span>Citizen Feedback & Quality Ratings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review verified citizen ratings, service quality satisfaction, suggestions, and staff performance in your jurisdiction.
        </p>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Average Rating</span>
          <div className="text-4xl font-black text-amber-400">{stats.avgRating || 0} / 5</div>
          <div className="flex justify-center text-amber-400 text-sm mt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <HiStar key={s} className={s <= Math.round(stats.avgRating || 0) ? 'text-amber-400' : 'text-slate-700'} />
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Total Reviews</span>
          <div className="text-4xl font-black text-white">{stats.total || 0}</div>
          <p className="text-[11px] text-slate-500">Verified by reporting citizens</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">5-Star Excellence</span>
          <div className="text-4xl font-black text-emerald-400">
            {stats.ratingDistribution?.[5] || 0}
          </div>
          <p className="text-[11px] text-slate-500">
            {stats.total > 0 ? Math.round(((stats.ratingDistribution?.[5] || 0) / stats.total) * 100) : 0}% of all reviews
          </p>
        </div>
      </div>

      {/* Rating Distribution Bars */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Rating Breakdown</h2>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = stats.ratingDistribution?.[stars] || 0;
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            return (
              <div key={stars} className="flex items-center gap-3 text-xs">
                <div className="w-14 text-slate-300 font-medium flex items-center gap-1 shrink-0">
                  <span>{stars}</span>
                  <HiStar className="text-amber-400" />
                </div>
                <div className="flex-1 bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-slate-400">{count}</span>
                <span className="w-10 text-right font-mono text-slate-500 text-[11px]">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-400 font-semibold">
          <HiOutlineFilter className="text-base text-blue-400" />
          <span>Filters:</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-400">Rating:</label>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Ratings</option>
            <option value="5">5 Stars Only</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-400">Category:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {(ratingFilter !== 'ALL' || categoryFilter !== 'ALL') && (
          <button
            onClick={() => {
              setRatingFilter('ALL');
              setCategoryFilter('ALL');
            }}
            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Feedbacks List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white">Recent Citizen Reviews</h2>
          <span className="text-xs text-slate-400">{feedbacks.length} records</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading citizen reviews...</div>
        ) : feedbacks.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 font-medium">
            No citizen feedback available yet.
          </div>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((f) => (
              <div key={f._id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-200">
                      {f.citizen?.name || 'Verified Citizen'}
                    </span>
                    <span className="font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 text-[11px]">
                      {f.request?.requestId || 'LF-REQ'}
                    </span>
                    {f.request?.category && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        <HiOutlineTag className="text-slate-500" />
                        {f.request.category}
                      </span>
                    )}
                    {f.staff?.name && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-teal-400 bg-teal-950/40 px-2 py-0.5 rounded border border-teal-800/60">
                        <HiOutlineUser className="text-teal-400" />
                        Staff: {f.staff.name}
                      </span>
                    )}
                    {(f.request?.department?.name || f.request?.department?.code) && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        <HiOutlineOfficeBuilding className="text-slate-500" />
                        {f.request.department.name || f.request.department.code}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <HiStar
                        key={i}
                        className={i <= f.rating ? 'text-amber-400 text-sm' : 'text-slate-800 text-sm'}
                      />
                    ))}
                    <span className="font-bold text-slate-300 ml-1 text-xs">{f.rating}/5</span>
                  </div>
                </div>

                {f.comment && (
                  <p className="text-slate-300 leading-relaxed text-xs pl-0.5">
                    "{f.comment}"
                  </p>
                )}

                {f.suggestion && (
                  <div className="text-xs text-teal-300 bg-teal-950/40 border border-teal-900/60 p-2.5 rounded-lg">
                    <span className="font-semibold text-teal-400">Citizen Suggestion:</span> {f.suggestion}
                  </div>
                )}

                {f.categories && f.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {f.categories.map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950/60 text-blue-300 border border-blue-900/60">
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-[10px] text-slate-500 pt-1 flex justify-between items-center">
                  <span>Submitted on: {new Date(f.createdAt).toLocaleString()}</span>
                  {f.request?.title && (
                    <span className="text-slate-400 truncate max-w-xs font-medium">
                      Issue: {f.request.title}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackPage;


