import * as XLSX from 'xlsx';

/**
 * Formats a Date safely for Excel cells
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleString();
  } catch {
    return '';
  }
};

/**
 * Filter-aware Service Requests Excel Exporter
 */
/**
 * Filter-aware Service Requests Excel Exporter
 */
export const exportRequestsToExcel = (requests = [], filename = 'Municipal_Requests_Report.xlsx') => {
  const safeRequests = Array.isArray(requests) ? requests : [];

  let data = [];

  if (safeRequests.length === 0) {
    data = [{
      'Request ID': 'N/A',
      'Title': 'No service request data available for the selected criteria in this municipal jurisdiction.',
      'Category': '',
      'Priority': '',
      'Status': '',
      'Citizen Name': '',
      'Citizen Email': '',
      'Citizen Phone': '',
      'Department': '',
      'Assigned Staff': '',
      'Address': '',
      'City': '',
      'Created At': '',
      'SLA Deadline': '',
      'SLA Status': '',
      'Resolved Date': '',
      'Closed Date': '',
      'Upvotes': 0,
      'Citizen Rating': '',
      'Citizen Feedback': '',
      'Resolution Notes': ''
    }];
  } else {
    data = safeRequests.map(r => ({
      'Request ID': r.requestId || '',
      'Title': r.title || '',
      'Category': r.category || '',
      'Priority': r.priority || '',
      'Status': r.status || '',
      'Citizen Name': r.citizenName || r.citizen?.name || 'N/A',
      'Citizen Email': r.citizenEmail || r.citizen?.email || 'N/A',
      'Citizen Phone': r.citizenPhone || r.citizen?.phone || 'N/A',
      'Department': r.departmentName || r.department?.name || 'Unassigned',
      'Assigned Staff': r.staffName || r.assignedStaff?.name || 'Unassigned',
      'Address': r.address || '',
      'City': r.city || '',
      'Created At': formatDate(r.createdAt),
      'SLA Deadline': formatDate(r.slaDeadline),
      'SLA Status': r.slaStatus || 'ON_TIME',
      'Resolved Date': formatDate(r.resolvedDate || r.resolvedAt || r.resolutionProof?.resolvedAt),
      'Closed Date': formatDate(r.closedDate || r.citizenVerification?.verifiedAt),
      'Upvotes': r.upvotes || r.upvoteCount || 0,
      'Citizen Rating': r.rating || (r.citizenVerification?.rating ? `${r.citizenVerification.rating}/5` : ''),
      'Citizen Feedback': r.feedbackComment || r.citizenVerification?.comment || '',
      'Resolution Notes': r.resolutionNotes || r.resolutionProof?.notes || ''
    }));
  }

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-fit column widths
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, 14)
  }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Service Requests');

  XLSX.writeFile(workbook, filename);
};

/**
 * Aggregated Summary Reports Excel Exporter
 * Can export single or multi-sheet workbooks for Status, Category, Dept, Staff, Feedback, SLA.
 */
export const exportSummaryToExcel = (summary, reportType = 'ALL', filename = 'LocalFix_Executive_Report.xlsx') => {
  if (!summary) return;

  const workbook = XLSX.utils.book_new();

  // 1. Status Breakdown Sheet
  if ((reportType === 'ALL' || reportType === 'STATUS') && summary.statusReport?.length > 0) {
    const statusData = summary.statusReport.map(s => ({
      'Request Status': s.status,
      'Total Count': s.count,
      'Percentage (%)': s.percentage
    }));
    const ws = XLSX.utils.json_to_sheet(statusData);
    XLSX.utils.book_append_sheet(workbook, ws, 'Status Summary');
  }

  // 2. Category Performance Sheet
  if ((reportType === 'ALL' || reportType === 'CATEGORY') && summary.categoryReport?.length > 0) {
    const categoryData = summary.categoryReport.map(c => ({
      'Category': c.category,
      'Total Requests': c.total,
      'Resolved Count': c.resolved,
      'Pending Count': c.pending,
      'Avg Resolution (Hours)': c.avgResolutionHours
    }));
    const ws = XLSX.utils.json_to_sheet(categoryData);
    XLSX.utils.book_append_sheet(workbook, ws, 'Category Performance');
  }

  // 3. Department Operations Sheet
  if ((reportType === 'ALL' || reportType === 'DEPARTMENT') && summary.departmentReport?.length > 0) {
    const deptData = summary.departmentReport.map(d => ({
      'Department Name': d.name,
      'Department Code': d.code,
      'Total Requests': d.totalRequests,
      'Resolved': d.resolvedRequests,
      'Pending': d.pendingRequests,
      'Active Field Staff': d.activeStaffCount,
      'Resolution Rate (%)': d.resolutionRate
    }));
    const ws = XLSX.utils.json_to_sheet(deptData);
    XLSX.utils.book_append_sheet(workbook, ws, 'Department Operations');
  }

  // 4. Staff Performance Sheet
  if ((reportType === 'ALL' || reportType === 'STAFF') && summary.staffReport?.length > 0) {
    const staffData = summary.staffReport.map(s => ({
      'Staff Name': s.name,
      'Email': s.email,
      'Department': s.department,
      'Active Status': s.isActive ? 'Active' : 'Suspended',
      'Total Assigned': s.totalAssigned,
      'Completed': s.completedRequests,
      'Pending': s.pendingRequests,
      'Avg Resolution (Hours)': s.avgResolutionHours,
      'Citizen Rating': s.avgRating > 0 ? `${s.avgRating} / 5` : 'No Feedback'
    }));
    const ws = XLSX.utils.json_to_sheet(staffData);
    XLSX.utils.book_append_sheet(workbook, ws, 'Staff Performance');
  }

  // 5. Citizen Feedback Audit Sheet
  if ((reportType === 'ALL' || reportType === 'FEEDBACK') && summary.feedbackReport?.length > 0) {
    const feedbackData = summary.feedbackReport.map(f => ({
      'Request ID': f.requestId,
      'Title': f.title,
      'Category': f.category,
      'Department': f.department,
      'Rating (1-5)': f.rating,
      'Citizen Comment': f.comment,
      'Citizen Name': f.citizenName,
      'Submission Date': formatDate(f.createdAt)
    }));
    const ws = XLSX.utils.json_to_sheet(feedbackData);
    XLSX.utils.book_append_sheet(workbook, ws, 'Citizen Reviews');
  }

  // 6. SLA Compliance Sheet
  if ((reportType === 'ALL' || reportType === 'SLA') && summary.slaReport?.length > 0) {
    const slaData = summary.slaReport.map(sla => ({
      'Priority Tier': sla.priority,
      'Total Requests': sla.total,
      'SLA Met': sla.met,
      'SLA Breached': sla.breached,
      'SLA Pending': sla.pending,
      'Compliance Rate (%)': sla.complianceRate
    }));
    const ws = XLSX.utils.json_to_sheet(slaData);
    XLSX.utils.book_append_sheet(workbook, ws, 'SLA Compliance');
  }

  XLSX.writeFile(workbook, filename);
};
