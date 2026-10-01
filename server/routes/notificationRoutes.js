const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authMiddleware');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications
} = require('../controllers/notificationController');

// All notification endpoints require JWT authentication
router.use(authenticateUser);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);

// Support both PATCH and PUT for marking notifications
router.patch('/read-all', markAllAsRead);
router.put('/read-all', markAllAsRead);

router.patch('/:id/read', markAsRead);
router.put('/:id/read', markAsRead);

// Delete endpoints (single notification and clear all)
router.delete('/clear-all', clearAllNotifications);
router.delete('/', clearAllNotifications);
router.delete('/:id', deleteNotification);

module.exports = router;
