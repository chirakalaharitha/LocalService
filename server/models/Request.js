const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Request title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Request description is required'],
      trim: true
    },
    category: {
      type: String,
      enum: ['WATER', 'ELECTRICITY', 'ROAD', 'STREET_LIGHT', 'GARBAGE', 'DRAINAGE', 'PUBLIC_AREA', 'OTHER'],
      required: [true, 'Category is required']
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    suggestedPriority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'UNDER_REVIEW',
        'ASSIGNED',
        'ACCEPTED',
        'IN_PROGRESS',
        'RESOLUTION_SUBMITTED',
        'RESOLVED',
        'PENDING_VERIFICATION',
        'CITIZEN_VERIFIED',
        'CLOSED',
        'REOPENED',
        'REJECTED'
      ],
      default: 'PENDING',
      index: true
    },
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true
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
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    address: {
      type: String,
      required: [true, 'Location address is required'],
      trim: true
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
    images: [{
      type: String
    }],
    beforeImage: {
      type: String,
      default: ''
    },
    afterImage: {
      type: String,
      default: ''
    },
    resolutionNotes: {
      type: String,
      default: ''
    },
    resolutionProof: {
      images: [{ type: String }],
      notes: { type: String, default: '' },
      resolvedAt: { type: Date }
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    upvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    upvoteCount: {
      type: Number,
      default: 0
    },
    slaDeadline: {
      type: Date,
      required: true
    },
    slaStatus: {
      type: String,
      enum: ['ON_TIME', 'NEAR_BREACH', 'OVERDUE'],
      default: 'ON_TIME'
    },
    verifiedAt: {
      type: Date
    },
    resolvedAt: {
      type: Date
    },
    citizenVerification: {
      verified: {
        type: Boolean,
        default: false
      },
      verifiedAt: {
        type: Date
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: {
        type: String,
        trim: true,
        default: ''
      }
    },
    verificationIssue: {
      reported: {
        type: Boolean,
        default: false
      },
      reason: {
        type: String,
        trim: true,
        default: ''
      },
      reportedAt: {
        type: Date
      },
      reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  },
  { timestamps: true }
);

// 2dsphere index for geographic calculations
requestSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Request', requestSchema);

