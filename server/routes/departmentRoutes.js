const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  getDepartments,
  getAdminDepartments,
  createDepartment,
  updateDepartment,
  toggleDepartmentStatus,
  deleteDepartment,
  getDepartmentStaff,
  assignStaffToDepartment,
  removeStaffFromDepartment
} = require('../controllers/departmentController');

// Public route: active departments
router.get('/', getDepartments);

// Admin-only management routes
router.get('/admin', authenticateUser, authorizeRoles('ADMIN'), getAdminDepartments);
router.post('/', authenticateUser, authorizeRoles('ADMIN'), createDepartment);
router.put('/:id', authenticateUser, authorizeRoles('ADMIN'), updateDepartment);
router.put('/:id/status', authenticateUser, authorizeRoles('ADMIN'), toggleDepartmentStatus);
router.delete('/:id', authenticateUser, authorizeRoles('ADMIN'), deleteDepartment);

// Department staff assignment routes
router.get('/:id/staff', authenticateUser, authorizeRoles('ADMIN'), getDepartmentStaff);
router.post('/:id/staff', authenticateUser, authorizeRoles('ADMIN'), assignStaffToDepartment);
router.delete('/:id/staff/:staffId', authenticateUser, authorizeRoles('ADMIN'), removeStaffFromDepartment);

module.exports = router;


