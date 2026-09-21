const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  getSettings,
  updateSettings,
  getPublicSettings
} = require('../controllers/settingsController');

// Public settings route
router.get('/public', getPublicSettings);

// Admin-only settings management
router.get('/', authenticateUser, authorizeRoles('ADMIN'), getSettings);
router.put('/', authenticateUser, authorizeRoles('ADMIN'), updateSettings);

module.exports = router;
