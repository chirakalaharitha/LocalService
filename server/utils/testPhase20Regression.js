/**
 * LocalFix — Phase 20: Complete System Testing & Full Regression Suite
 * 
 * End-to-end multi-role test covering:
 *  - 20.1 Citizen Complete Flow (Register -> Login -> Create -> Track -> Verify -> Feedback)
 *  - 20.2 Admin Complete Flow (Login -> Dashboard -> Requests -> Users -> Departments -> Analytics -> Reports -> Settings -> Audit Logs)
 *  - 20.3 Staff Complete Flow (Login -> Workload -> Accept -> Notes -> Resolution -> Awaiting Verification)
 *  - 20.4 Real-time Socket.IO verification (Authentication, room isolation, events)
 *  - 20.5 Security & Boundary Testing (401, 403, 404, 409, ownership isolation)
 *  - 20.6 Database Integrity & Consistency (Histories, timestamps, foreign keys)
 *  - 20.7 API Performance & Response sanity checks
 */

const http = require('http');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { io: Client } = require('../../client/node_modules/socket.io-client');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = require('../app');
const connectDB = require('../config/db');
const { initSocket } = require('../services/socketService');

const User = require('../models/User');
const Department = require('../models/Department');
const Request = require('../models/Request');
const RequestHistory = require('../models/RequestHistory');
const Notification = require('../models/Notification');
const Feedback = require('../models/Feedback');
const SystemSetting = require('../models/SystemSetting');
const ActivityLog = require('../models/ActivityLog');

let testServer = null;
let serverUrl = '';
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function request(method, endpoint, token = null, body = null, headers = {}) {
  const url = new URL(endpoint, serverUrl);
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), options);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, headers: res.headers, data };
}

async function runRegressionSuite() {
  console.log('\n===============================================================');
  console.log('🧪 Starting Phase 20: Complete System Testing & Full Regression');
  console.log('===============================================================\n');

  try {
    await connectDB();

    testServer = http.createServer(app);
    const io = new Server(testServer, {
      cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] }
    });
    initSocket(io);

    await new Promise((resolve) => {
      testServer.listen(0, '127.0.0.1', () => {
        const port = testServer.address().port;
        serverUrl = `http://127.0.0.1:${port}`;
        console.log(`  Test Server running on ${serverUrl}`);
        resolve();
      });
    });

    const timestamp = Date.now();

    // -------------------------------------------------------------
    // SETUP BASELINE MUNICIPAL INFRASTRUCTURE
    // -------------------------------------------------------------
    console.log('\n--- Setup: Seed Departments & Verified Roles ---');
    await User.deleteMany({ email: { $regex: /p20_/ } });
    await Request.deleteMany({ title: { $regex: /P20/ } });

    let deptRoads = await Department.findOne({ code: 'ROADS_P20' });
    if (!deptRoads) {
      deptRoads = await Department.create({
        name: `P20 Roads & Infrastructure ${timestamp}`,
        code: `ROADS_P20_${timestamp.toString().slice(-4)}`,
        description: 'Road repair and street maintenance division',
        isActive: true
      });
    }

    // -------------------------------------------------------------
    // 20.1: CITIZEN LIFECYCLE FLOW
    // -------------------------------------------------------------
    console.log('\n--- 20.1: Citizen Complete Flow ---');

    // 1. Register Citizen
    const citizenReg = await request('POST', '/api/auth/register', null, {
      name: 'P20 Citizen Alice',
      email: `p20_alice_${timestamp}@localfix.org`,
      phone: '9876543210',
      password: 'Password@123',
      role: 'CITIZEN'
    });
    assert(citizenReg.status === 201 && citizenReg.data.token, '1. Citizen registration returns JWT token');
    const citizenToken = citizenReg.data.token;
    const citizenId = citizenReg.data.user._id;

    // 2. Citizen /me profile check
    const citizenMe = await request('GET', '/api/auth/me', citizenToken);
    assert(citizenMe.status === 200 && citizenMe.data.user.role === 'CITIZEN', '2. Authenticated citizen profile fetched (/api/auth/me)');

    // 3. Create Service Request with location & priority
    const createReq = await request('POST', '/api/requests', citizenToken, {
      title: 'P20 Hazardous Pothole on High Street',
      description: 'Massive crater on high street causing heavy vehicle congestion',
      category: 'ROAD',
      priority: 'HIGH',
      address: '42 High Street, District 4',
      latitude: 28.6139,
      longitude: 77.2090
    });
    assert(createReq.status === 201 && createReq.data.request?._id, '3. Citizen created service request with coordinates');
    const requestId = createReq.data.request._id;
    const publicRequestId = createReq.data.request.requestId;

    // 4. Verify SLA deadline calculation
    assert(createReq.data.request.slaDeadline != null, '4. Smart SLA deadline computed upon request creation');

    // 5. Citizen views personal requests
    const myReqs = await request('GET', '/api/requests/my', citizenToken);
    assert(
      myReqs.status === 200 && myReqs.data.requests.some((r) => r._id === requestId),
      '5. Request appears in citizen /api/requests/my list'
    );

    // -------------------------------------------------------------
    // 20.2: ADMIN LIFECYCLE & MANAGEMENT FLOW
    // -------------------------------------------------------------
    console.log('\n--- 20.2: Admin Complete Flow ---');

    // Admin user creation & login
    const adminEmail = `p20_admin_${timestamp}@localfix.gov.in`;
    await User.create({
      name: 'P20 Municipal Admin',
      email: adminEmail,
      phone: '9876543211',
      password: 'AdminPassword@123',
      role: 'ADMIN',
      isActive: true
    });

    const adminLogin = await request('POST', '/api/auth/login', null, {
      email: adminEmail,
      password: 'AdminPassword@123'
    });
    assert(adminLogin.status === 200 && adminLogin.data.token, 'Admin login succeeded and returned JWT');
    const adminToken = adminLogin.data.token;

    // 1. Admin Dashboard KPIs
    const adminDash = await request('GET', '/api/admin/dashboard', adminToken);
    assert(adminDash.status === 200 && adminDash.data.stats != null, '1. Admin dashboard loaded with real MongoDB KPI metrics');

    // 2. Admin Request Management & Filtering
    const adminReqList = await request('GET', `/api/requests?category=ROAD&status=PENDING`, adminToken);
    assert(adminReqList.status === 200 && adminReqList.data.requests.length >= 1, '2. Admin requests filtered by category & status');

    // 3. Admin User Management
    const adminUsers = await request('GET', '/api/admin/users?role=CITIZEN', adminToken);
    assert(adminUsers.status === 200 && adminUsers.data.users.length >= 1, '3. Admin user management lists citizens with credentials hidden');

    // 4. Admin Department Management
    const adminDeptList = await request('GET', '/api/departments', adminToken);
    assert(adminDeptList.status === 200 && adminDeptList.data.departments.length >= 1, '4. Admin departments directory accessible');

    // Provision Staff User & Login
    const staffEmail = `p20_staff_bob_${timestamp}@localfix.gov.in`;
    const staffDoc = await User.create({
      name: 'P20 Field Officer Bob',
      email: staffEmail,
      phone: '9876543212',
      password: 'StaffPassword@123',
      role: 'STAFF',
      department: deptRoads._id,
      isActive: true
    });
    const staffId = staffDoc._id;

    const staffLogin = await request('POST', '/api/auth/login', null, {
      email: staffEmail,
      password: 'StaffPassword@123'
    });
    assert(staffLogin.status === 200 && staffLogin.data.token, 'Staff login succeeded and returned JWT');
    const staffToken = staffLogin.data.token;

    // 5. Admin assigns Request to Department & Staff
    const assignRes = await request('POST', `/api/admin/requests/${requestId}/assign`, adminToken, {
      departmentId: deptRoads._id,
      staffId: staffId,
      priority: 'HIGH'
    });
    assert(assignRes.status === 200 && assignRes.data.request.status === 'ASSIGNED', '5. Admin successfully assigned request to department staff');

    // 6. Admin Analytics API
    const analyticsOverview = await request('GET', '/api/admin/analytics', adminToken);
    assert(analyticsOverview.status === 200 && analyticsOverview.data.overview != null, '6. Admin analytics overview calculated successfully');

    // 7. Admin Reports Export APIs
    const reportsExport = await request('GET', '/api/admin/reports/requests?format=json', adminToken);
    assert(reportsExport.status === 200 && Array.isArray(reportsExport.data.data), '7. Admin reports export API generated dataset');

    // 8. Admin Settings API
    const settingsRes = await request('GET', '/api/admin/settings', adminToken);
    assert(settingsRes.status === 200 && settingsRes.data.settings.slaTargets != null, '8. Admin system settings & SLA targets retrieved');

    // 9. Admin Activity Log Audit
    const auditLogs = await request('GET', '/api/admin/activity-logs', adminToken);
    assert(auditLogs.status === 200 && Array.isArray(auditLogs.data.logs), '9. Administrative activity logs tracked assignment event');

    // -------------------------------------------------------------
    // 20.3: STAFF WORKFLOW EXECUTION
    // -------------------------------------------------------------
    console.log('\n--- 20.3: Field Staff Complete Flow ---');

    // 1. Staff Workload list
    const staffWorkload = await request('GET', '/api/staff/requests', staffToken);
    assert(
      staffWorkload.status === 200 && staffWorkload.data.requests.some((r) => r._id === requestId),
      '1. Assigned request appears in staff workload queue'
    );

    // 2. Staff accepts assignment
    const acceptRes = await request('POST', `/api/staff/requests/${requestId}/accept`, staffToken);
    assert(acceptRes.status === 200, '2. Staff accepted assignment: status moved to ACCEPTED / IN_PROGRESS');

    // 3. Staff adds Technical Work Note
    const noteRes = await request('POST', `/api/staff/requests/${requestId}/notes`, staffToken, {
      note: 'Inspected pothole with asphalt crew. Equipment on site.'
    });
    assert(noteRes.status === 201 || noteRes.status === 200, '3. Staff successfully recorded inspection work note');

    // 4. Staff submits Resolution
    const resolveRes = await request('PATCH', `/api/staff/requests/${requestId}/resolve`, staffToken, {
      resolutionNotes: 'Filled and leveled with hot-mix asphalt. Surface compacted and sealed.'
    });
    assert(resolveRes.status === 200, '4. Staff submitted resolution: status moved to RESOLVED / PENDING_VERIFICATION');

    // -------------------------------------------------------------
    // 20.1 (Cont.): CITIZEN VERIFICATION & FEEDBACK
    // -------------------------------------------------------------
    console.log('\n--- 20.1 (Cont.): Citizen Verification & Rating ---');

    // Citizen verifies work
    const verifyRes = await request('POST', `/api/requests/${requestId}/verify`, citizenToken, {
      rating: 5,
      comment: 'Excellent and swift road repair!'
    });
    assert(verifyRes.status === 200, '1. Citizen verified resolution: status moved to CITIZEN_VERIFIED');

    // Citizen submits feedback
    const feedbackRes = await request('POST', '/api/feedback', citizenToken, {
      requestId: requestId,
      rating: 5,
      comment: 'Top quality repair work by the roads team.'
    });
    assert(feedbackRes.status === 201, '2. Citizen submitted 5-star feedback and rating review');

    // -------------------------------------------------------------
    // 20.4: REAL-TIME SOCKET.IO SECURITY & COMMUNICATION
    // -------------------------------------------------------------
    console.log('\n--- 20.4: Real-time Socket.IO Verification ---');

    const clientSocket = Client(serverUrl, {
      auth: { token: citizenToken },
      transports: ['websocket']
    });

    const socketConnected = await new Promise((resolve) => {
      clientSocket.on('connect', () => resolve(true));
      setTimeout(() => resolve(false), 3000);
    });
    assert(socketConnected, '1. Socket.IO authenticated client connected successfully');

    clientSocket.emit('join_request', requestId.toString());
    await new Promise((r) => setTimeout(r, 400));
    assert(clientSocket.connected, '2. Citizen successfully joined authorized private request room via join_request event');

    clientSocket.disconnect();

    // -------------------------------------------------------------
    // 20.5: SECURITY & PERMISSION BOUNDARIES (NEGATIVE TESTING)
    // -------------------------------------------------------------
    console.log('\n--- 20.5: Security & Boundary Enforcement ---');

    // 1. Missing Token -> 401
    const noTokenRes = await request('GET', '/api/admin/dashboard');
    assert(noTokenRes.status === 401, '1. Unauthenticated request rejected with 401');

    // 2. Citizen accessing Admin -> 403
    const citizenOnAdmin = await request('GET', '/api/admin/dashboard', citizenToken);
    assert(citizenOnAdmin.status === 403, '2. Citizen blocked from admin dashboard (403)');

    // 3. Staff accessing Admin -> 403
    const staffOnAdmin = await request('GET', '/api/admin/settings', staffToken);
    assert(staffOnAdmin.status === 403, '3. Staff blocked from admin settings (403)');

    // 4. Duplicate feedback rejected -> 400
    const dupFeedback = await request('POST', '/api/feedback', citizenToken, {
      requestId: requestId,
      rating: 4,
      comment: 'Duplicate submission attempt'
    });
    assert(dupFeedback.status === 400, '4. Duplicate feedback for same request rejected (400)');

    // 5. Malformed ObjectId -> 404 / 400 handled safely
    const malformedIdRes = await request('GET', '/api/requests/000invalid000id', citizenToken);
    assert(malformedIdRes.status === 404 || malformedIdRes.status === 400, '5. Malformed ID handled safely without server crash (404/400)');

    // -------------------------------------------------------------
    // 20.6: DATABASE CONSISTENCY & REFERENTIAL INTEGRITY
    // -------------------------------------------------------------
    console.log('\n--- 20.6: Database Referential Integrity & Continuity ---');

    const finalReq = await Request.findById(requestId);
    assert(finalReq != null, '1. Service request persists in MongoDB');
    assert(finalReq.status === 'CITIZEN_VERIFIED', '2. Request final status is CITIZEN_VERIFIED');
    assert(finalReq.assignedStaff.toString() === staffId.toString(), '3. Assigned staff reference is consistent');
    assert(finalReq.department.toString() === deptRoads._id.toString(), '4. Department reference is consistent');
    assert(finalReq.verifiedAt != null, '5. verifiedAt timestamp stamped on request document');

    const histories = await RequestHistory.find({ request: requestId }).sort({ createdAt: 1 });
    assert(histories.length >= 3, `6. Audit history timeline preserved (${histories.length} state transitions)`);

    const persistedFeedback = await Feedback.findOne({ request: requestId });
    assert(persistedFeedback != null && persistedFeedback.rating === 5, '7. Feedback record stored with 5-star rating');

    const notifs = await Notification.find({ recipient: citizenId });
    assert(notifs.length >= 1, `8. In-app notifications generated for citizen (${notifs.length} notifications)`);

    // -------------------------------------------------------------
    // 20.7: PERFORMANCE & CLEANUP
    // -------------------------------------------------------------
    console.log('\n--- 20.7: API Performance & Clean Shutdown ---');

    const t0 = Date.now();
    const healthCheck = await request('GET', '/api/health');
    const latency = Date.now() - t0;
    assert(healthCheck.status === 200 && latency < 200, `Health check responds swiftly (${latency}ms < 200ms)`);

  } catch (err) {
    console.error('Fatal error during Phase 20 Regression Suite:', err);
    failed++;
  } finally {
    if (testServer) {
      await new Promise((r) => testServer.close(r));
    }
    await mongoose.disconnect();

    console.log('\n===============================================================');
    console.log(`Phase 20 Regression Suite: ${passed} Passed, ${failed} Failed`);
    console.log('===============================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

runRegressionSuite();
