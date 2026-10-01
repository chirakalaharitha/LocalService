const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function runTests() {
  console.log('========================================================');
  console.log('   LOCALFIX – FINAL CITIZEN REGISTRATION & AUTH TEST    ');
  console.log('========================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/localfix');

  const randomId = Math.floor(Math.random() * 90000) + 10000;
  const testEmail = `citizen_final_${randomId}@example.com`;
  const testPhone = `98765${randomId}`;
  const initialPassword = 'Password@123';
  const updatedPassword = 'NewSecurePassword@2026';

  // TEST 1: Register citizen via API (Direct activation, no email verification OTP)
  console.log('TEST 1: Register new citizen via POST /api/auth/register...');
  const regRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Ananya Sharma',
      email: testEmail,
      phone: testPhone,
      password: initialPassword,
      confirmPassword: initialPassword,
      address: 'Plot 42, Park View Colony',
      city: 'Tenali',
      state: 'Andhra Pradesh',
      pincode: '522201',
      role: 'ADMIN' // Malicious attempt to spoof role
    })
  });

  const regData = await regRes.json();
  if (regRes.status !== 201 || !regData.success || !regData.token) {
    console.error('❌ TEST 1 FAILED: Citizen registration failed:', regRes.status, regData);
    process.exit(1);
  }
  console.log('✅ TEST 1 PASSED: Citizen created successfully without email verification!');
  console.log('   Message:', regData.message);
  console.log('   Token generated:', Boolean(regData.token));
  console.log('   User role strictly enforced as:', regData.user.role);

  if (regData.user.role !== 'CITIZEN') {
    console.error('❌ TEST 1 FAILED: Role was not enforced as CITIZEN');
    process.exit(1);
  }

  // Verify in MongoDB directly
  const dbUser = await User.findOne({ email: testEmail });
  if (!dbUser || !dbUser.isVerified || !dbUser.emailVerified) {
    console.error('❌ TEST 1 FAILED: User in DB is not verified:', dbUser);
    process.exit(1);
  }
  console.log('✅ DB Verification state: isVerified =', dbUser.isVerified, ', emailVerified =', dbUser.emailVerified);

  // TEST 2: Citizen Login
  console.log('\nTEST 2: Login with the new citizen credentials via POST /api/auth/login...');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: initialPassword
    })
  });

  const loginData = await loginRes.json();
  if (loginRes.status !== 200 || !loginData.success || !loginData.token) {
    console.error('❌ TEST 2 FAILED: Citizen login failed:', loginRes.status, loginData);
    process.exit(1);
  }
  console.log('✅ TEST 2 PASSED: Citizen login successful!');
  console.log('   User name:', loginData.user.fullName);
  console.log('   Role:', loginData.user.role);

  // TEST 3: Forgot Password flow (Nodemailer OTP recovery)
  console.log('\nTEST 3: Initiate Forgot Password via POST /api/auth/forgot-password...');
  const forgotRes = await fetch('http://localhost:5000/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail })
  });

  const forgotData = await forgotRes.json();
  if (forgotRes.status !== 200 || !forgotData.success) {
    console.error('❌ TEST 3 FAILED: Forgot password request failed:', forgotRes.status, forgotData);
    process.exit(1);
  }
  console.log('✅ TEST 3 PASSED: Reset code requested successfully:', forgotData.message);

  // Retrieve OTP from DB to test verification
  const userWithOtp = await User.findOne({ email: testEmail }).select('+resetPasswordOtp +resetPasswordOtpExpires');
  if (!userWithOtp || !userWithOtp.resetPasswordOtp) {
    console.error('❌ TEST 3 FAILED: resetPasswordOtp not found in DB');
    process.exit(1);
  }
  console.log('   Reset OTP securely stored in DB (hashed with bcrypt)');

  // TEST 4: Verify OTP
  console.log('\nTEST 4: Verify Reset OTP...');
  // For automated verification test, let's generate a known OTP to test the verify endpoint
  const testOtp = '654321';
  userWithOtp.resetPasswordOtp = await bcrypt.hash(testOtp, 10);
  userWithOtp.resetPasswordOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
  await userWithOtp.save({ validateBeforeSave: false });

  const verifyRes = await fetch('http://localhost:5000/api/auth/verify-reset-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      otp: testOtp
    })
  });

  const verifyData = await verifyRes.json();
  if (verifyRes.status !== 200 || !verifyData.success || !verifyData.resetToken) {
    console.error('❌ TEST 4 FAILED: Verify OTP failed:', verifyRes.status, verifyData);
    process.exit(1);
  }
  console.log('✅ TEST 4 PASSED: Reset OTP verified, single-use token received!');

  // TEST 5: Reset Password
  console.log('\nTEST 5: Reset Password with new credentials via POST /api/auth/reset-password...');
  const resetRes = await fetch('http://localhost:5000/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      resetToken: verifyData.resetToken,
      newPassword: updatedPassword,
      confirmPassword: updatedPassword
    })
  });

  const resetData = await resetRes.json();
  if (resetRes.status !== 200 || !resetData.success) {
    console.error('❌ TEST 5 FAILED: Reset password failed:', resetRes.status, resetData);
    process.exit(1);
  }
  console.log('✅ TEST 5 PASSED: Password reset successfully:', resetData.message);

  // TEST 6: Login with new password
  console.log('\nTEST 6: Login with new password...');
  const newLoginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: updatedPassword
    })
  });

  const newLoginData = await newLoginRes.json();
  if (newLoginRes.status !== 200 || !newLoginData.success) {
    console.error('❌ TEST 6 FAILED: Login with new password failed:', newLoginRes.status, newLoginData);
    process.exit(1);
  }
  console.log('✅ TEST 6 PASSED: Login with new password succeeded!');

  // TEST 7: Login with old password must fail
  console.log('\nTEST 7: Login with old password must fail...');
  const oldLoginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: initialPassword
    })
  });

  if (oldLoginRes.status === 401) {
    console.log('✅ TEST 7 PASSED: Old password correctly rejected with HTTP 401.');
  } else {
    console.error('❌ TEST 7 FAILED: Old password was not rejected properly:', oldLoginRes.status);
    process.exit(1);
  }

  // Cleanup test citizen
  await User.deleteOne({ email: testEmail });
  console.log('\n========================================================');
  console.log('   ALL 7 AUTHENTICATION TESTS PASSED SUCCESSFULLY!       ');
  console.log('========================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
