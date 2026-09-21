const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { authenticateUser } = require('../middleware/authMiddleware');
const {
  createRequest,
  getMyRequests,
  checkDuplicate,
  getRequests,
  getPublicIssues,
  getNearbyRequests,
  getRequestById,
  toggleUpvote,
  verifyResolution,
  reopenRequest
} = require('../controllers/requestController');
const { addComment } = require('../controllers/commentController');

router.get('/public', getPublicIssues);
router.get('/nearby', authenticateUser, getNearbyRequests);
router.get('/my', authenticateUser, getMyRequests);
router.post('/check-duplicate', authenticateUser, checkDuplicate);

router.route('/')
  .post(authenticateUser, upload.array('images', 5), createRequest)
  .get(authenticateUser, getRequests);

router.get('/:id', authenticateUser, getRequestById);
router.post('/:id/upvote', authenticateUser, toggleUpvote);
router.route('/:id/verify')
  .post(authenticateUser, verifyResolution)
  .patch(authenticateUser, verifyResolution);
router.route('/:id/reopen')
  .post(authenticateUser, reopenRequest)
  .patch(authenticateUser, reopenRequest);
router.post('/:id/report-issue', authenticateUser, reopenRequest);
router.post('/:id/comments', authenticateUser, upload.array('attachments', 3), addComment);

module.exports = router;

