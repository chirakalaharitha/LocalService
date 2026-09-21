const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const Request = require('../models/Request');
const Municipality = require('../models/Municipality');
const Department = require('../models/Department');

const cleanLegacyData = async () => {
  console.log('\n==================================================');
  console.log('       LOCALFIX – REAL DATA PURGE & BIND          ');
  console.log('==================================================\n');

  try {
    await connectDB();

    const gmc = await Municipality.findOne({ code: 'GMC-01' });
    if (!gmc) {
      throw new Error('Municipality GMC-01 not found! Run setupAdmin.js first.');
    }
    console.log(`[GMC] Found target Municipality: ${gmc.name} (${gmc._id})`);

    // 1. Ensure real Admin users are linked to GMC
    const adminEmails = ['harithachirakala@gmail.com', 'chharitha050@gmail.com'];
    await User.updateMany(
      { email: { $in: adminEmails } },
      { $set: { municipality: gmc._id, role: 'ADMIN', isActive: true, isVerified: true } }
    );
    console.log(`[Users] Verified real Admins linked to GMC: ${adminEmails.join(', ')}`);

    // 2. Link real Staff harinigolla681@gmail.com to GMC
    const staffUser = await User.findOne({ email: 'harinigolla681@gmail.com' });
    if (staffUser) {
      staffUser.municipality = gmc._id;
      staffUser.role = 'STAFF';
      staffUser.isActive = true;
      staffUser.isVerified = true;
      if (!staffUser.ward) staffUser.ward = 'Ward 1';
      await staffUser.save();
      console.log(`[Staff] Linked real staff account ${staffUser.email} to GMC (${staffUser.ward})`);
    }

    // 3. Keep real request LF-2026-1045 and link to GMC
    const realReq = await Request.findOne({ requestId: 'LF-2026-1045' });
    if (realReq) {
      realReq.municipality = gmc._id;
      realReq.ward = realReq.ward || 'Ward 5';
      await realReq.save();
      console.log(`[Request] Linked real request ${realReq.requestId} ("${realReq.title}") to GMC`);
    } else {
      console.log('[Request] Request LF-2026-1045 not found.');
    }

    // 4. Purge all obsolete test requests (keep ONLY LF-2026-1045)
    const deleteRes = await Request.deleteMany({ requestId: { $ne: 'LF-2026-1045' } });
    console.log(`[Purge] Purged ${deleteRes.deletedCount} legacy test requests from database.`);

    // 5. Verify departments: link all active departments to GMC if unlinked
    const deptUpdateRes = await Department.updateMany(
      { municipality: { $exists: false } },
      { $set: { municipality: gmc._id } }
    );
    console.log(`[Departments] Linked ${deptUpdateRes.modifiedCount} departments to GMC.`);

    // 6. Summary verification
    const totalRequests = await Request.countDocuments();
    const totalStaff = await User.countDocuments({ role: 'STAFF' });
    const totalCitizens = await User.countDocuments({ role: 'CITIZEN' });
    const totalAdmins = await User.countDocuments({ role: 'ADMIN' });

    console.log('\n==================================================');
    console.log('         DATABASE STATE POST-PURGE                ');
    console.log('==================================================');
    console.log(`Total Requests : ${totalRequests} (Real: LF-2026-1045)`);
    console.log(`Total Staff    : ${totalStaff} (Real: harinigolla681@gmail.com)`);
    console.log(`Total Admins   : ${totalAdmins}`);
    console.log(`Total Citizens : ${totalCitizens}`);
    console.log('==================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error during data cleanup:', err);
    process.exit(1);
  }
};

cleanLegacyData();
