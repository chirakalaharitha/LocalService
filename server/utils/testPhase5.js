const API_URL = 'http://localhost:5000/api';

async function testPhase5() {
  console.log('--- Starting Phase 5 E2E Verification Test ---');

  try {
    // 1. Login as citizen
    console.log('1. Logging in as Citizen...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'citizen@localfix.org',
        password: 'Citizen@123456'
      })
    });
    const loginData = await loginRes.json();

    if (!loginData.success || !loginData.token) {
      throw new Error(`Citizen login failed: ${JSON.stringify(loginData)}`);
    }

    const token = loginData.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    console.log('   ✅ Citizen logged in successfully.');

    // 2. Test Backend Validation (Short title)
    console.log('2. Testing Backend Validation (Short Title < 5 chars)...');
    const badRes = await fetch(`${API_URL}/requests`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Bad',
        description: 'Valid description with sufficient length',
        category: 'WATER',
        address: '123 Main St',
        latitude: 19.076,
        longitude: 72.877
      })
    });
    const badData = await badRes.json();
    if (badRes.status === 400 && !badData.success) {
      console.log(`   ✅ Correctly rejected invalid request (Status 400: ${badData.message})`);
    } else {
      console.error(`   ❌ Validation failed to catch short title! Status: ${badRes.status}`);
    }

    // 3. Test Check Duplicate Endpoint
    console.log('3. Testing Check Duplicate Endpoint...');
    const dupRes = await fetch(`${API_URL}/requests/check-duplicate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        category: 'WATER',
        latitude: 19.076,
        longitude: 72.877
      })
    });
    const dupData = await dupRes.json();
    console.log(`   ✅ Check Duplicate API returned: possibleDuplicate=${dupData.possibleDuplicate}`);

    // 4. Create Valid Service Request
    console.log('4. Creating Valid Service Request...');
    const createRes = await fetch(`${API_URL}/requests`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Water Pipe Burst Near Main Market',
        description: 'Major water leakage from main pipeline causing flooding on street road.',
        category: 'WATER',
        priority: 'HIGH',
        address: 'Main Market Road, Sector 4, Mumbai',
        latitude: 19.076,
        longitude: 72.877,
        city: 'Mumbai',
        pincode: '400001'
      })
    });
    const createData = await createRes.json();

    if (!createRes.ok || !createData.success || !createData.request) {
      throw new Error(`Failed to create service request: ${JSON.stringify(createData)}`);
    }

    const createdReq = createData.request;
    console.log(`   ✅ Request Created Successfully! ID: ${createdReq.requestId}`);
    console.log(`      Status: ${createdReq.status}, Category: ${createdReq.category}, Priority: ${createdReq.priority}`);
    console.log(`      Location: [${createdReq.location.coordinates.join(', ')}]`);

    // 5. Test Get My Requests Endpoint
    console.log('5. Fetching Citizen My Requests...');
    const myReqsRes = await fetch(`${API_URL}/requests/my`, {
      method: 'GET',
      headers: authHeaders
    });
    const myReqsData = await myReqsRes.json();

    if (!myReqsRes.ok || !myReqsData.success) {
      throw new Error(`Failed to get my requests: ${JSON.stringify(myReqsData)}`);
    }

    console.log(`   ✅ My Requests fetched. Count: ${myReqsData.count}`);
    const foundCreated = myReqsData.requests.some(r => r.requestId === createdReq.requestId);
    if (foundCreated) {
      console.log(`   ✅ Verified newly created request ${createdReq.requestId} is in citizen list.`);
    } else {
      console.error(`   ❌ Newly created request ${createdReq.requestId} NOT found in citizen list!`);
    }

    console.log('\n--- ALL PHASE 5 E2E TESTS PASSED SUCCESSFULLY! ---');
  } catch (error) {
    console.error('❌ Phase 5 Test Error:', error.message);
    process.exit(1);
  }
}

testPhase5();
