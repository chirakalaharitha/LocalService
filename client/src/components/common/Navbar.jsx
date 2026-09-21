import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNotifications } from '../../context/NotificationContext';
import { HiOutlineBell, HiOutlineUser, HiOutlineLogout, HiOutlineMenu, HiOutlineX } from 'react-icons/hi';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { connectionStatus } = useSocket();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const brandLink = !user
    ? '/'
    : user.role === 'ADMIN'
    ? '/admin/dashboard'
    : user.role === 'STAFF'
    ? '/staff/dashboard'
    : '/dashboard';

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left Branding & Mobile Toggle */}
        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={onToggleSidebar}
              className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
              aria-label="Toggle Navigation Sidebar"
            >
              <HiOutlineMenu className="text-2xl" />
            </button>
          ) : (
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
              aria-label="Toggle Navigation Menu"
            >
              {mobileNavOpen ? <HiOutlineX className="text-2xl" /> : <HiOutlineMenu className="text-2xl" />}
            </button>
          )}

          <Link to={brandLink} className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-base font-black text-white">LF</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white leading-none">LocalFix</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                {user?.role === 'ADMIN' ? 'MUNICIPAL PORTAL' : 'SMART CIVIC PLATFORM'}
              </span>
            </div>
          </Link>
        </div>

        {/* Center Navigation / Dynamic Municipal Jurisdiction Badge */}
        {user?.role === 'ADMIN' ? (
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 shadow-inner">
            <span className="text-base">🏛️</span>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold text-slate-200 leading-tight">
                {user.municipality?.name || 'Municipal Control Center'}
              </span>
              <span className="text-[9px] text-blue-400 font-semibold tracking-wider uppercase">
                {user.municipality?.code ? `${user.municipality.code} • Administrative Jurisdiction` : 'Administrative Control Center'}
              </span>
            </div>
          </div>
        ) : !user ? (
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
            <Link to="/" className={`hover:text-white transition ${location.pathname === '/' ? 'text-blue-400 font-bold' : ''}`}>
              Home
            </Link>
            <a href="/#how-it-works" className="hover:text-white transition">
              How It Works
            </a>
            <a href="/#services" className="hover:text-white transition">
              Services
            </a>
          </nav>
        ) : user?.role === 'CITIZEN' ? (
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
            <Link to="/dashboard" className="hover:text-white transition">
              My Requests
            </Link>
            <Link to="/requests/create" className="hover:text-white transition">
              Report Issue
            </Link>
            <Link to="/services" className="hover:text-white transition">
              Services
            </Link>
          </nav>
        ) : null}

        {/* Right Authentication & Notifications */}
        <div className="flex items-center gap-3">
          
          {user ? (
            <>
              {/* Real-time Socket Connection Status Badge */}
              <div className="flex items-center">
                {connectionStatus === 'connected' && (
                  <span
                    title="Real-Time Connected"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="hidden sm:inline">Live</span>
                  </span>
                )}
                {(connectionStatus === 'connecting' || connectionStatus === 'reconnecting') && (
                  <span
                    title="Reconnecting to real-time server..."
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span className="hidden sm:inline">Reconnecting...</span>
                  </span>
                )}
                {connectionStatus === 'disconnected' && (
                  <span
                    title="Real-Time Server Disconnected"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    <span className="hidden sm:inline">Offline</span>
                  </span>
                )}
              </div>

              {/* Notification Bell Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`View Notifications (${unreadCount} unread)`}
                  aria-expanded={showNotifDropdown}
                  aria-haspopup="true"
                >
                  <HiOutlineBell className="text-xl" />
                  {unreadCount > 0 && (
                    <span
                      className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse"
                      title={`${unreadCount} unread notifications`}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifDropdown && (
                  <div
                    className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fadeIn"
                    role="region"
                    aria-label="Recent notifications"
                  >
                    <div className="p-3 border-b border-slate-700 flex items-center justify-between bg-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 font-semibold px-2 py-0.5 rounded-full border border-blue-500/30">
                            {unreadCount} New
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline font-semibold focus:outline-none"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-700/50">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-500">
                          <p className="font-medium text-slate-400">You're all caught up.</p>
                          <p className="text-[11px] mt-0.5">No notifications yet.</p>
                        </div>
                      ) : (
                        notifications.slice(0, 8).map((n) => {
                          const reqId = n.request?._id || n.request;
                          const targetPath = user?.role === 'STAFF'
                            ? `/staff/requests/${reqId}`
                            : `/requests/${reqId}`;

                          return (
                            <div
                              key={n._id}
                              onClick={() => {
                                markRead(n._id);
                                if (reqId) {
                                  navigate(targetPath);
                                }
                                setShowNotifDropdown(false);
                              }}
                              className={`p-3 text-xs cursor-pointer hover:bg-slate-700/60 transition ${
                                !n.isRead
                                  ? 'bg-blue-900/20 border-l-4 border-blue-500'
                                  : 'border-l-4 border-transparent opacity-80'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                                  {!n.isRead && (
                                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block flex-shrink-0" />
                                  )}
                                  <span className="line-clamp-1">{n.title}</span>
                                </div>
                                <span className="text-[10px] text-slate-500 flex-shrink-0">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                {n.message}
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-700/30 text-[10px]">
                                <span className={!n.isRead ? 'text-blue-400 font-medium' : 'text-slate-500'}>
                                  {!n.isRead ? '● Unread' : 'Read'}
                                </span>
                                {reqId && (
                                  <span className="text-blue-400 hover:underline">
                                    View details →
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <Link
                      to="/notifications"
                      onClick={() => setShowNotifDropdown(false)}
                      className="block text-center p-2.5 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-950 hover:text-white border-t border-slate-700 transition"
                    >
                      View All Notifications →
                    </Link>
                  </div>
                )}
              </div>

              {/* User Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold text-xs uppercase">
                    {user.name ? user.name.substring(0, 2) : 'US'}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-200 line-clamp-1">{user.name}</span>
                    <span className="text-[10px] text-teal-400 font-bold uppercase">{user.role}</span>
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 text-xs">
                    <div className="px-3 py-2 border-b border-slate-700">
                      <div className="font-bold text-slate-200">{user.name}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{user.email}</div>
                      {user.municipality?.name && (
                        <div className="text-[10px] text-teal-400 mt-1 flex items-center gap-1 font-medium">
                          <span>🏛️</span>
                          <span className="truncate">{user.municipality.name}</span>
                        </div>
                      )}
                    </div>
                    <Link
                      to={user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'STAFF' ? '/staff/dashboard' : '/dashboard'}
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-700"
                    >
                      <span>Dashboard</span>
                    </Link>
                    {user.role === 'ADMIN' && (
                      <Link
                        to="/admin/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-700"
                      >
                        <span>Jurisdiction Settings</span>
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-700"
                    >
                      <HiOutlineUser />
                      <span>My Profile</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-slate-700"
                    >
                      <HiOutlineLogout />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <Link
                to="/login"
                className="px-3.5 py-2 rounded-xl text-slate-300 hover:text-white font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/20"
              >
                Register
              </Link>
            </div>
          )}

        </div>
      </div>

      {/* Guest Mobile Navigation Drawer */}
      {!user && mobileNavOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 space-y-2 text-xs font-medium text-slate-300">
          <Link
            to="/"
            onClick={() => setMobileNavOpen(false)}
            className="block py-2 px-3 rounded-lg hover:bg-slate-800"
          >
            Home
          </Link>
          <a
            href="/#how-it-works"
            onClick={() => setMobileNavOpen(false)}
            className="block py-2 px-3 rounded-lg hover:bg-slate-800"
          >
            How It Works
          </a>
          <a
            href="/#services"
            onClick={() => setMobileNavOpen(false)}
            className="block py-2 px-3 rounded-lg hover:bg-slate-800"
          >
            Services
          </a>
          <div className="pt-2 flex gap-2 border-t border-slate-800">
            <Link
              to="/login"
              onClick={() => setMobileNavOpen(false)}
              className="flex-1 text-center py-2 rounded-xl bg-slate-800 text-slate-200"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileNavOpen(false)}
              className="flex-1 text-center py-2 rounded-xl bg-blue-600 text-white font-bold"
            >
              Register
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
