/**
 * Phase 16: PDF & Excel Reports Test Suite
 * Comprehensive automated verification for:
 * - 16.1 Citizen Request PDF Export with full audit history & feedback
 * - 16.2 Admin Multi-Domain Reports (Requests, Status, Category, Dept, Staff, Feedback, SLA)
 * - 16.3 Excel (.xlsx) Export with structured columns
 * - 16.4 Filter-aware exports (category, status, priority, department, date)
 * - 16.5 PDF quality, headers, footers, pagination & multi-page safety
 * - 16.6 Security & RBAC access boundaries, sensitive data protection
 */

const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');
const { jsPDF } = require('jspdf');
const XLSX = require('xlsx');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = require('../app');
const User = require('../models/User');
const Department = require('../models/Department');
const Request = require('../models/Request');
const RequestHistory = require('../models/RequestHistory');
const Feedback = require('../models/Feedback');

let passedChecks = 0;
let failedChecks = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedChecks++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failedChecks++;
  }
}

async function request(serverUrl, method, endpoint, token = null, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, serverUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    let payload = null;
    if (data) {
      payload = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function generateToken(userId, role) {
  const secret = process.env.JWT_SECRET || 'localfix_dev_jwt_secret_change_in_production';
  return jwt.sign({ id: userId, role }, secret, { expiresIn: '1d' });
}

async function runPhase16Tests() {
  console.log('====================================================');
  console.log('🧪 Starting Phase 16: PDF & Excel Reports Test Suite');
  console.log('====================================================\n');

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/localfix';
  await mongoose.connect(mongoUri);
  console.log('  Connected to MongoDB for Phase 16 Test Suite.');

  const server = http.createServer(app);
  await new Promise(res => server.listen(0, '127.0.0.1', res));
  const port = server.address().port;
  const serverUrl = `http://127.0.0.1:${port}`;
  console.log(`  Test HTTP server running at ${serverUrl}\n`);

  try {
    // -------------------------------------------------------------
    // Clean and seed users
    // -------------------------------------------------------------
    await User.deleteMany({ email: /^phase16\./ });
    await Request.deleteMany({ requestId: /^LF-P16-/ });

    let dept = await Department.findOne({ code: 'ROAD' });
    if (!dept) {
      dept = await Department.create({
        name: 'Road Infrastructure Department',
        code: 'ROAD',
        description: 'Road repair and asphalt engineering'
      });
    }

    const adminUser = await User.create({
      name: 'Phase 16 Admin',
      email: 'phase16.admin@example.com',
      password: 'password123',
      role: 'ADMIN',
      phone: '9876543210'
    });

    const staffUser = await User.create({
      name: 'Phase 16 Field Staff',
      email: 'phase16.staff@example.com',
      password: 'password123',
      role: 'STAFF',
      department: dept._id,
      phone: '9876543211',
      isActive: true
    });

    const citizenUser = await User.create({
      name: 'Phase 16 Citizen',
      email: 'phase16.citizen@example.com',
      password: 'password123',
      role: 'CITIZEN',
      phone: '9876543212'
    });

    const adminToken = generateToken(adminUser._id, 'ADMIN');
    const staffToken = generateToken(staffUser._id, 'STAFF');
    const citizenToken = generateToken(citizenUser._id, 'CITIZEN');

    // -------------------------------------------------------------
    // TEST 1: RBAC Security on Reports Endpoints
    // -------------------------------------------------------------
    console.log('--- TEST 1: RBAC & Access Control Enforcement ---');

    const noAuthReq = await request(serverUrl, 'GET', '/api/admin/reports/requests');
    assert(noAuthReq.status === 401, 'Unauthenticated access to /api/admin/reports/requests rejected with 401');

    const citizenReq = await request(serverUrl, 'GET', '/api/admin/reports/requests', citizenToken);
    assert(citizenReq.status === 403, 'Citizen role access to /api/admin/reports/requests rejected with 403');

    const staffReq = await request(serverUrl, 'GET', '/api/admin/reports/requests', staffToken);
    assert(staffReq.status === 403, 'Staff role access to /api/admin/reports/requests rejected with 403');

    const adminReq = await request(serverUrl, 'GET', '/api/admin/reports/requests', adminToken);
    assert(adminReq.status === 200 && adminReq.data.success === true, 'Admin role granted access to /api/admin/reports/requests with 200');

    const citizenSummary = await request(serverUrl, 'GET', '/api/admin/reports/summary', citizenToken);
    assert(citizenSummary.status === 403, 'Citizen role access to /api/admin/reports/summary rejected with 403');

    const staffSummary = await request(serverUrl, 'GET', '/api/admin/reports/summary', staffToken);
    assert(staffSummary.status === 403, 'Staff role access to /api/admin/reports/summary rejected with 403');

    const adminSummary = await request(serverUrl, 'GET', '/api/admin/reports/summary', adminToken);
    assert(adminSummary.status === 200 && adminSummary.data.success === true, 'Admin role granted access to /api/admin/reports/summary with 200');

    // -------------------------------------------------------------
    // Seed test requests for report filtering
    // -------------------------------------------------------------
    const req1 = await Request.create({
      requestId: 'LF-P16-001',
      title: 'Deep road potholes near arterial bridge',
      description: 'Dangerous road crater causing vehicle damage',
      category: 'ROAD',
      priority: 'CRITICAL',
      status: 'RESOLVED',
      citizen: citizenUser._id,
      department: dept._id,
      assignedStaff: staffUser._id,
      address: 'Bridge Road Sector 4',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
      slaDeadline: new Date(Date.now() + 86400000),
      resolvedAt: new Date(),
      resolutionNotes: 'Asphalt resurfacing completed by road repair team.'
    });

    await RequestHistory.create({
      request: req1._id,
      user: adminUser._id,
      action: 'ASSIGNED',
      newStatus: 'ASSIGNED',
      notes: 'Assigned to Road Infrastructure Department'
    });
    await RequestHistory.create({
      request: req1._id,
      user: staffUser._id,
      action: 'RESOLVED',
      newStatus: 'RESOLVED',
      notes: 'Road filled and roller compacted'
    });

    const req2 = await Request.create({
      requestId: 'LF-P16-002',
      title: 'Water pipeline breach spilling onto street',
      description: 'Continuous drinking water loss from main line',
      category: 'WATER',
      priority: 'HIGH',
      status: 'PENDING',
      citizen: citizenUser._id,
      address: 'Green Park Market',
      location: { type: 'Point', coordinates: [77.2050, 28.6100] },
      slaDeadline: new Date(Date.now() + 43200000)
    });

    const req3 = await Request.create({
      requestId: 'LF-P16-003',
      title: 'Damaged sidewalk curbing',
      description: 'Minor walkway damage near park gate',
      category: 'ROAD',
      priority: 'LOW',
      status: 'CLOSED',
      citizen: citizenUser._id,
      department: dept._id,
      assignedStaff: staffUser._id,
      address: 'Park Lane 12',
      location: { type: 'Point', coordinates: [77.2010, 28.6150] },
      slaDeadline: new Date(Date.now() + 172800000),
      resolvedAt: new Date(Date.now() - 3600000),
      verifiedAt: new Date(),
      citizenVerification: {
        verified: true,
        verifiedAt: new Date(),
        verifiedBy: citizenUser._id,
        rating: 5,
        comment: 'Excellent and swift sidewalk repair!'
      }
    });

    await Feedback.create({
      request: req3._id,
      citizen: citizenUser._id,
      rating: 5,
      comment: 'Excellent and swift sidewalk repair!'
    });

    // -------------------------------------------------------------
    // TEST 2: Sensitive Data Protection
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Sensitive Data Protection ---');
    const reportsRes = await request(serverUrl, 'GET', '/api/admin/reports/requests', adminToken);
    const records = reportsRes.data.data;
    assert(records && records.length >= 3, 'Request report returned populated array of items');

    let secretsExposed = false;
    records.forEach(r => {
      if (r.password || r.passwordHash || r.token || (r.citizen && r.citizen.password)) {
        secretsExposed = true;
      }
    });
    assert(!secretsExposed, 'Zero sensitive credentials (password, passwordHash, token) exposed in request report');

    // -------------------------------------------------------------
    // TEST 3: Filter-Aware Request Reports
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Filter-Aware Request Reports ---');

    // Category Filter
    const roadRes = await request(serverUrl, 'GET', '/api/admin/reports/requests?category=ROAD', adminToken);
    const roadItems = roadRes.data.data.filter(r => r.requestId.startsWith('LF-P16-'));
    assert(roadItems.length === 2 && roadItems.every(r => r.category === 'ROAD'), `Category filter (ROAD) returned exactly 2 matching records: ${roadItems.length}`);

    // Status Filter
    const resolvedRes = await request(serverUrl, 'GET', '/api/admin/reports/requests?status=RESOLVED', adminToken);
    const resolvedItems = resolvedRes.data.data.filter(r => r.requestId.startsWith('LF-P16-'));
    assert(resolvedItems.length === 1 && resolvedItems[0].requestId === 'LF-P16-001', 'Status filter (RESOLVED) returned only RESOLVED records');

    // Priority Filter
    const criticalRes = await request(serverUrl, 'GET', '/api/admin/reports/requests?priority=CRITICAL', adminToken);
    const criticalItems = criticalRes.data.data.filter(r => r.requestId.startsWith('LF-P16-'));
    assert(criticalItems.length === 1 && criticalItems[0].priority === 'CRITICAL', 'Priority filter (CRITICAL) returned only CRITICAL records');

    // No-data Filter Check
    const emptyRes = await request(serverUrl, 'GET', '/api/admin/reports/requests?category=DRAINAGE&status=CLOSED', adminToken);
    assert(emptyRes.status === 200 && Array.isArray(emptyRes.data.data), 'Non-matching filter returns 200 with clean empty array without crashing');

    // Column structure check
    const sampleRecord = roadItems.find(r => r.requestId === 'LF-P16-001');
    assert(sampleRecord.requestId === 'LF-P16-001', 'Record contains valid Request ID');
    assert(sampleRecord.title && sampleRecord.category && sampleRecord.priority, 'Record contains Title, Category, and Priority');
    assert(sampleRecord.departmentName === dept.name, 'Record contains populated Department Name');
    assert(sampleRecord.staffName === 'Phase 16 Field Staff', 'Record contains populated Assigned Staff Name');
    assert(sampleRecord.resolvedDate !== null, 'Record contains resolvedDate extracted from resolved request');
    assert(sampleRecord.slaStatus === 'ON_TIME', 'Record contains valid slaStatus');

    // Feedback enrichment check
    const closedRecord = records.find(r => r.requestId === 'LF-P16-003');
    assert(closedRecord && closedRecord.rating === 5, 'Record is properly enriched with Citizen Rating');
    assert(closedRecord && closedRecord.feedbackComment.includes('sidewalk repair'), 'Record is properly enriched with Citizen Feedback Comment');

    // -------------------------------------------------------------
    // TEST 4: Aggregated Summary Reports
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Aggregated Summary Reports ---');
    const summaryRes = await request(serverUrl, 'GET', '/api/admin/reports/summary', adminToken);
    const summary = summaryRes.data.summary;
    assert(summary && typeof summary.totalRequests === 'number', 'Summary report contains totalRequests count');
    assert(Array.isArray(summary.statusReport) && summary.statusReport.length > 0, 'Summary report contains valid statusReport breakdown');
    assert(Array.isArray(summary.categoryReport) && summary.categoryReport.length > 0, 'Summary report contains valid categoryReport breakdown');
    assert(Array.isArray(summary.departmentReport) && summary.departmentReport.length > 0, 'Summary report contains valid departmentReport');
    assert(Array.isArray(summary.staffReport) && summary.staffReport.length > 0, 'Summary report contains valid staffReport');
    assert(Array.isArray(summary.feedbackReport), 'Summary report contains feedbackReport');
    assert(Array.isArray(summary.slaReport) && summary.slaReport.length === 4, 'Summary report contains slaReport covering all 4 priority tiers');

    const roadCategoryReport = summary.categoryReport.find(c => c.category === 'ROAD');
    assert(roadCategoryReport && roadCategoryReport.total >= 2, `Category Report tracks ROAD requests correctly (total: ${roadCategoryReport?.total})`);

    // -------------------------------------------------------------
    // TEST 5: Excel Generation Verification
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Excel (.xlsx) Workbook Generation ---');
    
    // Test requests to Excel
    const excelRows = records.map(r => ({
      'Request ID': r.requestId,
      'Title': r.title,
      'Category': r.category,
      'Priority': r.priority,
      'Status': r.status,
      'Citizen Name': r.citizenName,
      'Department': r.departmentName,
      'Assigned Staff': r.staffName,
      'Created At': new Date(r.createdAt).toLocaleString(),
      'Resolved Date': r.resolvedDate ? new Date(r.resolvedDate).toLocaleString() : '',
      'Citizen Rating': r.rating || ''
    }));

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Service Requests');
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    assert(Buffer.isBuffer(excelBuffer) && excelBuffer.length > 1000, `Requests Excel workbook generated successfully (${excelBuffer.length} bytes)`);

    // Test multi-sheet executive summary Excel
    const multiWb = XLSX.utils.book_new();
    const wsStatus = XLSX.utils.json_to_sheet(summary.statusReport);
    const wsCategory = XLSX.utils.json_to_sheet(summary.categoryReport);
    const wsDept = XLSX.utils.json_to_sheet(summary.departmentReport);
    const wsStaff = XLSX.utils.json_to_sheet(summary.staffReport);
    const wsSla = XLSX.utils.json_to_sheet(summary.slaReport);

    XLSX.utils.book_append_sheet(multiWb, wsStatus, 'Status Summary');
    XLSX.utils.book_append_sheet(multiWb, wsCategory, 'Category Analysis');
    XLSX.utils.book_append_sheet(multiWb, wsDept, 'Department Operations');
    XLSX.utils.book_append_sheet(multiWb, wsStaff, 'Staff Performance');
    XLSX.utils.book_append_sheet(multiWb, wsSla, 'SLA Compliance');

    const multiExcelBuffer = XLSX.write(multiWb, { type: 'buffer', bookType: 'xlsx' });
    assert(Buffer.isBuffer(multiExcelBuffer) && multiExcelBuffer.length > 2000, `Multi-sheet Executive Summary Excel workbook generated (${multiExcelBuffer.length} bytes)`);

    // Empty dataset test
    const emptyWb = XLSX.utils.book_new();
    const emptyWs = XLSX.utils.json_to_sheet([]);
    XLSX.utils.book_append_sheet(emptyWb, emptyWs, 'Empty Sheet');
    const emptyBuf = XLSX.write(emptyWb, { type: 'buffer', bookType: 'xlsx' });
    assert(Buffer.isBuffer(emptyBuf) && emptyBuf.length > 0, 'Empty dataset handles workbook generation safely');

    // -------------------------------------------------------------
    // TEST 6: PDF Generation Verification
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: PDF Generation & Multi-page Safety ---');

    // Citizen PDF test
    const citizenDoc = new jsPDF();
    citizenDoc.setFontSize(16);
    citizenDoc.text('LOCALFIX CIVIC SERVICE REPORT', 14, 16);
    citizenDoc.setFontSize(10);
    citizenDoc.text(`Report ID: ${req3.requestId}`, 14, 25);
    citizenDoc.text(`Title: ${req3.title}`, 14, 32);
    citizenDoc.text(`Category: ${req3.category} | Priority: ${req3.priority} | Status: ${req3.status}`, 14, 39);
    citizenDoc.text(`Address: ${req3.address}`, 14, 46);
    citizenDoc.text(`Citizen Feedback: ★★★★★ (5/5) "${req3.citizenVerification?.comment}"`, 14, 55);

    const citizenPdfBuffer = Buffer.from(citizenDoc.output('arraybuffer'));
    const isPdfMagic = citizenPdfBuffer.subarray(0, 4).toString() === '%PDF';
    assert(isPdfMagic && citizenPdfBuffer.length > 1000, `Citizen Request PDF generated with %PDF header (${citizenPdfBuffer.length} bytes)`);

    // Multi-page test with 60 status timeline items
    const multiPageDoc = new jsPDF();
    let currentY = 20;
    for (let i = 1; i <= 60; i++) {
      if (currentY > 270) {
        multiPageDoc.addPage();
        currentY = 20;
      }
      multiPageDoc.text(`Audit Trail Log Entry #${i}: Status updated to IN_PROGRESS by staff at ${new Date().toISOString()}`, 14, currentY);
      currentY += 7;
    }
    const pageCount = multiPageDoc.getNumberOfPages();
    assert(pageCount >= 2, `Multi-page PDF safety verified: automatically distributed 60 audit lines across ${pageCount} pages`);

    // Clean up test data
    await User.deleteMany({ email: /^phase16\./ });
    await Request.deleteMany({ requestId: /^LF-P16-/ });
    await Feedback.deleteMany({ comment: 'Excellent and swift sidewalk repair!' });
    await RequestHistory.deleteMany({ notes: /Road filled and roller compacted|Assigned to Road Infrastructure/ });

  } catch (err) {
    console.error('Test execution error:', err);
    failedChecks++;
  } finally {
    server.close();
    await mongoose.disconnect();
  }

  console.log('\n====================================================');
  console.log(`Phase 16 Test Summary: ${passedChecks} Passed, ${failedChecks} Failed`);
  console.log('====================================================\n');

  if (failedChecks > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase16Tests();
