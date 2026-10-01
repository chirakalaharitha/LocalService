import React from 'react';

const STATUS_CONFIG = {
  PENDING: {
    label: 'Submitted',
    color: 'bg-[#FAF5F0] text-[#29252A] border-[#EFE7E0]'
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    color: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  ASSIGNED: {
    label: 'Assigned',
    color: 'bg-[#E8D7E6] text-[#6B4E71] border-[#6B4E71]/30'
  },
  ACCEPTED: {
    label: 'Staff Accepted',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  RESOLUTION_SUBMITTED: {
    label: 'Resolution Submitted',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200'
  },
  RESOLVED: {
    label: 'Pending Verification',
    color: 'bg-[#FDECEF] text-[#C65F63] border-[#C65F63]/30'
  },
  CITIZEN_VERIFIED: {
    label: 'Closed / Verified',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  CLOSED: {
    label: 'Closed',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-[#FAF5F0] text-[#9E98A2] border-[#EFE7E0]'
  }
};

const StatusBadge = ({ status, className = '' }) => {
  const normStatus = (status || 'PENDING').toUpperCase();
  const config = STATUS_CONFIG[normStatus] || {
    label: normStatus.replace(/_/g, ' '),
    color: 'bg-[#FAF5F0] text-[#6B666E] border-[#EFE7E0]'
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase border ${config.color} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {config.label}
    </span>
  );
};

export default StatusBadge;
