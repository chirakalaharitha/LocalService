const express = require('express');
const router = express.Router();
const Municipality = require('../models/Municipality');

// @desc    Get all active municipalities
// @route   GET /api/municipalities
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const municipalities = await Municipality.find({ isActive: true })
      .select('name code city state country pincodes wards contactPhone contactEmail')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: municipalities.length,
      municipalities
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get municipality by ID
// @route   GET /api/municipalities/:id
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const municipality = await Municipality.findById(req.params.id);
    if (!municipality) {
      return res.status(404).json({ success: false, message: 'Municipality not found' });
    }

    res.status(200).json({
      success: true,
      municipality
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
