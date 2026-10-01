const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  getDashboardStats,
  getUsers,
  createStaffUser,
  updateStaffUser,
  toggleUserStatus,
  assignStaff,
  updatePriority,
  getAnalyticsData,
  getActivityLogs,
  getRequestReports,
  getSummaryReports,
  getAdminMunicipality,
  updateAdminMunicipality,
  getAdminMunicipalities,
  createMunicipality,
  updateMunicipalityById,
  toggleMunicipalityStatus,
  transferRequest,
  getTransfers
} = require('../controllers/adminController');
const { getRequests } = require('../controllers/requestController');

router.use(authenticateUser);
router.use(authorizeRoles('ADMIN'));

router.get('/dashboard', getDashboardStats);
router.get('/requests', getRequests);
router.get('/users', getUsers);
router.post('/users/staff', createStaffUser);
router.put('/users/:id', updateStaffUser);
router.patch('/users/:id', updateStaffUser);
router.put('/users/:id/status', toggleUserStatus);
router.post('/requests/:id/assign', assignStaff);
router.put('/requests/:id/priority', updatePriority);
router.post('/requests/:id/transfer', transferRequest);
router.post('/requests/:id/transfer-jurisdiction', transferRequest);
router.get('/transfers', getTransfers);
router.get('/analytics', getAnalyticsData);
router.get('/activity-logs', getActivityLogs);
router.get('/reports/requests', getRequestReports);
router.get('/reports/summary', getSummaryReports);

// Municipality jurisdiction & master data
router.get('/municipality', getAdminMunicipality);
router.put('/municipality', updateAdminMunicipality);
router.get('/municipalities', getAdminMunicipalities);
router.post('/municipalities', createMunicipality);
router.put('/municipalities/:id', updateMunicipalityById);
router.delete('/municipalities/:id', toggleMunicipalityStatus);

module.exports = router;
