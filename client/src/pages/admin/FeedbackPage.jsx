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
      <div className="bg-white border border-[#EFE7E0] p-6 rounded-2xl shadow-sm">
        <h1 className="text-2xl font-bold text-[#29252A] tracking-tight flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <HiOutlineStar className="text-xl" />
          </div>
          <span>Citizen Feedback & Quality Ratings</span>
        </h1>
        <p className="text-xs text-[#6B4E71] mt-1">
          Review verified citizen ratings, service quality satisfaction, suggestions, and staff performance in your jurisdiction.
        </p>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-6 text-center space-y-1 shadow-sm">
          <span className="text-xs text-[#6B4E71] uppercase font-semibold tracking-wider">Average Rating</span>
          <div className="text-4xl font-black text-amber-500">{stats.avgRating || 0} / 5</div>
          <div className="flex justify-center text-amber-500 text-sm mt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <HiStar key={s} className={s <= Math.round(stats.avgRating || 0) ? 'text-amber-400' : 'text-[#EFE7E0]'} />
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-6 text-center space-y-1 shadow-sm">
          <span className="text-xs text-[#6B4E71] uppercase font-semibold tracking-wider">Total Reviews</span>
          <div className="text-4xl font-black text-[#29252A]">{stats.total || 0}</div>
          <p className="text-[11px] text-[#6B4E71]/70">Verified by reporting citizens</p>
        </div>

        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-6 text-center space-y-1 shadow-sm">
          <span className="text-xs text-[#6B4E71] uppercase font-semibold tracking-wider">5-Star Excellence</span>
          <div className="text-4xl font-black text-emerald-600">
            {stats.ratingDistribution?.[5] || 0}
          </div>
          <p className="text-[11px] text-[#6B4E71]/70">
            {stats.total > 0 ? Math.round(((stats.ratingDistribution?.[5] || 0) / stats.total) * 100) : 0}% of all reviews
          </p>
        </div>
      </div>

      {/* Rating Distribution Bars */}
      <div className="bg-white border border-[#EFE7E0] rounded-2xl p-6 space-y-3 shadow-sm">
        <h2 className="text-sm font-bold text-[#29252A] uppercase tracking-wider">Rating Breakdown</h2>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = stats.ratingDistribution?.[stars] || 0;
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            return (
              <div key={stars} className="flex items-center gap-3 text-xs">
                <div className="w-14 text-[#29252A] font-medium flex items-center gap-1 shrink-0">
                  <span>{stars}</span>
                  <HiStar className="text-amber-400" />
                </div>
                <div className="flex-1 bg-[#FAF5F0] h-3 rounded-full overflow-hidden border border-[#EFE7E0]">
                  <div
                    className="bg-[#C65F63] h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-[#29252A]">{count}</span>
                <span className="w-10 text-right font-mono text-[#6B4E71] text-[11px]">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#EFE7E0] p-4 rounded-2xl flex flex-wrap items-center gap-4 text-xs shadow-sm">
        <div className="flex items-center gap-2 text-[#6B4E71] font-semibold">
          <HiOutlineFilter className="text-base text-[#C65F63]" />
          <span>Filters:</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[#6B4E71]">Rating:</label>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl px-3 py-1.5 text-[#29252A] focus:outline-none focus:border-[#C65F63]"
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
          <label className="text-[#6B4E71]">Category:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl px-3 py-1.5 text-[#29252A] focus:outline-none focus:border-[#C65F63]"
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
            className="px-3 py-1 rounded-xl bg-[#FAF5F0] hover:bg-[#FDECEF] text-[#6B4E71] hover:text-[#C65F63] font-semibold border border-[#EFE7E0] transition"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Feedbacks List */}
      <div className="bg-white border border-[#EFE7E0] rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
          <h2 className="text-base font-bold text-[#29252A]">Recent Citizen Reviews</h2>
          <span className="text-xs text-[#6B4E71]">{feedbacks.length} records</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[#6B4E71]">Loading citizen reviews...</div>
        ) : feedbacks.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#6B4E71] font-medium">
            No citizen feedback available yet.
          </div>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((f) => (
              <div key={f._id} className="p-4 rounded-xl bg-[#FAF5F0] border border-[#EFE7E0] space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-[#29252A]">
                      {f.citizen?.name || 'Verified Citizen'}
                    </span>
                    <span className="font-mono text-[#C65F63] bg-[#FDECEF] px-2 py-0.5 rounded border border-[#C65F63]/30 text-[11px] font-bold">
                      {f.request?.requestId || 'LF-REQ'}
                    </span>
                    {f.request?.category && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#6B4E71] bg-white px-2 py-0.5 rounded border border-[#EFE7E0]">
                        <HiOutlineTag className="text-[#6B4E71]" />
                        {f.request.category}
                      </span>
                    )}
                    {f.staff?.name && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#6B4E71] bg-white px-2 py-0.5 rounded border border-[#EFE7E0] font-medium">
                        <HiOutlineUser className="text-[#C65F63]" />
                        Staff: {f.staff.name}
                      </span>
                    )}
                    {(f.request?.department?.name || f.request?.department?.code) && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#6B4E71] bg-white px-2 py-0.5 rounded border border-[#EFE7E0]">
                        <HiOutlineOfficeBuilding className="text-[#6B4E71]" />
                        {f.request.department.name || f.request.department.code}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <HiStar
                        key={i}
                        className={i <= f.rating ? 'text-amber-400 text-sm' : 'text-[#EFE7E0] text-sm'}
                      />
                    ))}
                    <span className="font-bold text-[#29252A] ml-1 text-xs">{f.rating}/5</span>
                  </div>
                </div>

                {f.comment && (
                  <p className="text-[#29252A] leading-relaxed text-xs pl-0.5">
                    "{f.comment}"
                  </p>
                )}

                {f.suggestion && (
                  <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg">
                    <span className="font-semibold text-emerald-700">Citizen Suggestion:</span> {f.suggestion}
                  </div>
                )}

                {f.categories && f.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {f.categories.map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FDECEF] text-[#C65F63] border border-[#C65F63]/30">
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-[10px] text-[#6B4E71] pt-1 flex justify-between items-center">
                  <span>Submitted on: {new Date(f.createdAt).toLocaleString()}</span>
                  {f.request?.title && (
                    <span className="text-[#6B4E71] truncate max-w-xs font-medium">
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


