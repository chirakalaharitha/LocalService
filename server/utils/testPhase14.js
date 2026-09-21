/**
 * Phase 14: Admin Dashboard & Admin Management Test Suite
 * Comprehensive automated verification for:
 * - Admin Executive Dashboard KPIs from real MongoDB data
 * - Request management, searching, sorting, and multi-field filtering
 * - Staff assignment with active-status validation and audit logging
 * - User management, role filtering, active/suspended status filtering & toggling
 * - Department CRUD, staff counts, and safe deletion prevention
 * - Activity logs and administrative security/RBAC enforcement
 */

const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = require('../app');
const User = require('../models/User');
const Department = require('../models/Department');
const Request = require('../models/Request');
const RequestHistory = require('../models/RequestHistory');
const Feedback = require('../models/Feedback');
const ActivityLog = require('../models/ActivityLog');

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
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runPhase14Tests() {
  console.log('===============================================================');
  console.log('🏛️  LOCALFIX PHASE 14: ADMIN DASHBOARD & MANAGEMENT TEST SUITE');
  console.log('===============================================================');

  const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/localfix';
  await mongoose.connect(connStr);
  console.log('[MongoDB] Connected successfully');

  const server = http.createServer(app);
  await new Promise(res => server.listen(0, '127.0.0.1', res));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`🚀 Test server running at ${baseUrl}`);

  try {
    // 1. Setup Test Accounts
    console.log('\n[1/8] Setting Up Admin, Staff, and Citizen Test Accounts...');
    await User.deleteMany({ email: /^phase14\./ });

    const rawPassword = 'Password@123';

    let deptA = await Department.findOne({ code: 'P14-CIVIC' });
    if (!deptA) {
      deptA = await Department.create({
        name: 'Phase 14 Civic Infrastructure',
        code: 'P14-CIVIC',
        description: 'Civic services and maintenance',
        isActive: true
      });
    }

    const admin = await User.create({
      name: 'Phase 14 Admin',
      email: 'phase14.admin@localfix.test',
      phone: '9876541401',
      password: rawPassword,
      role: 'ADMIN',
      isVerified: true
    });

    const activeStaff = await User.create({
      name: 'Phase 14 Active Staff',
      email: 'phase14.activestaff@localfix.test',
      phone: '9876541402',
      password: rawPassword,
      role: 'STAFF',
      department: deptA._id,
      isActive: true,
      isVerified: true
    });

    const inactiveStaff = await User.create({
      name: 'Phase 14 Inactive Staff',
      email: 'phase14.inactivestaff@localfix.test',
      phone: '9876541403',
      password: rawPassword,
      role: 'STAFF',
      department: deptA._id,
      isActive: false,
      isVerified: true
    });

    const citizen = await User.create({
      name: 'Phase 14 Citizen',
      email: 'phase14.citizen@localfix.test',
      phone: '9876541404',
      password: rawPassword,
      role: 'CITIZEN',
      isVerified: true
    });

    // Authenticate
    const adminLogin = await request(baseUrl, 'POST', '/api/auth/login', null, {
      email: 'phase14.admin@localfix.test',
      password: rawPassword
    });
    assert(adminLogin.status === 200 && adminLogin.body.token, 'Admin authenticated and obtained JWT');
    const adminToken = adminLogin.body.token;

    const citizenLogin = await request(baseUrl, 'POST', '/api/auth/login', null, {
      email: 'phase14.citizen@localfix.test',
      password: rawPassword
    });
    const citizenToken = citizenLogin.body.token;

    // 2. Admin Dashboard Stats
    console.log('\n[2/8] Testing Admin Executive Dashboard Stats API (Real MongoDB Data)...');
    const statsRes = await request(baseUrl, 'GET', '/api/admin/dashboard', adminToken);
    assert(statsRes.status === 200, 'GET /api/admin/dashboard responds with HTTP 200');
    assert(statsRes.body.success === true, 'Response indicates success: true');
    
    const s = statsRes.body.stats;
    assert(typeof s.totalUsers === 'number' && s.totalUsers >= 4, 'Stats reports real totalUsers count');
    assert(typeof s.totalCitizens === 'number' && s.totalCitizens >= 1, 'Stats reports totalCitizens count');
    assert(typeof s.totalStaff === 'number' && s.totalStaff >= 2, 'Stats reports totalStaff count');
    assert(typeof s.activeStaff === 'number' && s.activeStaff >= 1, 'Stats reports activeStaff count');
    assert(typeof s.totalRequests === 'number', 'Stats reports totalRequests');
    assert(typeof s.pendingRequests === 'number', 'Stats reports pendingRequests');
    assert(typeof s.assignedRequests === 'number', 'Stats reports assignedRequests');
    assert(typeof s.inProgressRequests === 'number', 'Stats reports inProgressRequests');
    assert(typeof s.resolvedRequests === 'number', 'Stats reports resolvedRequests');
    assert(typeof s.pendingVerificationRequests === 'number', 'Stats reports pendingVerificationRequests');
    assert(typeof s.closedRequests === 'number', 'Stats reports closedRequests');
    assert(typeof s.reopenedRequests === 'number', 'Stats reports reopenedRequests');
    assert(typeof s.avgRating === 'number', 'Stats reports real MongoDB average rating');
    assert(typeof s.pendingSlaRequests === 'number', 'Stats reports pendingSlaRequests');
    assert(typeof s.overdueCount === 'number', 'Stats reports overdueCount');

    // Security: Citizen cannot access admin dashboard
    const citBlock = await request(baseUrl, 'GET', '/api/admin/dashboard', citizenToken);
    assert(citBlock.status === 403, 'RBAC: Citizen blocked from admin dashboard with HTTP 403');

    // 3. Create Sample Requests for Multi-Filter Testing
    console.log('\n[3/8] Creating Sample Service Requests for Admin Query & Filter Testing...');
    const req1 = await request(baseUrl, 'POST', '/api/requests', citizenToken, {
      title: 'Water Leakage Near School',
      description: 'Underground pipe rupture flooding sidewalk and pedestrian area',
      category: 'WATER',
      priority: 'CRITICAL',
      address: 'School Road Main',
      latitude: 12.971,
      longitude: 77.594
    });
    assert(req1.status === 201 && req1.body.request, 'Created Request 1 (WATER / CRITICAL)');
    const req1Id = req1.body.request._id;

    const req2 = await request(baseUrl, 'POST', '/api/requests', citizenToken, {
      title: 'Fallen Tree Branch on Road',
      description: 'Heavy bough obstructing left traffic lane completely',
      category: 'ROAD',
      priority: 'LOW',
      address: 'Outer Ring Road',
      latitude: 12.975,
      longitude: 77.598
    });
    assert(req2.status === 201 && req2.body.request, 'Created Request 2 (ROAD / LOW)');
    const req2Id = req2.body.request._id;

    // 4. Request Management & Filtering
    console.log('\n[4/8] Testing Admin Request Management Filtering, Search, & Sorting...');
    // Category filter
    const catWaterRes = await request(baseUrl, 'GET', '/api/requests?category=WATER&scope=admin', adminToken);
    assert(catWaterRes.status === 200, 'Filtered requests by category=WATER');
    const allWater = catWaterRes.body.requests.every(r => r.category === 'WATER');
    assert(allWater, 'All returned requests match category=WATER');

    // Priority filter
    const prioCritRes = await request(baseUrl, 'GET', '/api/requests?priority=CRITICAL&scope=admin', adminToken);
    assert(prioCritRes.status === 200, 'Filtered requests by priority=CRITICAL');
    const allCritical = prioCritRes.body.requests.every(r => r.priority === 'CRITICAL');
    assert(allCritical, 'All returned requests match priority=CRITICAL');

    // Search filter
    const searchRes = await request(baseUrl, 'GET', '/api/requests?search=Fallen+Tree&scope=admin', adminToken);
    assert(searchRes.status === 200 && searchRes.body.requests.length >= 1, 'Search by keyword found matching request');
    assert(searchRes.body.requests[0].title.includes('Fallen Tree'), 'Search result title matches keyword');

    // 5. Staff Assignment Workflow & Safeguards
    console.log('\n[5/8] Testing Staff Assignment, Safeguards, & Audit Trail...');
    // Attempt to assign inactive staff -> Must fail with 400
    const inactiveAssignRes = await request(baseUrl, 'POST', `/api/admin/requests/${req1Id}/assign`, adminToken, {
      staffId: inactiveStaff._id,
      priority: 'HIGH'
    });
    assert(inactiveAssignRes.status === 400, 'Assignment to inactive/suspended staff correctly rejected (400)');

    // Assign active staff
    const validAssignRes = await request(baseUrl, 'POST', `/api/admin/requests/${req1Id}/assign`, adminToken, {
      staffId: activeStaff._id,
      departmentId: deptA._id,
      priority: 'HIGH'
    });
    assert(validAssignRes.status === 200, 'Assigned active staff and department successfully (200)');
    assert(validAssignRes.body.request.status === 'ASSIGNED', 'Request status transitioned to ASSIGNED');

    // Check DB RequestHistory
    const histories = await RequestHistory.find({ request: req1Id });
    const assignHistory = histories.find(h => h.action === 'ASSIGNED');
    assert(Boolean(assignHistory), 'RequestHistory recorded staff assignment');

    // Check ActivityLog
    const logs = await ActivityLog.find({ action: 'REQUEST_ASSIGNED', targetId: req1.body.request.requestId });
    assert(logs.length >= 1, 'ActivityLog recorded administrative assignment event');

    // 6. User Management & Status Toggling
    console.log('\n[6/8] Testing User Management, Filters, and Status Toggling...');
    // Role filter
    const staffListRes = await request(baseUrl, 'GET', '/api/admin/users?role=STAFF', adminToken);
    assert(staffListRes.status === 200, 'Retrieved users filtered by role=STAFF');
    assert(staffListRes.body.users.every(u => u.role === 'STAFF'), 'All returned users have STAFF role');

    // Status filter
    const activeStaffRes = await request(baseUrl, 'GET', '/api/admin/users?status=active&role=STAFF', adminToken);
    assert(activeStaffRes.status === 200, 'Retrieved users filtered by status=active');
    assert(activeStaffRes.body.users.every(u => u.isActive === true), 'All returned users are active');

    // Passwords not exposed
    assert(!staffListRes.body.users[0].password, 'Security check: Passwords excluded from user query');

    // Toggle citizen status
    const toggleRes = await request(baseUrl, 'PUT', `/api/admin/users/${citizen._id}/status`, adminToken);
    assert(toggleRes.status === 200, 'Toggled user status (active <-> suspended)');
    assert(toggleRes.body.isActive === false, 'User status successfully suspended');

    // Cannot suspend Admin
    const adminSuspendRes = await request(baseUrl, 'PUT', `/api/admin/users/${admin._id}/status`, adminToken);
    assert(adminSuspendRes.status === 403, 'Safeguard: Suspending admin account blocked with HTTP 403');

    // Restore citizen status
    await request(baseUrl, 'PUT', `/api/admin/users/${citizen._id}/status`, adminToken);

    // 7. Department Management & Safe Deletion
    console.log('\n[7/8] Testing Department Management & Referential Deletion Safeguards...');
    // Admin list all departments with staff and request counts
    const adminDeptsRes = await request(baseUrl, 'GET', '/api/departments/admin', adminToken);
    assert(adminDeptsRes.status === 200, 'GET /api/departments/admin returned all departments');
    assert(Array.isArray(adminDeptsRes.body.departments), 'Departments returned as array with metadata');
    const civicDept = adminDeptsRes.body.departments.find(d => d.code === 'P14-CIVIC');
    assert(civicDept && civicDept.staffCount >= 1, 'Department returns accurate staffCount');

    // Create new department
    const newDeptRes = await request(baseUrl, 'POST', '/api/departments', adminToken, {
      name: 'Phase 14 Waste Management',
      code: 'P14-WASTE',
      description: 'Solid waste and recycling collection'
    });
    assert(newDeptRes.status === 201 && newDeptRes.body.department, 'Created new department');
    const newDeptId = newDeptRes.body.department._id;

    // Update department
    const updateDeptRes = await request(baseUrl, 'PUT', `/api/departments/${newDeptId}`, adminToken, {
      name: 'Phase 14 Waste & Sanitization Management'
    });
    assert(updateDeptRes.status === 200, 'Updated department details');

    // Toggle department status
    const toggleDeptRes = await request(baseUrl, 'PUT', `/api/departments/${newDeptId}/status`, adminToken);
    assert(toggleDeptRes.status === 200 && toggleDeptRes.body.isActive === false, 'Deactivated department');

    // Safe deletion: Cannot delete dept with active requests
    const deleteBlocked = await request(baseUrl, 'DELETE', `/api/departments/${deptA._id}`, adminToken);
    assert(deleteBlocked.status === 400, 'Safeguard: Deletion of department with active requests prevented (400)');

    // Can delete unused department
    const deleteSuccess = await request(baseUrl, 'DELETE', `/api/departments/${newDeptId}`, adminToken);
    assert(deleteSuccess.status === 200, 'Successfully deleted unreferenced department');

    // 8. Activity Logs Retrieval
    console.log('\n[8/8] Verifying Activity Logs Endpoint...');
    const actLogsRes = await request(baseUrl, 'GET', '/api/admin/activity-logs', adminToken);
    assert(actLogsRes.status === 200, 'GET /api/admin/activity-logs succeeded');
    assert(actLogsRes.body.logs.length > 0, 'Activity logs list is populated with administrative events');
    assert(actLogsRes.body.logs[0].action, 'Log entries contain action descriptor');

    console.log('\n===============================================================');
    console.log(`📊 PHASE 14 TEST RESULTS: ${passedChecks} PASSED, ${failedChecks} FAILED`);
    console.log('===============================================================');

    if (failedChecks > 0) {
      console.error('❌ Some Phase 14 checks failed!');
      process.exit(1);
    } else {
      console.log('🎉 ALL PHASE 14 AUTOMATED CHECKS PASSED PERFECTLY!');
    }
  } catch (error) {
    console.error('Phase 14 test error:', error);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.disconnect();
    console.log('[Test Server] Cleaned up and disconnected.');
  }
}

runPhase14Tests();
