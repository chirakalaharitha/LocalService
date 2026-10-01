import React from 'react';
import { HiOutlineInformationCircle, HiOutlineClock, HiOutlineShieldCheck, HiOutlineUser } from 'react-icons/hi';
import RequestSlaTimer from './RequestSlaTimer';

const RequestMetadata = ({ request }) => {
  if (!request) return null;

  return (
    <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 text-[#29252A] font-black text-base border-b border-[#EFE7E0] pb-4">
        <HiOutlineInformationCircle className="text-[#C65F63] text-xl" />
        <h2>Request Metadata</h2>
      </div>

      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0]">
          <span className="text-[#6B666E] font-medium">Tracking ID</span>
          <span className="font-mono font-bold text-[#C65F63]">{request.requestId}</span>
        </div>

        {(request.municipality || request.municipalitySnapshot?.name) && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FDECEF] border border-[#C65F63]/20">
            <span className="text-[#6B666E] font-medium">Municipal Authority</span>
            <span className="font-bold text-[#C65F63] text-right truncate max-w-[200px]">
              🏛️ {request.municipality?.name || request.municipalitySnapshot?.name}
              {request.municipality?.code ? ` (${request.municipality.code})` : ''}
            </span>
          </div>
        )}

        {(request.district || request.municipalitySnapshot?.district || request.municipality?.district) && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0]">
            <span className="text-[#6B666E] font-medium">District Jurisdiction</span>
            <span className="font-bold text-[#29252A]">
              {request.district || request.municipalitySnapshot?.district || request.municipality?.district}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0]">
          <span className="text-[#6B666E] font-medium">Category</span>
          <span className="font-bold text-[#6B4E71]">{request.category}</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0]">
          <span className="text-[#6B666E] font-medium">Citizen Urgency</span>
          <span className="font-bold text-[#29252A]">{request.priority}</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0]">
          <span className="text-[#6B666E] font-medium">Assigned Department</span>
          <span className="font-bold text-[#29252A]">
            {request.department?.name || request.category || 'General Civic'}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0]">
          <span className="text-[#6B666E] font-medium">Field Staff</span>
          <span className="font-bold text-[#29252A]">
            {request.assignedStaff ? request.assignedStaff.name : 'Not assigned yet'}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0]">
          <span className="text-[#6B666E] font-medium">Target SLA Deadline</span>
          <RequestSlaTimer request={request} compact={true} />
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0]">
          <span className="text-[#6B666E] font-medium">Community Upvotes</span>
          <span className="font-bold text-[#C65F63]">{request.upvoteCount || 0} citizen(s)</span>
        </div>
      </div>
    </div>
  );
};

export default RequestMetadata;
