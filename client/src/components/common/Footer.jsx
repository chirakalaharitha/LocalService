import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="font-bold text-slate-200">LocalFix Platform</span> – Smart Local Service Request & Tracking System
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Municipal Service Hotline: 1800-LOCAL-FIX</span>
          <span>•</span>
          <span>© 2026 B.Tech Major Project</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

