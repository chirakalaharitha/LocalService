import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import Footer from '../components/common/Footer';
import { useAuth } from '../context/AuthContext';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  const isAuthLayout = Boolean(user);
  const isAdmin = user?.role === 'ADMIN';

  if (isAuthLayout) {
    return (
      <div className="h-screen w-full overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* Fixed Admin Topbar */}
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Layout Body: Fixed Sidebar + Scrollable Main Content */}
        <div className="flex-1 flex w-full overflow-hidden relative">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          
          {/* Scrollable Main Content Container */}
          <main className="flex-1 h-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 min-w-0">
            <div className={isAdmin ? 'max-w-[1720px] mx-auto w-full' : 'max-w-7xl mx-auto w-full'}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
        <div className="max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MainLayout;


