const mongoose = require('mongoose');

const requestHistorySchema = new mongoose.Schema(
  {
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    action: {
      type: String,
      required: true
    },
    previousStatus: {
      type: String,
      default: null
    },
    newStatus: {
      type: String,
      default: null
    },
    notes: {
      type: String,
      default: ''
    },
    images: [{
      type: String
    }]
  },
  { timestamps: true }
);

// Prevent accidental duplicate status history transitions
requestHistorySchema.pre('save', async function (next) {
  // If this is a status change action and previousStatus and newStatus are identical (e.g. SUBMITTED -> SUBMITTED), ignore
  const isStatusTransitionAction = ['STATUS_CHANGED', 'STATUS_UPDATE'].includes(this.action) || (this.action && this.action.startsWith('STATUS_'));
  if (isStatusTransitionAction && this.previousStatus && this.newStatus && this.previousStatus === this.newStatus) {
    const err = new Error('Duplicate status transition ignored: previousStatus is identical to newStatus');
    err.isDuplicate = true;
    return next(err);
  }

  // Prevent multiple CREATED entries for the same request
  if (this.action === 'CREATED' && this.isNew) {
    const existing = await this.constructor.findOne({
      request: this.request,
      action: 'CREATED'
    });
    if (existing) {
      const err = new Error('Duplicate CREATED history entry ignored');
      err.isDuplicate = true;
      return next(err);
    }
  }

  next();
});

// Safe recording helper method
requestHistorySchema.statics.safeRecord = async function (data) {
  try {
    const isStatusTransitionAction = ['STATUS_CHANGED', 'STATUS_UPDATE'].includes(data.action) || (data.action && data.action.startsWith('STATUS_'));
    if (isStatusTransitionAction && data.previousStatus && data.newStatus && data.previousStatus === data.newStatus) {
      return null;
    }
    const recent = await this.findOne({
      request: data.request,
      action: data.action,
      newStatus: data.newStatus,
      createdAt: { $gte: new Date(Date.now() - 10000) }
    });
    if (recent) return recent;

    return await this.create(data);
  } catch (err) {
    if (err.isDuplicate) return null;
    throw err;
  }
};

module.exports = mongoose.model('RequestHistory', requestHistorySchema);

