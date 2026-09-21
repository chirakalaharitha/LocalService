const express = require('express');
const router = express.Router();
const {
  registerUser,
  verifyEmailOtp,
  resendVerificationOtp,
  loginUser,
  getMe,
  updateProfile,
  getNotificationPreferences,
  updateNotificationPreferences,
  forgotPassword,
  verifyResetOtp,
  resetPassword
} = require('../controllers/authController');
const { authenticateUser } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

router.post('/register', authLimiter, registerUser);
router.post('/verify-email', authLimiter, verifyEmailOtp);
router.post('/verify-email-otp', authLimiter, verifyEmailOtp);
router.post('/resend-verification-otp', authLimiter, resendVerificationOtp);
router.post('/resend-email-otp', authLimiter, resendVerificationOtp);
router.post('/login', authLimiter, loginUser);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/verify-reset-otp', authLimiter, verifyResetOtp);
router.post('/reset-password', authLimiter, resetPassword);

router.get('/me', authenticateUser, getMe);
router.put('/profile', authenticateUser, updateProfile);
router.get('/notification-preferences', authenticateUser, getNotificationPreferences);
router.patch('/notification-preferences', authenticateUser, updateNotificationPreferences);
router.put('/notification-preferences', authenticateUser, updateNotificationPreferences);

module.exports = router;


