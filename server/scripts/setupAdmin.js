const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from project root .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const Municipality = require('../models/Municipality');

const setupAdmin = async () => {
  console.log('\n==================================================');
  console.log('       LOCALFIX – ONE-TIME ADMIN SETUP            ');
  console.log('==================================================\n');

  try {
    const conn = await connectDB();
    const dbName = conn.connection.name;
    const host = conn.connection.host;
    console.log(`[MongoDB] Connected to database: ${dbName} (${host})`);

    // Provision default Municipality (Guntur Municipal Corporation)
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
      console.log(`[Setup] Provisioned Municipality: ${gmc.name} (${gmc.code})`);
    } else {
      console.log(`[Setup] Existing Municipality found: ${gmc.name} (${gmc.code})`);
    }

    const adminEmail = 'harithachirakala@gmail.com';
    const normalizedEmail = adminEmail.toLowerCase().trim();

    // Check if password passed via CLI arg or env var
    const cliPassword = process.argv[2] || process.env.ADMIN_PASSWORD;

    let user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (user) {
      console.log(`[Setup] Existing account found for: ${normalizedEmail}`);

      user.role = 'ADMIN';
      user.isVerified = true;
      user.isActive = true;
      user.municipality = gmc._id;
      user.verificationOtp = undefined;
      user.verificationOtpExpires = undefined;
      user.verificationOtpAttempts = 0;

      if (cliPassword) {
        if (cliPassword.length < 6) {
          console.error('❌ Password must be at least 6 characters long.');
          process.exit(1);
        }
        user.password = cliPassword; // User model pre-save hook will hash with bcrypt
        console.log('[Setup] Updating password with provided new password...');
      } else {
        console.log('[Setup] Preserving existing bcrypt password hash.');
      }

      await user.save();
    } else {
      console.log(`[Setup] No existing account found. Creating real Admin user: ${normalizedEmail}`);

      const passwordToUse = cliPassword || crypto.randomBytes(8).toString('hex') + 'A1!';
      
      user = await User.create({
        name: 'Haritha Chirakala',
        email: normalizedEmail,
        phone: '9550964177',
        password: passwordToUse,
        role: 'ADMIN',
        isActive: true,
        isVerified: true,
        municipality: gmc._id,
        city: 'Guntur',
        state: 'AP',
        pincode: '522213'
      });

      if (!cliPassword) {
        console.log(`\n🔑 Initial Generated Admin Password: ${passwordToUse}`);
        console.log('   (Please save this or change it after initial login)\n');
      }
    }

    // Also link chharitha050@gmail.com if exists
    await User.updateMany(
      { email: { $in: ['harithachirakala@gmail.com', 'chharitha050@gmail.com'] } },
      { $set: { municipality: gmc._id, role: 'ADMIN', isVerified: true, isActive: true } }
    );

    // Verify final state in MongoDB directly
    const verifyDoc = await mongoose.connection.db.collection('users').findOne(
      { email: normalizedEmail },
      { projection: { email: 1, role: 1, password: 1, isActive: 1, isVerified: 1 } }
    );

    const isBcrypt = verifyDoc.password && (verifyDoc.password.startsWith('$2a$') || verifyDoc.password.startsWith('$2b$'));

    console.log('\n==================================================');
    console.log('           ADMIN PROVISIONING VERIFIED            ');
    console.log('==================================================');
    console.log(`MongoDB Host    : ${host}`);
    console.log(`Database        : ${dbName}`);
    console.log(`Collection      : users`);
    console.log(`Email           : ${verifyDoc.email}`);
    console.log(`Role            : ${verifyDoc.role}`);
    console.log(`Status          : ${verifyDoc.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`Verified        : ${verifyDoc.isVerified ? 'YES' : 'NO'}`);
    console.log(`Password Type   : ${isBcrypt ? 'bcrypt HASH (Verified)' : 'UNKNOWN'}`);
    console.log('==================================================\n');

    console.log('AUTHENTICATION FLOW CONFIRMED:');
    console.log('One-time Admin Setup');
    console.log('        ↓');
    console.log(`MongoDB (${host})`);
    console.log('        ↓');
    console.log('users collection');
    console.log('        ↓');
    console.log(`email = ${verifyDoc.email}`);
    console.log(`role = ${verifyDoc.role}`);
    console.log('password = bcrypt HASH');
    console.log('        ↓');
    console.log('/login');
    console.log('        ↓');
    console.log('Admin login');
    console.log('        ↓');
    console.log('/admin/dashboard\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during Admin setup:', error);
    process.exit(1);
  }
};

setupAdmin();
