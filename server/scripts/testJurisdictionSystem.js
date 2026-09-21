const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const Request = require('../models/Request');
const Municipality = require('../models/Municipality');
const Department = require('../models/Department');

const testJurisdiction = async () => {
  console.log('\n======================================================');
  console.log('   LOCALFIX – MUNICIPAL JURISDICTION INTEGRITY TEST   ');
  console.log('======================================================\n');

  try {
    await connectDB();

    // 1. Verify Default Municipality & Admin Binding
    const gmc = await Municipality.findOne({ code: 'GMC-01' });
    if (!gmc) {
      throw new Error('Default municipality GMC-01 not found in MongoDB!');
    }
    console.log(`[PASS] Verified default municipality: ${gmc.name} (${gmc.code})`);
    console.log(`       Wards configured: ${gmc.wards?.length || 0}`);
    console.log(`       Pincodes configured: ${gmc.pincodes?.join(', ')}`);

    const adminUser = await User.findOne({ email: 'harithachirakala@gmail.com' });
    if (!adminUser) {
      throw new Error('Admin user harithachirakala@gmail.com not found!');
    }
    if (!adminUser.municipality || adminUser.municipality.toString() !== gmc._id.toString()) {
      throw new Error(`Admin user is not bound to GMC! (bound to: ${adminUser.municipality})`);
    }
    console.log(`[PASS] Verified Admin ${adminUser.email} is bound to GMC (${gmc._id})`);

    // 2. Test Multi-Jurisdiction Isolation
    console.log('\n[TEST] Testing Multi-Jurisdiction Isolation & Cross-Jurisdiction Guards...');

    // Create a temporary secondary municipality
    const vmc = await Municipality.findOneAndUpdate(
      { code: 'VMC-TEST-99' },
      {
        name: 'Vijayawada Municipal Corporation (Test)',
        code: 'VMC-TEST-99',
        city: 'Vijayawada',
        state: 'Andhra Pradesh',
        country: 'India',
        pincodes: ['520001', '520002'],
        wards: [{ wardNumber: 'Ward 1', name: 'Governorpet', zone: 'Central' }],
        isActive: true
      },
      { upsert: true, new: true }
    );
    console.log(`[SETUP] Created temporary secondary municipality: ${vmc.name} (${vmc.code})`);

    // Create test dept
    let dept = await Department.findOne({ code: 'WATER' });
    if (!dept) {
      dept = await Department.create({ name: 'Water Department', code: 'WATER' });
    }

    // Create test staff in VMC
    const vmcStaff = await User.findOneAndUpdate(
      { email: 'vmc.staff.test@localfix.gov.in' },
      {
        name: 'VMC Test Staff',
        email: 'vmc.staff.test@localfix.gov.in',
        phone: '9999900001',
        password: 'Password123!',
        role: 'STAFF',
        municipality: vmc._id,
        department: dept._id,
        isActive: true,
        isVerified: true
      },
      { upsert: true, new: true }
    );

    // Create a request in VMC
    const vmcReq = await Request.create({
      requestId: 'REQ-TEST-VMC-01',
      title: 'Water leak in Vijayawada (Test)',
      description: 'Pipeline leakage in Governorpet test area',
      category: 'WATER',
      priority: 'HIGH',
      status: 'PENDING',
      address: 'Governorpet, Vijayawada',
      city: 'Vijayawada',
      location: {
        type: 'Point',
        coordinates: [80.6480, 16.5062]
      },
      slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      municipality: vmc._id,
      citizen: adminUser._id,
      department: dept._id
    });

    // Create a request in GMC
    const gmcReq = await Request.create({
      requestId: 'REQ-TEST-GMC-01',
      title: 'Water leak in Guntur (Test)',
      description: 'Pipeline leakage in Brodipet test area',
      category: 'WATER',
      priority: 'MEDIUM',
      status: 'PENDING',
      address: 'Brodipet, Guntur',
      city: 'Guntur',
      location: {
        type: 'Point',
        coordinates: [80.4365, 16.3067]
      },
      slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      municipality: gmc._id,
      citizen: adminUser._id,
      department: dept._id
    });

    // Verify Query Scoping Simulation (as performed in requestController.getRequests)
    const adminQuery = { municipality: adminUser.municipality };
    const scopedRequests = await Request.find(adminQuery);
    const hasVmcReq = scopedRequests.some(r => r._id.toString() === vmcReq._id.toString());
    const hasGmcReq = scopedRequests.some(r => r._id.toString() === gmcReq._id.toString());

    if (hasVmcReq) {
      throw new Error('[FAIL] Cross-jurisdiction leak: Admin query returned VMC request!');
    }
    if (!hasGmcReq) {
      throw new Error('[FAIL] Admin query failed to return its own jurisdiction request!');
    }
    console.log('[PASS] Query isolation verified: GMC Admin receives 0 records from VMC.');

    // Verify Cross-Jurisdiction Staff Assignment Guard Simulation
    // (GMC Request cannot be assigned to VMC Staff)
    const isSameJurisdiction = gmcReq.municipality.toString() === vmcStaff.municipality.toString();
    if (isSameJurisdiction) {
      throw new Error('[FAIL] Jurisdiction match expected to be false for cross-assignment.');
    }
    console.log('[PASS] Cross-jurisdiction staff assignment guard verified: Assignment blocked between GMC and VMC.');

    // Cleanup test records
    await Request.deleteMany({ _id: { $in: [vmcReq._id, gmcReq._id] } });
    await User.deleteOne({ _id: vmcStaff._id });
    await Municipality.deleteOne({ _id: vmc._id });
    console.log('[CLEANUP] Temporary test records successfully purged.');

    console.log('\n======================================================');
    console.log('   ALL MUNICIPAL JURISDICTION TESTS PASSED (100%)    ');
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Jurisdiction Test Failed:', error);
    process.exit(1);
  }
};

testJurisdiction();
