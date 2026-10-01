export const fallbackAssignedRequests = [
  {
    _id: 'mock-1',
    requestId: 'LF-2025-0048',
    title: 'Water leakage near main road',
    issue: 'Water leakage near main road',
    category: 'WATER',
    location: 'Tenali, Guntur',
    address: 'Tenali, Guntur',
    municipality: { name: 'Tenali Municipality' },
    municipalityName: 'Tenali Municipality',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    humanSla: '2 days left',
    sla: '2 days left',
    assignedDate: '12 Apr 2025 10:30 AM',
    createdAt: '2025-04-12T10:30:00.000Z'
  },
  {
    _id: 'mock-2',
    requestId: 'LF-2025-0047',
    title: 'Streetlight not working',
    issue: 'Streetlight not working',
    category: 'STREET_LIGHT',
    location: 'Guntur',
    address: 'Guntur',
    municipality: { name: 'Guntur Municipality' },
    municipalityName: 'Guntur Municipality',
    priority: 'MEDIUM',
    status: 'ASSIGNED',
    humanSla: '3 days left',
    sla: '3 days left',
    assignedDate: '11 Apr 2025 04:20 PM',
    createdAt: '2025-04-11T16:20:00.000Z'
  },
  {
    _id: 'mock-3',
    requestId: 'LF-2025-0046',
    title: 'Road pothole',
    issue: 'Road pothole',
    category: 'ROAD',
    location: 'Repalle, Guntur',
    address: 'Repalle, Guntur',
    municipality: { name: 'Repalle Municipality' },
    municipalityName: 'Repalle Municipality',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    humanSla: '1 day left',
    sla: '1 day left',
    assignedDate: '10 Apr 2025 09:15 AM',
    createdAt: '2025-04-10T09:15:00.000Z'
  },
  {
    _id: 'mock-4',
    requestId: 'LF-2025-0045',
    title: 'Garbage not collected',
    issue: 'Garbage not collected',
    category: 'GARBAGE',
    location: 'Sattenapalli',
    address: 'Sattenapalli',
    municipality: { name: 'Sattenapalli Municipality' },
    municipalityName: 'Sattenapalli Municipality',
    priority: 'LOW',
    status: 'PENDING',
    humanSla: '5 days left',
    sla: '5 days left',
    assignedDate: '9 Apr 2025 02:45 PM',
    createdAt: '2025-04-09T14:45:00.000Z'
  },
  {
    _id: 'mock-5',
    requestId: 'LF-2025-0044',
    title: 'Park maintenance',
    issue: 'Park maintenance',
    category: 'PUBLIC_AREA',
    location: 'Guntur',
    address: 'Guntur',
    municipality: { name: 'Guntur Municipality' },
    municipalityName: 'Guntur Municipality',
    priority: 'MEDIUM',
    status: 'RESOLVED',
    humanSla: '-',
    sla: '-',
    assignedDate: '8 Apr 2025 11:30 AM',
    createdAt: '2025-04-08T11:30:00.000Z'
  }
];

export const fallbackStatusDistribution = [
  { name: 'Pending', count: 6, color: '#38BDF8' },
  { name: 'In Progress', count: 8, color: '#FB923C' },
  { name: 'Completed', count: 7, color: '#4ADE80' },
  { name: 'Overdue', count: 2, color: '#F87171' },
  { name: 'Assigned', count: 1, color: '#C084FC' }
];

export const fallbackRecentActivity = [
  {
    id: 1,
    title: 'Request LF-2025-0048 updated to In Progress',
    time: '10 minutes ago',
    type: 'progress'
  },
  {
    id: 2,
    title: 'New request assigned to you',
    time: '32 minutes ago',
    type: 'assigned'
  },
  {
    id: 3,
    title: 'Request LF-2025-0046 resolved',
    time: '1 hour ago',
    type: 'resolved'
  },
  {
    id: 4,
    title: 'SLA overdue for LF-2025-0043',
    time: '2 hours ago',
    type: 'overdue'
  }
];
