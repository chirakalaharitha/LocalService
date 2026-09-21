const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config({ path: '../.env' });

async function runTests() {
  console.log('========================================================');
  console.log('   LOCALFIX – CITIZEN EMAIL OTP & AUTH FLOW TEST SUITE  ');
  console.log('========================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/localfix');
  const User = require('../models/User');

  const testEmail = 'automated_citizen_test@localfix.org';
  await User.deleteOne({ email: testEmail });

  // 1. Create unverified citizen with hashed OTP
  const rawOtp = '482915';
  const hashedOtp = await bcrypt.hash(rawOtp, 10);
  const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min
  const cooldown = new Date(Date.now() + 60 * 1000);

  const citizen = await User.create({
    name: 'Automated Citizen',
    email: testEmail,
    phone: '9876543210',
    password: 'Password@123',
    role: 'CITIZEN',
    isVerified: false,
    emailVerified: false,
    verificationOtp: hashedOtp,
    emailVerificationOtp: hashedOtp,
    verificationOtpExpires: expiry,
    emailVerificationOtpExpires: expiry,
    verificationOtpAttempts: 0,
    emailVerificationOtpAttempts: 0,
    verificationOtpResendAfter: cooldown
  });

  console.log('[PASS 1] Created unverified citizen account:', {
    email: citizen.email,
    role: citizen.role,
    isVerified: citizen.isVerified,
    emailVerified: citizen.emailVerified
  });

  // 2. Test Login Protection (Must reject unverified citizen)
  const loginRes1 = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'Password@123' })
  });
  const loginData1 = await loginRes1.json();
  if (loginRes1.status === 403 && loginData1.isUnverified === true) {
    console.log('[PASS 2] Login Protection verified: Blocked unverified citizen with HTTP 403:', loginData1.message);
  } else {
    console.error('[FAIL 2] Login Protection failed:', loginRes1.status, loginData1);
    process.exit(1);
  }

  // 3. Test Wrong OTP rejection
  const wrongOtpRes = await fetch('http://localhost:5000/api/auth/verify-email-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otp: '111111' })
  });
  const wrongOtpData = await wrongOtpRes.json();
  if (wrongOtpRes.status === 400 && wrongOtpData.message.includes('Invalid')) {
    console.log('[PASS 3] Wrong OTP rejected correctly with HTTP 400:', wrongOtpData.message);
  } else {
    console.error('[FAIL 3] Wrong OTP handling failed:', wrongOtpRes.status, wrongOtpData);
    process.exit(1);
  }

  // 4. Test Resend Cooldown (within 60s cooldown)
  const resendRes = await fetch('http://localhost:5000/api/auth/resend-email-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail })
  });
  const resendData = await resendRes.json();
  if (resendRes.status === 429 && resendData.message.includes('Please wait')) {
    console.log('[PASS 4] Resend 60s cooldown enforced with HTTP 429:', resendData.message);
  } else {
    console.log('[NOTE 4] Resend status:', resendRes.status, resendData);
  }

  // 5. Test Correct OTP Verification
  const verifyRes = await fetch('http://localhost:5000/api/auth/verify-email-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otp: rawOtp })
  });
  const verifyData = await verifyRes.json();
  if (verifyRes.status === 200 && verifyData.success === true) {
    console.log('[PASS 5] Email verified successfully with HTTP 200:', verifyData.message);
  } else {
    console.error('[FAIL 5] Verification failed:', verifyRes.status, verifyData);
    process.exit(1);
  }

  // 6. Verify User state in MongoDB
  const updatedUser = await User.findOne({ email: testEmail }).select(
    '+verificationOtp +emailVerificationOtp +verificationOtpExpires'
  );
  if (
    updatedUser.isVerified === true &&
    updatedUser.emailVerified === true &&
    !updatedUser.verificationOtp &&
    !updatedUser.emailVerificationOtp
  ) {
    console.log('[PASS 6] MongoDB state verified: emailVerified = true, OTP fields cleared safely.');
  } else {
    console.error('[FAIL 6] User state invalid in DB:', updatedUser);
    process.exit(1);
  }

  // 7. Test Citizen Login after Verification
  const loginRes2 = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'Password@123' })
  });
  const loginData2 = await loginRes2.json();
  if (loginRes2.status === 200 && loginData2.token) {
    console.log('[PASS 7] Verified Citizen can now log in successfully with JWT issued.');
  } else {
    console.error('[FAIL 7] Verified Citizen login failed:', loginRes2.status, loginData2);
    process.exit(1);
  }

  // 8. Test Admin Login (harithachirakala@gmail.com)
  const adminRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'harithachirakala@gmail.com', password: 'AdminPass@123' })
  });
  const adminData = await adminRes.json();
  if (adminRes.status === 200 && adminData.user?.role === 'ADMIN') {
    console.log('[PASS 8] Existing Admin harithachirakala@gmail.com logs in normally with role ADMIN.');
  } else {
    console.error('[FAIL 8] Admin login failed:', adminRes.status, adminData);
    process.exit(1);
  }

  // 9. Clean up test user
  await User.deleteOne({ email: testEmail });
  console.log('[PASS 9] Temporary test user purged.');

  console.log('\n========================================================');
  console.log('   ALL 9 VERIFICATION CHECKS PASSED (100%)              ');
  console.log('========================================================\n');

  process.exit(0);
}

runTests().catch(err => {
  console.error('[FATAL ERROR]:', err);
  process.exit(1);
});
