import React from 'react';
import { HiOutlineInformationCircle, HiOutlineClock, HiOutlineShieldCheck, HiOutlineUser } from 'react-icons/hi';

const RequestMetadata = ({ request }) => {
  if (!request) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 text-white font-bold text-base border-b border-slate-800 pb-3">
        <HiOutlineInformationCircle className="text-teal-400 text-xl" />
        <h2>Request Metadata</h2>
      </div>

      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 font-medium">Tracking ID</span>
          <span className="font-mono font-bold text-blue-400">{request.requestId}</span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 font-medium">Category</span>
          <span className="font-bold text-slate-200">{request.category}</span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 font-medium">Citizen Urgency</span>
          <span className="font-bold text-slate-200">{request.priority}</span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 font-medium">Assigned Department</span>
          <span className="font-bold text-slate-200">
            {request.department?.name || request.category || 'General Civic'}
          </span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 font-medium">Field Staff</span>
          <span className="font-bold text-slate-200">
            {request.assignedStaff ? request.assignedStaff.name : 'Not assigned yet'}
          </span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 font-medium">Target SLA Deadline</span>
          <span className="font-bold text-amber-400">
            {request.slaDeadline ? new Date(request.slaDeadline).toLocaleDateString() : 'Pending'}
          </span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 font-medium">Community Upvotes</span>
          <span className="font-bold text-blue-400">{request.upvoteCount || 0} citizen(s)</span>
        </div>
      </div>
    </div>
  );
};

export default RequestMetadata;

