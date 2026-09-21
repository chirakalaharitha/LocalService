const SystemSetting = require('../models/SystemSetting');
const ActivityLog = require('../models/ActivityLog');

const DEFAULT_CATEGORIES = [
  { code: 'WATER', name: 'Water Supply & Leakage', isActive: true },
  { code: 'ELECTRICITY', name: 'Electricity & Outages', isActive: true },
  { code: 'ROAD', name: 'Road Damage & Potholes', isActive: true },
  { code: 'STREET_LIGHT', name: 'Street Light Failures', isActive: true },
  { code: 'GARBAGE', name: 'Garbage & Sanitation', isActive: true },
  { code: 'DRAINAGE', name: 'Drainage & Sewage', isActive: true },
  { code: 'PUBLIC_AREA', name: 'Public Infrastructure', isActive: true },
  { code: 'OTHER', name: 'Other Civic Inquiries', isActive: true }
];

// Helper to get or initialize singleton settings
const getOrInitSettings = async () => {
  let settings = await SystemSetting.findOne();
  if (!settings) {
    settings = await SystemSetting.create({
      appName: 'LocalFix',
      tagline: 'Smart Local Service Request & Tracking Platform',
      contactEmail: 'support@localfix.gov',
      enableEmailNotifications: true,
      enableInAppNotifications: true,
      maintenanceMode: false,
      maintenanceMessage: 'LocalFix is undergoing scheduled maintenance. Please check back shortly.',
      defaultPageSize: 10,
      slaTargets: {
        CRITICAL: 4,
        HIGH: 12,
        MEDIUM: 24,
        LOW: 72
      },
      supportedCategories: DEFAULT_CATEGORIES
    });
  }
  return settings;
};

// @desc    Get system settings (Admin)
// @route   GET /api/admin/settings
// @access  Private (ADMIN)
const getSettings = async (req, res, next) => {
  try {
    const settings = await getOrInitSettings();

    // Check SMTP configuration status without exposing credentials
    const emailConfigStatus = {
      isConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
      host: process.env.SMTP_HOST || 'Not Configured (Using Mock Transporter)',
      port: process.env.SMTP_PORT || '587',
      from: process.env.SMTP_FROM || 'noreply@localfix.gov',
      authMethod: 'Environment Variable Protected'
    };

    res.status(200).json({
      success: true,
      settings,
      emailConfigStatus
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update system settings (Admin)
// @route   PUT /api/admin/settings
// @access  Private (ADMIN)
const updateSettings = async (req, res, next) => {
  try {
    const {
      appName,
      tagline,
      contactEmail,
      enableEmailNotifications,
      enableInAppNotifications,
      maintenanceMode,
      maintenanceMessage,
      defaultPageSize,
      slaTargets,
      supportedCategories
    } = req.body;

    const settings = await getOrInitSettings();

    if (appName !== undefined) {
      if (!appName || appName.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Application Name cannot be empty' });
      }
      settings.appName = appName.trim();
    }

    if (tagline !== undefined) settings.tagline = tagline.trim();

    if (contactEmail !== undefined) {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(contactEmail.trim())) {
        return res.status(400).json({ success: false, message: 'Invalid Contact Email format' });
      }
      settings.contactEmail = contactEmail.trim();
    }

    if (enableEmailNotifications !== undefined) settings.enableEmailNotifications = Boolean(enableEmailNotifications);
    if (enableInAppNotifications !== undefined) settings.enableInAppNotifications = Boolean(enableInAppNotifications);
    if (maintenanceMode !== undefined) settings.maintenanceMode = Boolean(maintenanceMode);
    if (maintenanceMessage !== undefined) settings.maintenanceMessage = maintenanceMessage.trim();

    if (defaultPageSize !== undefined) {
      const size = parseInt(defaultPageSize);
      if (isNaN(size) || size < 5 || size > 100) {
        return res.status(400).json({ success: false, message: 'Default page size must be between 5 and 100' });
      }
      settings.defaultPageSize = size;
    }

    if (slaTargets) {
      if (slaTargets.CRITICAL !== undefined) settings.slaTargets.CRITICAL = Math.max(1, Number(slaTargets.CRITICAL));
      if (slaTargets.HIGH !== undefined) settings.slaTargets.HIGH = Math.max(1, Number(slaTargets.HIGH));
      if (slaTargets.MEDIUM !== undefined) settings.slaTargets.MEDIUM = Math.max(1, Number(slaTargets.MEDIUM));
      if (slaTargets.LOW !== undefined) settings.slaTargets.LOW = Math.max(1, Number(slaTargets.LOW));
    }

    if (Array.isArray(supportedCategories)) {
      settings.supportedCategories = supportedCategories;
    }

    await settings.save();

    // Log administrative action
    await ActivityLog.create({
      user: req.user._id,
      action: 'SETTINGS_UPDATED',
      targetType: 'SystemSetting',
      targetId: settings._id.toString(),
      metadata: {
        appName: settings.appName,
        maintenanceMode: settings.maintenanceMode,
        updatedBy: req.user.email
      }
    });

    res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public safe settings
// @route   GET /api/settings/public
// @access  Public
const getPublicSettings = async (req, res, next) => {
  try {
    const settings = await getOrInitSettings();
    res.status(200).json({
      success: true,
      appName: settings.appName,
      tagline: settings.tagline,
      contactEmail: settings.contactEmail,
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage,
      supportedCategories: settings.supportedCategories
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getPublicSettings
};
