const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    type: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      default: null
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    },
    emailSent: {
      type: Boolean,
      default: false
    },
    emailSentAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Synchronize recipient and user for seamless backward-compatibility
notificationSchema.pre('validate', function () {
  if (this.recipient && !this.user) {
    this.user = this.recipient;
  } else if (this.user && !this.recipient) {
    this.recipient = this.user;
  }
});

// Compound performance indexes for quick queries & unread count
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
