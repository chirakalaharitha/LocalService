const http = require('http');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(`http://localhost:5000${path}`, {
      method,
      headers: {
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(responseBody); } catch (_) { parsed = responseBody; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
};

const runVerification = async () => {
  console.log('===============================================================');
  console.log('🧪 LOCALFIX: CITIZEN REGISTRATION & SMTP FLOW VERIFICATION');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  const assertTest = (condition, name, detail = '') => {
    if (condition) {
      console.log(`  ✅ [PASS] ${name} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  };

  // Connect to MongoDB
  await mongoose.connect('mongodb://127.0.0.1:27017/localfix');
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  // 1. Check Technical Error Masking when SMTP credentials are empty
  console.log('--- TEST 1: User-Facing Error Masking (STEP 7) ---');
  const testEmail = `test_mask_${Date.now()}@gmail.com`;
  const regRes = await request('POST', '/api/auth/register', {
    fullName: 'Mask Test User',
    email: testEmail,
    phone: '9876501234',
    password: 'Password@123',
    confirmPassword: 'Password@123',
    city: 'Guntur',
    state: 'AP',
    pincode: '522001'
  });

  assertTest(
    regRes.status === 503,
    'Registration returns HTTP 503 when SMTP is offline'
  );
  assertTest(
    regRes.data?.message === "We couldn't send the verification email right now. Please try again in a few moments.",
    'Citizen-facing message is clean and polite (No technical SMTP leak)',
    regRes.data?.message
  );
  assertTest(
    !JSON.stringify(regRes.data).includes('Please configure SMTP_USER and SMTP_PASS'),
    'Zero technical configuration instructions exposed to citizen'
  );

  // 2. Verify account was NOT created when email sending failed (STEP 5.8 & 8)
  console.log('\n--- TEST 2: Account Not Created If Email Delivery Fails (STEP 8) ---');
  const userInDb = await User.findOne({ email: testEmail });
  assertTest(!userInDb, 'User is NOT created in DB when email delivery fails');

  // 3. Test Unverified Citizen Account State & Login Guard (STEP 8)
  console.log('\n--- TEST 3: Unverified Citizen Login Guard (STEP 8) ---');
  const unverifiedCitizenEmail = `unverified_citizen_${Date.now()}@gmail.com`;
  const plainOtp = '654321';
  const hashedOtp = await bcrypt.hash(plainOtp, 10);
  const hashedPassword = await bcrypt.hash('Password@123', 10);

  // Directly provision unverified citizen to test authentication boundaries
  await User.create({
    name: 'Unverified Citizen',
    email: unverifiedCitizenEmail,
    phone: '9876549999',
    password: hashedPassword,
    role: 'CITIZEN',
    isVerified: false,
    emailVerified: false,
    isActive: true,
    verificationOtp: hashedOtp,
    emailVerificationOtp: hashedOtp,
    verificationOtpExpires: new Date(Date.now() + 5 * 60 * 1000), // 5 min
    emailVerificationOtpExpires: new Date(Date.now() + 5 * 60 * 1000),
    verificationOtpAttempts: 0
  });

  const unverifiedLoginRes = await request('POST', '/api/auth/login', {
    email: unverifiedCitizenEmail,
    password: 'Password@123'
  });

  assertTest(
    unverifiedLoginRes.status === 403,
    'Unverified Citizen login blocked with HTTP 403'
  );
  assertTest(
    unverifiedLoginRes.data?.isUnverified === true,
    'Response explicitly indicates account is unverified (isUnverified: true)'
  );

  // 4. Test Invalid OTP Attempt (STEP 10)
  console.log('\n--- TEST 4: Invalid OTP Attempt ---');
  const invalidOtpRes = await request('POST', '/api/auth/verify-email', {
    email: unverifiedCitizenEmail,
    otp: '000000'
  });
  assertTest(
    invalidOtpRes.status === 400,
    'Incorrect OTP returns HTTP 400'
  );
  assertTest(
    invalidOtpRes.data?.message?.includes('Invalid verification code'),
    'Returns correct invalid OTP message with remaining attempts',
    invalidOtpRes.data?.message
  );

  // 5. Test Expired OTP Attempt (STEP 10)
  console.log('\n--- TEST 5: Expired OTP Attempt ---');
  await User.updateOne(
    { email: unverifiedCitizenEmail },
    { $set: { verificationOtpExpires: new Date(Date.now() - 1000) } }
  );

  const expiredOtpRes = await request('POST', '/api/auth/verify-email', {
    email: unverifiedCitizenEmail,
    otp: plainOtp
  });
  assertTest(
    expiredOtpRes.status === 400,
    'Expired OTP returns HTTP 400'
  );
  assertTest(
    expiredOtpRes.data?.message?.includes('expired'),
    'Returns code expired error message',
    expiredOtpRes.data?.message
  );

  // 6. Test Correct OTP Verification & Account Activation (STEP 8 & 10)
  console.log('\n--- TEST 6: Successful OTP Verification & Activation ---');
  // Reset fresh 5 min OTP
  await User.updateOne(
    { email: unverifiedCitizenEmail },
    {
      $set: {
        verificationOtp: hashedOtp,
        emailVerificationOtp: hashedOtp,
        verificationOtpExpires: new Date(Date.now() + 5 * 60 * 1000),
        verificationOtpAttempts: 0
      }
    }
  );

  const verifySuccessRes = await request('POST', '/api/auth/verify-email', {
    email: unverifiedCitizenEmail,
    otp: plainOtp
  });
  assertTest(
    verifySuccessRes.status === 200,
    'Correct OTP submission returns HTTP 200'
  );

  const activatedUser = await User.findOne({ email: unverifiedCitizenEmail });
  assertTest(
    activatedUser.emailVerified === true && activatedUser.isVerified === true,
    'User marked as emailVerified: true and isVerified: true in MongoDB'
  );
  assertTest(
    !activatedUser.verificationOtp && !activatedUser.emailVerificationOtp,
    'Verification OTP cleared from database upon successful verification'
  );

  // 7. Test Citizen Login After Verification (STEP 8 & 10)
  console.log('\n--- TEST 7: Citizen Login After Verification ---');
  const postVerifyLoginRes = await request('POST', '/api/auth/login', {
    email: unverifiedCitizenEmail,
    password: 'Password@123'
  });
  assertTest(
    postVerifyLoginRes.status === 200,
    'Verified Citizen can log in successfully with HTTP 200'
  );
  assertTest(
    Boolean(postVerifyLoginRes.data?.token),
    'JWT token returned upon successful login'
  );
  assertTest(
    postVerifyLoginRes.data?.user?.role === 'CITIZEN',
    'User role is CITIZEN'
  );

  // 8. Test Forgot Password Flow (STEP 11)
  console.log('\n--- TEST 8: Forgot Password Independent Flow (STEP 11) ---');
  const resetOtp = '888999';
  const hashedResetOtp = await bcrypt.hash(resetOtp, 10);
  await User.updateOne(
    { email: unverifiedCitizenEmail },
    {
      $set: {
        resetPasswordOtp: hashedResetOtp,
        resetPasswordOtpExpires: new Date(Date.now() + 5 * 60 * 1000),
        resetPasswordOtpAttempts: 0
      }
    }
  );

  // Verify Reset OTP
  const verifyResetRes = await request('POST', '/api/auth/verify-reset-otp', {
    email: unverifiedCitizenEmail,
    otp: resetOtp
  });
  assertTest(
    verifyResetRes.status === 200,
    'Verify reset OTP returns HTTP 200'
  );
  assertTest(
    Boolean(verifyResetRes.data?.resetToken),
    'Returns single-use reset authorization token'
  );

  const resetToken = verifyResetRes.data?.resetToken;

  // Complete Password Reset
  const newPassword = 'NewPassword@2026';
  const resetPassRes = await request('POST', '/api/auth/reset-password', {
    email: unverifiedCitizenEmail,
    resetToken,
    newPassword,
    confirmPassword: newPassword
  });
  assertTest(
    resetPassRes.status === 200,
    'Reset password with new strong password succeeds with HTTP 200'
  );

  // Test Login with new password
  const newPassLoginRes = await request('POST', '/api/auth/login', {
    email: unverifiedCitizenEmail,
    password: newPassword
  });
  assertTest(
    newPassLoginRes.status === 200,
    'Login with new password succeeds with HTTP 200'
  );

  // Clean up test user
  await User.deleteOne({ email: unverifiedCitizenEmail });
  await User.deleteOne({ email: testEmail });

  console.log('\n===============================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

runVerification().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
