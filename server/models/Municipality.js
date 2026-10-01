const mongoose = require('mongoose');

const municipalitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Municipality name is required'],
      trim: true,
      unique: true
    },
    normalizedName: {
      type: String,
      lowercase: true,
      trim: true,
      index: true
    },
    code: {
      type: String,
      required: [true, 'Municipality code is required'],
      trim: true,
      uppercase: true,
      unique: true
    },
    district: {
      type: String,
      required: [true, 'District is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      default: 'Andhra Pradesh',
      trim: true
    },
    country: {
      type: String,
      default: 'India',
      trim: true
    },
    type: {
      type: String,
      enum: ['MUNICIPAL_CORPORATION', 'CORPORATION', 'MUNICIPALITY', 'NAGAR_PANCHAYAT', 'URBAN_DEVELOPMENT_AUTHORITY', 'DEVELOPMENT_AUTHORITY', 'LOCAL_AUTHORITY'],
      default: 'MUNICIPALITY'
    },
    latitude: {
      type: Number,
      default: 0
    },
    longitude: {
      type: Number,
      default: 0
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    },
    serviceRadiusKm: {
      type: Number,
      default: 15
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
      default: true,
      index: true
    },
    contactPhone: {
      type: String,
      default: null
    },
    contactEmail: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

// Pre-save hook: sync normalizedName and GeoJSON location coordinates
municipalitySchema.pre('save', function (next) {
  if (this.name) {
    this.normalizedName = this.name.toLowerCase().trim();
  }
  if (this.latitude !== undefined && this.longitude !== undefined) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude]
    };
  }
  next();
});

// 2dsphere index for geospatial location queries
municipalitySchema.index({ location: '2dsphere' });
municipalitySchema.index({ pincodes: 1 });
municipalitySchema.index({ city: 1 });
municipalitySchema.index({ district: 1 });

module.exports = mongoose.model('Municipality', municipalitySchema);
