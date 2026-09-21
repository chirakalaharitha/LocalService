const http = require('http');
const dotenv = require('dotenv');
const path = require('path');
const { Server } = require('socket.io');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/db');
const app = require('../app');
const User = require('../models/User');
const Department = require('../models/Department');
const Request = require('../models/Request');
const { initSocket } = require('../services/socketService');

let testServer;
let serverUrl;
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failCount++;
    throw new Error(`Assertion failed: ${message}`);
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

async function runRealAuthSuite() {
  console.log('\n===============================================================');
  console.log('🔐 Starting Real Production Authentication & RBAC Test Suite');
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

    // Ensure departments exist
    let dept = await Department.findOne({ code: 'WATER' });
    if (!dept) {
      dept = await Department.create({
        name: 'Water Supply & Quality',
        code: 'WATER',
        description: 'Municipal water supply and pipeline repair',
        isActive: true
      });
    }

    // -------------------------------------------------------------
    // TEST 1 – REAL CITIZEN REGISTRATION & LOGIN
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Real Citizen Registration & Login ---');
    const citizenEmail = `citizen_real_${timestamp}@localfix.org`;
    const citizenPass = 'Citizen@Secure123';

    // 1.1 Register new citizen
    const regRes = await request('POST', '/api/auth/register', null, {
      fullName: 'Aarav Real Citizen',
      email: citizenEmail,
      phone: '9876543210',
      password: citizenPass,
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      pincode: '400705',
      role: 'ADMIN' // Trying to tamper role -> must be forced to CITIZEN
    });

    assert(regRes.status === 201 && regRes.data.success, '1.1 Citizen registration returns HTTP 201');
    assert(regRes.data.user.role === 'CITIZEN', '1.2 Role forced to CITIZEN despite admin spoof attempt');
    assert(!regRes.data.user.password, '1.3 Password not returned in registration response');

    // Verify MongoDB document
    const citizenDoc = await User.findOne({ email: citizenEmail }).select('+password');
    assert(citizenDoc != null, '1.4 Citizen user persisted in MongoDB');
    assert(citizenDoc.password !== citizenPass, '1.5 Password hashed with bcrypt in MongoDB');

    // 1.2 Duplicate email rejection
    const dupRes = await request('POST', '/api/auth/register', null, {
      fullName: 'Duplicate Citizen',
      email: citizenEmail,
      phone: '9876543211',
      password: 'AnotherPassword@123'
    });
    assert(dupRes.status === 400, '1.6 Duplicate email registration rejected with HTTP 400');

    // 1.3 Invalid password login attempt
    const badLoginRes = await request('POST', '/api/auth/login', null, {
      email: citizenEmail,
      password: 'WrongPassword@123'
    });
    assert(badLoginRes.status === 401, '1.7 Invalid password login rejected with HTTP 401');

    // 1.4 Valid citizen login
    const loginRes = await request('POST', '/api/auth/login', null, {
      email: citizenEmail,
      password: citizenPass
    });
    assert(loginRes.status === 200 && loginRes.data.token, '1.8 Citizen login succeeds with HTTP 200 + JWT');
    assert(loginRes.data.user.role === 'CITIZEN', '1.9 Logged in user role is CITIZEN');
    const citizenToken = loginRes.data.token;

    // 1.5 Authenticated profile fetch
    const meRes = await request('GET', '/api/auth/me', citizenToken);
    assert(meRes.status === 200 && meRes.data.user.email === citizenEmail, '1.10 /api/auth/me returns citizen profile');

    // -------------------------------------------------------------
    // TEST 2 – REAL ADMIN LOGIN
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Real Admin Account Login ---');
    const adminEmail = 'admin@localfix.gov.in';
    const adminPass = 'Admin@123456';

    const adminLoginRes = await request('POST', '/api/auth/login', null, {
      email: adminEmail,
      password: adminPass
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.data.token, '2.1 Real Admin login succeeds with HTTP 200 + JWT');
    assert(adminLoginRes.data.user.role === 'ADMIN', '2.2 Logged in user role is ADMIN');
    const adminToken = adminLoginRes.data.token;

    // Admin dashboard access
    const adminDashRes = await request('GET', '/api/admin/dashboard', adminToken);
    assert(adminDashRes.status === 200 && adminDashRes.data.success, '2.3 Admin access to /api/admin/dashboard granted');

    // -------------------------------------------------------------
    // TEST 3 – REAL STAFF CREATION BY ADMIN
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Real Staff Creation by Admin ---');
    const staffEmail = `staff_real_${timestamp}@localfix.gov.in`;
    let staffPass = 'Staff@Secure123';

    // 3.1 Validation: password mismatch
    const mismatchRes = await request('POST', '/api/admin/users/staff', adminToken, {
      fullName: 'Field Officer Ramesh',
      email: staffEmail,
      phone: '9876543299',
      department: dept._id.toString(),
      password: staffPass,
      confirmPassword: 'DifferentPassword@123'
    });
    assert(mismatchRes.status === 400, '3.1 Password mismatch rejected with HTTP 400');

    // 3.2 Validation: password too short (<6)
    const shortPassRes = await request('POST', '/api/admin/users/staff', adminToken, {
      fullName: 'Field Officer Ramesh',
      email: staffEmail,
      phone: '9876543299',
      department: dept._id.toString(),
      password: '123',
      confirmPassword: '123'
    });
    assert(shortPassRes.status === 400, '3.2 Short password (<6 chars) rejected with HTTP 400');

    // 3.3 Create staff successfully
    const createStaffRes = await request('POST', '/api/admin/users/staff', adminToken, {
      fullName: 'Field Officer Ramesh',
      email: staffEmail,
      phone: '9876543299',
      department: dept._id.toString(),
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      pincode: '400705',
      password: staffPass,
      confirmPassword: staffPass,
      role: 'ADMIN' // Spoof attempt -> forced to STAFF
    });

    assert(createStaffRes.status === 201 && createStaffRes.data.success, '3.3 Staff created successfully (201)');
    assert(createStaffRes.data.user.role === 'STAFF', '3.4 Backend forced role to STAFF');
    assert(!createStaffRes.data.user.password, '3.5 Password excluded from safe user response');

    const staffDoc = await User.findOne({ email: staffEmail }).select('+password');
    assert(staffDoc != null && staffDoc.role === 'STAFF', '3.6 Staff persisted in MongoDB with role STAFF');
    assert(staffDoc.password !== staffPass, '3.7 Staff password stored as bcrypt hash');
    const staffId = staffDoc._id.toString();

    // -------------------------------------------------------------
    // TEST 4 – REAL STAFF LOGIN
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Real Staff Login ---');
    const staffLoginRes = await request('POST', '/api/auth/login', null, {
      email: staffEmail,
      password: staffPass
    });

    assert(staffLoginRes.status === 200 && staffLoginRes.data.token, '4.1 Staff logs in via unified /login with HTTP 200');
    assert(staffLoginRes.data.user.role === 'STAFF', '4.2 JWT contains role STAFF');
    const staffToken = staffLoginRes.data.token;

    const staffAssignedRes = await request('GET', '/api/staff/requests', staffToken);
    assert(staffAssignedRes.status === 200, '4.3 Staff access to /api/staff/requests granted');

    // -------------------------------------------------------------
    // TEST 5 – REAL STAFF ASSIGNMENT & WORKLOAD
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Real Staff Request Assignment ---');

    // Citizen creates request
    const newReq = await Request.create({
      requestId: `LF-${timestamp}`,
      title: 'Water Pipe Rupture Main Junction',
      description: 'Severe high pressure pipe leak near junction',
      category: 'WATER',
      priority: 'HIGH',
      citizen: citizenDoc._id,
      department: dept._id,
      address: 'Junction 42, Sector 15',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
      slaDeadline: new Date(Date.now() + 48 * 3600 * 1000),
      status: 'PENDING'
    });

    // Admin assigns request to the newly created staff
    const assignRes = await request('POST', `/api/admin/requests/${newReq._id}/assign`, adminToken, {
      staffId: staffId,
      departmentId: dept._id.toString(),
      priority: 'HIGH'
    });

    assert(assignRes.status === 200, '5.1 Admin assigned request to real staff member');

    // Staff sees assigned request
    const staffTasks = await request('GET', '/api/staff/requests', staffToken);
    const hasAssigned = staffTasks.data.requests?.some(r => r._id.toString() === newReq._id.toString());
    assert(hasAssigned, '5.2 Request appears in newly created staff workload');

    // -------------------------------------------------------------
    // TEST 6 – REAL PASSWORD RESET FLOW
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Real Password Reset via 6-Digit OTP ---');

    // 6.1 Request reset OTP
    const forgotRes = await request('POST', '/api/auth/forgot-password', null, {
      email: staffEmail
    });
    assert(forgotRes.status === 200, '6.1 Forgot password returns HTTP 200');

    // Fetch OTP hash from DB
    const staffWithOtp = await User.findOne({ email: staffEmail }).select('+resetPasswordOtp +resetPasswordOtpExpires');
    assert(staffWithOtp.resetPasswordOtp != null, '6.2 OTP hash stored securely in MongoDB');
    assert(staffWithOtp.resetPasswordOtpExpires > new Date(), '6.3 OTP expiry is in the future');

    // 6.2 Wrong OTP rejection
    const wrongOtpRes = await request('POST', '/api/auth/verify-reset-otp', null, {
      email: staffEmail,
      otp: '000000'
    });
    assert(wrongOtpRes.status === 400, '6.4 Incorrect OTP rejected with HTTP 400');

    // 6.3 Test with valid known OTP
    const bcrypt = require('bcryptjs');
    const knownOtp = '654321';
    staffWithOtp.resetPasswordOtp = await bcrypt.hash(knownOtp, 10);
    staffWithOtp.resetPasswordOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await staffWithOtp.save({ validateBeforeSave: false });

    const validOtpRes = await request('POST', '/api/auth/verify-reset-otp', null, {
      email: staffEmail,
      otp: knownOtp
    });
    assert(validOtpRes.status === 200 && validOtpRes.data.resetToken, '6.5 Valid OTP accepted and returned resetToken');
    const resetToken = validOtpRes.data.resetToken;

    // 6.4 Single-use OTP: Cannot reuse same OTP
    const reusedOtpRes = await request('POST', '/api/auth/verify-reset-otp', null, {
      email: staffEmail,
      otp: knownOtp
    });
    assert(reusedOtpRes.status === 400, '6.6 Single-use: OTP cannot be reused after verification (400)');

    // 6.5 Reset Password with new password
    const updatedStaffPass = 'Staff@NewPassword456';
    const resetRes = await request('POST', '/api/auth/reset-password', null, {
      email: staffEmail,
      resetToken: resetToken,
      newPassword: updatedStaffPass,
      confirmPassword: updatedStaffPass
    });
    assert(resetRes.status === 200, '6.7 Password reset returns HTTP 200 success');

    // 6.6 Old password rejected
    const oldLoginRes = await request('POST', '/api/auth/login', null, {
      email: staffEmail,
      password: staffPass
    });
    assert(oldLoginRes.status === 401, '6.8 Old password no longer authenticates (401)');

    // 6.7 New password login succeeds
    const newLoginRes = await request('POST', '/api/auth/login', null, {
      email: staffEmail,
      password: updatedStaffPass
    });
    assert(newLoginRes.status === 200 && newLoginRes.data.token, '6.9 Login with new password succeeds (200 + JWT)');
    staffPass = updatedStaffPass;

    // -------------------------------------------------------------
    // TEST 7 – RBAC & INACTIVE ACCOUNT ENFORCEMENT
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Strict RBAC & Inactive Account Enforcement ---');

    // 7.1 Citizen attempting Admin Users API
    const cUsers = await request('GET', '/api/admin/users', citizenToken);
    assert(cUsers.status === 403, '7.1 Citizen forbidden from Admin Users endpoint (403)');

    // 7.2 Staff attempting Admin Users API
    const sUsers = await request('GET', '/api/admin/users', staffToken);
    assert(sUsers.status === 403, '7.2 Staff forbidden from Admin Users endpoint (403)');

    // 7.3 Citizen attempting Staff creation API
    const cCreateStaff = await request('POST', '/api/admin/users/staff', citizenToken, {
      fullName: 'Illegal Staff',
      email: `illegal_${timestamp}@localfix.org`,
      phone: '9999999999',
      department: dept._id.toString(),
      password: 'Password@123'
    });
    assert(cCreateStaff.status === 403, '7.3 Citizen forbidden from Staff creation API (403)');

    // 7.4 Staff attempting Staff creation API
    const sCreateStaff = await request('POST', '/api/admin/users/staff', staffToken, {
      fullName: 'Illegal Staff',
      email: `illegal_${timestamp}@localfix.org`,
      phone: '9999999999',
      department: dept._id.toString(),
      password: 'Password@123'
    });
    assert(sCreateStaff.status === 403, '7.4 Staff forbidden from Staff creation API (403)');

    // 7.5 Deactivate user and verify login rejection with exact message
    const deactRes = await request('PUT', `/api/admin/users/${staffId}/status`, adminToken);
    assert(deactRes.status === 200, '7.5 Admin suspended staff user account');

    const inactLogin = await request('POST', '/api/auth/login', null, {
      email: staffEmail,
      password: staffPass
    });
    assert(inactLogin.status === 403, '7.6 Inactive staff login blocked with HTTP 403');
    assert(
      inactLogin.data.message === 'Your account is currently inactive. Please contact the administrator.',
      '7.7 Inactive user receives exact message: "Your account is currently inactive. Please contact the administrator."'
    );

    // 7.6 Reactivate staff and verify login succeeds
    const reactRes = await request('PUT', `/api/admin/users/${staffId}/status`, adminToken);
    assert(reactRes.status === 200, '7.8 Admin reactivated staff user account');

    const reactLogin = await request('POST', '/api/auth/login', null, {
      email: staffEmail,
      password: staffPass
    });
    assert(reactLogin.status === 200 && reactLogin.data.token, '7.9 Reactivated staff logs in successfully (200)');

    console.log('\n===============================================================');
    console.log(`🎉 Real Auth Test Suite: ${passCount} Passed, ${failCount} Failed`);
    console.log('===============================================================\n');

    testServer.close();
    process.exit(failCount === 0 ? 0 : 1);
  } catch (error) {
    console.error('\nFatal Error in Real Auth Suite:', error);
    if (testServer) testServer.close();
    process.exit(1);
  }
}

runRealAuthSuite();
