const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  {
    appName: {
      type: String,
      default: 'LocalFix',
      trim: true,
      required: true
    },
    tagline: {
      type: String,
      default: 'Smart Local Service Request & Tracking Platform',
      trim: true
    },
    contactEmail: {
      type: String,
      default: 'support@localfix.gov',
      trim: true
    },
    enableEmailNotifications: {
      type: Boolean,
      default: true
    },
    enableInAppNotifications: {
      type: Boolean,
      default: true
    },
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    maintenanceMessage: {
      type: String,
      default: 'LocalFix platform is currently undergoing scheduled maintenance. Please check back shortly.',
      trim: true
    },
    defaultPageSize: {
      type: Number,
      default: 10,
      min: 5,
      max: 100
    },
    slaTargets: {
      CRITICAL: { type: Number, default: 4, min: 1 },
      HIGH: { type: Number, default: 12, min: 1 },
      MEDIUM: { type: Number, default: 24, min: 1 },
      LOW: { type: Number, default: 72, min: 1 }
    },
    supportedCategories: [{
      code: { type: String, required: true },
      name: { type: String, required: true },
      isActive: { type: Boolean, default: true }
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
