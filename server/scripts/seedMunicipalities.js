const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const Municipality = require('../models/Municipality');

const municipalities = [
  {
    name: 'Guntur Municipal Corporation',
    code: 'GMC',
    city: 'Guntur',
    district: 'Guntur',
    state: 'Andhra Pradesh',
    type: 'CORPORATION',
    latitude: 16.3067,
    longitude: 80.4365,
    serviceRadiusKm: 25,
    pincodes: ['522001', '522002', '522003', '522004', '522005', '522006', '522007', '522019'],
    wardsCount: 57,
    isActive: true
  },
  {
    name: 'Tenali Municipality',
    code: 'TNL',
    city: 'Tenali',
    district: 'Guntur',
    state: 'Andhra Pradesh',
    type: 'MUNICIPALITY',
    latitude: 16.2437,
    longitude: 80.6400,
    serviceRadiusKm: 15,
    pincodes: ['522201', '522202'],
    wardsCount: 40,
    isActive: true
  },
  {
    name: 'Mangalagiri Tadepalli Municipal Corporation',
    code: 'MTMC',
    city: 'Mangalagiri',
    district: 'Guntur',
    state: 'Andhra Pradesh',
    type: 'CORPORATION',
    latitude: 16.4357,
    longitude: 80.5670,
    serviceRadiusKm: 20,
    pincodes: ['522501', '522502', '522503'],
    wardsCount: 50,
    isActive: true
  },
  {
    name: 'Vijayawada Municipal Corporation',
    code: 'VMC',
    city: 'Vijayawada',
    district: 'NTR',
    state: 'Andhra Pradesh',
    type: 'CORPORATION',
    latitude: 16.5062,
    longitude: 80.6480,
    serviceRadiusKm: 25,
    pincodes: [
      '520001',
      '520002',
      '520003',
      '520004',
      '520005',
      '520007',
      '520008',
      '520010',
      '520011',
      '520012',
      '520013',
      '520015'
    ],
    wardsCount: 64,
    isActive: true
  },
  {
    name: 'Bapatla Municipality',
    code: 'BPT',
    city: 'Bapatla',
    district: 'Bapatla',
    state: 'Andhra Pradesh',
    type: 'MUNICIPALITY',
    latitude: 15.9042,
    longitude: 80.4673,
    serviceRadiusKm: 15,
    pincodes: ['522101'],
    wardsCount: 34,
    isActive: true
  },
  {
    name: 'Narasaraopet Municipality',
    code: 'NRT',
    city: 'Narasaraopet',
    district: 'Palnadu',
    state: 'Andhra Pradesh',
    type: 'MUNICIPALITY',
    latitude: 16.2346,
    longitude: 80.0499,
    serviceRadiusKm: 18,
    pincodes: ['522601'],
    wardsCount: 34,
    isActive: true
  },
  {
    name: 'Chilakaluripet Municipality',
    code: 'CPT',
    city: 'Chilakaluripet',
    district: 'Palnadu',
    state: 'Andhra Pradesh',
    type: 'MUNICIPALITY',
    latitude: 16.0892,
    longitude: 80.1672,
    serviceRadiusKm: 15,
    pincodes: ['522616'],
    wardsCount: 34,
    isActive: true
  },
  {
    name: 'Piduguralla Municipality',
    code: 'PGR',
    city: 'Piduguralla',
    district: 'Palnadu',
    state: 'Andhra Pradesh',
    type: 'MUNICIPALITY',
    latitude: 16.4800,
    longitude: 79.8900,
    serviceRadiusKm: 12,
    pincodes: ['522413'],
    wardsCount: 28,
    isActive: true
  },
  {
    name: 'Sattenapalle Municipality',
    code: 'STP',
    city: 'Sattenapalle',
    district: 'Palnadu',
    state: 'Andhra Pradesh',
    type: 'MUNICIPALITY',
    latitude: 16.3962,
    longitude: 80.1818,
    serviceRadiusKm: 14,
    pincodes: ['522403'],
    wardsCount: 30,
    isActive: true
  },
  {
    name: 'Repalle Municipality',
    code: 'RPL',
    city: 'Repalle',
    district: 'Bapatla',
    state: 'Andhra Pradesh',
    type: 'MUNICIPALITY',
    latitude: 16.0200,
    longitude: 80.8500,
    serviceRadiusKm: 12,
    pincodes: ['522265'],
    wardsCount: 28,
    isActive: true
  },
  {
    name: 'Amaravati Capital Region (APCRDA)',
    code: 'APCRDA',
    city: 'Amaravati',
    district: 'Guntur',
    state: 'Andhra Pradesh',
    type: 'DEVELOPMENT_AUTHORITY',
    latitude: 16.5131,
    longitude: 80.5165,
    serviceRadiusKm: 30,
    pincodes: ['522503', '522237'],
    wardsCount: 25,
    isActive: true
  }
];

async function seed() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/localfix';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  console.log('Seeding Andhra Pradesh municipalities...');
  let upsertedCount = 0;

  for (const m of municipalities) {
    const loc = {
      type: 'Point',
      coordinates: [m.longitude, m.latitude]
    };

    const doc = await Municipality.findOneAndUpdate(
      { $or: [{ name: m.name }, { code: m.code }] },
      {
        $set: {
          ...m,
          normalizedName: m.name.toLowerCase().trim(),
          location: loc
        }
      },
      { upsert: true, new: true, runValidators: true }
    );
    upsertedCount++;
    console.log(`✓ Upserted: ${doc.name} (${doc.code}) [${doc.city}, ${doc.district}]`);
  }

  console.log(`Successfully seeded ${upsertedCount} municipalities.`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
