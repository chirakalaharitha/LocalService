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
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 className="text-base font-bold text-white">Tracking Lifecycle & Progress</h2>
        <span className="text-xs font-mono text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
          Status: {currentStatus.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Visual Workflow Steps */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Workflow Lifecycle</div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center">
          {WORKFLOW_STEPS.map((step, idx) => {
            const state = getStepStatus(currentStatus, step.key);
            
            let bgClass = 'bg-slate-950 text-slate-500 border-slate-800';
            let icon = <HiOutlineDotsCircleHorizontal className="mx-auto text-base" />;

            if (state === 'completed') {
              bgClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold';
              icon = <HiCheck className="mx-auto text-base" />;
            } else if (state === 'current') {
              bgClass = 'bg-blue-600 text-white border-blue-400 font-bold shadow-lg shadow-blue-600/30';
              icon = <HiClock className="mx-auto text-base animate-pulse" />;
            }

            return (
              <div
                key={step.key}
                className={`p-2.5 rounded-xl border text-[10px] space-y-1 ${bgClass}`}
              >
                {icon}
                <div className="leading-tight">{step.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* History Timeline Event List */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Audit Log & Timeline</div>

        {(!history || history.length === 0) ? (
          <div className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-xl border border-slate-800">
            No history timeline events recorded yet.
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {history.map((item, idx) => (
              <div key={item._id || idx} className="relative space-y-1 text-xs">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xs text-blue-400">
                  <HiCheck />
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100 uppercase">{item.action?.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-slate-500">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400">
                  Updated by <span className="text-slate-200 font-semibold">{item.user?.name || 'System'}</span> ({item.user?.role || 'SYSTEM'})
                </div>

                {item.notes && (
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-[11px] leading-relaxed">
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

