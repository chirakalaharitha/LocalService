const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'localfix_jwt_secret_dev_mode_2026';

const runTests = async () => {
  console.log('=== STARTING LOCALFIX PRODUCTION SYSTEM VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, extraInfo = '') => {
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${extraInfo}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${extraInfo}`);
      failed++;
    }
  };

  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://127.0.0.1:27017/localfix');
    const db = mongoose.connection.db;

    // Test 1: GET /api/health
    const healthRes = await fetch(`${API_BASE}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.success, 'GET /api/health returns 200');

    // Test 2: Verify Real Admin in MongoDB
    const adminUser = await db.collection('users').findOne({ email: 'harithachirakala@gmail.com' });
    assert(adminUser !== null, 'Admin account harithachirakala@gmail.com exists in MongoDB');
    assert(adminUser?.role === 'ADMIN', 'Admin user role is ADMIN');
    assert(adminUser?.isVerified === true, 'Admin user isVerified is true');
    assert(adminUser?.isActive === true, 'Admin user isActive is true');

    // Test 3: Zero dummy staff in MongoDB
    const staffCount = await db.collection('users').countDocuments({ role: 'STAFF' });
    assert(staffCount === 0, `Initial Staff count in MongoDB is 0 (found ${staffCount})`);

    // Test 4: Only 1 Admin in MongoDB
    const adminCount = await db.collection('users').countDocuments({ role: 'ADMIN' });
    assert(adminCount === 1, `Only 1 Admin in MongoDB (found ${adminCount})`);

    // Test 5: Invalid credentials returns 401
    const badLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'harithachirakala@gmail.com',
        password: 'IncorrectPasswordDefinitelyWrong999'
      })
    });
    const badLoginData = await badLoginRes.json();
    assert(badLoginRes.status === 401, 'Login with incorrect password returns 401', `(status: ${badLoginRes.status})`);
    assert(badLoginData.message === 'Invalid email or password', 'Returns safe error message without leaking details');

    // Test 6: Non-existent account returns 401
    const noUserRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent_person_random_999@domain.com',
        password: 'SomePassword123'
      })
    });
    assert(noUserRes.status === 401, 'Non-existent user login returns 401', `(status: ${noUserRes.status})`);

    // Generate authenticated admin token
    const adminToken = jwt.sign({ id: adminUser._id, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1d' });
    const adminHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    };

    // Test 7: GET /api/auth/me returns Admin user profile
    const meRes = await fetch(`${API_BASE}/auth/me`, { headers: adminHeaders });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.user.role === 'ADMIN', 'GET /api/auth/me returns role ADMIN');
    assert(meData.user.email === 'harithachirakala@gmail.com', 'Admin email matches harithachirakala@gmail.com');

    // Test 8: GET /api/admin/dashboard returns real MongoDB stats
    const dashRes = await fetch(`${API_BASE}/admin/dashboard`, { headers: adminHeaders });
    const dashData = await dashRes.json();
    assert(dashRes.status === 200 && dashData.success, 'GET /api/admin/dashboard succeeds for Admin');
    assert(dashData.stats.totalStaff === 0, `Stats show totalStaff: 0 (matches MongoDB count: ${dashData.stats.totalStaff})`);
    assert(dashData.stats.totalCitizens >= 1, `Stats show real citizen count: ${dashData.stats.totalCitizens}`);

    // Test 9: GET /api/admin/users?role=STAFF returns empty array
    const staffListRes = await fetch(`${API_BASE}/admin/users?role=STAFF`, { headers: adminHeaders });
    const staffListData = await staffListRes.json();
    assert(staffListRes.status === 200 && staffListData.users.length === 0, 'Initial staff list is empty array');

    // Test 10: Admin creates a real staff user via POST /api/admin/users/staff
    const waterDept = await db.collection('departments').findOne({ code: 'WATER' });
    const tempStaffEmail = `staff_test_${Date.now()}@realmunicipal.gov.in`;

    const createStaffRes = await fetch(`${API_BASE}/admin/users/staff`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        fullName: 'Suresh Kumar',
        email: tempStaffEmail,
        phone: '9876501234',
        password: 'StaffSecretPass@2026',
        confirmPassword: 'StaffSecretPass@2026',
        department: waterDept._id.toString(),
        city: 'Guntur',
        state: 'AP',
        pincode: '522213'
      })
    });
    const createStaffData = await createStaffRes.json();
    assert(createStaffRes.status === 201 && createStaffData.success, 'POST /api/admin/users/staff creates real Staff account');
    assert(createStaffData.user.role === 'STAFF', 'Created user has role STAFF');
    assert(!createStaffData.user.password && !createStaffData.user.passwordHash, 'Response never leaks password or hash');

    // Test 11: Created Staff exists in MongoDB with role STAFF and isVerified true
    const createdStaffDb = await db.collection('users').findOne({ email: tempStaffEmail });
    assert(createdStaffDb !== null, 'Newly created Staff found in MongoDB');
    assert(createdStaffDb?.role === 'STAFF', 'MongoDB document has role STAFF');
    assert(createdStaffDb?.isVerified === true, 'MongoDB document has isVerified: true');
    assert(createdStaffDb?.isActive === true, 'MongoDB document has isActive: true');

    // Test 12: Staff logs in via standard POST /api/auth/login
    const staffLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: tempStaffEmail,
        password: 'StaffSecretPass@2026'
      })
    });
    const staffLoginData = await staffLoginRes.json();
    assert(staffLoginRes.status === 200 && staffLoginData.success, 'Newly created Staff successfully logs in via /login');
    assert(staffLoginData.user.role === 'STAFF', 'Login response returns role STAFF for redirection to /staff/dashboard');

    const staffToken = staffLoginData.token;
    const staffHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${staffToken}`
    };

    // Test 13: Staff cannot access Admin-only APIs (403)
    const staffAdminRes = await fetch(`${API_BASE}/admin/dashboard`, { headers: staffHeaders });
    assert(staffAdminRes.status === 403, 'Staff is blocked from Admin endpoints with 403 Forbidden', `(status: ${staffAdminRes.status})`);

    // Test 14: Citizen cannot access Admin-only APIs (403)
    const citizenUser = await db.collection('users').findOne({ role: 'CITIZEN' });
    if (citizenUser) {
      const citizenToken = jwt.sign({ id: citizenUser._id, role: 'CITIZEN' }, JWT_SECRET, { expiresIn: '1d' });
      const citizenAdminRes = await fetch(`${API_BASE}/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${citizenToken}` }
      });
      assert(citizenAdminRes.status === 403, 'Citizen is blocked from Admin endpoints with 403 Forbidden', `(status: ${citizenAdminRes.status})`);
    }

    // Test 15: Clean up the test staff created during this verification
    await db.collection('users').deleteOne({ email: tempStaffEmail });
    await db.collection('activitylogs').deleteMany({ targetId: createdStaffDb._id.toString() });
    console.log('\n[Verification Clean] Removed temporary staff account used for test.');

    const finalStaffCount = await db.collection('users').countDocuments({ role: 'STAFF' });
    assert(finalStaffCount === 0, 'Final Staff count in MongoDB is 0');

    console.log(`\n========================================`);
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log(`========================================\n`);

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Unexpected error in verification script:', err);
    process.exit(1);
  }
};

runTests();
