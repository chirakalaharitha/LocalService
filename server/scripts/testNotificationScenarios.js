const mongoose = require('mongoose');
require('dotenv').config();

const Notification = require('../models/Notification');
const User = require('../models/User');

async function runTests() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/localfix';
  console.log('Connecting to MongoDB at:', uri);
  await mongoose.connect(uri);
  console.log('MongoDB connected successfully.\n');

  try {
    // 1. Get or create two test users for isolation testing
    let userA = await User.findOne({ email: 'test.userA@localfix.test' });
    if (!userA) {
      userA = await User.create({
        name: 'Test Citizen A',
        email: 'test.userA@localfix.test',
        password: 'password123',
        phone: '9876543210',
        role: 'CITIZEN'
      });
    }

    let userB = await User.findOne({ email: 'test.userB@localfix.test' });
    if (!userB) {
      userB = await User.create({
        name: 'Test Citizen B',
        email: 'test.userB@localfix.test',
        password: 'password123',
        phone: '9876543211',
        role: 'CITIZEN'
      });
    }

    console.log(`[PASS] Test users verified: UserA (${userA._id}), UserB (${userB._id})`);

    // Clean any prior test notifications for these test users
    await Notification.deleteMany({
      $or: [
        { recipient: { $in: [userA._id, userB._id] } },
        { user: { $in: [userA._id, userB._id] } }
      ]
    });

    // TEST 5 & 6: Create unread notifications for User A and User B
    const notifA1 = await Notification.create({
      recipient: userA._id,
      user: userA._id,
      type: 'STATUS_UPDATE',
      title: 'Road repair in progress',
      message: 'Staff has arrived at the location.',
      isRead: false
    });

    const notifA2 = await Notification.create({
      recipient: userA._id,
      user: userA._id,
      type: 'COMMENT',
      title: 'Staff note added',
      message: 'Repair work started.',
      isRead: false
    });

    const notifB1 = await Notification.create({
      recipient: userB._id,
      user: userB._id,
      type: 'STATUS_UPDATE',
      title: 'Water leak investigated',
      message: 'Pipeline inspection scheduled.',
      isRead: false
    });

    // Check unread count before Mark All as Read
    const unreadCountA_before = await Notification.countDocuments({
      $or: [{ recipient: userA._id }, { user: userA._id }],
      isRead: false
    });
    console.log(`User A unread before Mark All as Read: ${unreadCountA_before} (Expected: 2)`);
    if (unreadCountA_before !== 2) throw new Error('User A unread count should be 2');

    const unreadCountB_before = await Notification.countDocuments({
      $or: [{ recipient: userB._id }, { user: userB._id }],
      isRead: false
    });
    console.log(`User B unread before: ${unreadCountB_before} (Expected: 1)`);
    if (unreadCountB_before !== 1) throw new Error('User B unread count should be 1');

    // TEST: Mark All As Read for User A only
    const updateResult = await Notification.updateMany(
      {
        $or: [{ recipient: userA._id }, { user: userA._id }],
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );
    console.log(`[PASS] Mark all as read updated: ${updateResult.modifiedCount} notifications for User A`);
    if (updateResult.modifiedCount !== 2) throw new Error('Expected 2 notifications marked read');

    // TEST 6: Unread count for User A becomes 0
    const unreadCountA_after = await Notification.countDocuments({
      $or: [{ recipient: userA._id }, { user: userA._id }],
      isRead: false
    });
    console.log(`[PASS] User A unread count after Mark All as Read: ${unreadCountA_after} (Expected: 0)`);
    if (unreadCountA_after !== 0) throw new Error('User A unread count should be 0');

    // Verify User B's notifications are NOT affected (User Isolation check)
    const unreadCountB_after = await Notification.countDocuments({
      $or: [{ recipient: userB._id }, { user: userB._id }],
      isRead: false
    });
    console.log(`[PASS] User B unread count untouched: ${unreadCountB_after} (Expected: 1)`);
    if (unreadCountB_after !== 1) throw new Error('User B notifications should remain unchanged');

    // TEST 7: Create a new unread notification for User A -> unread count increases to 1
    const notifA3 = await Notification.create({
      recipient: userA._id,
      user: userA._id,
      type: 'VERIFICATION_REQUIRED',
      title: 'Please verify completion',
      message: 'Staff marked request as resolved. Please verify.',
      isRead: false
    });

    const unreadCountA_new = await Notification.countDocuments({
      $or: [{ recipient: userA._id }, { user: userA._id }],
      isRead: false
    });
    console.log(`[PASS] User A unread count after new notification: ${unreadCountA_new} (Expected: 1)`);
    if (unreadCountA_new !== 1) throw new Error('User A unread count should now be 1');

    // TEST 8: Delete single notification (notifA1)
    const delResult = await Notification.deleteOne({
      _id: notifA1._id,
      $or: [{ recipient: userA._id }, { user: userA._id }]
    });
    console.log(`[PASS] Delete single notification deleted: ${delResult.deletedCount}`);
    if (delResult.deletedCount !== 1) throw new Error('Single delete failed');

    const checkDeleted = await Notification.findById(notifA1._id);
    if (checkDeleted) throw new Error('Deleted notification still found');

    const countA_afterSingleDel = await Notification.countDocuments({
      $or: [{ recipient: userA._id }, { user: userA._id }]
    });
    console.log(`[PASS] Total notifications for User A remaining: ${countA_afterSingleDel} (Expected: 2: notifA2 & notifA3)`);
    if (countA_afterSingleDel !== 2) throw new Error('User A should have 2 notifications remaining');

    // TEST 9: Clear all notifications for User A only
    const clearResult = await Notification.deleteMany({
      $or: [{ recipient: userA._id }, { user: userA._id }]
    });
    console.log(`[PASS] Clear All deleted: ${clearResult.deletedCount} notifications for User A`);
    if (clearResult.deletedCount !== 2) throw new Error('Clear all should delete exactly 2 notifications');

    const countA_afterClear = await Notification.countDocuments({
      $or: [{ recipient: userA._id }, { user: userA._id }]
    });
    console.log(`[PASS] Total notifications for User A after Clear All: ${countA_afterClear} (Expected: 0)`);
    if (countA_afterClear !== 0) throw new Error('User A should have 0 notifications left');

    // Verify User B's notification is STILL intact after User A's Clear All!
    const checkUserB_notif = await Notification.findById(notifB1._id);
    if (!checkUserB_notif) throw new Error("User B's notification was mistakenly deleted!");
    console.log(`[PASS] User B notification is intact (Isolation preserved): ${checkUserB_notif.title}`);

    // Clean up test users and remaining test notification
    await Notification.deleteMany({
      $or: [
        { recipient: { $in: [userA._id, userB._id] } },
        { user: { $in: [userA._id, userB._id] } }
      ]
    });
    await User.deleteMany({ _id: { $in: [userA._id, userB._id] } });
    console.log('[PASS] Test cleanup completed successfully.');

    console.log('\n=== ALL NOTIFICATION TEST SCENARIOS PASSED WITH 100% SUCCESS ===');
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
