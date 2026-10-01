import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import API from '../services/api';
import {
  HiOutlineBell,
  HiOutlineCheck,
  HiOutlineCheckCircle,
  HiOutlineTrash,
  HiOutlineRefresh,
  HiOutlineClipboardCheck,
  HiOutlineChatAlt2,
  HiOutlineUserGroup,
  HiOutlineX
} from 'react-icons/hi';
import { RiRefreshLine } from 'react-icons/ri';

/**
 * Helper to display human-readable relative time like "2 hours ago", "1 day ago"
 */
const getRelativeTime = (dateVal) => {
  if (!dateVal) return 'Recently';
  const now = Date.now();
  const d = new Date(dateVal).getTime();
  if (isNaN(d)) return 'Recently';

  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  return new Date(dateVal).toLocaleDateString();
};

/**
 * Helper to choose icon matching notification type/content
 */
const getNotificationIcon = (title = '', type = '') => {
  const text = (title + ' ' + type).toLowerCase();
  if (text.includes('assigned') || text.includes('staff')) {
    return <HiOutlineClipboardCheck className="text-lg" />;
  }
  if (text.includes('status') || text.includes('progress') || text.includes('accepted')) {
    return <RiRefreshLine className="text-lg" />;
  }
  if (text.includes('message') || text.includes('note') || text.includes('comment')) {
    return <HiOutlineChatAlt2 className="text-lg" />;
  }
  if (text.includes('resolved') || text.includes('verified') || text.includes('completed')) {
    return <HiOutlineCheckCircle className="text-lg" />;
  }
  if (text.includes('community') || text.includes('citizen')) {
    return <HiOutlineUserGroup className="text-lg" />;
  }
  return <HiOutlineBell className="text-lg" />;
};

const FloralWatermark = ({ className = "w-32 h-32" }) => (
  <svg
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`pointer-events-none select-none ${className}`}
  >
    <path
      d="M190 190 C150 150 120 160 90 190"
      stroke="#C65F63"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeOpacity="0.3"
    />
    <path
      d="M170 170 C140 120 100 130 60 170"
      stroke="#C65F63"
      strokeWidth="2"
      strokeLinecap="round"
      strokeOpacity="0.25"
    />
    <path
      d="M140 140 C120 90 90 90 40 130"
      stroke="#6B4E71"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeOpacity="0.2"
    />
    <path
      d="M110 110 C80 60 60 70 20 90"
      stroke="#6B4E71"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeOpacity="0.2"
    />
    <ellipse cx="145" cy="115" rx="14" ry="7" transform="rotate(-35 145 115)" fill="#FDECEF" stroke="#C65F63" strokeWidth="1.2" strokeOpacity="0.4" />
    <ellipse cx="115" cy="85" rx="12" ry="6" transform="rotate(-40 115 85)" fill="#FDECEF" stroke="#C65F63" strokeWidth="1.2" strokeOpacity="0.4" />
    <ellipse cx="85" cy="65" rx="10" ry="5" transform="rotate(-45 85 65)" fill="#E8D7E6" stroke="#6B4E71" strokeWidth="1.2" strokeOpacity="0.4" />
    <ellipse cx="170" cy="145" rx="14" ry="7" transform="rotate(-30 170 145)" fill="#FDECEF" stroke="#C65F63" strokeWidth="1.2" strokeOpacity="0.4" />
    <circle cx="145" cy="115" r="2.5" fill="#C65F63" fillOpacity="0.4" />
    <circle cx="115" cy="85" r="2" fill="#C65F63" fillOpacity="0.4" />
    <circle cx="85" cy="65" r="1.8" fill="#6B4E71" fillOpacity="0.4" />
  </svg>
);

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    notifications: contextNotifications,
    unreadCount: contextUnreadCount,
    markRead,
    markAllRead,
    deleteNotification,
    clearAllNotifications,
    fetchUnreadCount
  } = useNotifications();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(contextUnreadCount || 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchPageNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get('/notifications?limit=50');
      if (res.data?.success) {
        setNotifications(res.data.notifications || []);
        if (typeof res.data.unreadCount === 'number') {
          setUnreadCount(res.data.unreadCount);
        }
      } else {
        setError('Unable to load notifications.');
      }
    } catch (err) {
      console.error('[NotificationsPage] Error fetching notifications:', err);
      setError('Unable to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPageNotifications();
  }, [fetchPageNotifications]);

  // Sync unreadCount from context when socket updates it
  useEffect(() => {
    setUnreadCount(contextUnreadCount);
  }, [contextUnreadCount]);

  // Sync real-time notifications from context when socket emits new notification
  useEffect(() => {
    if (contextNotifications && contextNotifications.length > 0) {
      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n._id?.toString()));
        const newItems = contextNotifications.filter(n => !existingIds.has(n._id?.toString()));
        if (newItems.length > 0) {
          return [...newItems, ...prev];
        }
        return prev;
      });
    }
  }, [contextNotifications]);

  // Handle Mark All as Read (TOP BUTTON)
  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await markAllRead();
      // Update local state immediately: set every notification to read
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date()
        }))
      );
      setUnreadCount(0);
      fetchUnreadCount();
    } catch (err) {
      console.error('Mark all read error:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  // Handle Individual Mark as Read
  const handleSingleMarkRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await markRead(id);
      // Immediately update local state
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      fetchUnreadCount();
    } catch (err) {
      console.error('Single mark read error:', err);
    }
  };

  // Handle Individual Delete
  const handleDeleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    setDeletingId(id);
    try {
      const success = await deleteNotification(id);
      if (success) {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
      }
    } catch (err) {
      console.error('Delete notification error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Handle Clear All Notifications
  const handleConfirmClearAll = async () => {
    setShowClearModal(false);
    try {
      const success = await clearAllNotifications();
      if (success) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Clear all error:', err);
    }
  };

  // Navigate to linked service request if present
  const handleNotificationClick = async (n) => {
    if (!n.isRead) {
      await handleSingleMarkRead(n._id);
    }
    if (n.request) {
      const reqId = n.request._id || n.request.requestId || n.request;
      const targetPath = user?.role === 'STAFF' ? `/staff/requests/${reqId}` : `/requests/${reqId}`;
      navigate(targetPath);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn font-sans max-w-5xl mx-auto">
      {/* Top Header Row with Clear Actions matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#29252A] tracking-tight">
            Notifications
          </h1>
          <p className="text-xs sm:text-sm text-[#7D7682] font-medium mt-0.5">
            Stay updated with the latest changes and important alerts.
          </p>
        </div>

        {/* TOP ACTION BUTTONS: [ ✓ Mark All as Read ] and [ 🗑 Clear All ] */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleMarkAllAsRead}
            disabled={markingAll || unreadCount === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E5A8AD] text-[#C65F63] hover:bg-[#FDECEF] text-xs font-bold transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Mark all notifications as read"
          >
            <HiOutlineCheck className="text-base" />
            <span>{markingAll ? 'Updating...' : 'Mark All as Read'}</span>
          </button>

          <button
            onClick={() => setShowClearModal(true)}
            disabled={notifications.length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Clear all notifications"
          >
            <HiOutlineTrash className="text-base" />
            <span>Clear All</span>
          </button>

          <button
            onClick={fetchPageNotifications}
            className="p-2.5 rounded-xl bg-white border border-[#EFE7E0] hover:bg-[#FAF6F2] text-[#6B4E71] transition shadow-xs cursor-pointer"
            title="Refresh notifications"
          >
            <HiOutlineRefresh className="text-base" />
          </button>
        </div>
      </div>

      {/* Notifications Card Container */}
      <div className="bg-white border border-[#EFE7E0] rounded-2xl shadow-xs overflow-hidden">
        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#C65F63] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-[#8C8490]">Loading notifications...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-10 text-center space-y-3">
            <p className="text-xs font-semibold text-rose-600">{error}</p>
            <button
              onClick={fetchPageNotifications}
              className="px-4 py-2 rounded-xl bg-[#FAF5F0] text-[#6B4E71] hover:bg-[#FDECEF] text-xs font-bold border border-[#EFE7E0]"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && notifications.length === 0 && (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FAF6F2] text-[#8C8490] flex items-center justify-center mx-auto text-2xl border border-[#EFE7E0]">
              <HiOutlineBell />
            </div>
            <div className="text-sm font-bold text-[#29252A]">No notifications yet</div>
            <p className="text-xs text-[#8C8490]">You're all caught up!</p>
          </div>
        )}

        {/* Notifications List matching screenshot */}
        {!loading && !error && notifications.length > 0 && (
          <div className="divide-y divide-[#F2ECE6]">
            {notifications.map((n) => {
              const isUnread = !n.isRead;
              const relativeTime = getRelativeTime(n.createdAt);

              return (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 sm:p-5 transition flex items-start justify-between gap-4 cursor-pointer hover:bg-[#FAF6F2] ${
                    isUnread
                      ? 'bg-[#FDF7F5] border-l-4 border-[#C65F63]'
                      : 'border-l-4 border-transparent'
                  }`}
                >
                  {/* Left: Unread indicator checkbox/dot + Icon + Title/Message */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Unread circle indicator / checkbox */}
                    <div className="pt-2 shrink-0">
                      {isUnread ? (
                        <div
                          onClick={(e) => handleSingleMarkRead(n._id, e)}
                          className="w-4 h-4 rounded border-2 border-[#C65F63] flex items-center justify-center cursor-pointer hover:bg-[#C65F63]/10"
                          title="Click to mark as read"
                        >
                          <span className="w-2 h-2 rounded-full bg-[#C65F63]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border border-[#EFE7E0] flex items-center justify-center bg-[#FAF6F2]">
                          <HiOutlineCheck className="text-[10px] text-[#8C8490]" />
                        </div>
                      )}
                    </div>

                    {/* Circular Icon in soft pink container */}
                    <div className="w-10 h-10 rounded-full bg-[#FDECEF] text-[#C65F63] flex items-center justify-center shrink-0 shadow-2xs">
                      {getNotificationIcon(n.title, n.type)}
                    </div>

                    {/* Text Details */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xs sm:text-sm font-bold text-[#29252A] tracking-tight">
                          {n.title}
                        </h2>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-[#C65F63] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-[#6B666E] leading-relaxed max-w-2xl">
                        {n.message}
                      </p>
                    </div>
                  </div>

                  {/* Right: Timestamp & Action Buttons */}
                  <div className="flex items-center gap-3 shrink-0 self-center">
                    <span className="text-xs font-medium text-[#8C8490] whitespace-nowrap hidden sm:inline-block">
                      {relativeTime}
                    </span>

                    {/* Individual [Mark as Read] Button */}
                    {isUnread && (
                      <button
                        onClick={(e) => handleSingleMarkRead(n._id, e)}
                        className="px-3.5 py-1.5 rounded-lg border border-[#E5A8AD] text-[#C65F63] hover:bg-[#FDECEF] text-xs font-bold transition whitespace-nowrap cursor-pointer"
                        title="Mark as read"
                      >
                        Mark as Read
                      </button>
                    )}

                    {/* Delete [🗑] Button */}
                    <button
                      onClick={(e) => handleDeleteNotification(n._id, e)}
                      disabled={deletingId === n._id}
                      className="p-1.5 rounded-lg text-[#C65F63] hover:bg-[#FDECEF] transition cursor-pointer disabled:opacity-50"
                      title="Delete notification"
                    >
                      <HiOutlineTrash className="text-base" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Caught-Up Footer matching screenshot */}
        {!loading && !error && notifications.length > 0 && (
          <div className="relative p-8 text-center border-t border-[#EFE7E0] bg-[#FAF8F6] space-y-1 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#FAF6F2] text-[#8C8490] flex items-center justify-center mx-auto mb-1">
              <HiOutlineBell className="text-base" />
            </div>
            <div className="text-xs font-bold text-[#29252A]">No more notifications</div>
            <div className="text-[11px] text-[#8C8490]">You're all caught up!</div>

            {/* Floral graphic watermark at bottom right of card */}
            <div className="absolute -bottom-6 -right-6 pointer-events-none">
              <FloralWatermark className="w-28 h-28" />
            </div>
          </div>
        )}
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-[#29252A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#EFE7E0] space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-[#EFE7E0]">
              <h3 className="text-sm font-bold text-[#29252A]">Clear All Notifications?</h3>
              <button
                onClick={() => setShowClearModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <HiOutlineX className="text-lg" />
              </button>
            </div>
            <p className="text-xs text-[#6B666E]">
              Are you sure you want to clear all your notifications? This will delete them from your notification inbox.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 rounded-xl border border-[#EFE7E0] text-xs font-bold text-[#6B666E]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearAll}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
