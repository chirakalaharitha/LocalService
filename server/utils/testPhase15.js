/**
 * Phase 15: Analytics & Data Visualization Test Suite
 * Comprehensive automated verification for:
 * - Real MongoDB Aggregations for Executive Analytics
 * - SLA analytics, turnaround hours, and compliance percentages
 * - Feedback & rating distributions
 * - Departmental and category workload analytics
 * - Filter-aware query processing (category, department, priority, status, date)
 * - Staff performance throughput & task metrics
 * - Security & RBAC access boundaries
 */

const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = require('../app');
const User = require('../models/User');
const Department = require('../models/Department');
const Request = require('../models/Request');
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

async function runPhase15Tests() {
  console.log('===============================================================');
  console.log('📊 LOCALFIX PHASE 15: ANALYTICS & DATA VISUALIZATION TEST SUITE');
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
    // 1. Setup Test Accounts & Data
    console.log('\n[1/6] Setting Up Multi-Role Accounts for Analytics Verification...');
    await User.deleteMany({ email: /^phase15\./ });
    await Request.deleteMany({ requestId: /^LF-P15-/ });

    const rawPassword = 'Password@123';

    let dept = await Department.findOne({ code: 'P15-ENG' });
    if (!dept) {
      dept = await Department.create({
        name: 'Phase 15 Civil Engineering',
        code: 'P15-ENG',
        description: 'Municipal engineering and roads'
      });
    }

    const admin = await User.create({
      name: 'Phase 15 Admin',
      email: 'phase15.admin@localfix.test',
      phone: '9876541501',
      password: rawPassword,
      role: 'ADMIN',
      isVerified: true
    });

    const citizen = await User.create({
      name: 'Phase 15 Citizen',
      email: 'phase15.citizen@localfix.test',
      phone: '9876541502',
      password: rawPassword,
      role: 'CITIZEN',
      isVerified: true
    });

    const staff = await User.create({
      name: 'Phase 15 Staff Worker',
      email: 'phase15.staff@localfix.test',
      phone: '9876541503',
      password: rawPassword,
      role: 'STAFF',
      department: dept._id,
      isVerified: true
    });

    const adminLogin = await request(baseUrl, 'POST', '/api/auth/login', null, {
      email: 'phase15.admin@localfix.test',
      password: rawPassword
    });
    assert(adminLogin.status === 200 && adminLogin.body.token, 'Admin logged in for analytics access');
    const adminToken = adminLogin.body.token;

    const citizenLogin = await request(baseUrl, 'POST', '/api/auth/login', null, {
      email: 'phase15.citizen@localfix.test',
      password: rawPassword
    });
    const citizenToken = citizenLogin.body.token;

    // 2. Create requests with realistic timestamps & states
    console.log('\n[2/6] Seeding Realistic Requests & Lifecycle Metrics...');
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    const reqResolved = await Request.create({
      requestId: 'LF-P15-001',
      title: 'Pothole Fixed on 8th Main',
      description: 'Major road pothole filled and leveled',
      category: 'ROAD',
      priority: 'HIGH',
      citizen: citizen._id,
      assignedStaff: staff._id,
      department: dept._id,
      status: 'RESOLVED',
      address: '8th Main Road',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
      slaDeadline: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      createdAt: fourHoursAgo,
      resolvedAt: twoHoursAgo
    });

    const reqClosed = await Request.create({
      requestId: 'LF-P15-002',
      title: 'Street Lamp Restored',
      description: 'Defective sodium bulb replaced with LED',
      category: 'STREET_LIGHT',
      priority: 'LOW',
      citizen: citizen._id,
      assignedStaff: staff._id,
      department: dept._id,
      status: 'CITIZEN_VERIFIED',
      address: '9th Cross Road',
      location: { type: 'Point', coordinates: [77.591, 12.971] },
      slaDeadline: new Date(now.getTime() + 72 * 60 * 60 * 1000),
      createdAt: fourHoursAgo,
      resolvedAt: twoHoursAgo,
      verifiedAt: now
    });

    // Feedback for the closed request
    await Feedback.create({
      request: reqClosed._id,
      citizen: citizen._id,
      rating: 5,
      comment: 'Superb and prompt resolution!'
    });

    // 3. Security & Authorization
    console.log('\n[3/6] Testing RBAC Security for Admin Analytics...');
    const citAccess = await request(baseUrl, 'GET', '/api/admin/analytics', citizenToken);
    assert(citAccess.status === 403, 'Citizen blocked from analytics with HTTP 403 Forbidden');

    const unauthAccess = await request(baseUrl, 'GET', '/api/admin/analytics');
    assert(unauthAccess.status === 401, 'Unauthenticated access blocked with HTTP 401 Unauthorized');

    // 4. Test Analytics Overview KPIs
    console.log('\n[4/6] Verifying Executive KPI Computations (MongoDB Data)...');
    const analyticsRes = await request(baseUrl, 'GET', '/api/admin/analytics', adminToken);
    if (analyticsRes.status !== 200) {
      console.log('analyticsRes status:', analyticsRes.status, 'body:', analyticsRes.body);
    }
    assert(analyticsRes.status === 200, 'GET /api/admin/analytics responded with HTTP 200');
    assert(analyticsRes.body?.success === true, 'Response body success is true');

    const ov = analyticsRes.body?.overview;
    assert(ov.totalRequests >= 2, 'Overview calculates totalRequests');
    assert(ov.resolvedRequests >= 2, 'Overview calculates resolvedRequests');
    assert(ov.closedRequests >= 1, 'Overview calculates closedRequests');
    assert(typeof ov.slaComplianceRate === 'number', 'Overview calculates slaComplianceRate percentage');
    assert(typeof ov.avgResolutionHours === 'number' && ov.avgResolutionHours > 0, 'Overview calculates avgResolutionHours from timestamps');
    assert(typeof ov.avgCompletionHours === 'number' && ov.avgCompletionHours > 0, 'Overview calculates avgCompletionHours from timestamps');
    assert(ov.avgRating >= 4, 'Overview calculates average rating from Feedback');

    // 5. Test Aggregations & Breakdowns
    console.log('\n[5/6] Verifying Category, Department, Status, & Feedback Distributions...');
    const catDist = analyticsRes.body.categoryDistribution;
    assert(Array.isArray(catDist) && catDist.length > 0, 'Returns categoryDistribution array');
    const roadCat = catDist.find(c => c._id === 'ROAD');
    assert(Boolean(roadCat), 'categoryDistribution includes ROAD');

    const deptDist = analyticsRes.body.departmentDistribution;
    assert(Array.isArray(deptDist) && deptDist.length > 0, 'Returns departmentDistribution with resolved counts');

    const statusDist = analyticsRes.body.statusBreakdown;
    assert(Array.isArray(statusDist) && statusDist.length > 0, 'Returns statusBreakdown array');

    const prioDist = analyticsRes.body.priorityDistribution;
    assert(Array.isArray(prioDist) && prioDist.length > 0, 'Returns priorityDistribution array');

    const fbAnalytics = analyticsRes.body.feedbackAnalytics;
    assert(fbAnalytics.totalFeedback >= 1, 'Feedback analytics reports total reviews');
    assert(fbAnalytics.ratingDistribution[5] >= 1, 'Feedback analytics reports 5-star count');

    const staffPerf = analyticsRes.body.staffPerformance;
    assert(Array.isArray(staffPerf) && staffPerf.length > 0, 'Returns staffPerformance array');
    const foundStaff = staffPerf.find(s => s.name === 'Phase 15 Staff Worker');
    assert(foundStaff && foundStaff.completedCount >= 2, 'Staff performance calculates completed task volume');

    // 6. Test Filter-Aware Querying
    console.log('\n[6/6] Testing Query Filtering on Analytics API...');
    const filteredCatRes = await request(baseUrl, 'GET', '/api/admin/analytics?category=ROAD', adminToken);
    assert(filteredCatRes.status === 200, 'Filtered analytics by category=ROAD');
    assert(filteredCatRes.body.overview.totalRequests >= 1, 'Filtered analytics reports correct volume');
    const allFilteredRoad = filteredCatRes.body.categoryDistribution.every(c => c._id === 'ROAD');
    assert(allFilteredRoad, 'Filtered categoryDistribution only contains ROAD');

    console.log('\n===============================================================');
    console.log(`📊 PHASE 15 TEST RESULTS: ${passedChecks} PASSED, ${failedChecks} FAILED`);
    console.log('===============================================================');

    if (failedChecks > 0) {
      console.error('❌ Some Phase 15 checks failed!');
      process.exit(1);
    } else {
      console.log('🎉 ALL PHASE 15 AUTOMATED CHECKS PASSED PERFECTLY!');
    }
  } catch (error) {
    console.error('Phase 15 test error:', error);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.disconnect();
    console.log('[Test Server] Cleaned up and disconnected.');
  }
}

runPhase15Tests();
