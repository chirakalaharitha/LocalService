const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Department = require('../models/Department');
const { generateToken } = require('../config/jwt');
const { sendPasswordResetOtpEmail, sendEmailVerificationOtp } = require('../services/emailService');

// @desc    Register new citizen user & send 6-digit verification OTP
// @route   POST /api/auth/register
// @access  Public (Citizen ONLY)
// @desc    Register new citizen user & send 6-digit verification OTP
// @route   POST /api/auth/register
// @access  Public (Citizen ONLY)
const registerUser = async (req, res, next) => {
  try {
    const { fullName, name, email, phone, password, confirmPassword, city, state, pincode } = req.body;

    const errors = [];

    // 1. Full Name Validation
    const userName = (fullName || name || '').trim();
    if (!userName) {
      errors.push({ field: 'fullName', message: 'Full name is required.' });
    } else if (userName.length < 2) {
      errors.push({ field: 'fullName', message: 'Full name must be at least 2 characters long.' });
    }

    // 2. Email Validation
    const normalizedEmail = (email || '').toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!normalizedEmail) {
      errors.push({ field: 'email', message: 'Email address is required.' });
    } else if (!emailRegex.test(normalizedEmail)) {
      errors.push({ field: 'email', message: 'Please provide a valid email address.' });
    }

    // 3. Indian Mobile Phone Validation (normalizes +91 or spaces, requires exactly 10 digits)
    const rawPhone = (phone || '').toString().trim();
    const cleanPhone = rawPhone.replace(/[\s\-()]/g, '').replace(/^(\+91|91)(?=\d{10}$)/, '');
    if (!cleanPhone) {
      errors.push({ field: 'phone', message: 'Phone number is required.' });
    } else if (!/^\d{10}$/.test(cleanPhone)) {
      errors.push({ field: 'phone', message: 'Phone number must be a valid 10-digit mobile number.' });
    }

    // 4. Password Validation (min 6 chars, consistent with User model)
    if (!password) {
      errors.push({ field: 'password', message: 'Password is required.' });
    } else if (password.length < 6) {
      errors.push({ field: 'password', message: 'Password must be at least 6 characters long.' });
    }

    // 5. Password Confirmation Check
    if (confirmPassword !== undefined && password !== confirmPassword) {
      errors.push({ field: 'confirmPassword', message: 'Passwords do not match.' });
    }

    // 6. Indian Pincode Validation (optional, but if provided must be exactly 6 digits)
    const cleanPincode = (pincode || '').toString().trim();
    if (cleanPincode && !/^[0-9]{6}$/.test(cleanPincode)) {
      errors.push({ field: 'pincode', message: 'Pincode must be exactly 6 digits.' });
    }

    // Return structured validation errors if any validation failed
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0].message,
        errors
      });
    }

    // 7. Check Duplicate Email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (existingUser.role !== 'CITIZEN') {
        return res.status(403).json({
          success: false,
          message: 'This email is reserved for administrative services. Please sign in.',
          errors: [{ field: 'email', message: 'This email is reserved for administrative services. Please sign in.' }]
        });
      }
      if (existingUser.isVerified !== false && existingUser.emailVerified !== false) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists.',
          errors: [{ field: 'email', message: 'An account with this email already exists.' }]
        });
      }
    }

    // 8. Check Duplicate Phone
    const existingPhoneUser = await User.findOne({
      phone: cleanPhone,
      $or: [{ emailVerified: true }, { isVerified: true }]
    });
    if (existingPhoneUser && existingPhoneUser.email !== normalizedEmail) {
      return res.status(409).json({
        success: false,
        message: 'This phone number is already registered.',
        errors: [{ field: 'phone', message: 'This phone number is already registered.' }]
      });
    }

    // 9. Generate Cryptographically Secure 6-Digit OTP (100000 - 999999)
    const otpNumber = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = await bcrypt.hash(otpNumber, 10);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
    const resendCooldown = new Date(Date.now() + 60 * 1000); // 60 seconds cooldown

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AUTH REGISTRATION OTP] Generated OTP for ${normalizedEmail}: ${otpNumber}`);
    }

    // 10. ATTEMPT EMAIL TRANSMISSION FIRST - DO NOT CLAIM SENT IF FAILED
    const emailResult = await sendEmailVerificationOtp({
      to: normalizedEmail,
      recipientName: userName,
      otp: otpNumber
    });

    if (!emailResult || !emailResult.success) {
      console.error(`[REGISTRATION FAILED] Verification email delivery failed to ${normalizedEmail}:`, {
        error: emailResult?.error || 'Unknown error',
        code: emailResult?.code || 'EMAIL_FAILED'
      });
      const isDev = process.env.NODE_ENV !== 'production';
      const userMessage = isDev
        ? `Unable to send verification email: ${emailResult?.error || 'SMTP delivery failed'}. Please configure SMTP_USER and SMTP_PASS in server/.env.`
        : 'Unable to send verification email. Please try again.';

      return res.status(503).json({
        success: false,
        message: userMessage,
        code: emailResult?.code || 'EMAIL_DELIVERY_FAILED',
        errors: [{ field: 'email', message: userMessage }]
      });
    }

    // 11. Only save or update citizen in DB after email is successfully handed off to SMTP
    const citizenData = {
      name: userName,
      email: normalizedEmail,
      phone: cleanPhone,
      password, // Pre-save hook will hash
      role: 'CITIZEN', // STRICT CITIZEN ONLY - CLIENT CANNOT OVERRIDE
      isVerified: false,
      emailVerified: false,
      isActive: true,
      verificationOtp: hashedOtp,
      emailVerificationOtp: hashedOtp,
      verificationOtpExpires: otpExpires,
      emailVerificationOtpExpires: otpExpires,
      verificationOtpAttempts: 0,
      emailVerificationOtpAttempts: 0,
      verificationOtpResendAfter: resendCooldown,
      city: city ? city.trim() : '',
      state: state ? state.trim() : '',
      pincode: cleanPincode
    };

    if (existingUser && (existingUser.isVerified === false || existingUser.emailVerified === false)) {
      Object.assign(existingUser, citizenData);
      await existingUser.save();
    } else {
      await User.create(citizenData);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Verification OTP sent to your registered email.',
      email: normalizedEmail
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify 6-digit OTP to activate citizen account
// @route   POST /api/auth/verify-email and POST /api/auth/verify-email-otp
// @access  Public
const verifyEmailOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email address and 6-digit verification code are required.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        message: 'Verification code must be exactly 6 digits.'
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+verificationOtp +verificationOtpExpires +verificationOtpAttempts +emailVerificationOtp +emailVerificationOtpExpires +emailVerificationOtpAttempts'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email. Please register first.'
      });
    }

    if (user.role !== 'CITIZEN') {
      return res.status(403).json({
        success: false,
        message: 'Staff and Admin accounts are managed directly by administration.'
      });
    }

    if (user.isVerified && user.emailVerified) {
      return res.status(200).json({
        success: true,
        message: 'Your email is already verified. You can now sign in.',
        alreadyVerified: true
      });
    }

    const storedOtp = user.verificationOtp || user.emailVerificationOtp;
    const expires = user.verificationOtpExpires || user.emailVerificationOtpExpires;
    const attempts = user.verificationOtpAttempts ?? user.emailVerificationOtpAttempts ?? 0;

    if (!storedOtp || !expires) {
      return res.status(400).json({
        success: false,
        message: 'No active verification code found. Please request a new OTP.'
      });
    }

    // Check expiration (5 min)
    if (new Date() > expires) {
      user.verificationOtp = undefined;
      user.emailVerificationOtp = undefined;
      user.verificationOtpExpires = undefined;
      user.emailVerificationOtpExpires = undefined;
      user.verificationOtpAttempts = 0;
      user.emailVerificationOtpAttempts = 0;
      await user.save({ validateBeforeSave: false });

      return res.status(400).json({
        success: false,
        message: 'Verification code expired. Please request a new OTP.'
      });
    }

    // Check max attempts
    if (attempts >= 5) {
      user.verificationOtp = undefined;
      user.emailVerificationOtp = undefined;
      user.verificationOtpExpires = undefined;
      user.emailVerificationOtpExpires = undefined;
      user.verificationOtpAttempts = 0;
      user.emailVerificationOtpAttempts = 0;
      await user.save({ validateBeforeSave: false });

      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please request a new OTP.'
      });
    }

    // Compare OTP with bcrypt
    const isMatch = await bcrypt.compare(cleanOtp, storedOtp);
    if (!isMatch) {
      const nextAttempts = attempts + 1;
      user.verificationOtpAttempts = nextAttempts;
      user.emailVerificationOtpAttempts = nextAttempts;
      await user.save({ validateBeforeSave: false });

      const remaining = 5 - nextAttempts;
      return res.status(400).json({
        success: false,
        message: remaining > 0 ? `Invalid verification code. ${remaining} attempt(s) remaining.` : 'Too many attempts. Please request a new OTP.'
      });
    }

    // Mark as verified & activate account
    user.isVerified = true;
    user.emailVerified = true;
    user.isActive = true;
    user.verificationOtp = undefined;
    user.emailVerificationOtp = undefined;
    user.verificationOtpExpires = undefined;
    user.emailVerificationOtpExpires = undefined;
    user.verificationOtpAttempts = 0;
    user.emailVerificationOtpAttempts = 0;
    user.verificationOtpResendAfter = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! Your account has been activated.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend 6-digit email verification OTP
// @route   POST /api/auth/resend-verification-otp and POST /api/auth/resend-email-otp
// @access  Public
const resendVerificationOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+verificationOtpResendAfter');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address.'
      });
    }

    if (user.role !== 'CITIZEN') {
      return res.status(403).json({
        success: false,
        message: 'Staff and Admin accounts are managed directly by administration.'
      });
    }

    if (user.isVerified && user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'This account is already verified. Please sign in.'
      });
    }

    // Rate-limiting / 60-second resend cooldown check
    if (user.verificationOtpResendAfter && new Date() < user.verificationOtpResendAfter) {
      const waitSeconds = Math.ceil((user.verificationOtpResendAfter.getTime() - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} second(s) before requesting another verification code.`
      });
    }

    // Generate fresh cryptographically secure 6-digit OTP
    const otpNumber = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = await bcrypt.hash(otpNumber, 10);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const resendCooldown = new Date(Date.now() + 60 * 1000); // 60s cooldown

    // ATTEMPT EMAIL TRANSMISSION FIRST
    const emailResult = await sendEmailVerificationOtp({
      to: user.email,
      recipientName: user.name,
      otp: otpNumber
    });

    if (!emailResult || !emailResult.success) {
      console.error(`[RESEND EMAIL FAILED] Could not send OTP to ${user.email}: ${emailResult?.error || 'Unknown error'}`);
      return res.status(503).json({
        success: false,
        message: 'Unable to send verification email. Please try again.'
      });
    }

    user.verificationOtp = hashedOtp;
    user.emailVerificationOtp = hashedOtp;
    user.verificationOtpExpires = otpExpires;
    user.emailVerificationOtpExpires = otpExpires;
    user.verificationOtpAttempts = 0;
    user.emailVerificationOtpAttempts = 0;
    user.verificationOtpResendAfter = resendCooldown;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail })
      .select('+password')
      .populate('department', 'name code')
      .populate('municipality', 'name code city state country wards');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is currently inactive. Please contact the administrator.'
      });
    }

    // Check email verification for Citizen role
    if (user.role === 'CITIZEN' && (user.isVerified !== true || user.emailVerified !== true)) {
      return res.status(403).json({
        success: false,
        isUnverified: true,
        email: user.email,
        message: 'Please verify your email before signing in.'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user._id, user.role);

    const safeUser = {
      id: user._id,
      _id: user._id,
      fullName: user.name,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department,
      municipality: user.municipality,
      ward: user.ward || '',
      serviceArea: user.serviceArea || '',
      isActive: user.isActive,
      city: user.city,
      state: user.state,
      pincode: user.pincode
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: safeUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('department', 'name code description')
      .populate('municipality', 'name code city state country wards');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const safeUser = {
      id: user._id,
      _id: user._id,
      fullName: user.name,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department,
      municipality: user.municipality,
      ward: user.ward || '',
      serviceArea: user.serviceArea || '',
      isActive: user.isActive,
      city: user.city,
      state: user.state,
      pincode: user.pincode,
      notificationPreferences: user.notificationPreferences
    };

    res.status(200).json({
      success: true,
      user: safeUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { fullName, name, phone, city, state, pincode, notificationPreferences, profileImage } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (fullName || name) user.name = fullName || name;
    if (phone) user.phone = phone;
    if (city !== undefined) user.city = city;
    if (state !== undefined) user.state = state;
    if (pincode !== undefined) user.pincode = pincode;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (notificationPreferences) {
      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...notificationPreferences
      };
    }

    await user.save();
    const updatedUser = await User.findById(user._id).populate('department', 'name code');

    const safeUser = {
      id: updatedUser._id,
      _id: updatedUser._id,
      fullName: updatedUser.name,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      department: updatedUser.department,
      isActive: updatedUser.isActive,
      city: updatedUser.city,
      state: updatedUser.state,
      pincode: updatedUser.pincode
    };

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: safeUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user notification preferences
// @route   GET /api/users/me/notification-preferences (and GET /api/auth/notification-preferences)
// @access  Private
const getNotificationPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const prefs = {
      inAppNotifications: user.notificationPreferences?.inAppNotifications ?? user.notificationPreferences?.push ?? true,
      emailAlerts: user.notificationPreferences?.emailAlerts ?? user.notificationPreferences?.email ?? true,
      email: user.notificationPreferences?.emailAlerts ?? user.notificationPreferences?.email ?? true,
      push: user.notificationPreferences?.inAppNotifications ?? user.notificationPreferences?.push ?? true
    };

    res.status(200).json({
      success: true,
      preferences: prefs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user notification preferences
// @route   PATCH /api/users/me/notification-preferences (and PATCH /api/auth/notification-preferences)
// @access  Private
const updateNotificationPreferences = async (req, res, next) => {
  try {
    const { inAppNotifications, emailAlerts, email, push } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentPrefs = user.notificationPreferences || {};
    const updatedInApp = inAppNotifications !== undefined ? !!inAppNotifications : (push !== undefined ? !!push : (currentPrefs.inAppNotifications ?? true));
    const updatedEmail = emailAlerts !== undefined ? !!emailAlerts : (email !== undefined ? !!email : (currentPrefs.emailAlerts ?? true));

    user.notificationPreferences = {
      inAppNotifications: updatedInApp,
      emailAlerts: updatedEmail,
      email: updatedEmail,
      push: updatedInApp
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: user.notificationPreferences
    });
  } catch (error) {
    next(error);
  }
};

// Password complexity validator
const validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_]/.test(password);
  return hasUpper && hasLower && hasNumber && hasSpecial;
};

// @desc    Initiate forgot password request and send 6-digit OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid registered email address.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Mitigate account enumeration: return success even if user not found
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email address, a 6-digit verification code has been sent.',
        email: normalizedEmail
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This account is deactivated. Please contact municipal support.'
      });
    }

    // Generate secure random 6-digit OTP (100000 to 999999)
    const otpNumber = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = await bcrypt.hash(otpNumber, 10);

    // Set 5-minute expiry
    user.resetPasswordOtp = hashedOtp;
    user.resetPasswordOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
    user.resetPasswordOtpAttempts = 0;
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // Send email using Nodemailer
    const emailResult = await sendPasswordResetOtpEmail({
      to: user.email,
      recipientName: user.name,
      otp: otpNumber
    });

    if (!emailResult || !emailResult.success) {
      console.error(`[FORGOT PASSWORD EMAIL FAILED] Could not send OTP to ${user.email}: ${emailResult?.error || 'Unknown error'}`);
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpires = undefined;
      user.resetPasswordOtpAttempts = 0;
      await user.save({ validateBeforeSave: false });

      return res.status(503).json({
        success: false,
        message: 'Unable to send password reset email. Please try again later.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'A 6-digit verification code has been sent to your email address.',
      email: normalizedEmail
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify 6-digit OTP for password reset
// @route   POST /api/auth/verify-reset-otp
// @access  Public
const verifyResetOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email address and 6-digit OTP are required.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be exactly 6 digits.'
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+resetPasswordOtp +resetPasswordOtpExpires +resetPasswordOtpAttempts'
    );

    if (!user || !user.resetPasswordOtp || !user.resetPasswordOtpExpires) {
      return res.status(400).json({
        success: false,
        message: 'No active password reset request found. Please request a new OTP.'
      });
    }

    // Check expiry
    if (new Date() > user.resetPasswordOtpExpires) {
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpires = undefined;
      user.resetPasswordOtpAttempts = 0;
      await user.save({ validateBeforeSave: false });

      return res.status(400).json({
        success: false,
        message: 'The OTP code has expired. Please request a new verification code.'
      });
    }

    // Check max attempts
    if (user.resetPasswordOtpAttempts >= 5) {
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpires = undefined;
      user.resetPasswordOtpAttempts = 0;
      await user.save({ validateBeforeSave: false });

      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. For security reasons, please request a new OTP.'
      });
    }

    // Compare OTP
    const isMatch = await bcrypt.compare(cleanOtp, user.resetPasswordOtp);
    if (!isMatch) {
      user.resetPasswordOtpAttempts = (user.resetPasswordOtpAttempts || 0) + 1;
      await user.save({ validateBeforeSave: false });

      const remaining = 5 - user.resetPasswordOtpAttempts;
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Please request a new code.'}`
      });
    }

    // Generate secure single-use reset authorization token valid for 10 minutes
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');

    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordTokenExpires = new Date(Date.now() + 10 * 60 * 1000);
    // Single-use: clear OTP once verified
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    user.resetPasswordOtpAttempts = 0;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
      resetToken: rawResetToken,
      email: normalizedEmail
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using verified reset token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { email, resetToken, newPassword, confirmPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, reset authorization token, and new password are required.'
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation password do not match.'
      });
    }

    if (!validatePasswordStrength(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const user = await User.findOne({
      email: normalizedEmail,
      resetPasswordToken: hashedResetToken,
      resetPasswordTokenExpires: { $gt: new Date() }
    }).select('+resetPasswordToken +resetPasswordTokenExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset authorization is invalid or has expired. Please restart the reset process.'
      });
    }

    // Set new password (pre-save hook will hash it with bcrypt)
    user.password = newPassword;
    // Invalidate reset token after successful reset
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpires = undefined;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    user.resetPasswordOtpAttempts = 0;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please sign in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};

