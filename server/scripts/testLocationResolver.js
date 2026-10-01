const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const municipalityService = require('../services/municipalityService');

async function runTests() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/localfix';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB for testing.');

  // Test 1: Pincode resolution (Vijayawada 520001)
  const pinRes = await municipalityService.resolveMunicipalityFromLocation({ pincode: '520001' });
  console.log('Test 1 (PINCODE 520001):', pinRes.municipality?.name, '| Match:', pinRes.matchType);

  // Test 2: City resolution (Tenali)
  const cityRes = await municipalityService.resolveMunicipalityFromLocation({ city: 'Tenali' });
  console.log('Test 2 (CITY Tenali):', cityRes.municipality?.name, '| Match:', cityRes.matchType);

  // Test 3: GPS Coordinates in Guntur (16.3067, 80.4365)
  const gpsRes = await municipalityService.resolveMunicipalityFromLocation({ latitude: 16.3067, longitude: 80.4365 });
  console.log('Test 3 (GPS Guntur):', gpsRes.municipality?.name, '| Match:', gpsRes.matchType, '| Dist:', gpsRes.distanceKm, 'km');

  // Test 4: GPS Coordinates in Tenali (16.2437, 80.6400)
  const tenaliGps = await municipalityService.resolveMunicipalityFromLocation({ latitude: 16.2437, longitude: 80.6400 });
  console.log('Test 4 (GPS Tenali):', tenaliGps.municipality?.name, '| Match:', tenaliGps.matchType, '| Dist:', tenaliGps.distanceKm, 'km');

  // Test 5: Nearby municipalities around Guntur
  const nearby = await municipalityService.getNearbyMunicipalities({ latitude: 16.3067, longitude: 80.4365, limit: 3 });
  console.log('Test 5 (Nearby GMC):', nearby.map(n => `${n.municipality.name} (${n.distanceKm}km)`).join(', '));

  await mongoose.disconnect();
  console.log('All backend resolver tests completed successfully.');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
