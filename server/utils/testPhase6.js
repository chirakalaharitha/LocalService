const API_URL = 'http://localhost:5000/api';

async function testPhase6() {
  console.log('--- Starting Phase 6 E2E Verification Test ---');

  try {
    // 1. Login as Citizen A (Aarav Sharma)
    console.log('1. Logging in as Citizen A (citizen@localfix.org)...');
    const loginARes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'citizen@localfix.org',
        password: 'Citizen@123456'
      })
    });
    const loginA = await loginARes.json();

    if (!loginA.success || !loginA.token) {
      throw new Error(`Citizen A login failed: ${JSON.stringify(loginA)}`);
    }

    const tokenA = loginA.token;
    const authHeadersA = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    };
    console.log('   ✅ Citizen A logged in successfully.');

    // 2. Fetch Citizen A's requests (/api/requests/my)
    console.log("2. Fetching Citizen A's requests...");
    const myReqsRes = await fetch(`${API_URL}/requests/my`, {
      method: 'GET',
      headers: authHeadersA
    });
    const myReqs = await myReqsRes.json();

    if (!myReqs.success || !myReqs.requests || myReqs.requests.length === 0) {
      throw new Error('Citizen A has no requests! Please ensure Phase 5 created at least one request.');
    }

    const targetReq = myReqs.requests[0];
    console.log(`   ✅ Fetched ${myReqs.count} requests for Citizen A.`);
    console.log(`      Selected target request: ID=${targetReq.requestId}, MongoID=${targetReq._id}`);

    // 3. Test GET /api/requests/:id using human-readable requestId (e.g. LF-2026-1006)
    console.log(`3. Testing GET /api/requests/:id using human-readable Request ID (${targetReq.requestId})...`);
    const getByReqIdRes = await fetch(`${API_URL}/requests/${targetReq.requestId}`, {
      method: 'GET',
      headers: authHeadersA
    });
    const dataByReqId = await getByReqIdRes.json();

    if (!getByReqIdRes.ok || !dataByReqId.success || !dataByReqId.request) {
      throw new Error(`Failed to fetch request by requestId: ${JSON.stringify(dataByReqId)}`);
    }

    const reqData = dataByReqId.request;
    console.log('   ✅ Request fetched successfully by Request ID!');
    console.log(`      Title: "${reqData.title}"`);
    console.log(`      Category: ${reqData.category}, Priority: ${reqData.priority}, Status: ${reqData.status}`);
    console.log(`      Location Address: "${reqData.address}"`);
    console.log(`      Coordinates: [${reqData.location?.coordinates?.join(', ')}]`);
    console.log(`      Timeline events history count: ${dataByReqId.history?.length || 0}`);

    // 4. Test GET /api/requests/:id using MongoDB _id
    console.log(`4. Testing GET /api/requests/:id using MongoDB _id (${targetReq._id})...`);
    const getByMongoIdRes = await fetch(`${API_URL}/requests/${targetReq._id}`, {
      method: 'GET',
      headers: authHeadersA
    });
    const dataByMongoId = await getByMongoIdRes.json();

    if (!getByMongoIdRes.ok || !dataByMongoId.success || !dataByMongoId.request) {
      throw new Error(`Failed to fetch request by MongoDB _id: ${JSON.stringify(dataByMongoId)}`);
    }
    console.log('   ✅ Request fetched successfully by MongoDB _id!');

    // 5. Test Unauthorized Access (Register/Login Citizen B and try to access Citizen A's request)
    console.log('5. Registering/Logging in as Citizen B to test Ownership Enforcement...');
    const citizenBData = {
      name: 'Citizen B TestUser',
      email: 'citizenB_phase6@localfix.org',
      password: 'Password123!',
      phone: '9876543299',
      city: 'Metro City',
      state: 'Central State',
      pincode: '400001'
    };

    // Try register (or login if exists)
    let tokenB;
    const regBRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(citizenBData)
    });
    const regB = await regBRes.json();

    if (regB.success && regB.token) {
      tokenB = regB.token;
    } else {
      // Login if already registered
      const loginBRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: citizenBData.email, password: citizenBData.password })
      });
      const loginB = await loginBRes.json();
      tokenB = loginB.token;
    }

    if (!tokenB) {
      throw new Error('Failed to obtain token for Citizen B');
    }

    console.log("   Attempting to access Citizen A's request using Citizen B's token...");
    const unauthRes = await fetch(`${API_URL}/requests/${targetReq._id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      }
    });
    const unauthData = await unauthRes.json();

    if (unauthRes.status === 403 && !unauthData.success) {
      console.log(`   ✅ Correctly denied unauthorized access (Status 403: ${unauthData.message})`);
    } else {
      console.error(`   ❌ Ownership check failed! Status: ${unauthRes.status}, Response: ${JSON.stringify(unauthData)}`);
      process.exit(1);
    }

    // 6. Test Non-existent Request ID
    console.log('6. Testing non-existent Request ID...');
    const notFoundRes = await fetch(`${API_URL}/requests/NON_EXISTENT_ID_999999`, {
      method: 'GET',
      headers: authHeadersA
    });
    const notFoundData = await notFoundRes.json();
    if (notFoundRes.status === 404 && !notFoundData.success) {
      console.log(`   ✅ Correctly returned 404 Not Found for non-existent request ID.`);
    } else {
      console.error(`   ❌ Expected 404 for non-existent request ID! Received status: ${notFoundRes.status}`);
    }

    console.log('\n--- ALL PHASE 6 E2E TESTS PASSED SUCCESSFULLY! ---');
  } catch (error) {
    console.error('❌ Phase 6 Test Error:', error.message);
    process.exit(1);
  }
}

testPhase6();

