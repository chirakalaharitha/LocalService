const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  getDashboardStats,
  getUsers,
  createStaffUser,
  toggleUserStatus,
  assignStaff,
  updatePriority,
  getAnalyticsData,
  getActivityLogs,
  getRequestReports,
  getSummaryReports,
  getAdminMunicipality,
  updateAdminMunicipality
} = require('../controllers/adminController');

router.use(authenticateUser);
router.use(authorizeRoles('ADMIN'));

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.post('/users/staff', createStaffUser);
router.put('/users/:id/status', toggleUserStatus);
router.post('/requests/:id/assign', assignStaff);
router.put('/requests/:id/priority', updatePriority);
router.get('/analytics', getAnalyticsData);
router.get('/activity-logs', getActivityLogs);
router.get('/reports/requests', getRequestReports);
router.get('/reports/summary', getSummaryReports);
router.get('/municipality', getAdminMunicipality);
router.put('/municipality', updateAdminMunicipality);

module.exports = router;


