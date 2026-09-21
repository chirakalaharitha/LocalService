import { jsPDF } from 'jspdf';

// Helper to format date cleanly
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
  } catch {
    return 'N/A';
  }
};

/**
 * Citizen Request PDF Exporter
 * Generates an official civic service report including complete metadata, location,
 * timeline history, resolution notes, verification status, and citizen feedback.
 */
export const generateRequestPDF = (request, history = [], feedback = null) => {
  if (!request) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  let y = 14;

  const drawHeader = (isFirstPage = false) => {
    // Header banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, isFirstPage ? 32 : 18, 'F');

    // Accent line
    doc.setFillColor(59, 130, 246); // blue-500
    doc.rect(0, isFirstPage ? 32 : 18, pageWidth, 1.5, 'F');

    doc.setTextColor(255, 255, 255);
    if (isFirstPage) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('LOCALFIX CIVIC SERVICE REPORT', margin, 16);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('Smart Local Service Request & Field Resolution Record', margin, 23);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`ID: ${request.requestId || 'REQ-DOC'}`, pageWidth - margin, 16, { align: 'right' });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, 23, { align: 'right' });
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`LocalFix Civic Report — [${request.requestId || 'N/A'}] ${request.title || ''}`.substring(0, 75), margin, 12);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, 12, { align: 'right' });
    }
  };

  const drawFooter = () => {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text('Official Civic Record • LocalFix Smart Civic Request & Tracking System', margin, pageHeight - 7);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
    }
  };

  const checkPageBreak = (neededHeight) => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      drawHeader(false);
      y = 26;
      return true;
    }
    return false;
  };

  // Draw initial header
  drawHeader(true);
  y = 42;

  // 1. Primary Request Information Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  const titleText = doc.splitTextToSize(request.title || 'Untitled Request', contentWidth - 10);
  doc.text(titleText, margin + 5, y + 7);

  let gridY = y + 15;
  doc.setFontSize(9);

  // Column 1
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Category:', margin + 5, gridY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(request.category || 'N/A', margin + 26, gridY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Priority:', margin + 5, gridY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(request.priority || 'MEDIUM', margin + 26, gridY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Status:', margin + 5, gridY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(
    request.status === 'RESOLVED' || request.status === 'CLOSED' ? 16 :
    request.status === 'IN_PROGRESS' ? 37 :
    request.status === 'REJECTED' ? 225 : 71,
    request.status === 'RESOLVED' || request.status === 'CLOSED' ? 185 :
    request.status === 'IN_PROGRESS' ? 99 :
    request.status === 'REJECTED' ? 29 : 85,
    request.status === 'RESOLVED' || request.status === 'CLOSED' ? 129 :
    request.status === 'IN_PROGRESS' ? 235 :
    request.status === 'REJECTED' ? 72 : 105
  );
  doc.text(request.status || 'PENDING', margin + 26, gridY + 12);

  // Column 2
  const col2X = margin + 80;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Submitted:', col2X, gridY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(formatDate(request.createdAt), col2X + 22, gridY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('SLA Deadline:', col2X, gridY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(formatDate(request.slaDeadline), col2X + 26, gridY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('SLA Status:', col2X, gridY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(request.slaStatus || 'ON_TIME', col2X + 26, gridY + 12);

  y += 44;

  // 2. Incident Location & Citizen Details
  checkPageBreak(30);
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('INCIDENT LOCATION & CITIZEN DETAILS', margin + 3, y + 5);

  y += 11;
  doc.setFontSize(9);

  // Address
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Address:', margin + 3, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const addressLines = doc.splitTextToSize(request.address || 'Address not specified', contentWidth - 30);
  doc.text(addressLines, margin + 25, y);
  y += addressLines.length * 5 + 2;

  // GPS & City
  const coords = request.location?.coordinates;
  const coordText = coords && coords.length >= 2 ? `Lat: ${coords[1].toFixed(5)}, Lng: ${coords[0].toFixed(5)}` : 'Captured via GPS';
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Coordinates:', margin + 3, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(coordText, margin + 28, y);

  if (request.city || request.pincode) {
    doc.text(`•  ${request.city || ''} ${request.pincode ? `(${request.pincode})` : ''}`, margin + 95, y);
  }
  y += 6;

  // Citizen
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Reporting Citizen:', margin + 3, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${request.citizen?.name || 'Local Resident'} (${request.citizen?.email || 'Confidential'})`, margin + 35, y);

  y += 10;

  // 3. Issue Description
  checkPageBreak(30);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('ISSUE DESCRIPTION', margin + 3, y + 5);

  y += 11;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  const descLines = doc.splitTextToSize(request.description || 'No detailed description provided.', contentWidth - 6);
  doc.text(descLines, margin + 3, y);
  y += descLines.length * 5 + 6;

  // 4. Department & Staff Assignment
  checkPageBreak(25);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('DEPARTMENT & STAFF ASSIGNMENT', margin + 3, y + 5);

  y += 11;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Department:', margin + 3, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(request.department ? `${request.department.name} (${request.department.code})` : 'Pending Department Allocation', margin + 28, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Assigned Staff:', margin + 3, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(request.assignedStaff ? `${request.assignedStaff.name} (${request.assignedStaff.email})` : 'Pending Field Staff Assignment', margin + 28, y);

  y += 10;

  // 5. Resolution Details (if available)
  if (request.resolutionNotes || request.resolutionProof?.notes || request.resolvedAt || ['RESOLVED', 'PENDING_VERIFICATION', 'CITIZEN_VERIFIED', 'CLOSED'].includes(request.status)) {
    checkPageBreak(30);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('FIELD RESOLUTION DETAILS', margin + 3, y + 5);

    y += 11;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Resolved At:', margin + 3, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(formatDate(request.resolvedAt || request.resolutionProof?.resolvedAt), margin + 28, y);

    y += 6;
    const notes = request.resolutionNotes || request.resolutionProof?.notes || 'Work completed per field specifications.';
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Resolution Notes:', margin + 3, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const resLines = doc.splitTextToSize(notes, contentWidth - 6);
    doc.text(resLines, margin + 3, y);
    y += resLines.length * 5 + 6;
  }

  // 6. Verification Status & Citizen Feedback
  const verification = request.citizenVerification;
  const issue = request.verificationIssue;
  const activeFeedback = feedback || (verification?.rating ? { rating: verification.rating, comment: verification.comment } : null);

  if (verification?.verified || issue?.reported || activeFeedback) {
    checkPageBreak(30);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('CITIZEN VERIFICATION & SATISFACTION FEEDBACK', margin + 3, y + 5);

    y += 11;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Verification State:', margin + 3, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const vState = verification?.verified ? `Verified & Approved by Citizen (${formatDate(verification.verifiedAt)})` :
      issue?.reported ? `Issue Reported during Verification: "${issue.reason || 'Work incomplete'}"` : 'Pending Citizen Confirmation';
    doc.text(vState, margin + 35, y);

    if (activeFeedback && activeFeedback.rating) {
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Citizen Rating:', margin + 3, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(217, 119, 6); // amber-600
      const stars = '★'.repeat(activeFeedback.rating) + '☆'.repeat(5 - activeFeedback.rating);
      doc.text(`${stars}  (${activeFeedback.rating} / 5 Stars)`, margin + 35, y);

      if (activeFeedback.comment) {
        y += 6;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('Citizen Remarks:', margin + 3, y);
        y += 5;
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(51, 65, 85);
        const fbLines = doc.splitTextToSize(`"${activeFeedback.comment}"`, contentWidth - 6);
        doc.text(fbLines, margin + 3, y);
        y += fbLines.length * 5;
      }
    }
    y += 8;
  }

  // 7. Status History & Audit Trail
  if (history && history.length > 0) {
    checkPageBreak(35);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('STATUS AUDIT TRAIL & TIMELINE HISTORY', margin + 3, y + 5);

    y += 11;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);

    // Table Header
    doc.text('Date & Time', margin + 3, y);
    doc.text('Action / Status', margin + 45, y);
    doc.text('Updated By', margin + 95, y);
    doc.text('Notes / Remarks', margin + 135, y);
    y += 3;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin + 2, y, pageWidth - margin - 2, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    history.forEach((h) => {
      checkPageBreak(12);
      const timeStr = formatDate(h.createdAt);
      const actionStr = `${h.action || ''} ${h.newStatus ? `-> ${h.newStatus}` : ''}`.trim();
      const userStr = `${h.user?.name || 'System'} (${h.user?.role || 'AUTO'})`;
      const notesLines = doc.splitTextToSize(h.notes || '—', contentWidth - 138);

      doc.text(timeStr, margin + 3, y);
      doc.text(actionStr, margin + 45, y);
      doc.text(userStr, margin + 95, y);
      doc.text(notesLines, margin + 135, y);

      y += Math.max(5, notesLines.length * 4 + 2);
    });
  }

  // Draw footer across all pages
  drawFooter();

  // Save PDF
  doc.save(`LocalFix_${request.requestId || 'Service_Report'}.pdf`);
};

/**
 * Admin Filter-Aware Requests Tabular PDF Exporter
 */
export const generateAdminRequestsPDF = (requests = [], filterMetadata = {}) => {
  const safeRequests = Array.isArray(requests) ? requests : [];

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  let y = 12;

  const drawHeader = (isFirstPage = false) => {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, isFirstPage ? 28 : 16, 'F');
    doc.setFillColor(59, 130, 246); // blue-500
    doc.rect(0, isFirstPage ? 28 : 16, pageWidth, 1.2, 'F');

    doc.setTextColor(255, 255, 255);
    if (isFirstPage) {
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('LOCALFIX MUNICIPAL EXECUTIVE REPORT — SERVICE REQUESTS', margin, 14);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      const filterSummary = [
        filterMetadata.category ? `Category: ${filterMetadata.category}` : null,
        filterMetadata.status ? `Status: ${filterMetadata.status}` : null,
        filterMetadata.priority ? `Priority: ${filterMetadata.priority}` : null,
        filterMetadata.department ? `Dept: ${filterMetadata.department}` : null,
        filterMetadata.startDate || filterMetadata.endDate ? `Dates: ${filterMetadata.startDate || 'Start'} to ${filterMetadata.endDate || 'Now'}` : null
      ].filter(Boolean).join('  |  ') || 'All Records';

      doc.text(`Active Filter Parameters: ${filterSummary}`, margin, 21);
      doc.text(`Matching Records: ${safeRequests.length}  •  Exported: ${new Date().toLocaleString()}`, pageWidth - margin, 21, { align: 'right' });
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('LocalFix Service Requests Report (Continued)', margin, 11);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Exported: ${new Date().toLocaleDateString()}`, pageWidth - margin, 11, { align: 'right' });
    }
  };

  const drawFooter = () => {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('LocalFix Municipal Administration • Confidential Operational Report', margin, pageHeight - 5);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    }
  };

  drawHeader(true);
  y = 35;

  if (safeRequests.length === 0) {
    // Empty state container in PDF
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('No Service Request Data Available', pageWidth / 2, y + 16, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('No service requests available matching the selected criteria in this municipal jurisdiction.', pageWidth / 2, y + 24, { align: 'center' });

    drawFooter();
    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`Municipal_Requests_Report_${dateStr}.pdf`);
    return;
  }

  // Table Column Headers
  const cols = [
    { name: 'Request ID', x: margin, w: 28 },
    { name: 'Title', x: margin + 29, w: 58 },
    { name: 'Category', x: margin + 88, w: 26 },
    { name: 'Priority', x: margin + 115, w: 20 },
    { name: 'Status', x: margin + 136, w: 32 },
    { name: 'Department', x: margin + 169, w: 34 },
    { name: 'Assigned Staff', x: margin + 204, w: 35 },
    { name: 'Submitted At', x: margin + 240, w: 33 }
  ];

  const drawTableHeader = () => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);

    cols.forEach(c => {
      doc.text(c.name, c.x + 2, y + 5);
    });
    y += 9;
  };

  drawTableHeader();

  safeRequests.forEach((r, idx) => {
    if (y + 8 > pageHeight - 15) {
      doc.addPage();
      drawHeader(false);
      y = 22;
      drawTableHeader();
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 2, contentWidth, 7, 'F');
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    doc.text(r.requestId || '—', cols[0].x + 2, y + 3);
    doc.text(doc.splitTextToSize(r.title || '—', cols[1].w - 4)[0] || '', cols[1].x + 2, y + 3);
    doc.text(r.category || '—', cols[2].x + 2, y + 3);
    doc.text(r.priority || '—', cols[3].x + 2, y + 3);
    doc.text(r.status || '—', cols[4].x + 2, y + 3);
    doc.text(r.departmentName || r.department?.name || 'Unassigned', cols[5].x + 2, y + 3);
    doc.text(r.staffName || r.assignedStaff?.name || 'Unassigned', cols[6].x + 2, y + 3);
    doc.text(r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—', cols[7].x + 2, y + 3);

    y += 7;
  });

  drawFooter();
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`Municipal_Requests_Report_${dateStr}.pdf`);
};

/**
 * Admin Executive Summary PDF Exporter (Status, Category, Dept, Staff, Feedback, SLA)
 */
export const generateAdminSummaryPDF = (summary, reportType = 'OVERVIEW', filterMetadata = {}) => {
  if (!summary) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let y = 14;

  const drawHeader = (title) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 28, pageWidth, 1.2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, 15);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Official Municipal Analytics Briefing  •  Total Volume: ${summary.totalRequests || 0} Requests`, margin, 22);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 22, { align: 'right' });
  };

  const drawFooter = () => {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('LocalFix Civic Intelligence • Real-Time Database Analytics', margin, pageHeight - 7);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
    }
  };

  const checkPageBreak = (neededHeight) => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      drawHeader(`LOCALFIX MUNICIPAL REPORT (CONT.)`);
      y = 36;
      return true;
    }
    return false;
  };

  drawHeader(`LOCALFIX ${reportType} REPORT`);
  y = 38;

  // 1. Status Breakdown
  if ((reportType === 'OVERVIEW' || reportType === 'STATUS') && summary.statusReport?.length > 0) {
    checkPageBreak(30);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('STATUS BREAKDOWN & OPERATIONAL PROGRESS', margin + 3, y + 5);
    y += 11;

    summary.statusReport.forEach(s => {
      checkPageBreak(7);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(s.status, margin + 4, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`${s.count} requests (${s.percentage}%)`, margin + 80, y);
      y += 6;
    });
    y += 6;
  }

  // 2. Category Report
  if ((reportType === 'OVERVIEW' || reportType === 'CATEGORY') && summary.categoryReport?.length > 0) {
    checkPageBreak(30);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('CATEGORY PERFORMANCE & RESOLUTION RATES', margin + 3, y + 5);
    y += 11;

    summary.categoryReport.forEach(c => {
      checkPageBreak(7);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(c.category, margin + 4, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`Total: ${c.total}  |  Resolved: ${c.resolved}  |  Pending: ${c.pending}  |  Avg: ${c.avgResolutionHours}h`, margin + 60, y);
      y += 6;
    });
    y += 6;
  }

  // 3. Department Report
  if ((reportType === 'OVERVIEW' || reportType === 'DEPARTMENT') && summary.departmentReport?.length > 0) {
    checkPageBreak(30);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('DEPARTMENT OPERATIONS & ACTIVE STAFFING', margin + 3, y + 5);
    y += 11;

    summary.departmentReport.forEach(d => {
      checkPageBreak(7);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(d.name, margin + 4, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`Requests: ${d.totalRequests}  |  Resolved: ${d.resolvedRequests}  |  Active Staff: ${d.activeStaffCount}  |  Rate: ${d.resolutionRate}%`, margin + 60, y);
      y += 6;
    });
    y += 6;
  }

  // 4. Staff Performance
  if ((reportType === 'OVERVIEW' || reportType === 'STAFF') && summary.staffReport?.length > 0) {
    checkPageBreak(30);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('STAFF PRODUCTIVITY & RESOLUTION SPEED', margin + 3, y + 5);
    y += 11;

    summary.staffReport.forEach(s => {
      checkPageBreak(7);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(s.name, margin + 4, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`Assigned: ${s.totalAssigned}  |  Completed: ${s.completedRequests}  |  Avg Speed: ${s.avgResolutionHours}h  |  Rating: ${s.avgRating > 0 ? `${s.avgRating}/5` : 'N/A'}`, margin + 55, y);
      y += 6;
    });
    y += 6;
  }

  // 5. SLA Compliance
  if ((reportType === 'OVERVIEW' || reportType === 'SLA') && summary.slaReport?.length > 0) {
    checkPageBreak(30);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('SLA COMPLIANCE BY PRIORITY TIER', margin + 3, y + 5);
    y += 11;

    summary.slaReport.forEach(sla => {
      checkPageBreak(7);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(`${sla.priority} PRIORITY`, margin + 4, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`Total: ${sla.total}  |  Met: ${sla.met}  |  Breached: ${sla.breached}  |  Compliance: ${sla.complianceRate}%`, margin + 55, y);
      y += 6;
    });
  }

  drawFooter();
  doc.save(`LocalFix_Admin_${reportType}_${Date.now()}.pdf`);
};
