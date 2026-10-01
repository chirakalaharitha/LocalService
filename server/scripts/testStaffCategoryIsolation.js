const mongoose = require('mongoose');
require('dotenv').config();

const Request = require('../models/Request');
const User = require('../models/User');
const Department = require('../models/Department');
const Municipality = require('../models/Municipality');
const ActivityLog = require('../models/ActivityLog');
const { getAssignedRequests } = require('../controllers/staffController');

async function runStaffCategoryTests() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/localfix';
  console.log('Connecting to MongoDB at:', uri);
  await mongoose.connect(uri);
  console.log('MongoDB connected successfully.\n');

  try {
    // 1. Create or fetch two distinct staff members: Staff A and Staff B
    let staffA = await User.findOne({ email: 'staff.a.test@localfix.test' });
    if (!staffA) {
      staffA = await User.create({
        name: 'Staff Member A',
        email: 'staff.a.test@localfix.test',
        password: 'password123',
        phone: '9900112233',
        role: 'STAFF'
      });
    }

    let staffB = await User.findOne({ email: 'staff.b.test@localfix.test' });
    if (!staffB) {
      staffB = await User.create({
        name: 'Staff Member B',
        email: 'staff.b.test@localfix.test',
        password: 'password123',
        phone: '9900112244',
        role: 'STAFF'
      });
    }

    // Citizen for reporting
    let testCitizen = await User.findOne({ email: 'citizen.test@localfix.test' });
    if (!testCitizen) {
      testCitizen = await User.create({
        name: 'Citizen Test',
        email: 'citizen.test@localfix.test',
        password: 'password123',
        phone: '9900112255',
        role: 'CITIZEN'
      });
    }

    console.log(`[PASS] Users ready: Staff A (${staffA._id}), Staff B (${staffB._id})`);

    // Clean up any old test requests for these staff members
    await Request.deleteMany({
      $or: [
        { assignedStaff: { $in: [staffA._id, staffB._id] } },
        { assignedTo: { $in: [staffA._id, staffB._id] } },
        { requestId: { $regex: /^TEST-CAT-/ } }
      ]
    });

    const now = new Date();

    // 2. Staff A Assignments:
    // 3 Water Supply requests
    // 2 Streetlight requests
    await Request.create([
      // Water Supply requests
      {
        requestId: 'TEST-CAT-W1',
        title: 'Water pipe leak near Market Rd',
        description: 'Underground pipeline rupture',
        category: 'WATER',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        citizen: testCitizen._id,
        assignedStaff: staffA._id,
        assignedTo: staffA._id,
        address: 'Market Road, Guntur',
        location: { type: 'Point', coordinates: [80.4365, 16.3067] },
        slaDeadline: new Date(now.getTime() + 2 * 24 * 3600 * 1000)
      },
      {
        requestId: 'TEST-CAT-W2',
        title: 'Low water pressure Sector 4',
        description: 'Water pressure dropped',
        category: 'WATER',
        priority: 'MEDIUM',
        status: 'ASSIGNED',
        citizen: testCitizen._id,
        assignedStaff: staffA._id,
        assignedTo: staffA._id,
        address: 'Sector 4, Guntur',
        location: { type: 'Point', coordinates: [80.4400, 16.3100] },
        slaDeadline: new Date(now.getTime() + 3 * 24 * 3600 * 1000)
      },
      {
        requestId: 'TEST-CAT-W3',
        title: 'Water valve broken',
        description: 'Main valve needs replacement',
        category: 'WATER',
        priority: 'CRITICAL',
        status: 'RESOLVED',
        citizen: testCitizen._id,
        assignedStaff: staffA._id,
        assignedTo: staffA._id,
        address: 'Ring Road, Guntur',
        location: { type: 'Point', coordinates: [80.4450, 16.3150] },
        slaDeadline: new Date(now.getTime() - 1 * 24 * 3600 * 1000)
      },
      // Streetlight requests
      {
        requestId: 'TEST-CAT-S1',
        title: 'Streetlight pole dark',
        description: 'Pole #14 dark for 2 nights',
        category: 'STREET_LIGHT',
        priority: 'LOW',
        status: 'IN_PROGRESS',
        citizen: testCitizen._id,
        assignedStaff: staffA._id,
        assignedTo: staffA._id,
        address: 'College Road, Tenali',
        location: { type: 'Point', coordinates: [80.6400, 16.2400] },
        slaDeadline: new Date(now.getTime() + 4 * 24 * 3600 * 1000)
      },
      {
        requestId: 'TEST-CAT-S2',
        title: 'Flickering street light',
        description: 'Light flickers constantly',
        category: 'STREET_LIGHT',
        priority: 'MEDIUM',
        status: 'ASSIGNED',
        citizen: testCitizen._id,
        assignedStaff: staffA._id,
        assignedTo: staffA._id,
        address: 'Station Road, Tenali',
        location: { type: 'Point', coordinates: [80.6450, 16.2450] },
        slaDeadline: new Date(now.getTime() + 1 * 24 * 3600 * 1000)
      }
    ]);

    // 3. Staff B Assignments:
    // 2 Roads & Potholes requests
    await Request.create([
      {
        requestId: 'TEST-CAT-R1',
        title: 'Severe pothole near flyover',
        description: 'Dangerous pothole on main artery',
        category: 'ROAD',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        citizen: testCitizen._id,
        assignedStaff: staffB._id,
        assignedTo: staffB._id,
        address: 'Flyover approach, Repalle',
        location: { type: 'Point', coordinates: [80.8500, 16.0200] },
        slaDeadline: new Date(now.getTime() + 2 * 24 * 3600 * 1000)
      },
      {
        requestId: 'TEST-CAT-R2',
        title: 'Crumbling road surface',
        description: 'Asphalt erosion after rains',
        category: 'ROAD',
        priority: 'MEDIUM',
        status: 'ASSIGNED',
        citizen: testCitizen._id,
        assignedStaff: staffB._id,
        assignedTo: staffB._id,
        address: 'Main Bazaar, Repalle',
        location: { type: 'Point', coordinates: [80.8550, 16.0250] },
        slaDeadline: new Date(now.getTime() + 3 * 24 * 3600 * 1000)
      }
    ]);

    console.log('[PASS] Test requests inserted: Staff A (3 Water, 2 Streetlights), Staff B (2 Roads)');

    // Helper to invoke getAssignedRequests controller directly
    const invokeController = (user, query = {}) => {
      return new Promise((resolve, reject) => {
        const req = { user, query };
        const res = {
          status: (statusCode) => ({
            json: (data) => resolve({ statusCode, data })
          })
        };
        const next = (err) => reject(err);
        getAssignedRequests(req, res, next).catch(reject);
      });
    };

    // ==========================================
    // TEST 1: Staff A Dashboard Categories & Data
    // ==========================================
    console.log('\n--- Testing Staff A Dashboard ---');
    const resultA = await invokeController(staffA);
    const dataA = resultA.data;

    console.log('Staff A stats:', dataA.stats);
    console.log('Staff A categories:', dataA.categoryDistribution);
    console.log('Staff A status distribution:', dataA.statusDistribution);

    // Verify Total Assigned is 5
    if (dataA.stats.totalAssigned !== 5) {
      throw new Error(`Staff A totalAssigned should be 5, got ${dataA.stats.totalAssigned}`);
    }

    // Verify Category Distribution has ONLY 2 categories: Water Supply (3) and Streetlights (2)
    if (dataA.categoryDistribution.length !== 2) {
      throw new Error(`Staff A should have exactly 2 categories, got ${dataA.categoryDistribution.length}`);
    }

    const waterCategory = dataA.categoryDistribution.find(c => c.key === 'WATER');
    const streetCategory = dataA.categoryDistribution.find(c => c.key === 'STREET_LIGHT');

    if (!waterCategory || waterCategory.count !== 3) {
      throw new Error(`Staff A Water Supply count should be 3, got ${waterCategory?.count}`);
    }
    if (!streetCategory || streetCategory.count !== 2) {
      throw new Error(`Staff A Streetlights count should be 2, got ${streetCategory?.count}`);
    }

    // Check that NO zero-value categories exist (Road, Garbage, Parks, etc. must NOT be present!)
    const forbiddenCategoriesA = ['ROAD', 'GARBAGE', 'DRAINAGE', 'PUBLIC_AREA', 'ELECTRICITY'];
    forbiddenCategoriesA.forEach(cat => {
      const exists = dataA.categoryDistribution.some(c => c.key === cat);
      if (exists) throw new Error(`Category ${cat} should NOT appear for Staff A`);
    });

    console.log('[PASS] Staff A has ONLY Water Supply (3) and Streetlights (2). Zero dummy or 0-count categories.');

    // ==========================================
    // TEST 2: Staff B Dashboard Categories & Data
    // ==========================================
    console.log('\n--- Testing Staff B Dashboard ---');
    const resultB = await invokeController(staffB);
    const dataB = resultB.data;

    console.log('Staff B stats:', dataB.stats);
    console.log('Staff B categories:', dataB.categoryDistribution);

    // Verify Total Assigned is 2
    if (dataB.stats.totalAssigned !== 2) {
      throw new Error(`Staff B totalAssigned should be 2, got ${dataB.stats.totalAssigned}`);
    }

    // Verify Category Distribution has ONLY 1 category: Roads & Potholes (2)
    if (dataB.categoryDistribution.length !== 1) {
      throw new Error(`Staff B should have exactly 1 category, got ${dataB.categoryDistribution.length}`);
    }

    const roadCategory = dataB.categoryDistribution.find(c => c.key === 'ROAD');
    if (!roadCategory || roadCategory.count !== 2) {
      throw new Error(`Staff B Roads count should be 2, got ${roadCategory?.count}`);
    }

    // Check that Water and Streetlights do NOT appear for Staff B
    const forbiddenCategoriesB = ['WATER', 'STREET_LIGHT', 'GARBAGE', 'DRAINAGE', 'PUBLIC_AREA'];
    forbiddenCategoriesB.forEach(cat => {
      const exists = dataB.categoryDistribution.some(c => c.key === cat);
      if (exists) throw new Error(`Category ${cat} should NOT appear for Staff B`);
    });

    console.log('[PASS] Staff B has ONLY Roads & Potholes (2). No cross-staff data leakage.');

    // ==========================================================
    // TEST 3: Real-Time Reassignment (Reassign Water Request to B)
    // ==========================================================
    console.log('\n--- Testing Reassignment from Staff A to Staff B ---');
    const targetReq = await Request.findOne({ requestId: 'TEST-CAT-W1' });
    targetReq.assignedStaff = staffB._id;
    targetReq.assignedTo = staffB._id;
    await targetReq.save();

    // Check Staff A: Water Supply count should decrease from 3 to 2
    const resultA_after = await invokeController(staffA);
    const waterAfterA = resultA_after.data.categoryDistribution.find(c => c.key === 'WATER');
    if (waterAfterA.count !== 2) {
      throw new Error(`Staff A Water Supply count should decrease to 2, got ${waterAfterA.count}`);
    }
    console.log(`[PASS] Staff A Water Supply count decreased to ${waterAfterA.count} after reassignment`);

    // Check Staff B: Now has Roads (2) AND Water Supply (1)
    const resultB_after = await invokeController(staffB);
    const waterAfterB = resultB_after.data.categoryDistribution.find(c => c.key === 'WATER');
    if (!waterAfterB || waterAfterB.count !== 1) {
      throw new Error(`Staff B should now have Water Supply with count 1`);
    }
    console.log(`[PASS] Staff B now dynamically includes Water Supply (count 1) alongside Roads`);

    // ==========================================================
    // TEST 4: Staff with 0 assigned requests (Empty State Check)
    // ==========================================================
    console.log('\n--- Testing Staff with 0 Assigned Requests ---');
    let staffC = await User.findOne({ email: 'staff.c.zero@localfix.test' });
    if (!staffC) {
      staffC = await User.create({
        name: 'Staff Member Zero',
        email: 'staff.c.zero@localfix.test',
        password: 'password123',
        phone: '9900112266',
        role: 'STAFF'
      });
    }

    const resultC = await invokeController(staffC);
    const dataC = resultC.data;

    console.log('Staff C stats:', dataC.stats);
    console.log('Staff C categories:', dataC.categoryDistribution);

    if (dataC.stats.totalAssigned !== 0) {
      throw new Error(`Staff C should have totalAssigned = 0, got ${dataC.stats.totalAssigned}`);
    }
    if (dataC.categoryDistribution.length !== 0) {
      throw new Error(`Staff C categoryDistribution should be empty, got ${dataC.categoryDistribution.length}`);
    }
    if (dataC.requests.length !== 0) {
      throw new Error(`Staff C requests should be empty, got ${dataC.requests.length}`);
    }

    console.log('[PASS] Staff C with 0 assigned requests returns 0 totalAssigned, [] categoryDistribution, and [] requests.');

    // Cleanup
    await Request.deleteMany({ requestId: { $regex: /^TEST-CAT-/ } });
    await User.deleteMany({ _id: { $in: [staffA._id, staffB._id, staffC._id, testCitizen._id] } });
    console.log('[PASS] Test cleanup completed successfully.');

    console.log('\n=== ALL STAFF DASHBOARD ASSIGNED CATEGORY TESTS PASSED 100% ===');
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

runStaffCategoryTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
