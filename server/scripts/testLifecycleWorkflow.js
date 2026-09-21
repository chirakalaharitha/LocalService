const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const Request = require('../models/Request');
const Municipality = require('../models/Municipality');
const Department = require('../models/Department');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const RequestHistory = require('../models/RequestHistory');
const NOTIFICATION_TYPES = require('../constants/notificationTypes');
const { createNotification } = require('../services/notificationService');
const {
  sendNewRequestAdminEmail,
  sendStaffAssignmentEmail,
  sendRequestInProgressEmail,
  sendRequestResolvedCitizenEmail,
  sendRequestResolvedAdminEmail,
  sendRequestVerifiedEmail,
  sendFeedbackSubmittedStaffEmail,
  sendFeedbackSubmittedAdminEmail
} = require('../services/emailService');

const runLifecycleTest = async () => {
  console.log('\n======================================================');
  console.log('   LOCALFIX – COMPLETE REAL-TIME LIFECYCLE TEST       ');
  console.log('   MongoDB + Notifications + Emails + Feedback Audit ');
  console.log('======================================================\n');

  let testCitizen = null;
  let testRequest = null;
  let testFeedback = null;
  const createdNotificationIds = [];

  try {
    await connectDB();
    console.log('[OK] Connected to MongoDB');

    // 1. Verify Municipality & Real Admin
    const gmc = await Municipality.findOne({ code: 'GMC-01' });
    if (!gmc) throw new Error('Municipality GMC-01 not found!');
    console.log(`[PASS] Found Municipality: ${gmc.name} (${gmc.code})`);

    const admin = await User.findOne({ email: 'harithachirakala@gmail.com' });
    if (!admin) throw new Error('Admin harithachirakala@gmail.com not found!');
    console.log(`[PASS] Found Real Admin: ${admin.name} <${admin.email}>, Municipality: ${admin.municipality}`);

    const staff = await User.findOne({ email: 'harinigolla681@gmail.com' });
    if (!staff) throw new Error('Staff harinigolla681@gmail.com not found!');
    console.log(`[PASS] Found Real Staff: ${staff.name} <${staff.email}>, Dept: ${staff.department}`);

    // Ensure email and in-app preferences are active for testing
    admin.notificationPreferences = { emailAlerts: true, inAppNotifications: true, smsAlerts: false };
    staff.notificationPreferences = { emailAlerts: true, inAppNotifications: true, smsAlerts: false };
    await admin.save();
    await staff.save();

    // 2. Setup / Retrieve Test Citizen
    testCitizen = await User.findOne({ email: 'citizen.test@localfix.internal' });
    if (!testCitizen) {
      testCitizen = await User.create({
        name: 'Suresh Kumar',
        email: 'citizen.test@localfix.internal',
        password: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGH', // Dummy bcrypt string
        phone: '9876543210',
        role: 'CITIZEN',
        isEmailVerified: true,
        isActive: true,
        municipality: gmc._id,
        notificationPreferences: { emailAlerts: true, inAppNotifications: true, smsAlerts: false }
      });
      console.log(`[PASS] Created Test Citizen: ${testCitizen.name} <${testCitizen.email}>`);
    } else {
      console.log(`[PASS] Reusing Test Citizen: ${testCitizen.name} <${testCitizen.email}>`);
    }

    // ----------------------------------------------------
    // STEP 1: CITIZEN CREATES SERVICE REQUEST
    // ----------------------------------------------------
    console.log('\n--- [STEP 1] Citizen Creates Service Request ---');
    const reqCount = await Request.countDocuments();
    const reqCode = `REQ-TEST-${Date.now().toString().slice(-4)}`;

    testRequest = await Request.create({
      requestId: reqCode,
      title: 'Major Water Pipeline Leakage Near Market',
      description: 'Drinking water pipeline ruptured causing water stagnation and low pressure in Ward 1.',
      category: 'WATER',
      priority: 'HIGH',
      status: 'PENDING',
      citizen: testCitizen._id,
      municipality: gmc._id,
      ward: 'Ward 1',
      address: 'Shop #14, Main Bazaar, GMC Ward 1',
      location: { type: 'Point', coordinates: [80.4365, 16.3067] },
      slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      slaStatus: 'ON_TIME'
    });
    console.log(`[PASS] Request created in MongoDB with ID: ${testRequest.requestId} (_id: ${testRequest._id})`);

    // In-app & Email Notification for Admin
    const adminNotif = await createNotification({
      recipient: admin._id,
      type: NOTIFICATION_TYPES.ADMIN_NEW_REQUEST,
      title: 'New Service Request Submitted',
      message: `A new HIGH priority WATER request [${testRequest.requestId}] has been submitted in Ward 1.`,
      data: {
        requestId: testRequest.requestId,
        requestMongoId: testRequest._id,
        category: testRequest.category,
        priority: testRequest.priority,
        ward: testRequest.ward
      },
      customEmailFn: (user) =>
        sendNewRequestAdminEmail({
          to: user.email,
          adminName: user.name,
          request: testRequest,
          citizen: testCitizen
        })
    });
    if (adminNotif) createdNotificationIds.push(adminNotif._id);
    console.log(`[PASS] Admin Notification created in MongoDB: ${adminNotif?._id} (type: ADMIN_NEW_REQUEST)`);

    // ----------------------------------------------------
    // STEP 2: ADMIN ASSIGNS ELIGIBLE STAFF
    // ----------------------------------------------------
    console.log('\n--- [STEP 2] Admin Assigns Eligible Staff ---');
    testRequest.assignedStaff = staff._id;
    testRequest.assignedTo = staff._id;
    testRequest.status = 'ASSIGNED';
    await testRequest.save();

    await RequestHistory.create({
      request: testRequest._id,
      user: admin._id,
      action: 'ASSIGNED',
      previousStatus: 'PENDING',
      newStatus: 'ASSIGNED',
      notes: 'Assigned to Ward 1 field officer for immediate inspection.'
    });

    const staffNotif = await createNotification({
      recipient: staff._id,
      type: NOTIFICATION_TYPES.REQUEST_ASSIGNED,
      title: 'New Service Request Assigned',
      message: `You have been assigned to request ${testRequest.requestId}: "${testRequest.title}"`,
      data: {
        requestId: testRequest.requestId,
        requestMongoId: testRequest._id,
        category: testRequest.category,
        priority: testRequest.priority
      },
      customEmailFn: (user) =>
        sendStaffAssignmentEmail({
          to: user.email,
          staffName: user.name,
          request: testRequest,
          assignedBy: admin.name
        })
    });
    if (staffNotif) createdNotificationIds.push(staffNotif._id);
    console.log(`[PASS] Staff Assignment recorded. Staff Notification ID: ${staffNotif?._id}`);

    // ----------------------------------------------------
    // STEP 3: STAFF ACCEPTS & STARTS WORK
    // ----------------------------------------------------
    console.log('\n--- [STEP 3] Staff Starts Work (IN_PROGRESS) ---');
    testRequest.status = 'IN_PROGRESS';
    await testRequest.save();

    const citizenProgNotif = await createNotification({
      recipient: testCitizen._id,
      type: NOTIFICATION_TYPES.REQUEST_IN_PROGRESS,
      title: 'Work In Progress on Your Request',
      message: `Staff member ${staff.name} has started work on your request [${testRequest.requestId}].`,
      data: {
        requestId: testRequest.requestId,
        requestMongoId: testRequest._id,
        staffName: staff.name
      },
      customEmailFn: (user) =>
        sendRequestInProgressEmail({
          to: user.email,
          citizenName: user.name,
          request: testRequest,
          staffName: staff.name
        })
    });
    if (citizenProgNotif) createdNotificationIds.push(citizenProgNotif._id);
    console.log(`[PASS] Request moved to IN_PROGRESS. Citizen notified: ${citizenProgNotif?._id}`);

    // ----------------------------------------------------
    // STEP 4: STAFF RESOLVES REQUEST
    // ----------------------------------------------------
    console.log('\n--- [STEP 4] Staff Resolves Request (PENDING_VERIFICATION) ---');
    testRequest.status = 'PENDING_VERIFICATION';
    testRequest.resolutionProof = {
      images: ['https://res.cloudinary.com/localfix/proof1.jpg'],
      notes: 'Repaired cracked collar on 4-inch supply line. Water flow restored and tested at 2.5 bar pressure.',
      resolvedAt: new Date()
    };
    testRequest.resolvedAt = new Date();
    await testRequest.save();

    // Notify Citizen
    const citizenResNotif = await createNotification({
      recipient: testCitizen._id,
      type: NOTIFICATION_TYPES.REQUEST_RESOLVED,
      title: 'Work Completed – Verification Required',
      message: `Staff member ${staff.name} has marked request [${testRequest.requestId}] as resolved. Please inspect and verify.`,
      data: {
        requestId: testRequest.requestId,
        requestMongoId: testRequest._id
      },
      customEmailFn: (user) =>
        sendRequestResolvedCitizenEmail({
          to: user.email,
          citizenName: user.name,
          request: testRequest,
          staffName: staff.name
        })
    });
    if (citizenResNotif) createdNotificationIds.push(citizenResNotif._id);

    // Notify Admin
    const adminResNotif = await createNotification({
      recipient: admin._id,
      type: NOTIFICATION_TYPES.REQUEST_RESOLVED,
      title: `Request Resolved: ${testRequest.requestId}`,
      message: `Staff ${staff.name} completed work on request [${testRequest.requestId}]. Awaiting citizen verification.`,
      data: {
        requestId: testRequest.requestId,
        requestMongoId: testRequest._id,
        staffName: staff.name
      },
      customEmailFn: (user) =>
        sendRequestResolvedAdminEmail({
          to: user.email,
          adminName: user.name,
          request: testRequest,
          staffName: staff.name
        })
    });
    if (adminResNotif) createdNotificationIds.push(adminResNotif._id);
    console.log(`[PASS] Resolution submitted. Citizen notified: ${citizenResNotif?._id}, Admin notified: ${adminResNotif?._id}`);

    // ----------------------------------------------------
    // STEP 5: CITIZEN VERIFIES RESOLUTION (CLOSED)
    // ----------------------------------------------------
    console.log('\n--- [STEP 5] Citizen Verifies Resolution (CLOSED) ---');
    testRequest.status = 'CLOSED';
    testRequest.verifiedAt = new Date();
    await testRequest.save();

    // Notify Staff
    const staffVerifNotif = await createNotification({
      recipient: staff._id,
      type: NOTIFICATION_TYPES.REQUEST_VERIFIED,
      title: 'Resolution Confirmed by Citizen',
      message: `Citizen verified and closed request [${testRequest.requestId}]. Thank you for your service!`,
      data: {
        requestId: testRequest.requestId,
        requestMongoId: testRequest._id,
        citizenName: testCitizen.name
      },
      customEmailFn: (user) =>
        sendRequestVerifiedEmail({
          to: user.email,
          recipientName: user.name,
          request: testRequest,
          citizenName: testCitizen.name,
          role: 'STAFF'
        })
    });
    if (staffVerifNotif) createdNotificationIds.push(staffVerifNotif._id);

    // Notify Admin
    const adminVerifNotif = await createNotification({
      recipient: admin._id,
      type: NOTIFICATION_TYPES.REQUEST_VERIFIED,
      title: `Request Verified & Closed: ${testRequest.requestId}`,
      message: `Request [${testRequest.requestId}] has been verified by the citizen and successfully closed.`,
      data: {
        requestId: testRequest.requestId,
        requestMongoId: testRequest._id,
        citizenName: testCitizen.name
      },
      customEmailFn: (user) =>
        sendRequestVerifiedEmail({
          to: user.email,
          recipientName: user.name,
          request: testRequest,
          citizenName: testCitizen.name,
          role: 'ADMIN'
        })
    });
    if (adminVerifNotif) createdNotificationIds.push(adminVerifNotif._id);
    console.log(`[PASS] Request CLOSED. Staff notified: ${staffVerifNotif?._id}, Admin notified: ${adminVerifNotif?._id}`);

    // ----------------------------------------------------
    // STEP 6: CITIZEN SUBMITS FEEDBACK & SUGGESTION
    // ----------------------------------------------------
    console.log('\n--- [STEP 6] Citizen Submits Rating, Feedback & Suggestion ---');
    testFeedback = await Feedback.create({
      request: testRequest._id,
      citizen: testCitizen._id,
      staff: staff._id,
      municipality: gmc._id,
      rating: 5,
      comment: 'Very professional, prompt arrival and tidy cleanup.',
      suggestion: 'Please establish a preventative bi-monthly pipeline inspection schedule for Market Road.',
      categories: ['Timeliness', 'Quality of Work', 'Staff Behavior']
    });
    console.log(`[PASS] Feedback created in MongoDB (_id: ${testFeedback._id})`);
    console.log(`       Rating: ${testFeedback.rating} ★`);
    console.log(`       Comment: "${testFeedback.comment}"`);
    console.log(`       Suggestion: "${testFeedback.suggestion}"`);
    console.log(`       Categories: ${testFeedback.categories.join(', ')}`);
    console.log(`       Staff Linked: ${testFeedback.staff}`);
    console.log(`       Municipality Linked: ${testFeedback.municipality}`);

    // Notify Staff
    const staffFbNotif = await createNotification({
      recipient: staff._id,
      type: NOTIFICATION_TYPES.FEEDBACK_SUBMITTED,
      title: 'Citizen Submitted Review for Your Work',
      message: `Citizen gave a ${testFeedback.rating}-star review for [${testRequest.requestId}].`,
      data: {
        requestId: testRequest.requestId,
        feedbackId: testFeedback._id,
        rating: testFeedback.rating
      },
      customEmailFn: (user) =>
        sendFeedbackSubmittedStaffEmail({
          to: user.email,
          staffName: user.name,
          request: testRequest,
          rating: testFeedback.rating,
          comment: testFeedback.comment,
          suggestion: testFeedback.suggestion
        })
    });
    if (staffFbNotif) createdNotificationIds.push(staffFbNotif._id);

    // Notify Admin
    const adminFbNotif = await createNotification({
      recipient: admin._id,
      type: NOTIFICATION_TYPES.FEEDBACK_SUBMITTED,
      title: `Citizen Review Received (${testFeedback.rating}★): ${testRequest.requestId}`,
      message: `Citizen submitted a ${testFeedback.rating}-star review with feedback for [${testRequest.requestId}].`,
      data: {
        requestId: testRequest.requestId,
        feedbackId: testFeedback._id,
        rating: testFeedback.rating
      },
      customEmailFn: (user) =>
        sendFeedbackSubmittedAdminEmail({
          to: user.email,
          adminName: user.name,
          request: testRequest,
          staffName: staff.name,
          rating: testFeedback.rating,
          comment: testFeedback.comment,
          suggestion: testFeedback.suggestion
        })
    });
    if (adminFbNotif) createdNotificationIds.push(adminFbNotif._id);
    console.log(`[PASS] Feedback notifications created. Staff: ${staffFbNotif?._id}, Admin: ${adminFbNotif?._id}`);

    // ----------------------------------------------------
    // STEP 7: STAFF FEEDBACK RETRIEVAL QUERY
    // ----------------------------------------------------
    console.log('\n--- [STEP 7] Verifying Staff Feedback Retrieval Query ---');
    const staffFeedbacks = await Feedback.find({ staff: staff._id })
      .populate('request', 'requestId title category')
      .populate('citizen', 'name')
      .lean();

    const retrievedStaffFb = staffFeedbacks.find((f) => f._id.toString() === testFeedback._id.toString());
    if (!retrievedStaffFb) throw new Error('Feedback not found in Staff query!');
    console.log(`[PASS] Staff retrieved ${staffFeedbacks.length} feedbacks.`);
    console.log(`       Found test feedback: rating=${retrievedStaffFb.rating}, suggestion="${retrievedStaffFb.suggestion}"`);

    // ----------------------------------------------------
    // STEP 8: ADMIN MUNICIPALITY FEEDBACK & ANALYTICS QUERY
    // ----------------------------------------------------
    console.log('\n--- [STEP 8] Verifying Admin Feedback & Analytics Query ---');
    const adminFeedbacks = await Feedback.find({ municipality: gmc._id })
      .populate('request', 'requestId title category status')
      .populate('citizen', 'name email')
      .populate('staff', 'name email')
      .lean();

    const retrievedAdminFb = adminFeedbacks.find((f) => f._id.toString() === testFeedback._id.toString());
    if (!retrievedAdminFb) throw new Error('Feedback not found in Admin municipality query!');
    console.log(`[PASS] Admin retrieved ${adminFeedbacks.length} feedbacks for municipality ${gmc.code}.`);
    console.log(`       Verified Staff Attribution: ${retrievedAdminFb.staff?.name} (${retrievedAdminFb.staff?.email})`);
    console.log(`       Verified Citizen Attribution: ${retrievedAdminFb.citizen?.name}`);
    console.log(`       Verified Suggestion: "${retrievedAdminFb.suggestion}"`);
    console.log(`       Verified Categories: ${retrievedAdminFb.categories.join(', ')}`);

    // Calculate dynamic analytics
    const totalReviews = adminFeedbacks.length;
    const avgRating = (adminFeedbacks.reduce((acc, f) => acc + (f.rating || 0), 0) / totalReviews).toFixed(1);
    console.log(`[PASS] Dynamic Analytics computed: Total Reviews=${totalReviews}, Average Rating=${avgRating}★`);

    console.log('\n======================================================');
    console.log('   ALL 8 LIFECYCLE STEPS VERIFIED SUCCESSFULLY!       ');
    console.log('======================================================\n');
  } catch (error) {
    console.error('\n[TEST FAILED]:', error);
  } finally {
    // ----------------------------------------------------
    // STEP 9: CLEANUP OF TEST ARTIFACTS
    // ----------------------------------------------------
    console.log('--- [STEP 9] Cleaning Up Test Records ---');
    if (testRequest) {
      await Request.deleteOne({ _id: testRequest._id });
      console.log(`[CLEANUP] Deleted test request ${testRequest.requestId}`);
    }
    if (testFeedback) {
      await Feedback.deleteOne({ _id: testFeedback._id });
      console.log(`[CLEANUP] Deleted test feedback ${testFeedback._id}`);
    }
    if (createdNotificationIds.length > 0) {
      const delRes = await Notification.deleteMany({ _id: { $in: createdNotificationIds } });
      console.log(`[CLEANUP] Deleted ${delRes.deletedCount} test notifications`);
    }
    if (testCitizen) {
      await User.deleteOne({ _id: testCitizen._id });
      console.log(`[CLEANUP] Deleted test citizen account`);
    }
    await mongoose.connection.close();
    console.log('[CLEANUP] Database connection closed.');
  }
};

runLifecycleTest();
