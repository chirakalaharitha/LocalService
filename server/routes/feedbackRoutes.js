const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { feedbackLimiter } = require('../middleware/rateLimitMiddleware');
const {
  submitFeedback,
  getFeedbackByRequest,
  updateFeedback,
  deleteFeedback,
  getFeedbacks,
  getStaffFeedbacks
} = require('../controllers/feedbackController');

router.post('/', authenticateUser, feedbackLimiter, submitFeedback);
router.get('/', authenticateUser, authorizeRoles('ADMIN'), getFeedbacks);
router.get('/staff/my', authenticateUser, authorizeRoles('STAFF', 'ADMIN'), getStaffFeedbacks);
router.get('/request/:requestId', authenticateUser, getFeedbackByRequest);
router.route('/:id')
  .patch(authenticateUser, feedbackLimiter, updateFeedback)
  .put(authenticateUser, feedbackLimiter, updateFeedback)
  .delete(authenticateUser, deleteFeedback);

module.exports = router;

