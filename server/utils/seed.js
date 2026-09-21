const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const Department = require('../models/Department');
const Municipality = require('../models/Municipality');

const seedData = async () => {
  try {
    await connectDB();

    console.log('[Seed] Checking and updating municipal departments and real Admin account...');
    
    // Standard Civic Departments
    const departmentsData = [
      { name: 'Water Department', code: 'WATER', description: 'Manages municipal water supply, leakages, and pipelines.', icon: 'HiOutlineDroplet' },
      { name: 'Electricity Department', code: 'ELECTRICITY', description: 'Handles power outages, transformer fixes, and electrical hazards.', icon: 'HiOutlineLightningBolt' },
      { name: 'Road Maintenance', code: 'ROAD', description: 'Repairs damaged roads, potholes, and street blockages.', icon: 'HiOutlineTruck' },
      { name: 'Sanitation', code: 'GARBAGE', description: 'Garbage collection, public cleanliness, and waste management.', icon: 'HiOutlineTrash' },
      { name: 'Drainage & Sewage', code: 'DRAINAGE', description: 'Drainage clearing, storm water management, and sewage leaks.', icon: 'HiOutlineChartBar' },
      { name: 'Public Works & Lighting', code: 'STREET_LIGHT', description: 'Streetlight maintenance, parks, and civic infrastructure.', icon: 'HiOutlineSun' },
      { name: 'General Public Services', code: 'OTHER', description: 'General civic complaints and public area maintenance.', icon: 'HiOutlineOfficeBuilding' }
    ];

    for (const dept of departmentsData) {
      await Department.findOneAndUpdate({ code: dept.code }, dept, { upsert: true, new: true });
    }
    console.log('[Seed] Civic Departments verified in MongoDB.');

    // Standard Municipality Setup (Guntur Municipal Corporation GMC-01)
    let gmc = await Municipality.findOne({ code: 'GMC-01' });
    if (!gmc) {
      gmc = await Municipality.create({
        name: 'Guntur Municipal Corporation',
        code: 'GMC-01',
        city: 'Guntur',
        state: 'Andhra Pradesh',
        country: 'India',
        pincodes: ['522001', '522002', '522003', '522004', '522006', '522213'],
        wards: [
          { wardNumber: 'Ward 1', name: 'Brodipet', zone: 'North Zone' },
          { wardNumber: 'Ward 2', name: 'Arundelpet', zone: 'North Zone' },
          { wardNumber: 'Ward 3', name: 'Pattabhipuram', zone: 'West Zone' },
          { wardNumber: 'Ward 4', name: 'Kothapet', zone: 'East Zone' },
          { wardNumber: 'Ward 5', name: 'Old Guntur', zone: 'South Zone' },
          { wardNumber: 'Ward 6', name: 'Nallapadu', zone: 'South Zone' },
          { wardNumber: 'Ward 7', name: 'Syndicate Nagar', zone: 'West Zone' },
          { wardNumber: 'Ward 8', name: 'Vidya Nagar', zone: 'Central Zone' }
        ],
        isActive: true,
        contactPhone: '0863-2224202',
        contactEmail: 'commissioner@gunturcorporation.org'
      });
      console.log(`[Seed] Provisioned Municipality: ${gmc.name} (${gmc.code})`);
    } else {
      console.log(`[Seed] Existing Municipality found: ${gmc.name} (${gmc.code})`);
    }

    // Real Admin Account (harithachirakala@gmail.com)
    const adminEmail = 'harithachirakala@gmail.com';
    const adminExists = await User.findOne({ email: adminEmail });
    if (!adminExists) {
      console.warn(`[Seed] Notice: ${adminEmail} is not yet in MongoDB. Will create with initial Admin role.`);
      await User.create({
        name: 'Haritha Chirakala',
        email: adminEmail,
        phone: '9550964177',
        password: 'AdminSecurePassword@123',
        role: 'ADMIN',
        isActive: true,
        isVerified: true,
        municipality: gmc._id,
        city: 'Guntur',
        state: 'AP',
        pincode: '522213'
      });
      console.log(`[Seed] Created Real Admin User: ${adminEmail}`);
    } else {
      await User.updateOne(
        { email: adminEmail },
        {
          role: 'ADMIN',
          isVerified: true,
          isActive: true,
          municipality: gmc._id,
          verificationOtp: undefined,
          verificationOtpExpires: undefined,
          verificationOtpAttempts: 0
        }
      );
      console.log(`[Seed] Existing Admin account ${adminEmail} verified with role: ADMIN and GMC municipality.`);
    }

    // Also link chharitha050@gmail.com if exists
    await User.updateMany(
      { email: { $in: ['harithachirakala@gmail.com', 'chharitha050@gmail.com'] } },
      { $set: { municipality: gmc._id, role: 'ADMIN', isVerified: true, isActive: true } }
    );

    // Zero dummy staff. Zero dummy citizens.
    console.log('[Seed] Database setup completed successfully with zero dummy data.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error during setup:', error);
    process.exit(1);
  }
};

seedData();
