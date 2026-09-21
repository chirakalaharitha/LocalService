import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import API from '../services/api';
import {
  HiOutlineBell,
  HiOutlineCheckCircle,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineRefresh,
  HiOutlineInbox
} from 'react-icons/hi';

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { markRead, markAllRead } = useNotifications();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const limit = 10;

  const fetchPageData = useCallback(async (targetPage = 1, currentFilter = filter) => {
    setLoading(true);
    setError(null);
    try {
      const unreadParam = currentFilter === 'UNREAD' ? '&unreadOnly=true' : '';
      const res = await API.get(`/notifications?page=${targetPage}&limit=${limit}${unreadParam}`);
      if (res.data?.success) {
        setNotifications(res.data.notifications || []);
        setPage(res.data.page || targetPage);
        setTotalPages(res.data.pages || 1);
        setTotalCount(res.data.total || 0);
        if (typeof res.data.unreadCount === 'number') {
          setUnreadCount(res.data.unreadCount);
        }
      } else {
        setError('Unable to load notifications. Please try again.');
      }
    } catch (err) {
      console.error('[NotificationsPage] Error fetching notifications:', err);
      setError('Unable to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filter, limit]);

  useEffect(() => {
    fetchPageData(page, filter);
  }, [page, filter, fetchPageData]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handleMarkRead = async (id, e) => {
    if (e) e.stopPropagation();
    await markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
    );
    setUnreadCount(0);
  };

  const handleNotificationClick = async (n) => {
    if (!n.isRead) {
      await handleMarkRead(n._id);
    }
    if (n.request) {
      const reqId = n.request._id || n.request;
      const targetPath = user?.role === 'STAFF'
        ? `/staff/requests/${reqId}`
        : `/requests/${reqId}`;
      navigate(targetPath);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <HiOutlineBell className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Notification Center</h1>
              <p className="text-xs text-slate-400">
                Live alerts for your service requests, status changes, and staff workflows.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 font-semibold text-xs border border-blue-500/30 transition shadow-sm"
              aria-label="Mark all notifications as read"
            >
              <HiOutlineCheckCircle className="text-base" />
              <span>Mark All as Read</span>
            </button>
          )}

          <button
            onClick={() => fetchPageData(page, filter)}
            className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Refresh notifications"
            aria-label="Refresh notifications"
          >
            <HiOutlineRefresh className="text-base" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => handleFilterChange('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            filter === 'ALL'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          All Notifications ({totalCount})
        </button>

        <button
          onClick={() => handleFilterChange('UNREAD')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            filter === 'UNREAD'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>Unread Only</span>
          {unreadCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              filter === 'UNREAD' ? 'bg-white text-blue-600' : 'bg-rose-500 text-white'
            }`}>
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-300">Loading notifications...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-semibold text-rose-400">{error}</p>
            <button
              onClick={() => fetchPageData(page, filter)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && notifications.length === 0 && (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <HiOutlineInbox className="text-2xl" />
            </div>
            <h3 className="text-base font-bold text-slate-200">No notifications</h3>
            <p className="text-xs text-slate-400">You're all caught up.</p>
          </div>
        )}

        {/* Notifications List */}
        {!loading && !error && notifications.length > 0 && (
          <div className="divide-y divide-slate-800">
            {notifications.map((n) => {
              const reqId = n.request?.requestId || n.request?._id || n.request;
              const isUnread = !n.isRead;

              return (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-5 transition cursor-pointer hover:bg-slate-800/40 flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                    isUnread
                      ? 'bg-blue-950/20 border-l-4 border-blue-500'
                      : 'border-l-4 border-transparent opacity-90'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isUnread
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                        <span>{isUnread ? 'Unread' : 'Read'}</span>
                      </span>

                      {n.type && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {n.type.replace(/_/g, ' ')}
                        </span>
                      )}

                      <span className="text-[10px] text-slate-500">
                        • {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <h2 className="text-sm font-bold text-slate-100 tracking-tight">
                      {n.title}
                    </h2>

                    <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                      {n.message}
                    </p>

                    {n.request && (
                      <div className="pt-2">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline">
                          View Related Request [{reqId}] →
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:self-center">
                    {isUnread && (
                      <button
                        onClick={(e) => handleMarkRead(n._id, e)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition"
                        title="Mark as read"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && !error && totalPages > 1 && (
          <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing <span className="font-semibold text-slate-200">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-slate-200">{Math.min(page * limit, totalCount)}</span> of{' '}
              <span className="font-semibold text-slate-200">{totalCount}</span> notifications
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:hover:bg-slate-800 transition flex items-center gap-1"
                aria-label="Previous Page"
              >
                <HiOutlineChevronLeft />
                <span>Prev</span>
              </button>

              <span className="px-2 font-medium text-slate-300">
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:hover:bg-slate-800 transition flex items-center gap-1"
                aria-label="Next Page"
              >
                <span>Next</span>
                <HiOutlineChevronRight />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default NotificationsPage;
