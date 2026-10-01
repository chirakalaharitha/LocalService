import React, { useState, useEffect } from 'react';
import { HiOutlineClock, HiOutlineExclamationCircle, HiOutlineCheckCircle } from 'react-icons/hi';

/**
 * RequestSlaTimer
 * Single controlled SLA countdown component based strictly on stored backend deadline.
 * Does NOT reset on re-render, tab changes, or socket events.
 */
const RequestSlaTimer = ({ request, compact = false }) => {
  if (!request?.slaDeadline) {
    return <span className="text-[#9E98A2] italic text-xs">No SLA set</span>;
  }

  const isTerminal = ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED', 'REJECTED'].includes(request.status);

  // Helper to compute remaining milliseconds
  const getDiff = () => {
    const deadlineMs = new Date(request.slaDeadline).getTime();
    return deadlineMs - Date.now();
  };

  const [diff, setDiff] = useState(getDiff);

  useEffect(() => {
    // If request is already resolved or closed, no need for active countdown
    if (isTerminal) return;

    // Immediately calculate diff once
    setDiff(getDiff());

    // Single controlled 1-second interval
    const interval = setInterval(() => {
      setDiff(getDiff());
    }, 1000);

    return () => clearInterval(interval);
  }, [request.slaDeadline, isTerminal]);

  // Terminal state display
  if (isTerminal) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <HiOutlineCheckCircle className="text-sm" />
        <span>Resolved</span>
      </span>
    );
  }

  const isOverdue = diff <= 0;
  const absDiff = Math.abs(diff);

  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((absDiff / (1000 * 60)) % 60);
  const seconds = Math.floor((absDiff / 1000) % 60);

  const formattedTime = days > 0
    ? `${days}d ${hours}h ${minutes}m ${seconds}s`
    : `${hours}h ${minutes}m ${seconds}s`;

  // Near breach: less than 4 hours remaining
  const isNearBreach = !isOverdue && diff < 4 * 60 * 60 * 1000;

  let colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let Icon = HiOutlineClock;

  if (isOverdue) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 font-black';
    Icon = HiOutlineExclamationCircle;
  } else if (isNearBreach) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
    Icon = HiOutlineClock;
  }

  if (compact) {
    return (
      <span
        title={`SLA Target: ${new Date(request.slaDeadline).toLocaleString()}`}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono border ${colorClasses}`}
      >
        <Icon className={`text-xs ${isNearBreach || isOverdue ? 'animate-pulse' : ''}`} />
        <span>{isOverdue ? `Overdue: ${formattedTime}` : `${formattedTime}`}</span>
      </span>
    );
  }

  return (
    <div
      title={`Target SLA Deadline: ${new Date(request.slaDeadline).toLocaleString()}`}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold border ${colorClasses}`}
    >
      <Icon className={`text-sm ${isNearBreach || isOverdue ? 'animate-pulse' : ''}`} />
      <span>{isOverdue ? `Overdue by ${formattedTime}` : `${formattedTime} remaining`}</span>
    </div>
  );
};

export default RequestSlaTimer;
