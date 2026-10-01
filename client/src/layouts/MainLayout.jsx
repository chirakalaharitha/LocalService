import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import Footer from '../components/common/Footer';
import { useAuth } from '../context/AuthContext';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const authRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/verify-reset-otp',
    '/reset-password',
    '/verify-email'
  ];

  const isAuthPage = authRoutes.includes(location.pathname);
  const isDashboardLayout = Boolean(user) && !isAuthPage && location.pathname !== '/';
  const isAdmin = user?.role === 'ADMIN';

  // AUTHENTICATION PAGES LAYOUT (Top Navbar + Centered Fixed Layout)
  if (isAuthPage) {
    return (
      <div className="h-screen w-full overflow-hidden bg-[#FAF5F0] text-[#29252A] font-sans flex flex-col">
        <Navbar onToggleSidebar={() => {}} isDashboard={false} />
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <Outlet />
        </main>
      </div>
    );
  }

  // AUTHENTICATED DASHBOARD LAYOUT (Plum Sidebar + Dashboard Topbar)
  if (isDashboardLayout) {
    return (
      <div className="h-screen w-full overflow-hidden bg-[#FAF5F0] text-[#29252A] flex font-sans">
        {/* Left Dark Plum Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} isDashboard={true} />

          {/* Scrollable Main Content */}
          <main className="flex-1 h-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 min-w-0 bg-[#FAF5F0]">
            <div className={isAdmin ? 'max-w-[1720px] mx-auto w-full' : 'max-w-7xl mx-auto w-full'}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // PUBLIC WEBSITE LAYOUT (Home, Services)
  return (
    <div className="min-h-screen bg-[#FAF5F0] text-[#29252A] flex flex-col font-sans">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} isDashboard={false} />

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default MainLayout;
