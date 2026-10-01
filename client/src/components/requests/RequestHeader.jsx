import React from 'react';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import RequestSlaTimer from './RequestSlaTimer';
import { HiOutlineCalendar, HiOutlineClock } from 'react-icons/hi';

const RequestHeader = ({ request }) => {
  if (!request) return null;

  const createdDate = request.createdAt
    ? new Date(request.createdAt).toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'N/A';

  const updatedDate = request.updatedAt
    ? new Date(request.updatedAt).toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : createdDate;

  return (
    <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE7E0] pb-4">
        <div className="flex items-center gap-2.5">
          <span className="font-mono font-bold text-[#C65F63] text-sm bg-[#FDECEF] px-3.5 py-1.5 rounded-xl border border-[#C65F63]/20">
            #{request.requestId}
          </span>
          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#E8D7E6] text-[#6B4E71] uppercase">
            {request.category}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <PriorityBadge priority={request.priority} />
          <StatusBadge status={request.status} />
        </div>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[#29252A] tracking-tight">{request.title}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#FAF5F0] p-4 rounded-2xl border border-[#EFE7E0] text-xs">
        <div>
          <div className="text-[10px] text-[#9E98A2] uppercase font-bold">Current Status</div>
          <div className="font-bold text-[#C65F63] text-sm mt-0.5">{request.status?.replace(/_/g, ' ')}</div>
        </div>

        <div>
          <div className="text-[10px] text-[#9E98A2] uppercase font-bold flex items-center gap-1">
            <HiOutlineCalendar />
            <span>Created Date</span>
          </div>
          <div className="font-semibold text-[#29252A] mt-0.5">{createdDate}</div>
        </div>

        <div>
          <div className="text-[10px] text-[#9E98A2] uppercase font-bold flex items-center gap-1">
            <HiOutlineClock />
            <span>Target SLA Resolution</span>
          </div>
          <div className="mt-1">
            <RequestSlaTimer request={request} compact={true} />
          </div>
        </div>

        <div>
          <div className="text-[10px] text-[#9E98A2] uppercase font-bold">Department</div>
          <div className="font-bold text-[#29252A] mt-0.5">
            {request.department?.name || request.category || 'General Services'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestHeader;
