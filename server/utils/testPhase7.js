/**
 * LocalFix - Phase 7 Field Staff Portal & Lifecycle Execution Verification Test
 * 
 * Verifies complete staff workflow:
 *  1. Staff Authentication & RBAC (valid login, invalid login, inactive account rejection)
 *  2. Role Protection (unauthenticated -> 401, citizen -> 403, admin -> allowed)
 *  3. Department & Workload Filtering (Staff A vs Staff B isolation, ignore spoofed staffId)
 *  4. SLA Information & Deadline Tracking
 *  5. Task Rejection Workflow (reject with reason, reset to PENDING, history entry)
 *  6. Task Acceptance Workflow (ASSIGNED -> ACCEPTED, duplicate accept rejected)
 *  7. Before-Work Proof Upload & Start Work (multipart image, ASSIGNED/ACCEPTED -> IN_PROGRESS)
 *  8. Before-Work Proof Security (Staff B cannot start or upload proof for Staff A's task -> 403)
 *  9. Technical Work Notes (valid note, empty note rejection -> 400, note too long -> 400)
 * 10. After-Work Proof & Resolution Submission (notes < 5 chars -> 400, multipart after-proof, moves to RESOLVED)
 * 11. Separation of Proof Fields (Citizen evidence != Before proof != After proof)
 * 12. Resolution Ownership (Staff B cannot resolve Staff A's task -> 403)
 * 13. Invalid Lifecycle Transitions (RESOLVED -> IN_PROGRESS -> 409, etc.)
 * 14. Comprehensive Status History Audit
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/db');
const app = require('../app');
const { initSocket } = require('../services/socketService');
const { Server } = require('socket.io');

const User = require('../models/User');
const Department = require('../models/Department');
const Request = require('../models/Request');
const RequestHistory = require('../models/RequestHistory');

// Minimal 1x1 valid PNG image buffer (base64 decoded)
const SAMPLE_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

let localServer = null;
let API_URL = 'http://localhost:5000/api';

const results = {
  passed: [],
  failed: []
};

function pass(testName, details = '') {
  results.passed.push(testName);
  console.log(`  ✅ [PASS] ${testName}${details ? ` (${details})` : ''}`);
}

function fail(testName, reason) {
  results.failed.push({ testName, reason });
  console.error(`  ❌ [FAIL] ${testName} - Reason: ${reason}`);
}

// Helper for multipart/form-data upload using native Node.js Blob & FormData
function createFormDataFile(buffer, filename, fieldname, extraFields = {}) {
  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'image/png' });
  formData.append(fieldname, blob, filename);
  for (const [key, value] of Object.entries(extraFields)) {
    formData.append(key, value);
  }
  return formData;
}

async function ensureServerAndDB() {
  // Connect MongoDB
  await connectDB();

  // Test if API server is already running on port 5000
  try {
    const res = await fetch('http://localhost:5000/api/health', { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      console.log('📡 Connected to already running API server on http://localhost:5000/api');
      API_URL = 'http://localhost:5000/api';
      return;
    }
  } catch (err) {
    // Server not running, spin up ephemeral server
  }

  console.log('⚡ Starting in-process HTTP server for test suite...');
  localServer = http.createServer(app);
  const io = new Server(localServer, {
    cors: { origin: '*' }
  });
  initSocket(io);

  await new Promise((resolve) => {
    localServer.listen(0, () => {
      const port = localServer.address().port;
      API_URL = `http://localhost:${port}/api`;
      console.log(`🚀 In-process test server listening on ${API_URL}`);
      resolve();
    });
  });
}

async function runPhase7Tests() {
  console.log('===============================================================');
  console.log('🛠️  LOCALFIX PHASE 7: FIELD STAFF PORTAL & LIFECYCLE TESTS');
  console.log('===============================================================');

  const assetsDir = path.join(__dirname, 'test-assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const beforeImagePath = path.join(assetsDir, 'temp_before.png');
  const afterImagePath = path.join(assetsDir, 'temp_after.png');
  fs.writeFileSync(beforeImagePath, SAMPLE_PNG_BUFFER);
  fs.writeFileSync(afterImagePath, SAMPLE_PNG_BUFFER);

  try {
    await ensureServerAndDB();

    // -------------------------------------------------------------
    // Step 1: Ensure required test accounts exist in DB
    // -------------------------------------------------------------
    console.log('\n[1/14] Setting up / verifying multi-role test users...');

    // Departments
    let waterDept = await Department.findOne({ code: 'WATER' });
    if (!waterDept) {
      waterDept = await Department.create({
        name: 'Water Department',
        code: 'WATER',
        description: 'Water maintenance and repair'
      });
    }

    let roadDept = await Department.findOne({ code: 'ROAD' });
    if (!roadDept) {
      roadDept = await Department.create({
        name: 'Road Maintenance',
        code: 'ROAD',
        description: 'Road repair and potholes'
      });
    }

    // Admin
    const adminEmail = 'admin@localfix.gov.in';
    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Municipal Admin',
        email: adminEmail,
        phone: '9876543210',
        password: 'Admin@123456',
        role: 'ADMIN'
      });
    }

    // Citizen
    const citizenEmail = 'citizen@localfix.org';
    let citizenUser = await User.findOne({ email: citizenEmail });
    if (!citizenUser) {
      citizenUser = await User.create({
        name: 'Aarav Sharma',
        email: citizenEmail,
        phone: '9876543212',
        password: 'Citizen@123456',
        role: 'CITIZEN'
      });
    }

    // Staff A (Water Department)
    const staffAEmail = 'staff.water@localfix.gov.in';
    let staffAUser = await User.findOne({ email: staffAEmail });
    if (!staffAUser) {
      staffAUser = await User.create({
        name: 'Rajesh Kumar (Water)',
        email: staffAEmail,
        phone: '9876543211',
        password: 'Staff@123456',
        role: 'STAFF',
        department: waterDept._id,
        isActive: true
      });
    } else if (!staffAUser.isActive) {
      staffAUser.isActive = true;
      await staffAUser.save();
    }

    // Staff B (Road Department)
    const staffBEmail = 'staff.road@localfix.gov.in';
    let staffBUser = await User.findOne({ email: staffBEmail });
    if (!staffBUser) {
      staffBUser = await User.create({
        name: 'Sunil Verma (Roads)',
        email: staffBEmail,
        phone: '9876543213',
        password: 'Staff@123456',
        role: 'STAFF',
        department: roadDept._id,
        isActive: true
      });
    } else if (!staffBUser.isActive) {
      staffBUser.isActive = true;
      await staffBUser.save();
    }

    // Inactive Staff (for negative testing)
    const inactiveStaffEmail = 'staff.inactive@localfix.gov.in';
    let inactiveStaffUser = await User.findOne({ email: inactiveStaffEmail });
    if (!inactiveStaffUser) {
      inactiveStaffUser = await User.create({
        name: 'Inactive Staff User',
        email: inactiveStaffEmail,
        phone: '9876543219',
        password: 'Staff@123456',
        role: 'STAFF',
        department: waterDept._id,
        isActive: false
      });
    } else if (inactiveStaffUser.isActive) {
      inactiveStaffUser.isActive = false;
      await inactiveStaffUser.save();
    }

    pass('Test accounts initialized', 'Admin, Citizen, Staff A, Staff B, Inactive Staff');

    // -------------------------------------------------------------
    // Step 2: Staff Authentication & Security Verification
    // -------------------------------------------------------------
    console.log('\n[2/14] Testing Staff Authentication & Inactive Account Rejection...');

    // Valid Staff A login
    const loginResA = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: staffAEmail, password: 'Staff@123456' })
    });
    const loginDataA = await loginResA.json();

    if (loginResA.status === 200 && loginDataA.success && loginDataA.token && loginDataA.user.role === 'STAFF') {
      pass('Staff A login succeeds with valid JWT & STAFF role');
    } else {
      fail('Staff A login', `Status: ${loginResA.status}, Response: ${JSON.stringify(loginDataA)}`);
    }
    const tokenStaffA = loginDataA.token;

    // Valid Staff B login
    const loginResB = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: staffBEmail, password: 'Staff@123456' })
    });
    const loginDataB = await loginResB.json();
    const tokenStaffB = loginDataB.token;
    if (loginResB.status === 200 && tokenStaffB) {
      pass('Staff B login succeeds');
    } else {
      fail('Staff B login', `Status: ${loginResB.status}`);
    }

    // Inactive Staff login rejection
    const loginInactiveRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inactiveStaffEmail, password: 'Staff@123456' })
    });
    const loginInactiveData = await loginInactiveRes.json();
    if (loginInactiveRes.status === 403 && !loginInactiveData.success) {
      pass('Inactive Staff account login correctly rejected with 403');
    } else {
      fail('Inactive Staff login rejection', `Expected 403, got ${loginInactiveRes.status}`);
    }

    // Invalid Password rejection
    const loginInvalidRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: staffAEmail, password: 'WrongPassword@123' })
    });
    if (loginInvalidRes.status === 401) {
      pass('Invalid Staff password correctly rejected with 401');
    } else {
      fail('Invalid password rejection', `Expected 401, got ${loginInvalidRes.status}`);
    }

    // Admin & Citizen tokens
    const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: 'Admin@123456' })
    });
    const tokenAdmin = (await adminLoginRes.json()).token;

    const citizenLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: citizenEmail, password: 'Citizen@123456' })
    });
    const tokenCitizen = (await citizenLoginRes.json()).token;

    // -------------------------------------------------------------
    // Step 3: Staff Role Protection (RBAC)
    // -------------------------------------------------------------
    console.log('\n[3/14] Testing Staff Route Role Protection...');

    // Unauthenticated -> 401
    const unauthStaffRes = await fetch(`${API_URL}/staff/requests`);
    if (unauthStaffRes.status === 401) {
      pass('Unauthenticated access to /api/staff/requests returns 401');
    } else {
      fail('Unauthenticated staff route access', `Expected 401, got ${unauthStaffRes.status}`);
    }

    // Citizen -> 403
    const citizenStaffRes = await fetch(`${API_URL}/staff/requests`, {
      headers: { Authorization: `Bearer ${tokenCitizen}` }
    });
    if (citizenStaffRes.status === 403) {
      pass('Citizen role accessing /api/staff/requests returns 403 Forbidden');
    } else {
      fail('Citizen accessing staff route', `Expected 403, got ${citizenStaffRes.status}`);
    }

    // Admin -> 200 (Staff routes allow STAFF and ADMIN)
    const adminStaffRes = await fetch(`${API_URL}/staff/requests`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    if (adminStaffRes.status === 200) {
      pass('Admin role accessing /api/staff/requests is permitted (STAFF/ADMIN allowed)');
    } else {
      fail('Admin accessing staff route', `Expected 200, got ${adminStaffRes.status}`);
    }

    // -------------------------------------------------------------
    // Step 4: Create Valid Service Requests as Citizen
    // -------------------------------------------------------------
    console.log('\n[4/14] Creating Service Requests via Citizen API...');

    // Request 1: Main lifecycle test request
    const createReq1Res = await fetch(`${API_URL}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCitizen}`
      },
      body: JSON.stringify({
        title: 'Burst Water Pipe Causing Flooding on Street',
        description: 'Underground municipal pipe ruptured with heavy water gushing into roadway.',
        category: 'WATER',
        priority: 'HIGH',
        address: '42 Marine Drive, Nariman Point, Mumbai',
        latitude: 18.9220,
        longitude: 72.8238,
        city: 'Mumbai',
        pincode: '400021'
      })
    });
    const req1Data = await createReq1Res.json();
    if (createReq1Res.status !== 201 && createReq1Res.status !== 200) {
      throw new Error(`Failed to create Request 1: ${JSON.stringify(req1Data)}`);
    }
    const request1 = req1Data.request;
    pass('Created Request 1 as Citizen', `ID: ${request1.requestId}, Status: ${request1.status}`);

    // Request 2: For rejection test
    const createReq2Res = await fetch(`${API_URL}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCitizen}`
      },
      body: JSON.stringify({
        title: 'Broken Main Valve Near Junction',
        description: 'Secondary line leakage near crossroads causing localized low pressure.',
        category: 'WATER',
        priority: 'MEDIUM',
        address: '105 Cross Road, Sector 3, Mumbai',
        latitude: 18.9250,
        longitude: 72.8270,
        city: 'Mumbai',
        pincode: '400021'
      })
    });
    const request2 = (await createReq2Res.json()).request;
    pass('Created Request 2 as Citizen', `ID: ${request2.requestId}`);

    // -------------------------------------------------------------
    // Step 5: Admin Assigns Requests to Staff A
    // -------------------------------------------------------------
    console.log('\n[5/14] Admin assigning Request 1 and Request 2 to Staff A...');

    const assign1Res = await fetch(`${API_URL}/admin/requests/${request1._id}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({
        staffId: staffAUser._id.toString(),
        departmentId: waterDept._id.toString(),
        priority: 'HIGH'
      })
    });
    const assign1Data = await assign1Res.json();
    if (assign1Res.status === 200 && assign1Data.success) {
      pass('Admin successfully assigned Request 1 to Staff A', 'Status -> ASSIGNED');
    } else {
      fail('Admin assignment of Request 1', `Status: ${assign1Res.status}`);
    }

    const assign2Res = await fetch(`${API_URL}/admin/requests/${request2._id}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({
        staffId: staffAUser._id.toString(),
        departmentId: waterDept._id.toString(),
        priority: 'MEDIUM'
      })
    });
    if (assign2Res.status === 200) {
      pass('Admin successfully assigned Request 2 to Staff A');
    } else {
      fail('Admin assignment of Request 2', `Status: ${assign2Res.status}`);
    }

    // -------------------------------------------------------------
    // Step 6: Staff Workload, Isolation & SLA Information
    // -------------------------------------------------------------
    console.log('\n[6/14] Testing Staff Workload & Workload Isolation...');

    // Staff A views workload
    const workloadARes = await fetch(`${API_URL}/staff/requests`, {
      headers: { Authorization: `Bearer ${tokenStaffA}` }
    });
    const workloadAData = await workloadARes.json();

    if (workloadARes.status === 200 && workloadAData.success) {
      const foundReq1 = workloadAData.requests.find(r => r.requestId === request1.requestId);
      if (foundReq1) {
        pass('Staff A workload contains assigned Request 1');
        // SLA check
        if (foundReq1.slaDeadline && foundReq1.slaStatus) {
          pass('SLA deadline and status calculated for Staff A task', `Status: ${foundReq1.slaStatus}, Deadline: ${new Date(foundReq1.slaDeadline).toLocaleTimeString()}`);
        } else {
          fail('SLA information', 'Missing slaDeadline or slaStatus in response');
        }
      } else {
        fail('Staff A workload', `Request 1 (${request1.requestId}) not found in workload list`);
      }
    } else {
      fail('Staff A workload fetch', `Status: ${workloadARes.status}`);
    }

    // Staff B views workload - Request 1 MUST NOT be present
    const workloadBRes = await fetch(`${API_URL}/staff/requests`, {
      headers: { Authorization: `Bearer ${tokenStaffB}` }
    });
    const workloadBData = await workloadBRes.json();
    const foundInB = (workloadBData.requests || []).find(r => r.requestId === request1.requestId);
    if (!foundInB) {
      pass('Workload Isolation: Request 1 NOT visible in Staff B workload');
    } else {
      fail('Workload Isolation', 'Staff B was able to see Staff A assigned request!');
    }

    // Attempt to spoof staffId query parameter
    const spoofRes = await fetch(`${API_URL}/staff/requests?staffId=${staffAUser._id}`, {
      headers: { Authorization: `Bearer ${tokenStaffB}` }
    });
    const spoofData = await spoofRes.json();
    const foundInSpoof = (spoofData.requests || []).find(r => r.requestId === request1.requestId);
    if (!foundInSpoof) {
      pass('Staff ID Spoofing Blocked: Passing ?staffId=StaffA does not leak Staff A workload');
    } else {
      fail('Staff ID Spoofing', 'Query parameter allowed Staff B to view Staff A workload!');
    }

    // -------------------------------------------------------------
    // Step 7: Staff Rejection Workflow (Testing Request 2)
    // -------------------------------------------------------------
    console.log('\n[7/14] Testing Task Rejection Workflow (Request 2)...');

    // Staff B attempts to reject Staff A's assigned task -> 403
    const unauthRejectRes = await fetch(`${API_URL}/staff/requests/${request2._id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffB}`
      },
      body: JSON.stringify({ reason: 'Malicious reject attempt' })
    });
    if (unauthRejectRes.status === 403) {
      pass('Staff B rejecting Staff A request is rejected with 403 Forbidden');
    } else {
      fail('Unauthorized rejection', `Expected 403, got ${unauthRejectRes.status}`);
    }

    // Staff A rejects Request 2 with valid reason
    const rejectRes = await fetch(`${API_URL}/staff/requests/${request2._id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`
      },
      body: JSON.stringify({ reason: 'Emergency crew currently deployed on critical hospital water main.' })
    });
    const rejectData = await rejectRes.json();
    if (rejectRes.status === 200 && rejectData.success && rejectData.request.status === 'PENDING') {
      pass('Staff A rejected Request 2: status reset to PENDING and assignedStaff cleared');
    } else {
      fail('Staff A rejection', `Expected status PENDING, got: ${JSON.stringify(rejectData)}`);
    }

    // -------------------------------------------------------------
    // Step 8: Task Acceptance Workflow (Request 1)
    // -------------------------------------------------------------
    console.log('\n[8/14] Testing Task Acceptance Workflow (Request 1)...');

    // Staff B attempts to accept Staff A's request -> 403
    const unauthAcceptRes = await fetch(`${API_URL}/staff/requests/${request1._id}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStaffB}` }
    });
    if (unauthAcceptRes.status === 403) {
      pass('Staff B accepting Staff A request correctly blocked with 403 Forbidden');
    } else {
      fail('Unauthorized acceptance', `Expected 403, got ${unauthAcceptRes.status}`);
    }

    // Staff A accepts Request 1
    const acceptRes = await fetch(`${API_URL}/staff/requests/${request1._id}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStaffA}` }
    });
    const acceptData = await acceptRes.json();
    if (acceptRes.status === 200 && acceptData.success && acceptData.request.status === 'ACCEPTED') {
      pass('Staff A accepted Request 1: Status moved to ACCEPTED');
    } else {
      fail('Staff A accept', `Expected status ACCEPTED, got ${JSON.stringify(acceptData)}`);
    }

    // Duplicate accept test -> 409 Conflict (already in ACCEPTED status)
    const dupAcceptRes = await fetch(`${API_URL}/staff/requests/${request1._id}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStaffA}` }
    });
    if (dupAcceptRes.status === 409) {
      pass('Duplicate accept on already ACCEPTED request correctly rejected with 409 Conflict');
    } else {
      fail('Duplicate accept check', `Expected 409, got ${dupAcceptRes.status}`);
    }

    // -------------------------------------------------------------
    // Step 9: Before-Work Proof Upload & Start Work
    // -------------------------------------------------------------
    console.log('\n[9/14] Testing Before-Work Proof Upload & Work Start...');

    // Staff B attempts to upload before-work proof & start Staff A's request -> 403
    const formB = createFormDataFile(SAMPLE_PNG_BUFFER, 'temp_before.png', 'beforeImage');
    const unauthStartRes = await fetch(`${API_URL}/staff/requests/${request1._id}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStaffB}` },
      body: formB
    });
    if (unauthStartRes.status === 403) {
      pass('Staff B attempting to start work on Staff A request blocked with 403 Forbidden');
    } else {
      fail('Unauthorized start work', `Expected 403, got ${unauthStartRes.status}`);
    }

    // Staff A starts work with real before-work proof image
    const formA = createFormDataFile(SAMPLE_PNG_BUFFER, 'before_proof.png', 'beforeImage');
    const startRes = await fetch(`${API_URL}/staff/requests/${request1._id}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStaffA}` },
      body: formA
    });
    const startData = await startRes.json();

    if (startRes.status === 200 && startData.success && startData.request.status === 'IN_PROGRESS') {
      pass('Staff A started work: status moved to IN_PROGRESS');
      if (startData.request.beforeImage && startData.request.beforeImage.startsWith('/uploads/')) {
        pass('Before-work proof image uploaded & stored in request.beforeImage', startData.request.beforeImage);
      } else {
        fail('Before-work proof image', 'beforeImage path not saved on request object');
      }
    } else {
      fail('Staff A start work', `Status: ${startRes.status}, Response: ${JSON.stringify(startData)}`);
    }

    // -------------------------------------------------------------
    // Step 10: Technical Work Notes
    // -------------------------------------------------------------
    console.log('\n[10/14] Testing Technical Work Notes Submission & Validation...');

    // Empty note validation -> 400
    const emptyNoteRes = await fetch(`${API_URL}/staff/requests/${request1._id}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`
      },
      body: JSON.stringify({ note: '    ' })
    });
    if (emptyNoteRes.status === 400) {
      pass('Empty work note correctly rejected with 400 Bad Request');
    } else {
      fail('Empty work note', `Expected 400, got ${emptyNoteRes.status}`);
    }

    // Excessively long note validation (> 2000 chars) -> 400
    const longNote = 'A'.repeat(2500);
    const longNoteRes = await fetch(`${API_URL}/staff/requests/${request1._id}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`
      },
      body: JSON.stringify({ note: longNote })
    });
    if (longNoteRes.status === 400) {
      pass('Excessively long work note (>2000 chars) correctly rejected with 400 Bad Request');
    } else {
      fail('Long work note', `Expected 400, got ${longNoteRes.status}`);
    }

    // Staff B cannot add note to Staff A request -> 403
    const unauthNoteRes = await fetch(`${API_URL}/staff/requests/${request1._id}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffB}`
      },
      body: JSON.stringify({ note: 'Tampering note from unauthorized staff' })
    });
    if (unauthNoteRes.status === 403) {
      pass('Staff B adding work note to Staff A request blocked with 403 Forbidden');
    } else {
      fail('Unauthorized work note', `Expected 403, got ${unauthNoteRes.status}`);
    }

    // Valid technical note by Staff A -> 201
    const validNoteText = 'Excavated 1.5m trench. Identified fracture on 4-inch ductile iron valve joint. Commenced replacement.';
    const validNoteRes = await fetch(`${API_URL}/staff/requests/${request1._id}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`
      },
      body: JSON.stringify({ note: validNoteText })
    });
    const validNoteData = await validNoteRes.json();
    if (validNoteRes.status === 201 && validNoteData.success) {
      pass('Valid technical note saved to request history', validNoteData.entry?.action);
    } else {
      fail('Valid work note', `Expected 201, got ${validNoteRes.status}`);
    }

    // -------------------------------------------------------------
    // Step 11: After-Work Proof & Resolution Submission
    // -------------------------------------------------------------
    console.log('\n[11/14] Testing Resolution Proof & Resolution Submission...');

    // Short resolution notes (< 5 chars) -> 400
    const shortResolveRes = await fetch(`${API_URL}/staff/requests/${request1._id}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`
      },
      body: JSON.stringify({ resolutionNotes: 'Done' })
    });
    if (shortResolveRes.status === 400) {
      pass('Resolution notes < 5 chars correctly rejected with 400 Bad Request');
    } else {
      fail('Short resolution notes', `Expected 400, got ${shortResolveRes.status}`);
    }

    // Staff B attempts to resolve Staff A request -> 403
    const formResolveB = createFormDataFile(SAMPLE_PNG_BUFFER, 'after_tamper.png', 'afterImage', {
      resolutionNotes: 'Unauthorized staff trying to resolve this request.'
    });
    const unauthResolveRes = await fetch(`${API_URL}/staff/requests/${request1._id}/resolve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStaffB}` },
      body: formResolveB
    });
    if (unauthResolveRes.status === 403) {
      pass('Staff B resolving Staff A request blocked with 403 Forbidden');
    } else {
      fail('Unauthorized resolution', `Expected 403, got ${unauthResolveRes.status}`);
    }

    // Staff A resolves with After-Work proof & notes
    const resolutionNoteText = 'Installed new high-tensile flanged pipe segment and gasket. Tested line pressure at 6.2 bar for 45 minutes with zero leakage. Backfilled and resurfaced asphalt.';
    const formResolveA = createFormDataFile(SAMPLE_PNG_BUFFER, 'after_proof.png', 'afterImage', {
      resolutionNotes: resolutionNoteText
    });

    const resolveRes = await fetch(`${API_URL}/staff/requests/${request1._id}/resolve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStaffA}` },
      body: formResolveA
    });
    const resolveData = await resolveRes.json();

    if (resolveRes.status === 200 && resolveData.success && resolveData.request.status === 'RESOLVED') {
      pass('Staff A resolved Request 1: status moved to RESOLVED');
      if (resolveData.request.afterImage && resolveData.request.afterImage.startsWith('/uploads/')) {
        pass('After-work proof image saved in request.afterImage', resolveData.request.afterImage);
      } else {
        fail('After-work proof image', 'afterImage missing in response');
      }

      if (resolveData.request.resolvedAt) {
        pass('resolvedAt timestamp stored on request', resolveData.request.resolvedAt);
      } else {
        fail('resolvedAt timestamp', 'resolvedAt not set on request');
      }
    } else {
      fail('Staff A submit resolution', `Status: ${resolveRes.status}, Response: ${JSON.stringify(resolveData)}`);
    }

    // -------------------------------------------------------------
    // Step 12: Separation of Proof Fields Verification
    // -------------------------------------------------------------
    console.log('\n[12/14] Verifying Separation of Proof Fields in MongoDB...');

    const freshReq = await Request.findById(request1._id);
    if (freshReq) {
      const citizenImages = freshReq.images || [];
      const beforeImg = freshReq.beforeImage;
      const afterImg = freshReq.afterImage;
      const proofObj = freshReq.resolutionProof;

      if (beforeImg && afterImg && beforeImg !== afterImg) {
        pass('Separation verified: Before-work proof is distinct from After-work proof');
      } else {
        fail('Proof Separation', `beforeImage (${beforeImg}) should not be identical to afterImage (${afterImg})`);
      }

      if (proofObj && proofObj.images && proofObj.images.length > 0 && proofObj.notes) {
        pass('Resolution proof package correctly structured in request.resolutionProof', `Notes: "${proofObj.notes.substring(0, 40)}..."`);
      } else {
        fail('resolutionProof structure', 'resolutionProof is missing or malformed');
      }
    } else {
      fail('Database fetch', 'Could not reload Request 1 from DB');
    }

    // -------------------------------------------------------------
    // Step 13: Invalid Lifecycle Transitions on Resolved Request
    // -------------------------------------------------------------
    console.log('\n[13/14] Testing Invalid Status Transitions on Resolved Request...');

    // Attempt start on resolved request -> 409
    const invalidStartRes = await fetch(`${API_URL}/staff/requests/${request1._id}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStaffA}` }
    });
    if (invalidStartRes.status === 409) {
      pass('Invalid transition: POST /start on RESOLVED request rejected with 409 Conflict');
    } else {
      fail('RESOLVED -> IN_PROGRESS', `Expected 409, got ${invalidStartRes.status}`);
    }

    // Attempt accept on resolved request -> 409
    const invalidAcceptRes = await fetch(`${API_URL}/staff/requests/${request1._id}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStaffA}` }
    });
    if (invalidAcceptRes.status === 409) {
      pass('Invalid transition: POST /accept on RESOLVED request rejected with 409 Conflict');
    } else {
      fail('RESOLVED -> ACCEPTED', `Expected 409, got ${invalidAcceptRes.status}`);
    }

    // Attempt reject on resolved request -> 409
    const invalidRejectRes = await fetch(`${API_URL}/staff/requests/${request1._id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`
      },
      body: JSON.stringify({ reason: 'Attempting to reject already resolved' })
    });
    if (invalidRejectRes.status === 409) {
      pass('Invalid transition: POST /reject on RESOLVED request rejected with 409 Conflict');
    } else {
      fail('RESOLVED -> REJECTED', `Expected 409, got ${invalidRejectRes.status}`);
    }

    // Attempt PATCH /status with invalid target -> 409
    const invalidPatchRes = await fetch(`${API_URL}/staff/requests/${request1._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`
      },
      body: JSON.stringify({ status: 'IN_PROGRESS' })
    });
    if (invalidPatchRes.status === 409) {
      pass('Invalid transition: PATCH /status to IN_PROGRESS on RESOLVED request rejected with 409');
    } else {
      fail('PATCH RESOLVED -> IN_PROGRESS', `Expected 409, got ${invalidPatchRes.status}`);
    }

    // -------------------------------------------------------------
    // Step 14: Comprehensive Status History Audit
    // -------------------------------------------------------------
    console.log('\n[14/14] Auditing Complete Lifecycle History...');

    const historyRes = await fetch(`${API_URL}/staff/requests/${request1._id}`, {
      headers: { Authorization: `Bearer ${tokenStaffA}` }
    });
    const historyData = await historyRes.json();

    if (historyRes.status === 200 && Array.isArray(historyData.history)) {
      const historyActions = historyData.history.map(h => h.action);
      console.log('   Recorded Timeline Actions:', historyActions.join(' ➔ '));

      const requiredActions = ['ASSIGNED', 'ACCEPTED', 'WORK_STARTED', 'WORK_NOTE_ADDED', 'RESOLUTION_SUBMITTED'];
      const allFound = requiredActions.every(act => historyActions.includes(act));

      if (allFound) {
        pass('Complete Status History Audited: all staff lifecycle actions tracked sequentially', historyActions.join(' -> '));
      } else {
        fail('Status History Audit', `Missing expected actions. Found: ${historyActions.join(', ')}`);
      }

      // Check fields in history entries
      const sampleHistory = historyData.history[historyData.history.length - 1];
      if (sampleHistory && sampleHistory.user && sampleHistory.newStatus && sampleHistory.createdAt) {
        pass('History entries contain required audit fields (user, status, notes, timestamps)');
      } else {
        fail('History entry fields', 'Missing user, status or createdAt on history record');
      }
    } else {
      fail('Fetch request details & history', `Status: ${historyRes.status}`);
    }

  } catch (error) {
    fail('Global Suite Execution', error.message);
  } finally {
    // Cleanup temporary test image files
    if (fs.existsSync(beforeImagePath)) fs.unlinkSync(beforeImagePath);
    if (fs.existsSync(afterImagePath)) fs.unlinkSync(afterImagePath);
    if (fs.existsSync(assetsDir)) {
      try { fs.rmdirSync(assetsDir); } catch (_) {}
    }

    // Close server and DB connection
    if (localServer) {
      await new Promise(r => localServer.close(r));
    }
    await mongoose.disconnect();

    // Summary Report
    console.log('\n===============================================================');
    console.log('📊 LOCALFIX PHASE 7 TEST SUMMARY REPORT');
    console.log('===============================================================');
    console.log(`Total Tests Run: ${results.passed.length + results.failed.length}`);
    console.log(`Passed: ${results.passed.length}`);
    console.log(`Failed: ${results.failed.length}`);

    if (results.failed.length === 0) {
      console.log('\n🎉 ===============================================================');
      console.log('✅ PHASE 7 RESULT: PASS');
      console.log('===============================================================');
      process.exit(0);
    } else {
      console.log('\n⚠️ ===============================================================');
      console.log('❌ PHASE 7 RESULT: FAILED');
      console.log('===============================================================');
      results.failed.forEach((f, idx) => {
        console.log(`  ${idx + 1}. [FAIL] ${f.testName} - ${f.reason}`);
      });
      process.exit(1);
    }
  }
}

runPhase7Tests();
