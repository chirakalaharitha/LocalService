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

module.exports = mongoose.model('RequestHistory', requestHistorySchema);

