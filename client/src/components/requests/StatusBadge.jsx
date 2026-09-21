import React from 'react';

const STATUS_CONFIG = {
  PENDING: {
    label: 'Submitted',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  },
  ASSIGNED: {
    label: 'Assigned',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  },
  ACCEPTED: {
    label: 'Staff Accepted',
    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'bg-teal-500/20 text-teal-400 border-teal-500/30'
  },
  RESOLUTION_SUBMITTED: {
    label: 'Resolution Submitted',
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
  },
  RESOLVED: {
    label: 'Pending Verification',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  },
  CITIZEN_VERIFIED: {
    label: 'Closed / Verified',
    color: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40'
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-slate-800 text-slate-400 border-slate-700'
  }
};

const StatusBadge = ({ status, className = '' }) => {
  const normStatus = (status || 'PENDING').toUpperCase();
  const config = STATUS_CONFIG[normStatus] || {
    label: normStatus.replace(/_/g, ' '),
    color: 'bg-slate-800 text-slate-300 border-slate-700'
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase border ${config.color} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {config.label}
    </span>
  );
};

export default StatusBadge;

