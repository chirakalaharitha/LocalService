import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineHome,
  HiOutlineViewGrid,
  HiOutlinePlusCircle,
  HiOutlineGlobe,
  HiOutlineUserGroup,
  HiOutlineBriefcase,
  HiOutlineClipboardList,
  HiOutlineChartBar,
  HiOutlineCog,
  HiOutlineStar,
  HiOutlineMap,
  HiOutlineDocumentDownload,
  HiOutlineOfficeBuilding,
  HiOutlineX
} from 'react-icons/hi';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role;

  const citizenLinks = [
    { to: '/dashboard', label: 'My Dashboard', icon: HiOutlineHome },
    { to: '/requests/create', label: 'Report Issue', icon: HiOutlinePlusCircle },
    { to: '/requests', label: 'My Requests History', icon: HiOutlineClipboardList }
  ];

  const staffLinks = [
    { to: '/staff/dashboard', label: 'Staff Workload', icon: HiOutlineHome },
    { to: '/staff/requests', label: 'Assigned Requests', icon: HiOutlineClipboardList }
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Executive Control', icon: HiOutlineViewGrid },
    { to: '/admin/requests', label: 'Manage Requests', icon: HiOutlineClipboardList },
    { to: '/admin/users', label: 'Citizens & Staff', icon: HiOutlineUserGroup },
    { to: '/admin/departments', label: 'Departments', icon: HiOutlineOfficeBuilding },
    { to: '/admin/analytics', label: 'Analytics & Trends', icon: HiOutlineChartBar },
    { to: '/admin/reports', label: 'Reports & Exports', icon: HiOutlineDocumentDownload },
    { to: '/admin/feedback', label: 'Citizen Reviews', icon: HiOutlineStar },
    { to: '/admin/settings', label: 'System Settings', icon: HiOutlineCog },
    { to: '/admin/activity-logs', label: 'Activity Logs', icon: HiOutlineClipboardList }
  ];

  const links = role === 'ADMIN' ? adminLinks : role === 'STAFF' ? staffLinks : citizenLinks;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 h-full flex-shrink-0 bg-slate-900 border-r border-slate-800 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } transition-transform duration-200 ease-in-out flex flex-col justify-between overflow-y-auto`}
      >
        <div className="p-4 space-y-4">
          <div className="px-3 py-2.5 bg-slate-950 rounded-xl border border-slate-800 relative">
            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="md:hidden absolute top-2 right-2 p-1 text-slate-400 hover:text-white rounded-lg"
              aria-label="Close Sidebar"
            >
              <HiOutlineX className="text-lg" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {role.substring(0, 2)}
              </div>
              <div className="min-w-0 pr-5 md:pr-0">
                <div className="text-xs font-bold text-slate-100 truncate">{user.name}</div>
                <div className="text-[10px] text-teal-400 font-semibold">{user.role} PANEL</div>
              </div>
            </div>

            {/* Municipal Badge */}
            {user.municipality?.name && (
              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] text-blue-300 font-medium">
                <span className="flex-shrink-0">🏛️</span>
                <span className="truncate" title={user.municipality.name}>{user.municipality.name}</span>
              </div>
            )}
          </div>

          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`
                  }
                >
                  <Icon className="text-lg" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
          LocalFix v1.0 • B.Tech CSE Major Project
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

