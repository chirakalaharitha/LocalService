const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    icon: {
      type: String,
      default: 'HiOfficeBuilding'
    },
    municipality: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Municipality'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);

