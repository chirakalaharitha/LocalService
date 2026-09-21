/**
 * Phase 12: Final Quality & Security Audit Test Suite
 * Comprehensive automated verification for authentication, RBAC, input validation,
 * negative boundaries, and error handling.
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
const Comment = require('../models/Comment');
const { getSlaStatus, calculateSlaDeadline } = require('../services/slaService');

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

async function runAudit() {
  console.log('===============================================================');
  console.log('🔍 LOCALFIX PHASE 12: FINAL QUALITY & SECURITY AUDIT');
  console.log('===============================================================');

  const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/localfix';
  await mongoose.connect(connStr);
  console.log('[MongoDB] Connected successfully');

  const server = http.createServer(app);
  await new Promise(res => server.listen(0, '127.0.0.1', res));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`🚀 Audit test server running at ${baseUrl}`);

  try {
    // 1. Health Check
    console.log('\n[1/7] Testing Production Health Endpoint...');
    const healthRes = await request(baseUrl, 'GET', '/api/health');
    assert(healthRes.status === 200, 'Health endpoint responds with 200 OK');
    assert(healthRes.body.success === true, 'Health check response format is valid JSON with success: true');
    assert(!healthRes.body.MONGODB_URI && !healthRes.body.JWT_SECRET, 'Health check does NOT leak secrets');

    // 2. Authentication & Role Elevation Prevention
    console.log('\n[2/7] Auditing Public Registration Security & Role Elevation...');
    const spoofEmail = `hacker_${Date.now()}@spoof.org`;
    const regRes = await request(baseUrl, 'POST', '/api/auth/register', null, {
      fullName: 'Attacker Bob',
      email: spoofEmail,
      phone: '9998887777',
      password: 'Password@123',
      role: 'ADMIN' // Trying to elevate to ADMIN
    });

    assert(regRes.status === 201, 'Registration succeeded with HTTP 201');
    assert(regRes.body.user.role === 'CITIZEN', 'Role Elevation Blocked: Registered user role forced to CITIZEN, not ADMIN');
    const citizenToken = regRes.body.token;
    const citizenId = regRes.body.user.id || regRes.body.user._id;

    // Duplicate email registration rejected
    const dupRes = await request(baseUrl, 'POST', '/api/auth/register', null, {
      fullName: 'Duplicate Bob',
      email: spoofEmail,
      phone: '9998887777',
      password: 'Password@123'
    });
    assert(dupRes.status === 400, 'Duplicate email registration rejected with HTTP 400');

    // Invalid Login
    const badLoginRes = await request(baseUrl, 'POST', '/api/auth/login', null, {
      email: spoofEmail,
      password: 'WrongPassword'
    });
    assert(badLoginRes.status === 401, 'Invalid password rejected with HTTP 401');

    // Valid Citizen Login
    const goodLoginRes = await request(baseUrl, 'POST', '/api/auth/login', null, {
      email: spoofEmail,
      password: 'Password@123'
    });
    assert(goodLoginRes.status === 200, 'Valid login returns HTTP 200 with JWT');

    // Prepare Admin and Staff accounts
    let adminUser = await User.findOne({ role: 'ADMIN' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Audit Admin',
        email: 'audit_admin@localfix.gov.in',
        phone: '9876543210',
        password: 'Admin@123456',
        role: 'ADMIN'
      });
    }
    const adminLoginRes = await request(baseUrl, 'POST', '/api/auth/login', null, {
      email: adminUser.email,
      password: 'Admin@123456'
    });
    const adminToken = adminLoginRes.body.token;

    let dept = await Department.findOne({ code: 'WATER' });
    if (!dept) {
      dept = await Department.create({ name: 'Water Works', code: 'WATER', description: 'Water supply' });
    }

    let staffA = await User.findOne({ email: 'audit_staff_a@localfix.gov.in' });
    if (!staffA) {
      staffA = await User.create({
        name: 'Staff Alpha',
        email: 'audit_staff_a@localfix.gov.in',
        phone: '9876543211',
        password: 'Staff@123456',
        role: 'STAFF',
        department: dept._id
      });
    }

    let staffB = await User.findOne({ email: 'audit_staff_b@localfix.gov.in' });
    if (!staffB) {
      staffB = await User.create({
        name: 'Staff Beta',
        email: 'audit_staff_b@localfix.gov.in',
        phone: '9876543212',
        password: 'Staff@123456',
        role: 'STAFF',
        department: dept._id
      });
    }

    const staffALoginRes = await request(baseUrl, 'POST', '/api/auth/login', null, {
      email: staffA.email,
      password: 'Staff@123456'
    });
    const staffAToken = staffALoginRes.body.token;

    const staffBLoginRes = await request(baseUrl, 'POST', '/api/auth/login', null, {
      email: staffB.email,
      password: 'Staff@123456'
    });
    const staffBToken = staffBLoginRes.body.token;

    // 3. RBAC Negative Tests
    console.log('\n[3/7] Auditing RBAC Authorization & Negative Cases...');
    const citizenToAdmin = await request(baseUrl, 'GET', '/api/admin/dashboard', citizenToken);
    assert(citizenToAdmin.status === 403, 'RBAC: Citizen accessing /api/admin/dashboard blocked with HTTP 403');

    const citizenToStaff = await request(baseUrl, 'GET', '/api/staff/requests', citizenToken);
    assert(citizenToStaff.status === 403, 'RBAC: Citizen accessing /api/staff/requests blocked with HTTP 403');

    const staffToAdmin = await request(baseUrl, 'GET', '/api/admin/dashboard', staffAToken);
    assert(staffToAdmin.status === 403, 'RBAC: Staff accessing /api/admin/dashboard blocked with HTTP 403');

    const noAuthRes = await request(baseUrl, 'GET', '/api/auth/me');
    assert(noAuthRes.status === 401, 'RBAC: Unauthenticated access blocked with HTTP 401');

    const badJwtRes = await request(baseUrl, 'GET', '/api/auth/me', 'invalid.jwt.token');
    assert(badJwtRes.status === 401, 'RBAC: Malformed JWT token rejected with HTTP 401');

    // 4. Create Service Request & Ownership Check
    console.log('\n[4/7] Auditing Request Lifecycle, Privacy & Cross-User Security...');
    const reqCreateRes = await request(baseUrl, 'POST', '/api/requests', citizenToken, {
      title: 'Water Pipe Burst at Sector 4',
      description: 'Major water pipeline has ruptured near community hall leaking gallons of water.',
      category: 'WATER',
      priority: 'HIGH',
      address: 'Sector 4 Market Area, Pune',
      latitude: 18.5204,
      longitude: 73.8567
    });
    assert(reqCreateRes.status === 201, 'Citizen created service request successfully');
    const createdReq = reqCreateRes.body.request;
    const reqMongoId = createdReq._id;

    // Second citizen tries to view first citizen's request
    const secondCitizenRes = await request(baseUrl, 'POST', '/api/auth/register', null, {
      fullName: 'Citizen Charlie',
      email: `charlie_${Date.now()}@localfix.org`,
      phone: '9991112222',
      password: 'Password@123'
    });
    const secondCitizenToken = secondCitizenRes.body.token;

    const crossViewRes = await request(baseUrl, 'GET', `/api/requests/${reqMongoId}`, secondCitizenToken);
    assert(crossViewRes.status === 403, 'Privacy Check: Another citizen cannot view private request details (HTTP 403)');

    // Assign to Staff A by Admin
    const assignRes = await request(baseUrl, 'POST', `/api/admin/requests/${reqMongoId}/assign`, adminToken, {
      staffId: staffA._id.toString()
    });
    assert(assignRes.status === 200, 'Admin assigned request to Staff A');

    // Staff B tries to view Staff A's request
    const staffBCrossView = await request(baseUrl, 'GET', `/api/staff/requests/${reqMongoId}`, staffBToken);
    assert(staffBCrossView.status === 403, 'Staff Isolation: Staff B cannot access request assigned to Staff A (HTTP 403)');

    // 5. Comments Authorization & Input Validation
    console.log('\n[5/7] Auditing Comments Security & Validation...');
    // Empty comment rejected
    const emptyCommentRes = await request(baseUrl, 'POST', `/api/requests/${reqMongoId}/comments`, citizenToken, {
      message: '   '
    });
    assert(emptyCommentRes.status === 400, 'Empty comment message rejected with HTTP 400');

    // Unauthorized citizen comment
    const crossCommentRes = await request(baseUrl, 'POST', `/api/requests/${reqMongoId}/comments`, secondCitizenToken, {
      message: 'Trying to comment on another citizen ticket'
    });
    assert(crossCommentRes.status === 403, 'Unauthorized citizen cannot comment on another citizen ticket (HTTP 403)');

    // Unauthorized staff comment
    const crossStaffCommentRes = await request(baseUrl, 'POST', `/api/requests/${reqMongoId}/comments`, staffBToken, {
      message: 'Staff B trying to comment on Staff A ticket'
    });
    assert(crossStaffCommentRes.status === 403, 'Unauthorized staff member cannot comment on unassigned ticket (HTTP 403)');

    // Valid citizen comment
    const validCommentRes = await request(baseUrl, 'POST', `/api/requests/${reqMongoId}/comments`, citizenToken, {
      message: 'Please repair this urgently before evening.'
    });
    assert(validCommentRes.status === 201, 'Original citizen can comment on their own ticket (HTTP 201)');

    // 6. Verification & Feedback Bounds
    console.log('\n[6/7] Auditing Citizen Verification, Rejection & Feedback Validation...');
    // Staff A accepts and resolves
    await request(baseUrl, 'POST', `/api/staff/requests/${reqMongoId}/accept`, staffAToken);
    await request(baseUrl, 'POST', `/api/staff/requests/${reqMongoId}/start`, staffAToken);
    await request(baseUrl, 'POST', `/api/staff/requests/${reqMongoId}/resolve`, staffAToken, {
      resolutionNotes: 'Main line valve replaced and tested under pressure.'
    });

    // Another citizen attempts verification
    const crossVerifyRes = await request(baseUrl, 'POST', `/api/requests/${reqMongoId}/verify`, secondCitizenToken, {
      rating: 5
    });
    assert(crossVerifyRes.status === 403, 'Only original reporting citizen can verify resolution (HTTP 403)');

    // Original citizen verifies
    const validVerifyRes = await request(baseUrl, 'POST', `/api/requests/${reqMongoId}/verify`, citizenToken, {
      rating: 5,
      comment: 'Excellent service'
    });
    assert(validVerifyRes.status === 200, 'Original citizen verified resolution (HTTP 200)');

    // Another citizen attempts feedback submission
    const crossFeedbackRes = await request(baseUrl, 'POST', '/api/feedback', secondCitizenToken, {
      requestId: reqMongoId,
      rating: 5,
      comment: 'Fraudulent feedback attempt'
    });
    assert(crossFeedbackRes.status === 403, 'Unauthorized citizen feedback blocked with HTTP 403');

    // Invalid rating (> 5) rejected
    const badRatingRes = await request(baseUrl, 'POST', '/api/feedback', citizenToken, {
      requestId: reqMongoId,
      rating: 10,
      comment: 'Out of bounds'
    });
    assert(badRatingRes.status === 400, 'Out-of-bounds rating (>5) rejected with HTTP 400');

    // Valid feedback
    const validFeedbackRes = await request(baseUrl, 'POST', '/api/feedback', citizenToken, {
      requestId: reqMongoId,
      rating: 5,
      comment: 'Prompt resolution, very satisfied!'
    });
    assert(validFeedbackRes.status === 201, 'Valid citizen feedback submitted successfully (HTTP 201)');

    // Duplicate feedback rejected
    const dupFeedbackRes = await request(baseUrl, 'POST', '/api/feedback', citizenToken, {
      requestId: reqMongoId,
      rating: 5,
      comment: 'Duplicate'
    });
    assert(dupFeedbackRes.status === 400, 'Duplicate feedback submission rejected with HTTP 400');

    // 7. Error Handling & Mongoose CastError / 404
    console.log('\n[7/7] Auditing API Error Handling & CastError Protection...');
    const invalidIdRes = await request(baseUrl, 'GET', '/api/requests/not-a-valid-objectid', citizenToken);
    assert(invalidIdRes.status === 404 || invalidIdRes.status === 400, 'Invalid request ID handled safely without 500 error');
    assert(invalidIdRes.body.success === false, 'Error response conforms to standard { success: false } format');

    const notFoundRes = await request(baseUrl, 'GET', '/api/non-existent-endpoint');
    assert(notFoundRes.status === 404, 'Non-existent endpoint returns HTTP 404');

    // SLA Calculation verification
    const slaOverdue = getSlaStatus(new Date(Date.now() - 1000), 'IN_PROGRESS', 'HIGH');
    assert(slaOverdue === 'OVERDUE', 'SLA correctly detects OVERDUE state when deadline is past');

    const slaOnTime = getSlaStatus(new Date(Date.now() + 24 * 3600 * 1000), 'IN_PROGRESS', 'HIGH');
    assert(slaOnTime === 'ON_TIME', 'SLA correctly detects ON_TIME state for future deadline');

    console.log('\n===============================================================');
    console.log('📊 LOCALFIX PHASE 12 QUALITY AUDIT SUMMARY REPORT');
    console.log('===============================================================');
    console.log(`Total Checks Run: ${passedChecks + failedChecks}`);
    console.log(`Passed: ${passedChecks}`);
    console.log(`Failed: ${failedChecks}`);

    if (failedChecks === 0) {
      console.log('\n🎉 ===============================================================');
      console.log('✅ PHASE 12 QUALITY AUDIT: ALL CHECKS PASSED');
      console.log('===============================================================');
    } else {
      console.error('\n❌ PHASE 12 QUALITY AUDIT: FAILURES OCCURRED');
      process.exit(1);
    }
  } finally {
    server.close();
    await mongoose.connection.close();
  }
}

runAudit().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
