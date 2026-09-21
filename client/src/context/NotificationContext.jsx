import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import API from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  // Fetch unread count directly from MongoDB
  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await API.get('/notifications/unread-count');
      if (res.data?.success) {
        setUnreadCount(typeof res.data.count === 'number' ? res.data.count : (res.data.unreadCount || 0));
      }
    } catch (err) {
      console.warn('[NotificationContext] Failed to fetch unread count:', err.message);
    }
  }, [user]);

  // Fetch paginated notifications
  const fetchNotifications = useCallback(async (page = 1, limit = 20) => {
    if (!user) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      const res = await API.get(`/notifications?page=${page}&limit=${limit}`);
      if (res.data?.success) {
        setNotifications(res.data.notifications || []);
        if (typeof res.data.unreadCount === 'number') {
          setUnreadCount(res.data.unreadCount);
        }
        setPagination({
          page: res.data.page || page,
          limit: res.data.limit || limit,
          total: res.data.total || 0,
          pages: res.data.pages || 1
        });
      }
    } catch (err) {
      console.error('[NotificationContext] Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load initial notifications and unread count on login
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications, fetchUnreadCount]);

  // Real-time socket delivery listener with duplicate suppression
  useEffect(() => {
    if (!socket || !user) return;

    const handleIncomingNotification = (payload) => {
      // Handle both { notification: {...} } and direct {...} payloads
      const notif = payload?.notification || payload;
      if (!notif || !notif._id) return;

      // Duplicate prevention: check if this notification is already in state
      setNotifications(prev => {
        const exists = prev.some(item => item._id.toString() === notif._id.toString());
        if (exists) {
          return prev;
        }
        return [notif, ...prev];
      });

      // Increment unread count if notification is unread
      if (!notif.isRead) {
        setUnreadCount(prev => prev + 1);
      }

      // Show toast alert
      toast.info(`🔔 ${notif.title}: ${notif.message}`, {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        theme: 'dark'
      });
    };

    // Listen to Phase 10 standard event and legacy fallback
    socket.on('notification:new', handleIncomingNotification);
    socket.on('newNotification', handleIncomingNotification);

    return () => {
      socket.off('notification:new', handleIncomingNotification);
      socket.off('newNotification', handleIncomingNotification);
    };
  }, [socket, user]);

  // Mark single notification as read
  const markRead = async (id) => {
    if (!id) return;
    try {
      // Support PATCH and fallback to PUT
      try {
        await API.patch(`/notifications/${id}/read`);
      } catch (patchErr) {
        await API.put(`/notifications/${id}/read`);
      }

      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true, readAt: new Date() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[NotificationContext] Error marking notification as read:', err);
    }
  };

  // Mark all notifications as read
  const markAllRead = async () => {
    try {
      try {
        await API.patch('/notifications/read-all');
      } catch (patchErr) {
        await API.put('/notifications/read-all');
      }

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date() })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[NotificationContext] Error marking all as read:', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        pagination,
        markRead,
        markAllRead,
        fetchNotifications,
        fetchUnreadCount
      }}
    >
      {children}
      <ToastContainer theme="dark" position="bottom-right" />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export default NotificationContext;
