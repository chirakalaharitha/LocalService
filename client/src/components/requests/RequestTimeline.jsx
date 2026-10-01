import React from 'react';
import { HiCheckCircle, HiOutlineClock, HiExclamationCircle, HiOutlineUser, HiOutlineCog } from 'react-icons/hi';

const getActionIcon = (action) => {
  switch (action) {
    case 'CREATED':
      return <HiOutlineClock className="text-blue-400" />;
    case 'ASSIGNED':
      return <HiOutlineUser className="text-teal-400" />;
    case 'ACCEPTED':
      return <HiCheckCircle className="text-emerald-400" />;
    case 'WORK_STARTED':
      return <HiOutlineCog className="text-amber-400 animate-spin" />;
    case 'RESOLUTION_SUBMITTED':
      return <HiCheckCircle className="text-indigo-400" />;
    case 'CITIZEN_VERIFIED':
      return <HiCheckCircle className="text-emerald-400" />;
    case 'REOPENED':
      return <HiExclamationCircle className="text-rose-400" />;
    default:
      return <HiCheckCircle className="text-slate-400" />;
  }
};

const RequestTimeline = ({ history = [] }) => {
  if (!history || history.length === 0) {
    return <div className="text-xs text-[#6B4E71] italic">No history timeline events recorded yet.</div>;
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#EFE7E0]">
      {history.map((item, idx) => (
        <div key={item._id || idx} className="relative flex flex-col gap-1 text-xs">
          <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-[#FAF5F0] border border-[#EFE7E0] flex items-center justify-center text-sm shadow-sm">
            {getActionIcon(item.action)}
          </div>

          <div className="flex items-center justify-between text-[#29252A] font-medium">
            <span className="capitalize font-bold text-[#29252A]">{item.action.replace(/_/g, ' ')}</span>
            <span className="text-[10px] text-[#6B4E71]">{new Date(item.createdAt).toLocaleString()}</span>
          </div>

          <div className="text-[#6B4E71]">
            By <span className="text-[#29252A] font-medium">{item.user?.name || 'System'}</span> ({item.user?.role || 'SYSTEM'})
          </div>

          {item.notes && (
            <div className="mt-1 p-2.5 rounded-lg bg-[#FAF5F0] border border-[#EFE7E0] text-[#29252A] leading-relaxed text-[11px]">
              {item.notes}
            </div>
          )}

          {item.images && item.images.length > 0 && (
            <div className="flex gap-2 mt-2">
              {item.images.map((img, i) => (
                <a key={i} href={img} target="_blank" rel="noreferrer">
                  <img src={img} alt="Proof" className="w-16 h-16 object-cover rounded-lg border border-[#EFE7E0] hover:opacity-80 transition" />
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default RequestTimeline;

