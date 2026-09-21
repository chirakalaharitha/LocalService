/**
 * LocalFix Location Service
 * Handles Browser Geolocation API and Nominatim OpenStreetMap Geocoding / Reverse Geocoding.
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

/**
 * Extract structured address components from Nominatim address object
 */
export const extractAddressComponents = (data) => {
  if (!data) {
    return { address: '', city: '', state: '', pincode: '', displayName: '' };
  }

  const addr = data.address || {};
  const displayName = data.display_name || '';

  // Extract City / Town / Village
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.suburb ||
    addr.county ||
    '';

  // Extract State
  const state = addr.state || addr.state_district || '';

  // Extract Pincode / Postcode
  const pincode = addr.postcode || addr.postal_code || '';

  // Construct a concise street/area address
  const streetParts = [];
  if (addr.house_number) streetParts.push(addr.house_number);
  if (addr.building) streetParts.push(addr.building);
  if (addr.road) streetParts.push(addr.road);
  if (addr.residential) streetParts.push(addr.residential);
  if (addr.neighbourhood && !streetParts.includes(addr.neighbourhood)) streetParts.push(addr.neighbourhood);
  if (addr.suburb && !streetParts.includes(addr.suburb) && addr.suburb !== city) streetParts.push(addr.suburb);
  if (addr.commercial) streetParts.push(addr.commercial);
  if (addr.industrial) streetParts.push(addr.industrial);

  let formattedStreetAddress = streetParts.join(', ').trim();

  // If no specific street parts could be assembled, derive a clean readable string from display_name
  if (!formattedStreetAddress) {
    if (displayName) {
      // Use the first 2-3 segments of display_name
      const parts = displayName.split(',').map((p) => p.trim());
      formattedStreetAddress = parts.slice(0, Math.min(3, parts.length)).join(', ');
    } else {
      formattedStreetAddress = city || state || 'Selected Location';
    }
  }

  return {
    address: formattedStreetAddress,
    city,
    state,
    pincode,
    displayName
  };
};

/**
 * Retrieve current location using the Browser Geolocation API
 * Returns a Promise that resolves to { lat, lng, accuracy } or rejects with a user-friendly error message.
 */
export const getCurrentCoordinates = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return reject({
        type: 'UNSUPPORTED',
        message: 'Geolocation is not supported by your browser. Please search or select a location manually.'
      });
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
      ...options
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        resolve({
          lat: latitude,
          lng: longitude,
          accuracy: typeof accuracy === 'number' ? Math.round(accuracy) : null
        });
      },
      (error) => {
        let message = 'Unable to determine your current location. Please search or select a location manually.';
        let type = 'UNKNOWN';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            type = 'PERMISSION_DENIED';
            message = 'Location permission was denied. You can search for a location or select one manually on the map.';
            break;
          case error.POSITION_UNAVAILABLE:
            type = 'POSITION_UNAVAILABLE';
            message = 'Unable to determine your current location. Please search or select a location manually.';
            break;
          case error.TIMEOUT:
            type = 'TIMEOUT';
            message = 'Location request timed out. Please try again.';
            break;
          default:
            type = 'ERROR';
            message = error.message || 'Unable to retrieve location. Please search or select on the map manually.';
        }

        reject({ type, code: error.code, message });
      },
      defaultOptions
    );
  });
};

/**
 * Search locations using Nominatim Geocoding API
 * @param {string} query - The search text (e.g. area, town, landmark, pincode)
 * @param {AbortSignal} [signal] - Optional AbortController signal
 */
export const searchLocations = async (query, signal) => {
  if (!query || !query.trim()) {
    return [];
  }

  const trimmed = query.trim();
  const url = `${NOMINATIM_BASE_URL}/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(trimmed)}`;

  try {
    const response = await fetch(url, {
      signal,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Geocoding server responded with status: ${response.status}`);
    }

    const results = await response.json();

    if (!Array.isArray(results)) {
      return [];
    }

    return results.map((item) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      const components = extractAddressComponents(item);

      return {
        placeId: item.place_id,
        lat,
        lng,
        displayName: item.display_name || `${lat}, ${lng}`,
        address: components.address,
        city: components.city,
        state: components.state,
        pincode: components.pincode
      };
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      // Ignored: request was cancelled by newer search keystroke
      return null;
    }
    console.error('Nominatim search failed:', err);
    throw err;
  }
};

/**
 * Reverse geocode latitude and longitude to address using Nominatim
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {AbortSignal} [signal] - Optional AbortController signal
 */
export const reverseGeocode = async (lat, lng, signal) => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    throw new Error('Latitude and Longitude are required for reverse geocoding.');
  }

  const url = `${NOMINATIM_BASE_URL}/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}`;

  try {
    const response = await fetch(url, {
      signal,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Reverse geocoding server responded with status: ${response.status}`);
    }

    const data = await response.json();
    const components = extractAddressComponents(data);

    return {
      lat,
      lng,
      displayName: components.displayName,
      address: components.address,
      city: components.city,
      state: components.state,
      pincode: components.pincode
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return null;
    }
    console.error('Nominatim reverse geocode failed:', err);
    throw err;
  }
};
