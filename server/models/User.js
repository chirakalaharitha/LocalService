const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    role: {
      type: String,
      enum: ['CITIZEN', 'STAFF', 'ADMIN'],
      default: 'CITIZEN'
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
    },
    municipality: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Municipality',
      default: null,
      index: true
    },
    ward: {
      type: String,
      default: '',
      trim: true
    },
    serviceArea: {
      type: String,
      default: '',
      trim: true
    },
    profileImage: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: ''
    },
    state: {
      type: String,
      default: ''
    },
    pincode: {
      type: String,
      default: ''
    },
    notificationPreferences: {
      inAppNotifications: { type: Boolean, default: true },
      emailAlerts: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    verificationOtp: {
      type: String,
      select: false
    },
    verificationOtpExpires: {
      type: Date,
      select: false
    },
    verificationOtpAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    verificationOtpResendAfter: {
      type: Date,
      select: false
    },
    emailVerificationOtp: {
      type: String,
      select: false
    },
    emailVerificationOtpExpires: {
      type: Date,
      select: false
    },
    emailVerificationOtpAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    resetPasswordOtp: {
      type: String,
      select: false
    },
    resetPasswordOtpExpires: {
      type: Date,
      select: false
    },
    resetPasswordOtpAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    resetPasswordToken: {
      type: String,
      select: false
    },
    resetPasswordTokenExpires: {
      type: Date,
      select: false
    }
  },
  { timestamps: true }
);

// Encrypt password using bcrypt before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

