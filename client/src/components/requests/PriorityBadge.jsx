import React from 'react';

const PRIORITY_CONFIG = {
  CRITICAL: {
    label: 'Critical Priority',
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
  },
  HIGH: {
    label: 'High Priority',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  },
  MEDIUM: {
    label: 'Medium Priority',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  },
  LOW: {
    label: 'Low Priority',
    color: 'bg-slate-800 text-slate-400 border-slate-700'
  }
};

const PriorityBadge = ({ priority, className = '' }) => {
  const normPriority = (priority || 'MEDIUM').toUpperCase();
  const config = PRIORITY_CONFIG[normPriority] || PRIORITY_CONFIG.MEDIUM;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${config.color} ${className}`}
    >
      {config.label}
    </span>
  );
};

export default PriorityBadge;

