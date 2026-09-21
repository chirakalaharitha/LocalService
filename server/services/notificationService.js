const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitToUser } = require('./socketService');
const { sendNotificationEmail } = require('./emailService');

/**
 * Centralized Notification Service for LocalFix
 * Implements the Database-First execution flow:
 * 1. Validate recipient
 * 2. Save Notification in MongoDB
 * 3. Emit real-time Socket.IO event to private user room
 * 4. Check user notification preferences
 * 5. Send transactional email safely (never failing business operation)
 */
const createNotification = async ({
  recipient,
  type,
  title,
  message,
  request = null,
  actor = null,
  customEmailFn = null
}) => {
  try {
    if (!recipient) {
      console.warn('[NotificationService] Skipped: No recipient specified.');
      return null;
    }

    const recipientId = recipient._id ? recipient._id.toString() : recipient.toString();

    // 1. Fetch recipient user details to check notification preferences & email
    let user = null;
    if (recipient._id && recipient.email && recipient.notificationPreferences !== undefined) {
      user = recipient;
    } else {
      user = await User.findById(recipientId).select('name email notificationPreferences');
    }

    if (!user) {
      console.warn(`[NotificationService] Recipient user not found: ${recipientId}`);
      return null;
    }

    // Resolve request reference ID
    const requestId = request?._id ? request._id : request;
    const actorId = actor?._id ? actor._id : actor;

    // Check user preferences
    const inAppEnabled = user.notificationPreferences?.inAppNotifications !== false &&
      user.notificationPreferences?.push !== false;
    const emailEnabled = user.notificationPreferences?.emailAlerts !== false &&
      user.notificationPreferences?.email !== false;

    let notification = null;

    // 2. Database-First: Save notification document in MongoDB if in-app notifications are enabled
    if (inAppEnabled) {
      notification = await Notification.create({
        recipient: recipientId,
        user: recipientId, // Backward compatibility
        type,
        title,
        message,
        request: requestId || null,
        actor: actorId || null,
        isRead: false,
        readAt: null,
        emailSent: false,
        emailSentAt: null
      });

      const safeNotification = {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        request: notification.request,
        actor: notification.actor,
        isRead: notification.isRead,
        createdAt: notification.createdAt
      };

      // Standard event format per Phase 10 specification
      emitToUser(recipientId, 'notification:new', {
        notification: safeNotification
      });

      // Backward-compatible alias for existing components
      emitToUser(recipientId, 'newNotification', safeNotification);
    }

    // 3. Send Email if preference enabled
    if (emailEnabled && user.email) {
      try {
        let emailResult = null;
        if (typeof customEmailFn === 'function') {
          emailResult = await customEmailFn(user);
        } else {
          emailResult = await sendNotificationEmail({
            to: user.email,
            recipientName: user.name,
            type,
            title,
            message,
            request
          });
        }

        if (emailResult && emailResult.success && notification) {
          notification.emailSent = true;
          notification.emailSentAt = new Date();
          await notification.save();
        }
      } catch (emailErr) {
        // Safe error logging - never fails the primary business operation
        console.error(`[NotificationService] Email delivery failed safely: ${emailErr.message}`);
      }
    }

    return notification;
  } catch (error) {
    console.error(`[NotificationService] Error creating notification: ${error.message}`);
    return null;
  }
};

module.exports = {
  createNotification
};
