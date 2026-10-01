const https = require('https');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Municipality = require('../models/Municipality');
const municipalityService = require('../services/municipalityService');

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'LocalFix-App/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function searchCity(query) {
  const results = [];
  const seen = new Set();
  
  // 1. Check local DB municipalities matching city, name, district
  const searchRegex = new RegExp(query.trim(), 'i');
  const dbMatches = await Municipality.find({
    isActive: true,
    $or: [
      { city: searchRegex },
      { name: searchRegex },
      { district: searchRegex }
    ]
  }).limit(10);
  
  for (const m of dbMatches) {
    const key = `${m.city}|${m.district}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      results.push({
        city: m.city,
        district: m.district,
        state: m.state,
        pincode: m.pincodes?.[0] || '',
        lat: m.latitude,
        lng: m.longitude,
        municipality: m,
        source: 'DATABASE'
      });
    }
  }
  
  // 2. Query Nominatim for locations matching query in India
  const geoUrl = 'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=in&limit=6&q=' + encodeURIComponent(query.trim());
  const geoResults = await fetchJson(geoUrl);
  
  if (Array.isArray(geoResults)) {
    for (const item of geoResults) {
      const addr = item.address || {};
      const cityName = addr.city || addr.town || addr.village || addr.suburb || addr.county || '';
      const districtName = addr.state_district || addr.county || '';
      const stateName = addr.state || '';
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      const pincode = addr.postcode || '';
      
      if (!cityName) continue;
      
      const key = `${cityName}|${districtName}`.toLowerCase();
      if (seen.has(key)) continue;
      
      // Resolve which municipality in our system covers this location
      const resolution = await municipalityService.resolveMunicipalityFromLocation({
        latitude: lat,
        longitude: lng,
        city: cityName,
        district: districtName
      });
      
      if (resolution.municipality && (resolution.distanceKm === null || resolution.distanceKm <= 50 || resolution.municipality.district?.toLowerCase() === districtName?.toLowerCase())) {
        seen.add(key);
        results.push({
          city: cityName,
          district: districtName || resolution.municipality.district,
          state: stateName || resolution.municipality.state,
          pincode: pincode || resolution.municipality.pincodes?.[0] || '',
          lat: lat,
          lng: lng,
          municipality: resolution.municipality,
          distanceKm: resolution.distanceKm,
          source: 'GEOCODED'
        });
      }
    }
  }
  
  console.log(`Search for "${query}" found ${results.length} items:`);
  results.forEach(r => console.log(` -> ${r.city} (${r.district}) => ${r.municipality.name} [${r.distanceKm ? r.distanceKm + 'km' : 'HQ'}]`));
}

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/localfix');
  await searchCity('Nagaram');
  await searchCity('Tenali');
  await searchCity('Repalle');
  await searchCity('NonExistentPlaceXyz123');
  await mongoose.disconnect();
}

main();
