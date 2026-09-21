import React from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineExclamationCircle, HiOutlineArrowLeft } from 'react-icons/hi';

const RequestNotFound = ({ message = 'The service request you are looking for does not exist or is no longer available.' }) => {
  return (
    <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mx-auto">
        <HiOutlineExclamationCircle />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Request Not Found</h1>
        <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
      </div>

      <div>
        <Link
          to="/my-requests"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition"
        >
          <HiOutlineArrowLeft />
          <span>Back to My Requests</span>
        </Link>
      </div>
    </div>
  );
};

export default RequestNotFound;

