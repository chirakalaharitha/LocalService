const Request = require('../models/Request');

/**
 * Checks for duplicate active requests within radius (meters) matching category
 */
const checkDuplicateRequests = async ({ longitude, latitude, category, radiusMeters = 300 }) => {
  if (!longitude || !latitude) return [];

  // Find active requests (exclude RESOLVED / CITIZEN_VERIFIED / REJECTED)
  const activeStatuses = ['PENDING', 'UNDER_REVIEW', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED'];

  const nearby = await Request.find({
    category: category,
    status: { $in: activeStatuses },
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        },
        $maxDistance: radiusMeters
      }
    }
  }).populate('citizen', 'name email').limit(5);

  return nearby;
};

module.exports = { checkDuplicateRequests };

