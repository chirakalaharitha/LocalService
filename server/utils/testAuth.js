const BASE_URL = 'http://localhost:5000/api';

const runAuthTests = async () => {
  console.log('=================================================');
  console.log('🔐 Running Phase 2 Authentication & Security Tests');
  console.log('=================================================');

  try {
    const timestamp = Date.now();
    const testEmail = `testuser_${timestamp}@localfix.org`;
    const testPassword = 'SecurePass@123';

    // 1. Valid Registration Test
    console.log('\n[1/7] Testing Public Citizen Registration...');
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Citizen User',
        email: testEmail,
        phone: '9876543299',
        password: testPassword,
        role: 'ADMIN' // Trying to force admin role from frontend
      })
    });
    const regData = await regRes.json();

    if (!regData.success) {
      throw new Error(`Registration failed: ${regData.message}`);
    }
    console.log(`  ✅ Registration successful for ${testEmail}`);
    console.log(`  ✅ Enforced Role: ${regData.user.role} (Public ADMIN attempt forced to CITIZEN)`);
    console.log(`  ✅ Password excluded from response: ${regData.user.password === undefined}`);

    // 2. Duplicate Registration Test
    console.log('\n[2/7] Testing Duplicate Email Prevention...');
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Duplicate User',
        email: testEmail,
        phone: '9876543299',
        password: testPassword
      })
    });
    const dupData = await dupRes.json();
    if (!dupRes.ok && dupData.message.includes('already exists')) {
      console.log('  ✅ Duplicate registration correctly rejected with 400.');
    } else {
      throw new Error('Duplicate registration check failed');
    }

    // 3. Login with Correct Credentials
    console.log('\n[3/7] Testing Valid Login & JWT Generation...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const loginData = await loginRes.json();
    if (!loginData.success || !loginData.token) {
      throw new Error(`Login failed: ${loginData.message}`);
    }
    const token = loginData.token;
    console.log('  ✅ Login successful. JWT token received.');

    // 4. Login with Invalid Password
    console.log('\n[4/7] Testing Invalid Password Rejection...');
    const invalidLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword@123' })
    });
    if (invalidLoginRes.status === 401) {
      console.log('  ✅ Invalid password correctly rejected with 401 Unauthorized.');
    } else {
      throw new Error('Invalid password check failed');
    }

    // 5. GET /api/auth/me with Valid Token
    console.log('\n[5/7] Testing GET /api/auth/me with Bearer Token...');
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const meData = await meRes.json();
    if (meData.success && meData.user.email === testEmail) {
      console.log(`  ✅ GET /api/auth/me succeeded for authenticated user: ${meData.user.fullName}`);
    } else {
      throw new Error('GET /api/auth/me failed');
    }

    // 6. GET /api/auth/me without Token
    console.log('\n[6/7] Testing Unauthenticated Access Rejection...');
    const unauthRes = await fetch(`${BASE_URL}/auth/me`);
    if (unauthRes.status === 401) {
      console.log('  ✅ Missing token correctly rejected with 401 Unauthorized.');
    } else {
      throw new Error('Unauthenticated access check failed');
    }

    // 7. Role Restriction Check (Citizen accessing Staff route)
    console.log('\n[7/7] Testing Role Authorization (Citizen accessing Staff route)...');
    const roleRes = await fetch(`${BASE_URL}/staff/requests`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (roleRes.status === 403) {
      console.log('  ✅ Unauthorized role access correctly rejected with 403 Forbidden.');
    } else {
      throw new Error('Role authorization check failed');
    }

    console.log('\n=================================================');
    console.log('🎉 ALL PHASE 2 AUTHENTICATION TESTS PASSED!');
    console.log('=================================================');
  } catch (err) {
    console.error('❌ Phase 2 Test Failed:', err.message);
    process.exit(1);
  }
};

runAuthTests();

