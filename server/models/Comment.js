const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
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
    message: {
      type: String,
      required: [true, 'Comment message is required'],
      trim: true
    },
    attachments: [{
      type: String
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);

