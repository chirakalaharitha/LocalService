import React from 'react';
import { HiCheck, HiClock, HiOutlineUser, HiOutlineCheckCircle, HiExclamationCircle, HiOutlineDotsCircleHorizontal } from 'react-icons/hi';

const WORKFLOW_STEPS = [
  { key: 'PENDING', label: 'Submitted' },
  { key: 'UNDER_REVIEW', label: 'Under Review' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'RESOLUTION_SUBMITTED', label: 'Pending Verification' },
  { key: 'CITIZEN_VERIFIED', label: 'Closed' }
];

const getStepStatus = (currentStatus, stepKey) => {
  const normalizedCurrent = currentStatus === 'PENDING_VERIFICATION' ? 'RESOLUTION_SUBMITTED' : (currentStatus === 'CLOSED' ? 'CITIZEN_VERIFIED' : currentStatus);
  const normalizedStep = stepKey === 'PENDING_VERIFICATION' ? 'RESOLUTION_SUBMITTED' : (stepKey === 'CLOSED' ? 'CITIZEN_VERIFIED' : stepKey);

  const statusOrder = [
    'PENDING',
    'UNDER_REVIEW',
    'ASSIGNED',
    'ACCEPTED',
    'IN_PROGRESS',
    'RESOLUTION_SUBMITTED',
    'RESOLVED',
    'CITIZEN_VERIFIED'
  ];

  const currentIdx = statusOrder.indexOf(normalizedCurrent);
  const stepIdx = statusOrder.indexOf(normalizedStep);

  if (currentStatus === 'REJECTED' || currentStatus === 'CANCELLED') {
    return 'disabled';
  }

  if (stepIdx < currentIdx) return 'completed';
  if (stepIdx === currentIdx) return 'current';
  return 'upcoming';
};

const StatusTimeline = ({ currentStatus = 'PENDING', history = [] }) => {
  // Deduplicate history entries and filter redundant consecutive identical statuses
  const uniqueHistory = React.useMemo(() => {
    if (!Array.isArray(history)) return [];
    const seen = new Set();
    const result = [];
    let lastStatus = null;

    history.forEach((item) => {
      const statusKey = item.newStatus || item.action;
      const isRedundant = statusKey && statusKey === lastStatus && item.action !== 'COMMENT_ADDED';
      const dedupeKey = item._id ? item._id.toString() : `${item.action}_${item.newStatus || ''}_${new Date(item.createdAt).getMinutes()}`;

      if (!seen.has(dedupeKey) && !isRedundant) {
        seen.add(dedupeKey);
        lastStatus = statusKey;
        result.push(item);
      }
    });

    return result;
  }, [history]);

  return (
    <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-4">
        <h2 className="text-base font-black text-[#29252A]">Tracking Lifecycle & Progress</h2>
        <span className="text-xs font-mono font-bold text-[#C65F63] bg-[#FDECEF] px-3 py-1 rounded-full border border-[#C65F63]/20">
          Status: {currentStatus.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Visual Workflow Steps */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-[#6B666E] uppercase tracking-wider">Workflow Lifecycle</div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center">
          {WORKFLOW_STEPS.map((step) => {
            const state = getStepStatus(currentStatus, step.key);
            
            let bgClass = 'bg-[#FAF5F0] text-[#9E98A2] border-[#EFE7E0]';
            let icon = <HiOutlineDotsCircleHorizontal className="mx-auto text-base" />;

            if (state === 'completed') {
              bgClass = 'bg-[#E8D7E6] text-[#6B4E71] border-[#6B4E71]/30 font-bold';
              icon = <HiCheck className="mx-auto text-base" />;
            } else if (state === 'current') {
              bgClass = 'bg-[#C65F63] text-white border-[#C65F63] font-bold shadow-md shadow-[#C65F63]/30';
              icon = <HiClock className="mx-auto text-base animate-pulse" />;
            }

            return (
              <div
                key={step.key}
                className={`p-2.5 rounded-2xl border text-[10px] space-y-1 ${bgClass}`}
              >
                {icon}
                <div className="leading-tight">{step.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* History Timeline Event List */}
      <div className="space-y-3 pt-4 border-t border-[#EFE7E0]">
        <div className="text-xs font-bold text-[#6B666E] uppercase tracking-wider">Audit Log & Timeline</div>

        {uniqueHistory.length === 0 ? (
          <div className="text-xs text-[#6B666E] italic p-4 bg-[#FAF5F0] rounded-2xl border border-[#EFE7E0]">
            No history timeline events recorded yet.
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#EFE7E0]">
            {uniqueHistory.map((item, idx) => (
              <div key={item._id || idx} className="relative space-y-1 text-xs">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-[#C65F63] flex items-center justify-center text-xs text-[#C65F63]">
                  <HiCheck />
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#29252A] uppercase">{item.action?.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-[#9E98A2]">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}
                  </span>
                </div>

                <div className="text-[11px] text-[#6B666E]">
                  Updated by <span className="text-[#29252A] font-semibold">{item.user?.name || 'System'}</span> ({item.user?.role || 'SYSTEM'})
                </div>

                {item.notes && (
                  <div className="p-3 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0] text-[#29252A] text-[11px] leading-relaxed">
                    {item.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusTimeline;
