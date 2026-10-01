import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { getProfileImageUrl } from '../../utils/imageUrl';
import LocalFixLogo from './LocalFixLogo';
import {
  HiOutlineHome,
  HiOutlineViewGrid,
  HiOutlineClipboardList,
  HiOutlineUserGroup,
  HiOutlineOfficeBuilding,
  HiOutlineChartBar,
  HiOutlineDocumentDownload,
  HiOutlineStar,
  HiOutlineCog,
  HiOutlineBell,
  HiOutlineUser,
  HiOutlineLogout,
  HiOutlineX,
  HiOutlinePencilAlt,
  HiOutlineBriefcase
} from 'react-icons/hi';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [user?.profileImage]);

  if (!user) return null;

  const role = user.role;
  const profileImageUrl = getProfileImageUrl(user.profileImage);
  const avatarInitials = user.name?.trim()
    ? user.name
        .trim()
        .split(/\s+/)
        .map(p => p[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'U';

  const citizenLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
    { to: '/services', label: 'Services', icon: HiOutlineViewGrid },
    { to: '/requests/create', label: 'Report Issue', icon: HiOutlinePencilAlt },
    { to: '/requests', label: 'My Requests', icon: HiOutlineClipboardList },
    { to: '/notifications', label: 'Notifications', icon: HiOutlineBell, badge: unreadCount > 0 ? unreadCount : null },
    { to: '/profile', label: 'Profile', icon: HiOutlineUser },
    { to: '/settings', label: 'Settings', icon: HiOutlineCog }
  ];

  const staffLinks = [
    { to: '/staff/dashboard', label: 'Staff Dashboard', icon: HiOutlineHome },
    { to: '/staff/requests', label: 'Assigned Requests', icon: HiOutlineClipboardList },
    { to: '/staff/my-work', label: 'My Work', icon: HiOutlineBriefcase },
    { to: '/notifications', label: 'Notifications', icon: HiOutlineBell, badge: unreadCount > 0 ? unreadCount : null },
    { to: '/profile', label: 'Profile', icon: HiOutlineUser },
    { to: '/staff/settings', label: 'Settings', icon: HiOutlineCog }
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: HiOutlineViewGrid },
    { to: '/admin/requests', label: 'Requests', icon: HiOutlineClipboardList },
    { to: '/admin/users', label: 'Users & Staff', icon: HiOutlineUserGroup },
    { to: '/admin/departments', label: 'Departments', icon: HiOutlineOfficeBuilding },
    { to: '/admin/analytics', label: 'Analytics', icon: HiOutlineChartBar },
    { to: '/admin/reports', label: 'Reports', icon: HiOutlineDocumentDownload },
    { to: '/admin/feedback', label: 'Feedback', icon: HiOutlineStar },
    { to: '/admin/settings', label: 'Settings', icon: HiOutlineCog },
    { to: '/admin/activity-logs', label: 'Activity Logs', icon: HiOutlineClipboardList }
  ];

  const links = role === 'ADMIN' ? adminLinks : role === 'STAFF' ? staffLinks : citizenLinks;
  const brandLink = role === 'ADMIN' ? '/admin/dashboard' : role === 'STAFF' ? '/staff/dashboard' : '/dashboard';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Strict path-matching logic
  const isLinkActive = (targetTo) => {
    const path = location.pathname;

    if (targetTo === '/requests/create') {
      return path === '/requests/create' || path === '/create-request';
    }

    if (targetTo === '/requests') {
      if (path === '/requests/create' || path === '/create-request') return false;
      return path === '/requests' || path === '/my-requests';
    }

    if (targetTo === '/services') {
      return path === '/services' || path === '/dashboard/services';
    }

    if (targetTo === '/staff/dashboard') {
      return path === '/staff/dashboard';
    }

    if (targetTo === '/staff/requests') {
      return path === '/staff/requests' || path === '/staff/assigned-requests';
    }

    if (targetTo === '/staff/my-work') {
      return path === '/staff/my-work';
    }

    if (targetTo === '/staff/settings') {
      return path === '/staff/settings';
    }

    if (targetTo === '/settings') {
      return path === '/settings';
    }

    if (targetTo === '/profile') {
      return path === '/profile';
    }

    if (targetTo === '/notifications') {
      return path === '/notifications';
    }

    if (targetTo === '/dashboard') {
      return path === '/dashboard';
    }

    if (targetTo === '/admin/dashboard') {
      return path === '/admin/dashboard';
    }

    if (targetTo === '/admin/requests') {
      return path.startsWith('/admin/requests');
    }

    return path === targetTo;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-[#29252A]/60 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 h-full flex-shrink-0 bg-[#3B283E] border-r border-[#4A324E] transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } transition-transform duration-200 ease-in-out flex flex-col justify-between overflow-hidden shadow-xl select-none`}
      >
        {/* Brand Header with LocalFixLogo */}
        <div className="p-5 pb-5 flex items-center justify-between border-b border-[#4A324E]/70">
          <LocalFixLogo size="sm" light={true} to={brandLink} />

          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-[#E8D7E6] hover:text-white rounded-xl hover:bg-[#4E354F] transition"
            aria-label="Close Navigation Sidebar"
          >
            <HiOutlineX className="text-xl" />
          </button>
        </div>

        {/* Role Portal Subheader for Admin only */}
        {role === 'ADMIN' && (
          <div className="px-6 py-2 bg-[#312033] text-[10px] uppercase font-bold tracking-wider text-[#E8D7E6]/70 border-b border-[#4A324E]/50 flex items-center justify-between">
            <span>Admin Portal</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#C65F63]"></span>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isLinkActive(link.to);

            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                  active
                    ? 'bg-[#C65F63] text-white shadow-md shadow-[#C65F63]/30 font-bold'
                    : 'text-[#C4B5C3] hover:bg-[#4E354F] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Icon className={`text-xl shrink-0 ${active ? 'text-white' : 'text-[#C4B5C3]'}`} />
                  <span className="truncate">{link.label}</span>
                </div>
                {link.badge && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-[#C65F63] text-white shadow-sm border border-white/20">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Identity & Avatar Card + Logout Footer */}
        <div className="p-3.5 border-t border-[#4A324E]/70 space-y-2 bg-[#312033]/60">
          <Link
            to="/profile"
            onClick={onClose}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#4E354F] transition group"
            title="View User Profile"
          >
            {/* User Avatar (Real Uploaded Profile Image or Fallback Initials) */}
            <div className="w-10 h-10 rounded-full bg-[#4E354F] border border-[#6B4E71] overflow-hidden flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0 relative">
              {profileImageUrl && !imgError ? (
                <img
                  src={profileImageUrl}
                  alt={user.name || 'User'}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <span className="font-bold tracking-wider">{avatarInitials}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-bold text-xs text-white truncate group-hover:text-[#FDECEF] transition">
                {user.name || 'User'}
              </div>
              <div className="text-[10px] text-[#C4B5C3] truncate capitalize flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5C9A72] shrink-0"></span>
                <span className="truncate">
                  {user.role === 'STAFF' ? 'Staff' : user.role === 'ADMIN' ? 'Admin' : 'Citizen'}
                </span>
              </div>
            </div>
          </Link>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#C4B5C3] hover:bg-[#4E354F] hover:text-white transition-all duration-150"
          >
            <HiOutlineLogout className="text-lg shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
