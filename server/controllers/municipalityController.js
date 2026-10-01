const Municipality = require('../models/Municipality');
const municipalityService = require('../services/municipalityService');

// @desc    Get all active municipalities
// @route   GET /api/municipalities
// @access  Public
exports.getAllMunicipalities = async (req, res, next) => {
  try {
    const { search, district, state } = req.query;
    const query = { isActive: true };

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { code: searchRegex },
        { city: searchRegex },
        { district: searchRegex },
        { pincodes: search }
      ];
    }

    if (district) {
      query.district = new RegExp(district, 'i');
    }

    if (state) {
      query.state = new RegExp(state, 'i');
    }

    const municipalities = await Municipality.find(query)
      .select('name normalizedName code city district state country type latitude longitude serviceRadiusKm pincodes wards contactPhone contactEmail isActive')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: municipalities.length,
      municipalities
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get municipality by ID
// @route   GET /api/municipalities/:id
// @access  Public
exports.getMunicipalityById = async (req, res, next) => {
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
};

// @desc    Resolve municipality based strictly on physical location
// @route   POST /api/municipalities/resolve-location (or GET)
// @access  Public
exports.resolveLocation = async (req, res, next) => {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const { latitude, longitude, pincode, city, district } = params;

    const result = await municipalityService.resolveMunicipalityFromLocation({
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      pincode,
      city,
      district
    });

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get nearby municipalities relative to coordinates
// @route   GET /api/municipalities/nearby
// @access  Public
exports.getNearby = async (req, res, next) => {
  try {
    const { lat, lng, latitude, longitude, exclude, limit } = req.query;
    const targetLat = latitude || lat;
    const targetLng = longitude || lng;

    const nearby = await municipalityService.getNearbyMunicipalities({
      latitude: targetLat,
      longitude: targetLng,
      excludeMunicipalityId: exclude,
      limit: limit ? parseInt(limit, 10) : 6
    });

    res.status(200).json({
      success: true,
      count: nearby.length,
      nearby
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get municipality by pincode
// @route   GET /api/municipalities/by-pincode/:pincode
// @access  Public
exports.getByPincode = async (req, res, next) => {
  try {
    const { pincode } = req.params;
    const municipality = await Municipality.findOne({
      isActive: true,
      pincodes: pincode.trim()
    });

    if (!municipality) {
      return res.status(404).json({
        success: false,
        message: `No active municipality mapped to pincode ${pincode}`
      });
    }

    res.status(200).json({
      success: true,
      municipality
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Comprehensive pincode lookup (postal directory + configured municipality resolution)
// @route   GET /api/municipalities/lookup-pincode/:pincode
// @access  Public
exports.lookupPincode = async (req, res, next) => {
  try {
    const { pincode } = req.params;
    const cleanPin = pincode ? String(pincode).trim() : '';

    if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 6-digit postal pincode.'
      });
    }

    const { lookupPostalPincode } = require('../services/pincodeService');
    const postal = await lookupPostalPincode(cleanPin);

    const resolution = await municipalityService.resolveMunicipalityFromLocation({
      pincode: cleanPin,
      city: postal?.locality,
      district: postal?.district,
      latitude: postal?.latitude,
      longitude: postal?.longitude
    });

    const isConfigured = !!resolution.municipality;

    res.status(200).json({
      success: true,
      pincode: cleanPin,
      configured: isConfigured,
      postal: postal || null,
      municipality: resolution.municipality || null,
      matchType: resolution.matchType,
      confidence: resolution.confidence,
      notes: resolution.notes || (isConfigured ? 'Matched successfully' : 'Local authority mapping is not configured for this location yet.')
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get municipality by city name
// @route   GET /api/municipalities/by-city/:city
// @access  Public
exports.getByCity = async (req, res, next) => {
  try {
    const { city } = req.params;
    const municipality = await Municipality.findOne({
      isActive: true,
      $or: [
        { city: new RegExp(`^${city.trim()}$`, 'i') },
        { name: new RegExp(city.trim(), 'i') }
      ]
    });

    if (!municipality) {
      return res.status(404).json({
        success: false,
        message: `No active municipality found for city ${city}`
      });
    }

    res.status(200).json({
      success: true,
      municipality
    });
  } catch (error) {
    next(error);
  }
};
