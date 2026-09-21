const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
      unique: true
    },
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    municipality: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Municipality'
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required (1-5)'],
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
      default: ''
    },
    suggestion: {
      type: String,
      trim: true,
      maxlength: [1000, 'Suggestion cannot exceed 1000 characters'],
      default: ''
    },
    categories: [
      {
        type: String,
        trim: true
      }
    ]
  },
  { timestamps: true }
);

// Indexes for fast querying & municipality scoping
feedbackSchema.index({ request: 1, citizen: 1 }, { unique: true });
feedbackSchema.index({ municipality: 1, createdAt: -1 });
feedbackSchema.index({ staff: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);

