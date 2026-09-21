import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="py-20 text-center space-y-4">
      <div className="text-6xl font-black text-blue-500">404</div>
      <h1 className="text-2xl font-bold text-white">Page Not Found</h1>
      <p className="text-xs text-slate-400">The page or resource you requested could not be found.</p>
      <Link
        to="/"
        className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-lg"
      >
        Return to Home Page
      </Link>
    </div>
  );
};

export default NotFound;

