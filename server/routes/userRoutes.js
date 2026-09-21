const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authMiddleware');
const {
  getNotificationPreferences,
  updateNotificationPreferences
} = require('../controllers/authController');

// All user routes require JWT authentication
router.use(authenticateUser);

// Notification preferences endpoints
router.get('/me/notification-preferences', getNotificationPreferences);
router.patch('/me/notification-preferences', updateNotificationPreferences);
router.put('/me/notification-preferences', updateNotificationPreferences);

module.exports = router;
