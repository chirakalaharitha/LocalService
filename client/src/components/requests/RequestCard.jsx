import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import { HiOutlineLocationMarker, HiOutlineCalendar, HiOutlineChevronRight } from 'react-icons/hi';

const RequestCard = ({ request }) => {
  if (!request) return null;

  const formattedDate = request.createdAt
    ? new Date(request.createdAt).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : 'N/A';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition shadow-lg group flex flex-col justify-between">
      <div className="space-y-3">
        {/* Card Header: Request ID, Status & Priority */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-blue-400 text-xs tracking-wider">
              {request.requestId}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 uppercase">
              {request.category}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={request.priority} />
            <StatusBadge status={request.status} />
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition line-clamp-1">
            {request.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {request.description}
          </p>
        </div>

        {/* Location Summary */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono line-clamp-1">
          <HiOutlineLocationMarker className="text-blue-400 shrink-0 text-sm" />
          <span>{request.address || 'Address provided'}</span>
        </div>
      </div>

      {/* Footer: Date & View Details Link */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
          <HiOutlineCalendar className="text-sm" />
          <span>Submitted {formattedDate}</span>
        </div>

        <Link
          to={`/requests/${request._id || request.requestId}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-bold text-xs border border-blue-500/30 transition"
        >
          <span>View Details</span>
          <HiOutlineChevronRight className="text-sm" />
        </Link>
      </div>
    </div>
  );
};

export default RequestCard;

