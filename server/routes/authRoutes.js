const express = require('express');
const router = express.Router();
const {
  registerUser,
  verifyEmailOtp,
  resendVerificationOtp,
  loginUser,
  getMe,
  updateProfile,
  changePassword,
  uploadProfileImage,
  removeProfileImage,
  getNotificationPreferences,
  updateNotificationPreferences,
  deleteAccount,
  forgotPassword,
  verifyResetOtp,
  resetPassword
} = require('../controllers/authController');
const { authenticateUser } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Flexible single-file helper middleware
const handleSingleImage = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) return next(err);
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

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
router.patch('/change-password', authenticateUser, changePassword);
router.put('/change-password', authenticateUser, changePassword);
router.post('/profile-image', authenticateUser, handleSingleImage, uploadProfileImage);
router.delete('/profile-image', authenticateUser, removeProfileImage);
router.delete('/account', authenticateUser, deleteAccount);

router.get('/notification-preferences', authenticateUser, getNotificationPreferences);
router.patch('/notification-preferences', authenticateUser, updateNotificationPreferences);
router.put('/notification-preferences', authenticateUser, updateNotificationPreferences);

module.exports = router;
