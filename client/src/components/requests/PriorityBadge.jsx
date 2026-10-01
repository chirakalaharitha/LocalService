import React from 'react';

const PRIORITY_CONFIG = {
  CRITICAL: {
    label: 'Critical Priority',
    color: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  HIGH: {
    label: 'High Priority',
    color: 'bg-[#FDECEF] text-[#C65F63] border-[#C65F63]/30'
  },
  MEDIUM: {
    label: 'Medium Priority',
    color: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  LOW: {
    label: 'Low Priority',
    color: 'bg-[#FAF5F0] text-[#6B666E] border-[#EFE7E0]'
  }
};

const PriorityBadge = ({ priority, className = '' }) => {
  const normPriority = (priority || 'MEDIUM').toUpperCase();
  const config = PRIORITY_CONFIG[normPriority] || PRIORITY_CONFIG.MEDIUM;

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase border ${config.color} ${className}`}
    >
      {config.label}
    </span>
  );
};

export default PriorityBadge;
