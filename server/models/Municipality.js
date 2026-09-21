const mongoose = require('mongoose');

const municipalitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Municipality name is required'],
      trim: true,
      unique: true
    },
    code: {
      type: String,
      required: [true, 'Municipality code is required'],
      trim: true,
      uppercase: true,
      unique: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    country: {
      type: String,
      default: 'India',
      trim: true
    },
    pincodes: [{
      type: String,
      trim: true
    }],
    wards: [{
      wardNumber: { type: String, required: true },
      name: { type: String, default: '' },
      zone: { type: String, default: '' }
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    contactPhone: {
      type: String,
      default: ''
    },
    contactEmail: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Municipality', municipalitySchema);
