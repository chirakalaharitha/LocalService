/**
 * pincodeService.js
 * Official postal directory service for postal code to locality resolution.
 * Based on India Post postal directory standards (Andhra Pradesh & National).
 */

// Comprehensive directory of Andhra Pradesh and regional pincodes
const POSTAL_DIRECTORY = {
  // Bapatla District
  '522265': { locality: 'Repalle', postOffice: 'Repalle S.O', district: 'Bapatla', state: 'Andhra Pradesh', lat: 16.0200, lng: 80.8500 },
  '522101': { locality: 'Bapatla', postOffice: 'Bapatla H.O', district: 'Bapatla', state: 'Andhra Pradesh', lat: 15.9042, lng: 80.4673 },
  '522111': { locality: 'Pittalavanipalem', postOffice: 'Pittalavanipalem S.O', district: 'Bapatla', state: 'Andhra Pradesh', lat: 15.9320, lng: 80.5340 },
  '522311': { locality: 'Karlapalem', postOffice: 'Karlapalem S.O', district: 'Bapatla', state: 'Andhra Pradesh', lat: 15.9400, lng: 80.5500 },
  '522256': { locality: 'Nizampatnam', postOffice: 'Nizampatnam S.O', district: 'Bapatla', state: 'Andhra Pradesh', lat: 15.9050, lng: 80.6720 },

  // Guntur District
  '522001': { locality: 'Guntur Head Office', postOffice: 'Guntur H.O', district: 'Guntur', state: 'Andhra Pradesh', lat: 16.3067, lng: 80.4365 },
  '522002': { locality: 'Guntur Arundelpet', postOffice: 'Arundelpet S.O', district: 'Guntur', state: 'Andhra Pradesh', lat: 16.3020, lng: 80.4420 },
  '522003': { locality: 'Guntur Brodipet', postOffice: 'Brodipet S.O', district: 'Guntur', state: 'Andhra Pradesh', lat: 16.3120, lng: 80.4310 },
  '522004': { locality: 'Guntur Pattabhipuram', postOffice: 'Pattabhipuram S.O', district: 'Guntur', state: 'Andhra Pradesh', lat: 16.2950, lng: 80.4200 },
  '522005': { locality: 'Guntur Kothapet', postOffice: 'Kothapet S.O', district: 'Guntur', state: 'Andhra Pradesh', lat: 16.3150, lng: 80.4490 },
  '522006': { locality: 'Guntur Collectorate', postOffice: 'Guntur Collectorate S.O', district: 'Guntur', state: 'Andhra Pradesh', lat: 16.3080, lng: 80.4330 },
  '522007': { locality: 'Guntur Nallapadu', postOffice: 'Nallapadu S.O', district: 'Guntur', state: 'Andhra Pradesh', lat: 16.2750, lng: 80.3950 },
  '522019': { locality: 'Guntur R.V. Nagar', postOffice: 'R.V. Nagar S.O', district: 'Guntur', state: 'Andhra Pradesh', lat: 16.2910, lng: 80.4150 },

  // Tenali
  '522201': { locality: 'Tenali Head Office', postOffice: 'Tenali H.O', district: 'Guntur', state: 'Andhra Pradesh', lat: 16.2437, lng: 80.6400 },
  '522202': { locality: 'Tenali Morrispet', postOffice: 'Morrispet S.O', district: 'Guntur', state: 'Andhra Pradesh', lat: 16.2380, lng: 80.6450 },

  // Mangalagiri & Tadepalli
  '522501': { locality: 'Tadepalli', postOffice: 'Tadepalli S.O', district: 'Guntur', state: 'Andhra Pradesh', lat: 16.4800, lng: 80.6000 },
  '522502': { locality: 'Kunchanapalli', postOffice: 'Kunchanapalli B.O', district: 'Guntur', state: 'Andhra Pradesh', lat: 16.4600, lng: 80.5800 },
  '522503': { locality: 'Mangalagiri', postOffice: 'Mangalagiri S.O', district: 'Guntur', state: 'Andhra Pradesh', lat: 16.4357, lng: 80.5670 },
  '522237': { locality: 'Amaravati', postOffice: 'Amaravati S.O', district: 'Guntur', state: 'Andhra Pradesh', lat: 16.5131, lng: 80.5165 },

  // Palnadu District
  '522601': { locality: 'Narasaraopet', postOffice: 'Narasaraopet H.O', district: 'Palnadu', state: 'Andhra Pradesh', lat: 16.2346, lng: 80.0499 },
  '522616': { locality: 'Chilakaluripet', postOffice: 'Chilakaluripet S.O', district: 'Palnadu', state: 'Andhra Pradesh', lat: 16.0892, lng: 80.1672 },
  '522413': { locality: 'Piduguralla', postOffice: 'Piduguralla S.O', district: 'Palnadu', state: 'Andhra Pradesh', lat: 16.4800, lng: 79.8900 },
  '522403': { locality: 'Sattenapalle', postOffice: 'Sattenapalle S.O', district: 'Palnadu', state: 'Andhra Pradesh', lat: 16.3962, lng: 80.1818 },
  '522414': { locality: 'Macherla', postOffice: 'Macherla S.O', district: 'Palnadu', state: 'Andhra Pradesh', lat: 16.4800, lng: 79.3000 },
  '522426': { locality: 'Vinukonda', postOffice: 'Vinukonda S.O', district: 'Palnadu', state: 'Andhra Pradesh', lat: 16.0500, lng: 79.7500 },

  // NTR & Krishna District (Vijayawada)
  '520001': { locality: 'Vijayawada Head Office', postOffice: 'Vijayawada H.O', district: 'NTR', state: 'Andhra Pradesh', lat: 16.5062, lng: 80.6480 },
  '520002': { locality: 'Vijayawada Governorpet', postOffice: 'Governorpet S.O', district: 'NTR', state: 'Andhra Pradesh', lat: 16.5120, lng: 80.6350 },
  '520003': { locality: 'Vijayawada Gandhinagar', postOffice: 'Gandhinagar S.O', district: 'NTR', state: 'Andhra Pradesh', lat: 16.5180, lng: 80.6280 },
  '520004': { locality: 'Vijayawada Satyanarayanapuram', postOffice: 'Satyanarayanapuram S.O', district: 'NTR', state: 'Andhra Pradesh', lat: 16.5250, lng: 80.6320 },
  '520005': { locality: 'Vijayawada Bhavanipuram', postOffice: 'Bhavanipuram S.O', district: 'NTR', state: 'Andhra Pradesh', lat: 16.5300, lng: 80.5900 },
  '520007': { locality: 'Vijayawada Gunadala', postOffice: 'Gunadala S.O', district: 'NTR', state: 'Andhra Pradesh', lat: 16.5150, lng: 80.6650 },
  '520008': { locality: 'Vijayawada Patamata', postOffice: 'Patamata S.O', district: 'NTR', state: 'Andhra Pradesh', lat: 16.4950, lng: 80.6600 },
  '520010': { locality: 'Vijayawada Autonagar', postOffice: 'Autonagar S.O', district: 'NTR', state: 'Andhra Pradesh', lat: 16.4900, lng: 80.6800 },
  '520011': { locality: 'Vijayawada Moghalrajpuram', postOffice: 'Moghalrajpuram S.O', district: 'NTR', state: 'Andhra Pradesh', lat: 16.5000, lng: 80.6450 },
  '520012': { locality: 'Vijayawada Benz Circle', postOffice: 'Benz Circle S.O', district: 'NTR', state: 'Andhra Pradesh', lat: 16.4980, lng: 80.6520 },
  '520013': { locality: 'Vijayawada Vidyadharapuram', postOffice: 'Vidyadharapuram S.O', district: 'NTR', state: 'Andhra Pradesh', lat: 16.5350, lng: 80.6050 },
  '520015': { locality: 'Vijayawada Enikepadu', postOffice: 'Enikepadu S.O', district: 'NTR', state: 'Andhra Pradesh', lat: 16.5200, lng: 80.7000 },
  '521001': { locality: 'Machilipatnam', postOffice: 'Machilipatnam H.O', district: 'Krishna', state: 'Andhra Pradesh', lat: 16.1875, lng: 81.1389 },
  '521175': { locality: 'Gudivada', postOffice: 'Gudivada H.O', district: 'Krishna', state: 'Andhra Pradesh', lat: 16.4300, lng: 80.9900 },

  // Prakasam District
  '523001': { locality: 'Ongole Head Office', postOffice: 'Ongole H.O', district: 'Prakasam', state: 'Andhra Pradesh', lat: 15.5057, lng: 80.0499 },
  '523155': { locality: 'Chirala', postOffice: 'Chirala H.O', district: 'Bapatla', state: 'Andhra Pradesh', lat: 15.8200, lng: 80.3500 }
};

/**
 * Look up postal locality details for a given 6-digit postal pincode.
 * @param {string} pincode 
 * @returns {Promise<Object|null>}
 */
async function lookupPostalPincode(pincode) {
  if (!pincode) return null;
  const cleanPin = String(pincode).trim();
  if (cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
    return null;
  }

  // 1. Check local postal directory
  if (POSTAL_DIRECTORY[cleanPin]) {
    const data = POSTAL_DIRECTORY[cleanPin];
    return {
      pincode: cleanPin,
      locality: data.locality,
      postOffice: data.postOffice,
      district: data.district,
      state: data.state,
      latitude: data.lat,
      longitude: data.lng,
      source: 'INDIA_POST_DIRECTORY'
    };
  }

  // 2. Fallback to OpenStreetMap / Postal geocoding if online and external pincode
  try {
    const fetch = globalThis.fetch || require('node-fetch');
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${cleanPin}&country=India&format=json&addressdetails=1&limit=1`,
      {
        headers: { 'User-Agent': 'LocalFix-PostalDirectory/1.0' }
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const addr = item.address || {};
        const locality = addr.city || addr.town || addr.village || addr.suburb || addr.county || 'Local Area';
        const district = addr.state_district || addr.county || addr.district || '';
        const state = addr.state || 'Andhra Pradesh';
        return {
          pincode: cleanPin,
          locality,
          postOffice: `${locality} P.O.`,
          district,
          state,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          source: 'GEOCODING_LOOKUP'
        };
      }
    }
  } catch (err) {
    // Network lookup silently bypassed
  }

  return null;
}

module.exports = {
  POSTAL_DIRECTORY,
  lookupPostalPincode
};
