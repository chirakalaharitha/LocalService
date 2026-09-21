const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const Department = require('../models/Department');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const Feedback = require('../models/Feedback');
const Request = require('../models/Request');

const cleanProductionData = async () => {
  try {
    await connectDB();
    console.log('[CleanData] Connected to MongoDB.');

    // 1. Configure the single real Admin account
    const realAdminEmail = 'harithachirakala@gmail.com';
    const adminUser = await User.findOne({ email: realAdminEmail });

    if (adminUser) {
      adminUser.role = 'ADMIN';
      adminUser.isVerified = true;
      adminUser.isActive = true;
      adminUser.verificationOtp = undefined;
      adminUser.verificationOtpExpires = undefined;
      adminUser.verificationOtpAttempts = 0;
      await adminUser.save({ validateBeforeSave: false });
      console.log(`[CleanData] Real Admin account verified: ${realAdminEmail} (Role: ADMIN, isVerified: true, isActive: true)`);
    } else {
      console.warn(`[CleanData] Warning: ${realAdminEmail} not found in database!`);
    }

    // 2. Remove dummy / test users
    const dummyFilter = {
      $or: [
        { email: { $in: [
          'admin@localfix.gov.in',
          'staff.water@localfix.gov.in',
          'staff.roads@localfix.gov.in',
          'staff.road@localfix.gov.in',
          'staff.inactive@localfix.gov.in',
          'citizen@localfix.org',
          'audit_staff_a@localfix.gov.in',
          'audit_staff_b@localfix.gov.in'
        ] } },
        { email: { $regex: /(@localfix\.test|citizen_e2e_|citizen_b_|hacker_|charlie_|testuser_|pwd_reset_user_|p20_alice_|staff_real_|citizen_real_|citizenb_phase6)/i } }
      ]
    };

    const deletedUsers = await User.deleteMany(dummyFilter);
    console.log(`[CleanData] Removed ${deletedUsers.deletedCount} dummy/test user accounts.`);

    // 3. Remove test departments
    const testDeptFilter = {
      $or: [
        { code: { $in: ['P13-ROADS', 'P14-CIVIC', 'P15-ENG'] } },
        { code: { $regex: /^ROADS_P20_/i } }
      ]
    };
    const deletedDepts = await Department.deleteMany(testDeptFilter);
    console.log(`[CleanData] Removed ${deletedDepts.deletedCount} test department records.`);

    // 4. Remove orphaned notifications, activity logs, and feedbacks referencing removed test accounts/requests
    const remainingUserIds = (await User.find().select('_id')).map(u => u._id);
    const remainingRequestIds = (await Request.find().select('_id')).map(r => r._id);

    const deletedNotifs = await Notification.deleteMany({
      $or: [
        { recipient: { $nin: remainingUserIds } },
        { request: { $nin: remainingRequestIds } }
      ]
    });
    console.log(`[CleanData] Removed ${deletedNotifs.deletedCount} orphaned test notifications.`);

    const deletedLogs = await ActivityLog.deleteMany({
      user: { $nin: remainingUserIds }
    });
    console.log(`[CleanData] Removed ${deletedLogs.deletedCount} orphaned test activity logs.`);

    const deletedFeedbacks = await Feedback.deleteMany({
      $or: [
        { citizen: { $nin: remainingUserIds } },
        { request: { $nin: remainingRequestIds } }
      ]
    });
    console.log(`[CleanData] Removed ${deletedFeedbacks.deletedCount} orphaned test feedback records.`);

    // 5. Output current database summary
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.find({ role: 'ADMIN' }).select('name email role');
    const staffCount = await User.countDocuments({ role: 'STAFF' });
    const citizenCount = await User.countDocuments({ role: 'CITIZEN' });
    const deptCount = await Department.countDocuments();

    console.log('--- DATABASE STATE AFTER CLEANUP ---');
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Admins (${adminUsers.length}):`, adminUsers);
    console.log(`Staff Count: ${staffCount} (must be 0 dummy staff)`);
    console.log(`Citizen Count: ${citizenCount}`);
    console.log(`Departments Count: ${deptCount}`);
    console.log('-----------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('[CleanData] Error cleaning production data:', error);
    process.exit(1);
  }
};

cleanProductionData();
