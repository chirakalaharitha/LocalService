import React from 'react';
import {
  HiOutlineClock,
  HiOutlineExclamationCircle,
  HiOutlineCheckCircle
} from 'react-icons/hi';

/**
 * Format category with custom icons & styles matching screenshot
 */
export const StaffCategoryBadge = ({ category }) => {
  const cat = (category || '').toUpperCase();

  switch (cat) {
    case 'WATER':
    case 'WATER SUPPLY':
      return (
        <div className="flex items-center gap-2 text-xs font-semibold text-sky-700">
          <span className="w-5 h-5 rounded-full bg-sky-100 flex items-center justify-center text-[11px] shrink-0">
            💧
          </span>
          <span className="truncate">Water Supply</span>
        </div>
      );
    case 'STREET_LIGHT':
    case 'STREETLIGHTS':
      return (
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
          <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-[11px] shrink-0">
            💡
          </span>
          <span className="truncate">Streetlights</span>
        </div>
      );
    case 'ROAD':
    case 'ROADS':
    case 'ROADS & POTHOLES':
      return (
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[11px] shrink-0">
            🛣️
          </span>
          <span className="truncate">Roads & Potholes</span>
        </div>
      );
    case 'GARBAGE':
    case 'SANITATION':
    case 'GARBAGE & SANITATION':
      return (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[11px] shrink-0">
            🗑️
          </span>
          <span className="truncate">Garbage & Sanitation</span>
        </div>
      );
    case 'PUBLIC_AREA':
    case 'PARKS':
    case 'PARKS & GREENERY':
      return (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
          <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[11px] shrink-0">
            🌳
          </span>
          <span className="truncate">Parks & Greenery</span>
        </div>
      );
    case 'DRAINAGE':
    case 'DRAINAGE & SEWAGE':
      return (
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-700">
          <span className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-[11px] shrink-0">
            🌊
          </span>
          <span className="truncate">Drainage & Sewage</span>
        </div>
      );
    case 'ELECTRICITY':
    case 'POWER':
      return (
        <div className="flex items-center gap-2 text-xs font-semibold text-yellow-700">
          <span className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center text-[11px] shrink-0">
            ⚡
          </span>
          <span className="truncate">Electricity & Power</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-[11px] shrink-0">
            📋
          </span>
          <span className="truncate">{category || 'Civic Issue'}</span>
        </div>
      );
  }
};

/**
 * Priority pill matching screenshot
 */
export const StaffPriorityBadge = ({ priority }) => {
  const p = (priority || '').toUpperCase();
  if (p === 'HIGH' || p === 'CRITICAL') {
    return (
      <span className="inline-block px-3 py-0.5 rounded-md text-[11px] font-bold bg-[#FDECEF] text-[#C65F63] border border-[#F6D0D5]">
        High
      </span>
    );
  }
  if (p === 'MEDIUM') {
    return (
      <span className="inline-block px-3 py-0.5 rounded-md text-[11px] font-bold bg-[#FEF3E2] text-[#D97706] border border-[#FDE3B8]">
        Medium
      </span>
    );
  }
  return (
    <span className="inline-block px-3 py-0.5 rounded-md text-[11px] font-bold bg-[#EBF7EE] text-[#16A34A] border border-[#CDEED5]">
      Low
    </span>
  );
};

/**
 * Status pill matching screenshot
 */
export const StaffStatusBadge = ({ status }) => {
  const s = (status || '').toUpperCase();

  if (s === 'OVERDUE') {
    return (
      <span className="inline-block px-3 py-0.5 rounded-md text-[11px] font-bold bg-[#FDECEF] text-[#EF4444] border border-[#F6D0D5]">
        Overdue
      </span>
    );
  }
  if (s === 'IN_PROGRESS' || s === 'ACCEPTED') {
    return (
      <span className="inline-block px-3 py-0.5 rounded-md text-[11px] font-bold bg-[#FEF3E2] text-[#D97706]">
        In Progress
      </span>
    );
  }
  if (s === 'ASSIGNED') {
    return (
      <span className="inline-block px-3 py-0.5 rounded-md text-[11px] font-bold bg-[#F3E8FF] text-[#7E22CE]">
        Assigned
      </span>
    );
  }
  if (s === 'PENDING' || s === 'UNDER_REVIEW') {
    return (
      <span className="inline-block px-3 py-0.5 rounded-md text-[11px] font-bold bg-[#E0F2FE] text-[#0284C7]">
        Pending
      </span>
    );
  }
  if (s === 'COMPLETED' || s === 'RESOLVED' || s === 'CITIZEN_VERIFIED' || s === 'CLOSED' || s === 'RESOLUTION_SUBMITTED') {
    return (
      <span className="inline-block px-3 py-0.5 rounded-md text-[11px] font-bold bg-[#E6F7ED] text-[#15803D]">
        Completed
      </span>
    );
  }
  return (
    <span className="inline-block px-3 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
      {status}
    </span>
  );
};

/**
 * SLA pill matching screenshot
 */
export const StaffSlaBadge = ({ sla, deadline, status }) => {
  if (status === 'RESOLVED' || status === 'CITIZEN_VERIFIED' || status === 'CLOSED') {
    return <span className="text-gray-400 font-bold text-xs">-</span>;
  }

  const slaText = sla || '';

  if (slaText.includes('1 day') || slaText.toLowerCase().includes('overdue')) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
        <HiOutlineClock className="text-sm shrink-0" />
        <span>{slaText || '1 day left'}</span>
      </div>
    );
  }

  if (slaText.includes('day') || slaText.includes('left')) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
        <HiOutlineClock className="text-sm shrink-0" />
        <span>{slaText}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
      <HiOutlineClock className="text-sm shrink-0" />
      <span>3 days left</span>
    </div>
  );
};

/**
 * Format timestamp nicely like "12 Apr 2025 10:30 AM"
 */
export const formatAssignedDate = (dateVal) => {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);

  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${day} ${month} ${year} ${hours}:${minutes} ${ampm}`;
};

/**
 * Export table data to CSV file
 */
export const exportRequestsToCSV = (requests, filename = 'assigned-requests.csv') => {
  if (!requests || requests.length === 0) return;

  const headers = ['Request ID', 'Issue', 'Category', 'Location', 'Municipality', 'Priority', 'Status', 'SLA', 'Assigned Date'];
  const rows = requests.map((r) => [
    `"${r.requestId || ''}"`,
    `"${(r.title || r.issue || '').replace(/"/g, '""')}"`,
    `"${r.category || ''}"`,
    `"${(r.address || r.locationStr || '').replace(/"/g, '""')}"`,
    `"${(r.municipality?.name || r.municipality || '').replace(/"/g, '""')}"`,
    `"${r.priority || ''}"`,
    `"${r.status || ''}"`,
    `"${r.humanSla || r.sla || ''}"`,
    `"${formatAssignedDate(r.createdAt || r.assignedAt)}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
