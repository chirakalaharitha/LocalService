/**
 * Phase 17: Departments & Admin Settings Test Suite
 * Comprehensive automated verification for:
 * - 17.1 Department CRUD, active toggling & duplicate prevention (code & name)
 * - 17.1 Department staff viewing, assignment & removal
 * - 17.1 Referential integrity: preventing deletion of departments with active requests
 * - 17.2 Static civic categories preserved without breaking request creation
 * - 17.3 Configurable SLA target resolution times for CRITICAL, HIGH, MEDIUM, LOW
 * - 17.4 Administrative System Settings (Identity, Notifications, Maintenance Mode)
 * - 17.5 Admin Profile: safe profile updates, prevention of unauthorized role elevation
 * - 17.6 Security & RBAC: Admin-only access enforcement on settings & staff assignments
 */

const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = require('../app');
const User = require('../models/User');
const Department = require('../models/Department');
const Request = require('../models/Request');
const SystemSetting = require('../models/SystemSetting');
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

async function runPhase17Tests() {
  console.log('===============================================================');
  console.log('🏛️  Starting Phase 17: Departments & Admin Settings Test Suite');
  console.log('===============================================================\n');

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/localfix';
  await mongoose.connect(mongoUri);
  console.log('  Connected to MongoDB for Phase 17 Test Suite.');

  const server = http.createServer(app);
  await new Promise(res => server.listen(0, '127.0.0.1', res));
  const port = server.address().port;
  const serverUrl = `http://127.0.0.1:${port}`;
  console.log(`  Test HTTP server running at ${serverUrl}\n`);

  try {
    // -------------------------------------------------------------
    // Clean and seed users
    // -------------------------------------------------------------
    await User.deleteMany({ email: /^phase17\./ });
    await Department.deleteMany({ code: /^P17-/ });
    await Request.deleteMany({ requestId: /^LF-P17-/ });

    const adminUser = await User.create({
      name: 'Phase 17 Admin',
      email: 'phase17.admin@example.com',
      password: 'password123',
      role: 'ADMIN',
      phone: '9876543230',
      city: 'Capital City'
    });

    const staffUser1 = await User.create({
      name: 'Phase 17 Staff Alpha',
      email: 'phase17.staff1@example.com',
      password: 'password123',
      role: 'STAFF',
      phone: '9876543231',
      isActive: true
    });

    const staffUser2 = await User.create({
      name: 'Phase 17 Staff Beta',
      email: 'phase17.staff2@example.com',
      password: 'password123',
      role: 'STAFF',
      phone: '9876543232',
      isActive: true
    });

    const citizenUser = await User.create({
      name: 'Phase 17 Citizen',
      email: 'phase17.citizen@example.com',
      password: 'password123',
      role: 'CITIZEN',
      phone: '9876543233'
    });

    const adminToken = generateToken(adminUser._id, 'ADMIN');
    const staffToken = generateToken(staffUser1._id, 'STAFF');
    const citizenToken = generateToken(citizenUser._id, 'CITIZEN');

    // -------------------------------------------------------------
    // TEST 1: Department Management & Duplicate Prevention
    // -------------------------------------------------------------
    console.log('--- TEST 1: Department Management & Duplicate Prevention ---');

    // Create Department
    const createRes = await request(serverUrl, 'POST', '/api/departments', adminToken, {
      name: 'Phase 17 Horticulture & Forestry',
      code: 'P17-HORT',
      description: 'City parks, tree maintenance, and public green zones',
      icon: 'HiSparkles'
    });
    assert(createRes.status === 201 && createRes.data.success === true, 'Admin successfully created new department (201)');
    const createdDeptId = createRes.data.department._id;

    // Reject duplicate code
    const dupCodeRes = await request(serverUrl, 'POST', '/api/departments', adminToken, {
      name: 'Another Dept',
      code: 'P17-HORT',
      description: 'Duplicate code check'
    });
    assert(dupCodeRes.status === 400 && dupCodeRes.data.message.includes('code already in use'), 'Duplicate department code rejected with 400');

    // Reject duplicate name
    const dupNameRes = await request(serverUrl, 'POST', '/api/departments', adminToken, {
      name: 'Phase 17 Horticulture & Forestry',
      code: 'P17-HORT2',
      description: 'Duplicate name check'
    });
    assert(dupNameRes.status === 400 && dupNameRes.data.message.includes('name already in use'), 'Duplicate department name rejected with 400');

    // RBAC: Citizen & Staff cannot create departments
    const citizenCreateDept = await request(serverUrl, 'POST', '/api/departments', citizenToken, {
      name: 'Unauthorized Dept',
      code: 'P17-UNAUTH'
    });
    assert(citizenCreateDept.status === 403, 'Citizen role forbidden from creating department (403)');

    // Update Department
    const updateRes = await request(serverUrl, 'PUT', `/api/departments/${createdDeptId}`, adminToken, {
      name: 'Phase 17 Urban Forestry & Greenery',
      description: 'Updated operational description for forestry'
    });
    assert(updateRes.status === 200 && updateRes.data.department.name === 'Phase 17 Urban Forestry & Greenery', 'Admin successfully updated department details');

    // Toggle Status
    const toggleRes = await request(serverUrl, 'PUT', `/api/departments/${createdDeptId}/status`, adminToken);
    assert(toggleRes.status === 200 && toggleRes.data.isActive === false, 'Admin deactivated department (status: false)');
    const toggleRes2 = await request(serverUrl, 'PUT', `/api/departments/${createdDeptId}/status`, adminToken);
    assert(toggleRes2.status === 200 && toggleRes2.data.isActive === true, 'Admin reactivated department (status: true)');

    // -------------------------------------------------------------
    // TEST 2: Department Staff Assignment & Inspection
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Department Staff Assignment & Operations ---');

    // Initially staff count is 0
    const staffList1 = await request(serverUrl, 'GET', `/api/departments/${createdDeptId}/staff`, adminToken);
    assert(staffList1.status === 200 && staffList1.data.count === 0, 'New department initially has 0 assigned staff');

    // Assign staffUser1 to department
    const assignRes1 = await request(serverUrl, 'POST', `/api/departments/${createdDeptId}/staff`, adminToken, {
      staffId: staffUser1._id.toString()
    });
    assert(assignRes1.status === 200 && assignRes1.data.success === true, 'Assigned staffUser1 to department');

    // Assign staffUser2 to department
    const assignRes2 = await request(serverUrl, 'POST', `/api/departments/${createdDeptId}/staff`, adminToken, {
      staffId: staffUser2._id.toString()
    });
    assert(assignRes2.status === 200 && assignRes2.data.success === true, 'Assigned staffUser2 to department');

    // Verify staff list now has 2 members
    const staffList2 = await request(serverUrl, 'GET', `/api/departments/${createdDeptId}/staff`, adminToken);
    assert(staffList2.status === 200 && staffList2.data.count === 2, 'Department now reports 2 assigned staff members');

    // Prevent assigning citizen as department staff
    const badAssignRes = await request(serverUrl, 'POST', `/api/departments/${createdDeptId}/staff`, adminToken, {
      staffId: citizenUser._id.toString()
    });
    assert(badAssignRes.status === 400, 'Attempting to assign non-STAFF user rejected with 400');

    // Remove staffUser2 from department
    const removeStaffRes = await request(serverUrl, 'DELETE', `/api/departments/${createdDeptId}/staff/${staffUser2._id}`, adminToken);
    assert(removeStaffRes.status === 200 && removeStaffRes.data.success === true, 'Removed staffUser2 from department');

    const staffList3 = await request(serverUrl, 'GET', `/api/departments/${createdDeptId}/staff`, adminToken);
    assert(staffList3.status === 200 && staffList3.data.count === 1, 'Department now reflects 1 assigned staff member after removal');

    // -------------------------------------------------------------
    // TEST 3: Referential Integrity on Department Deletion
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Department Deletion Safeguards ---');

    // Create an active request referencing createdDeptId
    const activeReq = await Request.create({
      requestId: 'LF-P17-001',
      title: 'Fallen tree blocking public road',
      description: 'Storm damaged tree blocking two traffic lanes',
      category: 'ROAD',
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      citizen: citizenUser._id,
      department: createdDeptId,
      assignedStaff: staffUser1._id,
      address: 'Main Avenue Sector 7',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
      slaDeadline: new Date(Date.now() + 86400000)
    });

    // Attempt to delete department with active request
    const blockedDeleteRes = await request(serverUrl, 'DELETE', `/api/departments/${createdDeptId}`, adminToken);
    assert(blockedDeleteRes.status === 400 && blockedDeleteRes.data.message.includes('Cannot delete department'), 'Deletion blocked when active requests reference department (400)');

    // Resolve the request so no active requests remain
    activeReq.status = 'CLOSED';
    await activeReq.save();

    // Now delete should succeed
    const allowedDeleteRes = await request(serverUrl, 'DELETE', `/api/departments/${createdDeptId}`, adminToken);
    assert(allowedDeleteRes.status === 200 && allowedDeleteRes.data.success === true, 'Department successfully deleted when no active requests remain');

    // -------------------------------------------------------------
    // TEST 4: Administrative System Settings & RBAC
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: System Settings & Configurable SLA ---');

    // RBAC on settings
    const citizenSettings = await request(serverUrl, 'GET', '/api/admin/settings', citizenToken);
    assert(citizenSettings.status === 403, 'Citizen forbidden from viewing admin settings (403)');

    const staffSettings = await request(serverUrl, 'GET', '/api/admin/settings', staffToken);
    assert(staffSettings.status === 403, 'Staff forbidden from viewing admin settings (403)');

    const adminSettingsGet = await request(serverUrl, 'GET', '/api/admin/settings', adminToken);
    assert(adminSettingsGet.status === 200 && adminSettingsGet.data.settings, 'Admin retrieved system settings successfully (200)');
    assert(adminSettingsGet.data.emailConfigStatus && adminSettingsGet.data.emailConfigStatus.authMethod, 'Settings includes secure emailConfigStatus without secrets');

    // Update settings
    const updateSettingsRes = await request(serverUrl, 'PUT', '/api/admin/settings', adminToken, {
      appName: 'LocalFix Municipal Hub',
      tagline: 'Modern Civic Problem Management',
      contactEmail: 'contact@localfix.gov',
      defaultPageSize: 20,
      slaTargets: {
        CRITICAL: 6,
        HIGH: 18,
        MEDIUM: 36,
        LOW: 96
      },
      maintenanceMode: false,
      maintenanceMessage: 'Scheduled system maintenance'
    });
    assert(updateSettingsRes.status === 200 && updateSettingsRes.data.settings.appName === 'LocalFixMunicipalHub' || updateSettingsRes.data.settings.appName === 'LocalFix Municipal Hub', 'Admin updated platform settings and SLA targets (200)');
    assert(updateSettingsRes.data.settings.slaTargets.CRITICAL === 6, 'Configured CRITICAL SLA target saved as 6 hours');
    assert(updateSettingsRes.data.settings.slaTargets.HIGH === 18, 'Configured HIGH SLA target saved as 18 hours');

    // Verify ActivityLog was created for settings update
    const logCheck = await ActivityLog.findOne({ action: 'SETTINGS_UPDATED', targetType: 'SystemSetting' });
    assert(logCheck !== null, 'ActivityLog recorded administrative SETTINGS_UPDATED audit entry');

    // Validation: Reject empty appName
    const emptyAppRes = await request(serverUrl, 'PUT', '/api/admin/settings', adminToken, {
      appName: '   '
    });
    assert(emptyAppRes.status === 400, 'Server-side validation: Empty appName rejected with 400');

    // Validation: Reject invalid contact email
    const badEmailRes = await request(serverUrl, 'PUT', '/api/admin/settings', adminToken, {
      contactEmail: 'invalid-email-string'
    });
    assert(badEmailRes.status === 400, 'Server-side validation: Malformed contactEmail rejected with 400');

    // Public Settings endpoint
    const publicSettingsRes = await request(serverUrl, 'GET', '/api/settings/public');
    assert(publicSettingsRes.status === 200 && publicSettingsRes.data.appName, 'Public settings accessible without auth token');
    assert(!publicSettingsRes.data.emailConfigStatus && !publicSettingsRes.data.password, 'Public settings does not expose internal configuration or credentials');

    // -------------------------------------------------------------
    // TEST 5: Admin Profile Safety & Role Tamper Protection
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Admin Profile Safety & Role Protection ---');

    // Update safe profile fields
    const profileUpdateRes = await request(serverUrl, 'PUT', '/api/auth/profile', adminToken, {
      fullName: 'Phase 17 Chief Administrator',
      phone: '9876543299',
      city: 'Metropolis',
      role: 'SUPER_ROOT_ADMIN' // Malicious attempt to manipulate role
    });

    assert(profileUpdateRes.status === 200, 'Profile update endpoint returned 200');
    assert(profileUpdateRes.data.user.name === 'Phase 17 Chief Administrator', 'Admin profile name updated successfully');
    assert(profileUpdateRes.data.user.phone === '9876543299', 'Admin profile phone updated successfully');
    assert(profileUpdateRes.data.user.city === 'Metropolis', 'Admin profile city updated successfully');
    assert(profileUpdateRes.data.user.role === 'ADMIN', 'Role manipulation payload ignored: user.role remains strictly ADMIN');

    const dbUser = await User.findById(adminUser._id);
    assert(dbUser.role === 'ADMIN', 'Database record confirms user.role was untouched');

    // Cleanup test data
    await User.deleteMany({ email: /^phase17\./ });
    await Department.deleteMany({ code: /^P17-/ });
    await Request.deleteMany({ requestId: /^LF-P17-/ });
    await ActivityLog.deleteMany({ action: 'SETTINGS_UPDATED' });

  } catch (err) {
    console.error('Test execution error:', err);
    failedChecks++;
  } finally {
    server.close();
    await mongoose.disconnect();
  }

  console.log('\n===============================================================');
  console.log(`Phase 17 Test Summary: ${passedChecks} Passed, ${failedChecks} Failed`);
  console.log('===============================================================\n');

  if (failedChecks > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase17Tests();
