const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { authenticateUser } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  getAssignedRequests,
  getStaffRequestDetails,
  updateRequestStatus,
  addWorkNote,
  acceptRequest,
  rejectRequest,
  startWork,
  submitResolution
} = require('../controllers/staffController');

// All staff routes require authentication and STAFF or ADMIN role
router.use(authenticateUser);
router.use(authorizeRoles('STAFF', 'ADMIN'));

// List assigned requests with filtering and summary metrics
router.get('/requests', getAssignedRequests);

// Get single assigned request details
router.get('/requests/:id', getStaffRequestDetails);

// Status transition endpoint
router.patch('/requests/:id/status', updateRequestStatus);

// Add work / inspection notes
router.post('/requests/:id/notes', addWorkNote);

// Submit resolution with proof
router.patch('/requests/:id/resolve', upload.single('afterImage'), submitResolution);
router.post('/requests/:id/resolve', upload.single('afterImage'), submitResolution);

// Backwards-compatible action endpoints
router.post('/requests/:id/accept', acceptRequest);
router.post('/requests/:id/reject', rejectRequest);
router.post('/requests/:id/start', upload.single('beforeImage'), startWork);

module.exports = router;
