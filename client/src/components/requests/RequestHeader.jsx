import React from 'react';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import { HiOutlineCalendar, HiOutlineClock } from 'react-icons/hi';

const RequestHeader = ({ request }) => {
  if (!request) return null;

  const createdDate = request.createdAt
    ? new Date(request.createdAt).toLocaleString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'N/A';

  const updatedDate = request.updatedAt
    ? new Date(request.updatedAt).toLocaleString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : createdDate;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="font-mono font-bold text-blue-400 text-sm bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">
            Request ID: {request.requestId}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 uppercase">
            {request.category}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <PriorityBadge priority={request.priority} />
          <StatusBadge status={request.status} />
        </div>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{request.title}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Current Status</div>
          <div className="font-bold text-teal-400 text-sm mt-0.5">{request.status?.replace(/_/g, ' ')}</div>
        </div>

        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
            <HiOutlineCalendar />
            <span>Created Date</span>
          </div>
          <div className="font-medium text-slate-200 mt-0.5">{createdDate}</div>
        </div>

        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
            <HiOutlineClock />
            <span>Last Updated</span>
          </div>
          <div className="font-medium text-slate-200 mt-0.5">{updatedDate}</div>
        </div>

        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Department</div>
          <div className="font-bold text-slate-200 mt-0.5">
            {request.department?.name || request.category || 'General Services'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestHeader;

