const Municipality = require('../models/Municipality');
const { lookupPostalPincode } = require('./pincodeService');

/**
 * Calculates the Haversine distance between two sets of coordinates in kilometers.
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lat1 === null || lon1 === undefined || lon1 === null ||
      lat2 === undefined || lat2 === null || lon2 === undefined || lon2 === null) {
    return null;
  }
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

/**
 * Normalizes city/municipality name for loose comparison.
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/municipal\s+corporation|municipality|nagar\s+panchayat|corporation|mc|np/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Resolves the appropriate municipality for an issue based strictly on its location.
 *
 * Precedence:
 * 1. PINCODE match in active municipality database
 * 1b. PINCODE lookup via India Post official directory
 * 2. CITY / TOWN name match
 * 3. GPS Coordinates within serviceRadiusKm
 * 4. NEAREST Municipality within acceptable threshold
 * 5. District Fallback (only within configured district)
 * 6. NOT_CONFIGURED (no silent fallback to Guntur or arbitrary default)
 *
 * @param {Object} locationData - { latitude, longitude, pincode, city, district }
 * @returns {Promise<Object>} - { municipality, matchType, confidence, distanceKm, notes, postal }
 */
async function resolveMunicipalityFromLocation({ latitude, longitude, pincode, city, district } = {}) {
  const cleanPin = pincode ? String(pincode).trim() : '';
  const cleanCity = city ? String(city).trim() : '';
  const cleanDistrict = district ? String(district).trim() : '';
  const lat = latitude !== undefined && latitude !== null ? parseFloat(latitude) : null;
  const lng = longitude !== undefined && longitude !== null ? parseFloat(longitude) : null;
  const hasCoords = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

  // 1. PINCODE Match (Database explicit pincodes list)
  if (cleanPin) {
    const pinMatch = await Municipality.findOne({
      isActive: true,
      pincodes: cleanPin
    });

    if (pinMatch) {
      let distanceKm = null;
      if (hasCoords && pinMatch.latitude && pinMatch.longitude) {
        distanceKm = calculateDistanceKm(lat, lng, pinMatch.latitude, pinMatch.longitude);
      }
      return {
        municipality: pinMatch,
        matchType: 'PINCODE',
        confidence: 'HIGH',
        distanceKm,
        notes: `Matched via postal code ${cleanPin} to ${pinMatch.name}`
      };
    }

    // 1b. PINCODE Postal Directory Lookup (India Post directory)
    const postalInfo = await lookupPostalPincode(cleanPin);
    if (postalInfo) {
      const postalLocality = postalInfo.locality;
      const postalDistrict = postalInfo.district;

      let matchedByPostal = await Municipality.findOne({
        isActive: true,
        $or: [
          { city: new RegExp(`^${postalLocality}$`, 'i') },
          { name: new RegExp(postalLocality, 'i') },
          { normalizedName: normalizeName(postalLocality) }
        ]
      });

      if (!matchedByPostal && postalDistrict) {
        // Try district match if city is within that district
        matchedByPostal = await Municipality.findOne({
          isActive: true,
          district: new RegExp(`^${postalDistrict}$`, 'i'),
          city: new RegExp(postalLocality, 'i')
        });
      }

      if (!matchedByPostal && postalInfo.latitude && postalInfo.longitude) {
        // Check if postal coords are within operational radius of a municipality
        const allActive = await Municipality.find({
          isActive: true,
          latitude: { $ne: null },
          longitude: { $ne: null }
        });
        for (const muni of allActive) {
          const dist = calculateDistanceKm(postalInfo.latitude, postalInfo.longitude, muni.latitude, muni.longitude);
          if (dist !== null && dist <= (muni.serviceRadiusKm || 15)) {
            matchedByPostal = muni;
            break;
          }
        }
      }

      if (matchedByPostal) {
        return {
          municipality: matchedByPostal,
          postal: postalInfo,
          matchType: 'PINCODE_POSTAL',
          confidence: 'HIGH',
          distanceKm: null,
          notes: `Matched to ${matchedByPostal.name} via India Post directory (${postalInfo.locality}, ${postalInfo.district})`
        };
      }
    }
  }

  // 2. CITY / TOWN Name Match
  if (cleanCity) {
    const normSearchCity = normalizeName(cleanCity);

    const cityMatch = await Municipality.findOne({
      isActive: true,
      $or: [
        { name: new RegExp(`^${cleanCity}$`, 'i') },
        { code: new RegExp(`^${cleanCity}$`, 'i') },
        { normalizedName: normSearchCity },
        { name: new RegExp(cleanCity, 'i') }
      ]
    });

    if (cityMatch) {
      let distanceKm = null;
      if (hasCoords && cityMatch.latitude && cityMatch.longitude) {
        distanceKm = calculateDistanceKm(lat, lng, cityMatch.latitude, cityMatch.longitude);
      }
      return {
        municipality: cityMatch,
        matchType: 'CITY',
        confidence: 'HIGH',
        distanceKm,
        notes: `Matched via city/town name "${cleanCity}" to ${cityMatch.name}`
      };
    }
  }

  // 3. GPS Coordinates within serviceRadiusKm
  if (hasCoords) {
    const allActive = await Municipality.find({
      isActive: true,
      latitude: { $ne: null },
      longitude: { $ne: null }
    });

    let bestWithinRadius = null;
    let minDistance = Infinity;

    for (const muni of allActive) {
      const dist = calculateDistanceKm(lat, lng, muni.latitude, muni.longitude);
      const radius = muni.serviceRadiusKm || 15;
      if (dist !== null && dist <= radius) {
        if (dist < minDistance) {
          minDistance = dist;
          bestWithinRadius = muni;
        }
      }
    }

    if (bestWithinRadius) {
      return {
        municipality: bestWithinRadius,
        matchType: 'GPS_RADIUS',
        confidence: 'HIGH',
        distanceKm: minDistance,
        notes: `Matched within ${bestWithinRadius.serviceRadiusKm}km operational radius (${minDistance}km away)`
      };
    }

    // 4. NEAREST Municipality within a reasonable limit (e.g. <= 25km)
    if (allActive.length > 0) {
      let districtCandidates = cleanDistrict
        ? allActive.filter(
            (m) =>
              m.district &&
              m.district.toLowerCase().includes(cleanDistrict.toLowerCase())
          )
        : [];

      const candidates = districtCandidates.length > 0 ? districtCandidates : allActive;

      let nearest = null;
      let nearestDist = Infinity;

      for (const muni of candidates) {
        const dist = calculateDistanceKm(lat, lng, muni.latitude, muni.longitude);
        if (dist !== null && dist < nearestDist) {
          nearestDist = dist;
          nearest = muni;
        }
      }

      // Only assign if nearest is within reasonable operational proximity (<= 25km)
      if (nearest && nearestDist <= 25) {
        return {
          municipality: nearest,
          matchType: 'NEAREST',
          confidence: 'MEDIUM',
          distanceKm: nearestDist,
          notes: `Assigned to nearest authority (${nearestDist}km away)`
        };
      }
    }
  }

  // 5. District Fallback if no coords but district given and matching municipality exists
  if (cleanDistrict) {
    const districtMuni = await Municipality.findOne({
      isActive: true,
      district: new RegExp(`^${cleanDistrict}$`, 'i')
    });

    if (districtMuni) {
      return {
        municipality: districtMuni,
        matchType: 'DISTRICT',
        confidence: 'LOW',
        distanceKm: null,
        notes: `Matched to district authority in ${cleanDistrict}`
      };
    }
  }

  // 6. Explicit Unconfigured State (DO NOT fall back to Guntur or any arbitrary municipality)
  return {
    municipality: null,
    matchType: 'NOT_CONFIGURED',
    confidence: 'NONE',
    distanceKm: null,
    notes: 'Local authority mapping is not configured for this location yet.'
  };
}

/**
 * Returns nearby municipalities sorted by distance from given coordinates.
 * Excludes a given municipality ID (useful for administrative transfers).
 */
async function getNearbyMunicipalities({ latitude, longitude, excludeMunicipalityId = null, limit = 6 } = {}) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    const query = { isActive: true };
    if (excludeMunicipalityId) {
      query._id = { $ne: excludeMunicipalityId };
    }
    const list = await Municipality.find(query).limit(limit);
    return list.map((m) => ({
      municipality: m,
      distanceKm: null
    }));
  }

  const query = {
    isActive: true,
    latitude: { $ne: null },
    longitude: { $ne: null }
  };
  if (excludeMunicipalityId) {
    query._id = { $ne: excludeMunicipalityId };
  }

  const municipalities = await Municipality.find(query);
  const withDistance = municipalities.map((m) => ({
    municipality: m,
    distanceKm: calculateDistanceKm(lat, lng, m.latitude, m.longitude)
  }));

  withDistance.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  return withDistance.slice(0, limit);
}

module.exports = {
  calculateDistanceKm,
  normalizeName,
  resolveMunicipalityFromLocation,
  getNearbyMunicipalities
};
