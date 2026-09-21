/**
 * Phase 13: Citizen Verification + Feedback & Rating System Test Suite
 * Comprehensive automated verification for:
 * - Citizen resolution verification workflow
 * - Issue reporting / reopening with reason
 * - Feedback & 1-5 star rating CRUD and duplicate prevention
 * - Strict RBAC, ownership checks, and staff/admin visibility
 * - Status history logging and notification generation
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
const Notification = require('../models/Notification');

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

async function runPhase13Tests() {
  console.log('===============================================================');
  console.log('🧪 LOCALFIX PHASE 13: CITIZEN VERIFICATION & FEEDBACK TEST SUITE');
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
    // 1. Seed or find test users
    console.log('\n[1/8] Setting Up Test Accounts (Citizen A, Citizen B, Staff, Admin)...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('TestPassword123!', salt);

    // Clean up any existing Phase 13 test accounts
    await User.deleteMany({ email: /^phase13\./ });

    const rawPassword = 'TestPassword123!';

    let citizenA = await User.create({
      name: 'Phase 13 Citizen A',
      email: 'phase13.citizena@localfix.test',
      phone: '9876543211',
      password: rawPassword,
      role: 'CITIZEN',
      isVerified: true
    });

    let citizenB = await User.create({
      name: 'Phase 13 Citizen B',
      email: 'phase13.citizenb@localfix.test',
      phone: '9876543212',
      password: rawPassword,
      role: 'CITIZEN',
      isVerified: true
    });

    let staff = await User.create({
      name: 'Phase 13 Field Staff',
      email: 'phase13.staff@localfix.test',
      phone: '9876543213',
      password: rawPassword,
      role: 'STAFF',
      isVerified: true
    });

    let admin = await User.create({
      name: 'Phase 13 Admin',
      email: 'phase13.admin@localfix.test',
      phone: '9876543214',
      password: rawPassword,
      role: 'ADMIN',
      isVerified: true
    });

    // Authenticate all users
    const loginA = await request(baseUrl, 'POST', '/api/auth/login', null, {
      email: 'phase13.citizena@localfix.test',
      password: 'TestPassword123!'
    });
    assert(loginA.status === 200 && loginA.body.token, 'Citizen A logged in successfully');
    const tokenCitizenA = loginA.body.token;

    const loginB = await request(baseUrl, 'POST', '/api/auth/login', null, {
      email: 'phase13.citizenb@localfix.test',
      password: 'TestPassword123!'
    });
    assert(loginB.status === 200 && loginB.body.token, 'Citizen B logged in successfully');
    const tokenCitizenB = loginB.body.token;

    const loginStaff = await request(baseUrl, 'POST', '/api/auth/login', null, {
      email: 'phase13.staff@localfix.test',
      password: 'TestPassword123!'
    });
    assert(loginStaff.status === 200 && loginStaff.body.token, 'Staff logged in successfully');
    const tokenStaff = loginStaff.body.token;

    const loginAdmin = await request(baseUrl, 'POST', '/api/auth/login', null, {
      email: 'phase13.admin@localfix.test',
      password: 'TestPassword123!'
    });
    assert(loginAdmin.status === 200 && loginAdmin.body.token, 'Admin logged in successfully');
    const tokenAdmin = loginAdmin.body.token;

    // Find or create test department
    let department = await Department.findOne({ code: 'P13-ROADS' });
    if (!department) {
      department = await Department.create({
        name: 'Phase 13 Roads & Infrastructure',
        code: 'P13-ROADS',
        description: 'Road repair and street maintenance for Phase 13',
        isActive: true
      });
    }

    // 2. Create Service Request for Citizen A
    console.log('\n[2/8] Creating Test Service Requests for Verification Workflow...');
    const reqCreateRes = await request(baseUrl, 'POST', '/api/requests', tokenCitizenA, {
      title: 'Phase 13 Damaged Pothole on 5th Cross',
      description: 'Major road crater requiring asphalt filling and surface leveling',
      category: 'ROAD',
      priority: 'HIGH',
      address: '5th Cross Main Road',
      latitude: 12.9716,
      longitude: 77.5946
    });
    assert(reqCreateRes.status === 201 && reqCreateRes.body.request, 'Citizen A created service request');
    const testReqA = reqCreateRes.body.request;
    const testReqAId = testReqA._id;

    // Assign staff and advance status to RESOLVED
    await Request.findByIdAndUpdate(testReqAId, {
      assignedStaff: staff._id,
      assignedTo: staff._id,
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolutionNotes: 'Filled pothole with hot-mix asphalt and compacted surface.'
    });
    console.log('  -> Request transitioned to RESOLVED / Pending Verification');

    // 3. Security & Ownership Verification
    console.log('\n[3/8] Testing Citizen Verification Security & Ownership Rules...');
    
    // Missing JWT
    const noJwtRes = await request(baseUrl, 'PATCH', `/api/requests/${testReqAId}/verify`);
    assert(noJwtRes.status === 401, 'Verification rejected without JWT (401)');

    // Citizen B tries to verify Citizen A's request
    const citBVerifyRes = await request(baseUrl, 'PATCH', `/api/requests/${testReqAId}/verify`, tokenCitizenB);
    assert(citBVerifyRes.status === 403, 'Citizen B forbidden from verifying Citizen A request (403)');

    // Citizen A verifies own request
    const citAVerifyRes = await request(baseUrl, 'PATCH', `/api/requests/${testReqAId}/verify`, tokenCitizenA, {
      notes: 'Work inspected on site, repair is solid and clean.'
    });
    assert(citAVerifyRes.status === 200, 'Citizen A verified own resolution successfully (200)');
    assert(
      citAVerifyRes.body.request.status === 'CITIZEN_VERIFIED' || citAVerifyRes.body.request.status === 'CLOSED',
      'Request status moved to CITIZEN_VERIFIED / CLOSED'
    );

    // Verify Database Persistence
    const dbReqA = await Request.findById(testReqAId);
    assert(dbReqA.citizenVerification?.verified === true, 'Database has citizenVerification.verified === true');
    assert(dbReqA.citizenVerification?.verifiedBy?.toString() === citizenA._id.toString(), 'Database records verifying citizen');
    assert(dbReqA.citizenVerification?.verifiedAt instanceof Date, 'Database stores verification timestamp');

    // Check RequestHistory logging
    const historyEntries = await RequestHistory.find({ request: testReqAId });
    const verifyHistory = historyEntries.find(h => h.action.includes('VERIFIED') || h.newStatus === 'CITIZEN_VERIFIED');
    assert(Boolean(verifyHistory), 'RequestHistory timeline entry recorded for citizen verification');

    // Replay / Double verification protection
    const duplicateVerifyRes = await request(baseUrl, 'PATCH', `/api/requests/${testReqAId}/verify`, tokenCitizenA);
    assert(duplicateVerifyRes.status === 400, 'Double verification prevented with meaningful error (400)');

    // 4. Testing Reopen / Report Issue Flow
    console.log('\n[4/8] Testing Issue Reporting / Reopening Flow...');
    const reqCreate2 = await request(baseUrl, 'POST', '/api/requests', tokenCitizenA, {
      title: 'Phase 13 Broken Streetlight Near Park',
      description: 'Streetlight pole light is flickering and completely dark at night',
      category: 'STREET_LIGHT',
      priority: 'MEDIUM',
      address: 'Park Avenue Road',
      latitude: 12.972,
      longitude: 77.595
    });
    assert(reqCreate2.status === 201, 'Created second service request for reopen testing');
    const testReq2Id = reqCreate2.body.request._id;

    // Set to RESOLVED
    await Request.findByIdAndUpdate(testReq2Id, {
      assignedStaff: staff._id,
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolutionNotes: 'Bulb replaced.'
    });

    // Reopen without reason should fail
    const reopenNoReason = await request(baseUrl, 'PATCH', `/api/requests/${testReq2Id}/reopen`, tokenCitizenA, {
      reason: '   '
    });
    assert(reopenNoReason.status === 400, 'Reopen rejected when reason is missing/empty (400)');

    // Citizen B cannot reopen Citizen A request
    const citBReopen = await request(baseUrl, 'PATCH', `/api/requests/${testReq2Id}/reopen`, tokenCitizenB, {
      reason: 'Still broken'
    });
    assert(citBReopen.status === 403, 'Citizen B forbidden from reopening Citizen A request (403)');

    // Citizen A reopens with valid reason
    const citAReopen = await request(baseUrl, 'PATCH', `/api/requests/${testReq2Id}/reopen`, tokenCitizenA, {
      reason: 'The new bulb still flickers continuously and turns off after 10 minutes.'
    });
    assert(citAReopen.status === 200, 'Citizen A reported issue and reopened request (200)');
    assert(
      citAReopen.body.request.status === 'IN_PROGRESS' || citAReopen.body.request.status === 'REOPENED',
      'Request transitioned back to IN_PROGRESS / REOPENED'
    );

    const dbReq2 = await Request.findById(testReq2Id);
    assert(dbReq2.verificationIssue?.reported === true, 'Database has verificationIssue.reported === true');
    assert(dbReq2.verificationIssue?.reason.includes('flickers continuously'), 'Database stored report issue reason');

    // 5. Feedback & Rating Submission & Validation
    console.log('\n[5/8] Testing Feedback & Rating Submission...');

    // Citizen B cannot submit feedback on Citizen A's request
    const citBFeedback = await request(baseUrl, 'POST', '/api/feedback', tokenCitizenB, {
      requestId: testReqAId,
      rating: 5,
      comment: 'Trying to rate someone elses ticket'
    });
    assert(citBFeedback.status === 403, 'Citizen B forbidden from submitting feedback for Citizen A request (403)');

    // Rating validation: out of bounds (0 or 6)
    const invalidRating0 = await request(baseUrl, 'POST', '/api/feedback', tokenCitizenA, {
      requestId: testReqAId,
      rating: 0,
      comment: 'Too low'
    });
    assert(invalidRating0.status === 400, 'Rating of 0 rejected (400)');

    const invalidRating6 = await request(baseUrl, 'POST', '/api/feedback', tokenCitizenA, {
      requestId: testReqAId,
      rating: 6,
      comment: 'Too high'
    });
    assert(invalidRating6.status === 400, 'Rating of 6 rejected (400)');

    // Rating validation: non-integer
    const nonIntRating = await request(baseUrl, 'POST', '/api/feedback', tokenCitizenA, {
      requestId: testReqAId,
      rating: 'five_stars',
      comment: 'Non-integer rating'
    });
    assert(nonIntRating.status === 400, 'Non-integer rating rejected (400)');

    // Citizen A submits valid 5-star feedback
    const submitFeedbackRes = await request(baseUrl, 'POST', '/api/feedback', tokenCitizenA, {
      requestId: testReqAId,
      rating: 5,
      comment: 'Outstanding repair quality! The road surface is perfectly leveled.'
    });
    assert(submitFeedbackRes.status === 201 && submitFeedbackRes.body.feedback, 'Citizen A submitted 5-star feedback successfully (201)');
    const createdFeedbackId = submitFeedbackRes.body.feedback._id;

    // Database verification for feedback
    const dbFeedback = await Feedback.findById(createdFeedbackId);
    assert(dbFeedback && dbFeedback.rating === 5, 'Feedback stored with rating 5 in MongoDB');
    assert(dbFeedback.comment.includes('Outstanding repair quality'), 'Feedback comment persisted accurately');
    assert(dbFeedback.citizen.toString() === citizenA._id.toString(), 'Feedback references valid citizen');
    assert(dbFeedback.request.toString() === testReqAId.toString(), 'Feedback references valid request');

    // Duplicate feedback prevention
    const duplicateFeedbackRes = await request(baseUrl, 'POST', '/api/feedback', tokenCitizenA, {
      requestId: testReqAId,
      rating: 4,
      comment: 'Trying to submit duplicate feedback'
    });
    assert(duplicateFeedbackRes.status === 400, 'Duplicate feedback submission prevented (400)');

    // 6. Feedback Read & Staff / Admin Visibility
    console.log('\n[6/8] Testing Feedback Queries, Staff Visibility, and Admin Analytics...');

    // Fetch feedback by request ID
    const getByReqRes = await request(baseUrl, 'GET', `/api/feedback/request/${testReqAId}`, tokenCitizenA);
    assert(getByReqRes.status === 200 && getByReqRes.body.feedback, 'GET feedback by request ID succeeded');
    assert(getByReqRes.body.feedback.rating === 5, 'Returned feedback rating matches');

    // Staff views their assigned feedback
    const staffFeedbacksRes = await request(baseUrl, 'GET', '/api/feedback/staff/my', tokenStaff);
    assert(staffFeedbacksRes.status === 200 && Array.isArray(staffFeedbacksRes.body.feedbacks), 'Staff retrieved their assigned feedback (200)');
    const staffFoundReview = staffFeedbacksRes.body.feedbacks.some(f => f._id.toString() === createdFeedbackId.toString());
    assert(staffFoundReview, 'Staff can see feedback on their completed task');

    // Staff cannot edit citizen feedback
    const staffEditRes = await request(baseUrl, 'PATCH', `/api/feedback/${createdFeedbackId}`, tokenStaff, {
      rating: 5,
      comment: 'Staff trying to edit'
    });
    assert(staffEditRes.status === 403, 'Staff forbidden from editing citizen feedback (403)');

    // Staff cannot delete citizen feedback
    const staffDeleteRes = await request(baseUrl, 'DELETE', `/api/feedback/${createdFeedbackId}`, tokenStaff);
    assert(staffDeleteRes.status === 403, 'Staff forbidden from deleting citizen feedback (403)');

    // Admin views all feedback & analytics
    const adminFeedbacksRes = await request(baseUrl, 'GET', '/api/feedback', tokenAdmin);
    assert(adminFeedbacksRes.status === 200, 'Admin retrieved all feedback and analytics (200)');
    assert(adminFeedbacksRes.body.stats?.total >= 1, 'Admin stats report total review count');
    assert(adminFeedbacksRes.body.stats?.ratingDistribution[5] >= 1, 'Admin stats report rating distribution');
    assert(adminFeedbacksRes.body.feedbacks.length > 0, 'Admin receives populated feedback array');

    // 7. Feedback Modification & Deletion by Owner
    console.log('\n[7/8] Testing Citizen Feedback Update and Delete...');

    // Citizen B cannot edit Citizen A's feedback
    const citBEditRes = await request(baseUrl, 'PATCH', `/api/feedback/${createdFeedbackId}`, tokenCitizenB, {
      rating: 1,
      comment: 'Malicious modification attempt'
    });
    assert(citBEditRes.status === 403, 'Citizen B forbidden from editing Citizen A feedback (403)');

    // Citizen A updates own feedback (4 stars, updated comment)
    const citAUpdateRes = await request(baseUrl, 'PATCH', `/api/feedback/${createdFeedbackId}`, tokenCitizenA, {
      rating: 4,
      comment: 'Updated review: Very good repair, though cleanup took an extra day.'
    });
    assert(citAUpdateRes.status === 200, 'Citizen A updated own feedback successfully (200)');
    assert(citAUpdateRes.body.feedback.rating === 4, 'Feedback rating updated to 4 stars');

    const updatedDbFeedback = await Feedback.findById(createdFeedbackId);
    assert(updatedDbFeedback.rating === 4, 'Database updated rating to 4');

    // Citizen A deletes own feedback
    const citADeleteRes = await request(baseUrl, 'DELETE', `/api/feedback/${createdFeedbackId}`, tokenCitizenA);
    assert(citADeleteRes.status === 200, 'Citizen A deleted own feedback successfully (200)');

    const deletedCheck = await Feedback.findById(createdFeedbackId);
    assert(deletedCheck === null, 'Feedback document removed from MongoDB');

    // 8. Notifications Verification
    console.log('\n[8/8] Verifying Automated Notification Delivery...');
    const staffNotifications = await Notification.find({ recipient: staff._id });
    assert(staffNotifications.length > 0, 'Staff received notifications for request activity');

    const verifyNotif = staffNotifications.find(n => n.message.includes('verified') || n.title.includes('Verified'));
    assert(Boolean(verifyNotif), 'Staff received notification when citizen verified request');

    const issueNotif = staffNotifications.find(n => n.message.includes('reported') || n.title.includes('Issue'));
    assert(Boolean(issueNotif), 'Staff received notification when citizen reported issue on request');

    console.log('\n===============================================================');
    console.log(`📊 PHASE 13 TEST RESULTS: ${passedChecks} PASSED, ${failedChecks} FAILED`);
    console.log('===============================================================');

    if (failedChecks > 0) {
      console.error('❌ Some Phase 13 tests failed!');
      process.exit(1);
    } else {
      console.log('🎉 ALL PHASE 13 AUTOMATED CHECKS PASSED PERFECTLY!');
    }
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.disconnect();
    console.log('[Test Server] Cleaned up and disconnected.');
  }
}

runPhase13Tests();
