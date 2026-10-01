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
    <div className="bg-white border border-[#EFE7E0] rounded-2xl p-5 space-y-4 hover:border-[#C65F63]/30 transition shadow-sm group flex flex-col justify-between">
      <div className="space-y-3">
        {/* Card Header: Request ID, Status & Priority */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE7E0] pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-[#C65F63] text-xs tracking-wider">
              {request.requestId}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAF5F0] text-[#6B4E71] uppercase border border-[#EFE7E0]">
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
          <h3 className="text-base font-bold text-[#29252A] group-hover:text-[#C65F63] transition line-clamp-1">
            {request.title}
          </h3>
          <p className="text-xs text-[#6B4E71] mt-1 line-clamp-2 leading-relaxed">
            {request.description}
          </p>
        </div>

        {/* Location & Authority Summary */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[#6B4E71] line-clamp-1">
            <HiOutlineLocationMarker className="text-[#C65F63] shrink-0 text-sm" />
            <span>{request.address || 'Address provided'}</span>
          </div>
          {(request.municipalitySnapshot?.name || request.municipality?.name) && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#6B4E71] font-semibold line-clamp-1">
              <span>🏛️</span>
              <span>{request.municipalitySnapshot?.name || request.municipality?.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Date & View Details Link */}
      <div className="flex items-center justify-between pt-3 border-t border-[#EFE7E0] text-xs">
        <div className="flex items-center gap-1.5 text-[#6B4E71]/70 text-[11px]">
          <HiOutlineCalendar className="text-sm" />
          <span>Submitted {formattedDate}</span>
        </div>

        <Link
          to={`/requests/${request._id || request.requestId}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FDECEF] hover:bg-[#FDECEF]/80 text-[#C65F63] font-bold text-xs border border-[#C65F63]/20 transition"
        >
          <span>View Details</span>
          <HiOutlineChevronRight className="text-sm" />
        </Link>
      </div>
    </div>
  );
};

export default RequestCard;

