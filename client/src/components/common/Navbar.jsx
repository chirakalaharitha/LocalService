import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNotifications } from '../../context/NotificationContext';
import LocalFixLogo from './LocalFixLogo';
import {
  HiOutlineBell,
  HiOutlineUser,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineSearch,
  HiOutlineViewGrid
} from 'react-icons/hi';
import { getProfileImageUrl } from '../../utils/imageUrl';

const Navbar = ({ onToggleSidebar, isDashboard = false }) => {
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

  const dashboardPath = !user
    ? '/dashboard'
    : user.role === 'ADMIN'
    ? '/admin/dashboard'
    : user.role === 'STAFF'
    ? '/staff/dashboard'
    : '/dashboard';

  // Return smoothly to top of home page
  const handleHomeClick = (e) => {
    if (e) e.preventDefault();
    setMobileNavOpen(false);

    if (location.pathname === '/') {
      // Clear hash if present in browser URL
      if (location.hash || window.location.hash) {
        navigate('/', { replace: true });
      }
      const heroEl = document.getElementById('home');
      if (heroEl) {
        heroEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    } else {
      navigate('/');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      });
    }
  };

  // Smooth scroll handler for home page sections
  const handleSectionClick = (e, sectionId) => {
    e.preventDefault();
    setMobileNavOpen(false);

    if (location.pathname === '/') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        navigate(`/#${sectionId}`, { replace: true });
      }
    } else {
      navigate(`/#${sectionId}`);
    }
  };

  // AUTHENTICATED DASHBOARD HEADER (Used within sidebar layout)
  if (user && isDashboard) {
    return (
      <header className="bg-white border-b border-[#EFE7E0] sticky top-0 z-30 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between shadow-xs">
        {/* Left: Mobile Sidebar Toggle & Search Bar */}
        <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
          <button
            onClick={onToggleSidebar}
            className="md:hidden text-[#29252A] p-1.5 rounded-xl hover:bg-[#FAF5F0] border border-[#EFE7E0] transition"
            aria-label="Toggle Navigation Sidebar"
          >
            <HiOutlineMenu className="text-2xl" />
          </button>

          <div className="hidden md:flex items-center relative w-80 lg:w-[420px]">
            <HiOutlineSearch className="absolute left-3.5 top-2.5 text-[#9E98A2] text-base" />
            <input
              type="text"
              placeholder="Search requests, locations, or categories..."
              className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 pl-10 pr-4 text-xs text-[#29252A] placeholder-[#9E98A2] shadow-xs focus:outline-none focus:border-[#C65F63] focus:bg-white focus:ring-2 focus:ring-[#C65F63]/10 transition"
            />
          </div>

          <div className="md:hidden flex items-center gap-2">
            <LocalFixLogo size="sm" to={dashboardPath} />
          </div>
        </div>

        {/* Right: Notifications & User Profile Card */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">

          {/* Notifications Bell Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-2 rounded-full bg-[#FAF5F0] border border-[#EFE7E0] text-[#29252A] hover:text-[#C65F63] shadow-xs hover:border-[#C65F63]/30 transition"
              aria-label="Notifications"
            >
              <HiOutlineBell className="text-xl" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C65F63] text-white text-[10px] font-bold flex items-center justify-center shadow-md">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#EFE7E0] rounded-2xl shadow-2xl p-4 z-50 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-[#EFE7E0]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#29252A]">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FDECEF] text-[#C65F63]">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-[#C65F63] hover:underline font-semibold cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[#EFE7E0] my-2">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#9E98A2]">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((n) => (
                      <div
                        key={n._id}
                        onClick={() => markRead(n._id)}
                        className={`p-3 text-xs cursor-pointer hover:bg-[#FAF5F0] rounded-xl transition ${
                          !n.isRead ? 'bg-[#FDECEF]/40 font-semibold' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#29252A]">{n.title}</span>
                          <span className="text-[10px] text-[#9E98A2]">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B666E] mt-1 line-clamp-2">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-[#EFE7E0] text-center">
                  <Link
                    to="/notifications"
                    onClick={() => setShowNotifDropdown(false)}
                    className="text-xs font-bold text-[#6B4E71] hover:text-[#C65F63] transition"
                  >
                    View All Notifications →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1 rounded-full hover:bg-[#FAF5F0] transition"
            >
              <div className="w-9 h-9 rounded-full bg-[#FAF5F0] border border-[#EFE7E0] overflow-hidden flex items-center justify-center text-xs font-bold text-[#6B4E71] shadow-xs">
                {user.profileImage ? (
                  <img
                    src={getProfileImageUrl(user.profileImage)}
                    alt={user.name || 'User'}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <span>{user.name ? user.name[0].toUpperCase() : 'U'}</span>
                )}
              </div>
              <div className="hidden sm:block text-left text-xs leading-tight">
                <div className="font-bold text-[#29252A] truncate max-w-[130px]">{user.name || 'Staff User'}</div>
                <div className="text-[11px] text-[#6B666E] capitalize font-medium">
                  {user.role === 'STAFF' ? 'Staff' : user.role === 'ADMIN' ? 'Admin' : 'Citizen'}
                </div>
              </div>
              <svg className="w-3.5 h-3.5 text-[#9E98A2] hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#EFE7E0] rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn">
                <Link
                  to="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#29252A] hover:bg-[#FAF5F0] rounded-xl transition"
                >
                  <HiOutlineUser className="text-base" />
                  <span>My Profile</span>
                </Link>
                <Link
                  to={dashboardPath}
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#29252A] hover:bg-[#FAF5F0] rounded-xl transition"
                >
                  <HiOutlineViewGrid className="text-base" />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#C65F63] hover:bg-[#FDECEF] rounded-xl transition"
                >
                  <HiOutlineLogout className="text-base" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  // PUBLIC WEBSITE NAVBAR (Home, Services, How It Works, About, Auth)
  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-[#EFE7E0] sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-3">
        {/* Left: LocalFix logo */}
        <LocalFixLogo size="sm" to="/" onClick={handleHomeClick} />

        {/* Center: Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-xs sm:text-sm font-bold text-[#6B4E71]">
          <a
            href="/"
            onClick={handleHomeClick}
            className={`transition cursor-pointer ${
              location.pathname === '/' && !location.hash ? 'text-[#C65F63]' : 'hover:text-[#C65F63]'
            }`}
          >
            Home
          </a>
          <a
            href="/#services"
            onClick={(e) => handleSectionClick(e, 'services')}
            className={`transition ${location.hash === '#services' ? 'text-[#C65F63]' : 'hover:text-[#C65F63]'}`}
          >
            Services
          </a>
          <a
            href="/#how-it-works"
            onClick={(e) => handleSectionClick(e, 'how-it-works')}
            className={`transition ${location.hash === '#how-it-works' ? 'text-[#C65F63]' : 'hover:text-[#C65F63]'}`}
          >
            How It Works
          </a>
          <a
            href="/#about"
            onClick={(e) => handleSectionClick(e, 'about')}
            className={`transition ${location.hash === '#about' ? 'text-[#C65F63]' : 'hover:text-[#C65F63]'}`}
          >
            About
          </a>
        </nav>

        {/* Right: Auth State actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link
                to={dashboardPath}
                className="px-4 py-2 rounded-full text-xs font-bold text-[#6B4E71] hover:text-[#29252A] transition flex items-center gap-1.5 bg-[#FAF5F0] border border-[#EFE7E0]"
              >
                <HiOutlineViewGrid className="text-sm text-[#C65F63]" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/profile"
                className="px-4 py-2 rounded-full text-xs font-bold text-[#6B4E71] hover:text-[#29252A] transition flex items-center gap-1.5"
              >
                <HiOutlineUser className="text-sm" />
                <span>Profile</span>
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-full text-xs font-bold text-[#C65F63] hover:bg-[#FDECEF] transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              {location.pathname === '/login' ? (
                <Link
                  to="/register"
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#C65F63] hover:bg-[#B35256] text-white shadow-md shadow-[#C65F63]/25 transition"
                >
                  Create Account
                </Link>
              ) : location.pathname === '/register' || location.pathname.startsWith('/forgot-password') || location.pathname.startsWith('/reset-password') || location.pathname.startsWith('/verify') ? (
                <Link
                  to="/login"
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#C65F63] hover:bg-[#B35256] text-white shadow-md shadow-[#C65F63]/25 transition"
                >
                  Login
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 rounded-full text-xs font-bold text-[#6B4E71] hover:text-[#C65F63] transition"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#C65F63] hover:bg-[#B35256] text-white shadow-md shadow-[#C65F63]/25 transition"
                  >
                    Create Account
                  </Link>
                </>
              )}
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="md:hidden text-[#29252A] p-2 rounded-xl border border-[#EFE7E0] bg-[#FAF5F0] hover:bg-white transition"
          aria-label="Toggle navigation menu"
        >
          {mobileNavOpen ? <HiOutlineX className="text-2xl" /> : <HiOutlineMenu className="text-2xl" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="md:hidden bg-white border-b border-[#EFE7E0] p-5 space-y-4 shadow-xl animate-fadeIn">
          <div className="flex flex-col space-y-3 font-semibold text-sm text-[#29252A]">
            <a
              href="/"
              onClick={handleHomeClick}
              className={`py-1 cursor-pointer ${
                location.pathname === '/' && !location.hash ? 'text-[#C65F63]' : 'hover:text-[#C65F63]'
              }`}
            >
              Home
            </a>
            <a
              href="/#services"
              onClick={(e) => handleSectionClick(e, 'services')}
              className="py-1 hover:text-[#C65F63]"
            >
              Services
            </a>
            <a
              href="/#how-it-works"
              onClick={(e) => handleSectionClick(e, 'how-it-works')}
              className="py-1 hover:text-[#C65F63]"
            >
              How It Works
            </a>
            <a
              href="/#about"
              onClick={(e) => handleSectionClick(e, 'about')}
              className="py-1 hover:text-[#C65F63]"
            >
              About
            </a>
          </div>

          <div className="pt-3 border-t border-[#EFE7E0] flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  to={dashboardPath}
                  onClick={() => setMobileNavOpen(false)}
                  className="w-full py-2.5 text-center text-xs font-bold bg-[#C65F63] text-white rounded-xl shadow-sm"
                >
                  Go to Dashboard
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/profile"
                    onClick={() => setMobileNavOpen(false)}
                    className="py-2 text-center text-xs font-bold border border-[#EFE7E0] rounded-xl text-[#29252A]"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      setMobileNavOpen(false);
                      handleLogout();
                    }}
                    className="py-2 text-center text-xs font-bold text-[#C65F63] border border-[#FDECEF] bg-[#FDECEF] rounded-xl"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileNavOpen(false)}
                  className="py-2.5 text-center text-xs font-bold border border-[#EFE7E0] rounded-xl text-[#29252A] hover:bg-[#FAF5F0]"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileNavOpen(false)}
                  className="py-2.5 text-center text-xs font-bold bg-[#C65F63] text-white rounded-xl shadow-md shadow-[#C65F63]/20"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
