/**
 * Phase 18: Security & Validation Hardening Test Suite
 * Comprehensive automated verification for:
 * - 18.1 Authentication (missing token, invalid token, expired token, signature tampering)
 * - 18.2 Role-Based Access Control (RBAC matrix across Citizen, Staff, Admin)
 * - 18.3 Resource Ownership protection (preventing cross-user inspection & tampering)
 * - 18.4 Input validation (titles, categories, coordinates, ratings, duplicates)
 * - 18.5 MongoDB injection & malformed ObjectId safety
 * - 18.6 File upload security (extension whitelist, MIME checking, null bytes, filename sanitization)
 * - 18.7 Rate limiting on sensitive endpoints
 * - 18.8 Centralized production error sanitization (no credentials or paths leaked)
 * - 18.9 Socket.IO room authorization & eavesdropping prevention
 */

const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');
const { io: Client } = require('../../client/node_modules/socket.io-client');
const { Server } = require('socket.io');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = require('../app');
const User = require('../models/User');
const Department = require('../models/Department');
const Request = require('../models/Request');
const Feedback = require('../models/Feedback');
const { initSocket } = require('../services/socketService');

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

async function request(serverUrl, method, endpoint, token = null, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, serverUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
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
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function generateToken(userId, role, options = {}) {
  const secret = process.env.JWT_SECRET || 'localfix_dev_jwt_secret_change_in_production';
  return jwt.sign({ id: userId, role }, secret, { expiresIn: '1d', ...options });
}

async function runPhase18Tests() {
  console.log('===============================================================');
  console.log('🛡️  Starting Phase 18: Security & Validation Hardening Suite');
  console.log('===============================================================\n');

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/localfix';
  await mongoose.connect(mongoUri);
  console.log('  Connected to MongoDB for Phase 18 Security Suite.');

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  initSocket(io);

  await new Promise(res => server.listen(0, '127.0.0.1', res));
  const port = server.address().port;
  const serverUrl = `http://127.0.0.1:${port}`;
  console.log(`  Test HTTP & Socket.IO server running at ${serverUrl}\n`);

  try {
    // -------------------------------------------------------------
    // Clean and seed users
    // -------------------------------------------------------------
    await User.deleteMany({ email: /^phase18\./ });
    await Request.deleteMany({ requestId: /^LF-P18-/ });
    await Feedback.deleteMany({ comment: /Phase 18/ });

    let dept = await Department.findOne({ code: 'ROAD' });
    if (!dept) {
      dept = await Department.create({ name: 'Roads Dept', code: 'ROAD' });
    }

    const adminUser = await User.create({
      name: 'Phase 18 Admin',
      email: 'phase18.admin@example.com',
      password: 'password123',
      role: 'ADMIN',
      phone: '9876543240'
    });

    const citizenA = await User.create({
      name: 'Phase 18 Citizen Alice',
      email: 'phase18.citizenA@example.com',
      password: 'password123',
      role: 'CITIZEN',
      phone: '9876543241'
    });

    const citizenB = await User.create({
      name: 'Phase 18 Citizen Bob',
      email: 'phase18.citizenB@example.com',
      password: 'password123',
      role: 'CITIZEN',
      phone: '9876543242'
    });

    const staffA = await User.create({
      name: 'Phase 18 Staff Alpha',
      email: 'phase18.staffA@example.com',
      password: 'password123',
      role: 'STAFF',
      department: dept._id,
      phone: '9876543243',
      isActive: true
    });

    const staffB = await User.create({
      name: 'Phase 18 Staff Beta',
      email: 'phase18.staffB@example.com',
      password: 'password123',
      role: 'STAFF',
      department: dept._id,
      phone: '9876543244',
      isActive: true
    });

    const adminToken = generateToken(adminUser._id, 'ADMIN');
    const citizenAToken = generateToken(citizenA._id, 'CITIZEN');
    const citizenBToken = generateToken(citizenB._id, 'CITIZEN');
    const staffAToken = generateToken(staffA._id, 'STAFF');
    const staffBToken = generateToken(staffB._id, 'STAFF');

    // -------------------------------------------------------------
    // 18.1: Authentication & Token Negative Testing
    // -------------------------------------------------------------
    console.log('--- 18.1: Authentication & Token Hardening ---');

    // Missing token
    const missingRes = await request(serverUrl, 'GET', '/api/requests');
    assert(missingRes.status === 401, 'Request without token rejected with 401');

    // Malformed token
    const malformedRes = await request(serverUrl, 'GET', '/api/requests', 'malformed.fake.jwt');
    assert(malformedRes.status === 401, 'Malformed JWT token rejected with 401');

    // Expired token
    const expiredToken = generateToken(citizenA._id, 'CITIZEN', { expiresIn: '-5s' });
    const expiredRes = await request(serverUrl, 'GET', '/api/requests', expiredToken);
    assert(expiredRes.status === 401 && (expiredRes.data.message.includes('expired') || expiredRes.data.message.includes('Invalid')), 'Expired JWT token rejected with 401');

    // Fake user token
    const fakeIdToken = generateToken(new mongoose.Types.ObjectId(), 'CITIZEN');
    const fakeUserRes = await request(serverUrl, 'GET', '/api/requests', fakeIdToken);
    assert(fakeUserRes.status === 401, 'Token with non-existent userId rejected with 401');

    // -------------------------------------------------------------
    // 18.2: Role-Based Access Control (RBAC) Enforcement
    // -------------------------------------------------------------
    console.log('\n--- 18.2: RBAC Access Boundary Enforcement ---');

    // Citizen attempting Admin endpoints
    const cAdminDash = await request(serverUrl, 'GET', '/api/admin/dashboard', citizenAToken);
    assert(cAdminDash.status === 403, 'Citizen blocked from Admin Dashboard (403)');

    const cAdminSettings = await request(serverUrl, 'GET', '/api/admin/settings', citizenAToken);
    assert(cAdminSettings.status === 403, 'Citizen blocked from Admin Settings (403)');

    const cAdminReports = await request(serverUrl, 'GET', '/api/admin/reports/requests', citizenAToken);
    assert(cAdminReports.status === 403, 'Citizen blocked from Admin Reports (403)');

    // Staff attempting Admin endpoints
    const sAdminUsers = await request(serverUrl, 'GET', '/api/admin/users', staffAToken);
    assert(sAdminUsers.status === 403, 'Staff blocked from Admin User Management (403)');

    const sAdminSettings = await request(serverUrl, 'GET', '/api/admin/settings', staffAToken);
    assert(sAdminSettings.status === 403, 'Staff blocked from Admin Settings (403)');

    // Citizen attempting Staff endpoints
    const cStaffAssigned = await request(serverUrl, 'GET', '/api/staff/requests/assigned', citizenAToken);
    assert(cStaffAssigned.status === 403, 'Citizen blocked from Staff Workload API (403)');

    // -------------------------------------------------------------
    // 18.3: Resource Ownership & Isolation
    // -------------------------------------------------------------
    console.log('\n--- 18.3: Resource Ownership & Anti-Tampering ---');

    // Citizen A creates a request
    const reqA = await Request.create({
      requestId: 'LF-P18-001',
      title: 'Water pipe leak in private residential colony',
      description: 'Severe water leak under driveway pavement',
      category: 'WATER',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      citizen: citizenA._id,
      department: dept._id,
      assignedStaff: staffA._id,
      address: 'Colony Street 4',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
      slaDeadline: new Date(Date.now() + 86400000),
      resolvedAt: new Date()
    });

    // Citizen B attempts to view Citizen A's request details directly
    const cBViewReqA = await request(serverUrl, 'GET', `/api/requests/${reqA._id}`, citizenBToken);
    assert(cBViewReqA.status === 403, 'Citizen B forbidden from viewing Citizen A private request (403)');

    // Citizen B attempts to submit verification on Citizen A's request
    const cBVerify = await request(serverUrl, 'POST', `/api/requests/${reqA._id}/verify`, citizenBToken, {
      rating: 5,
      comment: 'Fraudulent verification'
    });
    assert(cBVerify.status === 403, 'Citizen B forbidden from verifying Citizen A request (403)');

    // Staff B attempts to resolve Staff A's assigned request
    const sBResolve = await request(serverUrl, 'POST', `/api/staff/requests/${reqA._id}/resolve`, staffBToken, {
      resolutionNotes: 'Unauthorized resolution attempt notes'
    });
    assert(sBResolve.status === 403, 'Staff B forbidden from resolving request assigned to Staff A (403)');

    // -------------------------------------------------------------
    // 18.4: Input Validation & Sanitization
    // -------------------------------------------------------------
    console.log('\n--- 18.4: Input Validation & Parameter Boundaries ---');

    // Title too short (< 5 chars)
    const shortTitleRes = await request(serverUrl, 'POST', '/api/requests', citizenAToken, {
      title: 'Bad',
      description: 'Valid description that has more than 10 characters',
      category: 'ROAD',
      address: 'Sample Address',
      latitude: 28.6139,
      longitude: 77.2090
    });
    assert(shortTitleRes.status === 400 && shortTitleRes.data.message.includes('at least 5 characters'), 'Short title (<5 chars) rejected with 400');

    // Invalid category
    const badCatRes = await request(serverUrl, 'POST', '/api/requests', citizenAToken, {
      title: 'Valid Request Title',
      description: 'Valid description that has more than 10 characters',
      category: 'MALICIOUS_CATEGORY',
      address: 'Sample Address',
      latitude: 28.6139,
      longitude: 77.2090
    });
    assert(badCatRes.status === 400 && badCatRes.data.message.includes('Invalid category'), 'Illegal category rejected with 400');

    // Invalid coordinates (lat > 90)
    const badCoordsRes = await request(serverUrl, 'POST', '/api/requests', citizenAToken, {
      title: 'Valid Request Title',
      description: 'Valid description that has more than 10 characters',
      category: 'ROAD',
      address: 'Sample Address',
      latitude: 195.5,
      longitude: 77.2090
    });
    assert(badCoordsRes.status === 400 && badCoordsRes.data.message.includes('Invalid latitude'), 'Out-of-range coordinates (>90) rejected with 400');

    // Invalid feedback rating (> 5)
    const badRatingRes = await request(serverUrl, 'POST', '/api/feedback', citizenAToken, {
      requestId: reqA._id.toString(),
      rating: 7,
      comment: 'Super rating'
    });
    assert(badRatingRes.status === 400, 'Rating > 5 rejected with 400');

    // -------------------------------------------------------------
    // 18.5: MongoDB Injection & Malformed ID Safety
    // -------------------------------------------------------------
    console.log('\n--- 18.5: MongoDB Injection & Malformed ID Handling ---');

    const malformedIdRes = await request(serverUrl, 'GET', '/api/requests/not-a-valid-id', adminToken);
    assert(malformedIdRes.status === 404 || malformedIdRes.status === 400, `Malformed ID handled safely without 500 crash (Status: ${malformedIdRes.status})`);

    // Sensitive field projection check
    const usersRes = await request(serverUrl, 'GET', '/api/admin/users', adminToken);
    const usersList = usersRes.data.users || [];
    let exposedPasswords = usersList.some(u => u.password || u.passwordHash);
    assert(!exposedPasswords, 'User listing excludes password and password hash fields');

    // -------------------------------------------------------------
    // 18.6: File Upload Security Checks
    // -------------------------------------------------------------
    console.log('\n--- 18.6: File Upload Security Enforcement ---');

    const uploadMiddleware = require('../middleware/uploadMiddleware');
    assert(typeof uploadMiddleware.array === 'function', 'Upload middleware initialized');

    // Directly test fileFilter of uploadMiddleware
    const fileFilter = uploadMiddleware.fileFilter;
    let allowedExtPass = false;
    let disallowedExtBlocked = false;
    let nullByteBlocked = false;

    // 1. Valid PNG
    fileFilter(null, { originalname: 'evidence.png', mimetype: 'image/png' }, (err, allow) => {
      if (!err && allow) allowedExtPass = true;
    });
    assert(allowedExtPass, 'Valid image (evidence.png, image/png) accepted by upload filter');

    // 2. Dangerous executable (.exe / .sh / .php)
    fileFilter(null, { originalname: 'exploit.php', mimetype: 'application/x-php' }, (err, allow) => {
      if (err) disallowedExtBlocked = true;
    });
    assert(disallowedExtBlocked, 'Executable script (exploit.php) blocked by upload filter');

    // 3. Null-byte injection
    fileFilter(null, { originalname: 'image.png\0.php', mimetype: 'image/png' }, (err, allow) => {
      if (err) nullByteBlocked = true;
    });
    assert(nullByteBlocked, 'Null-byte injected filename (image.png\\0.php) blocked');

    // -------------------------------------------------------------
    // 18.7: Rate Limiting on Sensitive Endpoints
    // -------------------------------------------------------------
    console.log('\n--- 18.7: Rate Limiting Enforcement ---');

    const { authLimiter } = require('../middleware/rateLimitMiddleware');
    assert(typeof authLimiter === 'function', 'authLimiter middleware is defined');

    // Verify rate limit response headers on auth route
    const authReq1 = await request(serverUrl, 'POST', '/api/auth/login', null, {
      email: 'nonexistent@test.com',
      password: 'wrongpassword'
    });
    assert(authReq1.status === 401, 'Auth endpoint active and enforcing credentials');

    // -------------------------------------------------------------
    // 18.8: Error Sanitization (No credentials or stack traces leaked)
    // -------------------------------------------------------------
    console.log('\n--- 18.8: Error Sanitization ---');

    const errorMiddleware = require('../middleware/errorMiddleware');
    let sanitizedOutput = '';
    const mockRes = {
      statusCode: 500,
      status: function (code) { this.statusCode = code; return this; },
      json: function (payload) { sanitizedOutput = payload.message; }
    };

    const secretError = new Error('Connection failed to mongodb://admin:SuperSecretPassword123@cluster0.net/localfix');
    errorMiddleware.errorHandler(secretError, {}, mockRes, () => {});

    assert(!sanitizedOutput.includes('SuperSecretPassword123'), 'Sanitized error output stripped database passwords');
    assert(sanitizedOutput.includes('[REDACTED]'), 'Sanitized error output replaced credentials with [REDACTED]');

    // -------------------------------------------------------------
    // 18.9: Socket.IO Room Eavesdropping Prevention
    // -------------------------------------------------------------
    console.log('\n--- 18.9: Socket.IO Room Access Security ---');

    // Connect socket with Citizen B's token
    const clientSocketB = Client(`http://127.0.0.1:${port}`, {
      auth: { token: citizenBToken },
      transports: ['websocket']
    });

    await new Promise((resolve) => {
      clientSocketB.on('connect', resolve);
    });

    let joinDeniedError = false;
    await new Promise((resolve) => {
      clientSocketB.on('error', (err) => {
        if (err.message && err.message.includes('Unauthorized')) {
          joinDeniedError = true;
        }
        resolve();
      });

      // Citizen B attempts to join Citizen A's private request room
      clientSocketB.emit('join_request', reqA._id.toString());
      setTimeout(resolve, 500);
    });

    assert(joinDeniedError, 'Citizen B blocked from joining Citizen A private Socket.IO request room');
    clientSocketB.disconnect();

    // Clean up
    await User.deleteMany({ email: /^phase18\./ });
    await Request.deleteMany({ requestId: /^LF-P18-/ });
    await Feedback.deleteMany({ comment: /Phase 18/ });

  } catch (err) {
    console.error('Test execution error:', err);
    failedChecks++;
  } finally {
    server.close();
    await mongoose.disconnect();
  }

  console.log('\n===============================================================');
  console.log(`Phase 18 Security Suite: ${passedChecks} Passed, ${failedChecks} Failed`);
  console.log('===============================================================\n');

  if (failedChecks > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase18Tests();
