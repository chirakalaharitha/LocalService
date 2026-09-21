const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    action: {
      type: String,
      required: true
    },
    targetType: {
      type: String,
      default: ''
    },
    targetId: {
      type: String,
      default: ''
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);

