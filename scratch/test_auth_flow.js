const http = require('http');

const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data && { 'Content-Length': Buffer.byteLength(data) }),
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
      (res) => {
        let bodyStr = '';
        res.on('data', (chunk) => (bodyStr += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(bodyStr) });
          } catch (e) {
            resolve({ status: res.statusCode, body: bodyStr });
          }
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
};

const runTests = async () => {
  console.log('--- STARTING AUTH & TENANT ISOLATION TESTS ---');

  // Test 1: Health check
  const health = await request('GET', '/api/health');
  console.log('\n1. GET /api/health:', health.status);

  // Test 2: Unauthenticated create tenant -> Should fail 401
  const unauthTenant = await request('POST', '/api/tenants', {
    name: 'Acme Corp',
    slug: `acme-${Date.now()}`,
    email: 'contact@acme.com',
  });
  console.log('\n2. Unauthenticated POST /api/tenants:', unauthTenant.status, unauthTenant.body.message);

  // We need a valid tenant ID to test registration. Let's inspect DB or create tenant directly via Mongoose in test script
  const mongoose = require('mongoose');
  require('dotenv').config();
  await mongoose.connect(process.env.MONGO_URI);
  const Tenant = require('../src/models/tenant.model');
  
  let tenant = await Tenant.findOne({ slug: 'test-tenant-slug' });
  if (!tenant) {
    tenant = await Tenant.create({
      name: 'Test Tenant',
      slug: 'test-tenant-slug',
      email: 'admin@testtenant.com',
      status: 'active',
    });
  }
  const tenantId = tenant._id.toString();
  console.log('\nTest Tenant ID:', tenantId);

  // Test 3: Attempting to register with privileged role (admin) -> Should fail 400
  const privReg = await request('POST', '/api/auth/register', {
    name: 'Attacker',
    email: `hacker-${Date.now()}@test.com`,
    password: 'password123',
    role: 'admin',
    tenantId,
  });
  console.log('\n3. Privileged Role Registration (role: admin):', privReg.status, privReg.body.message);

  // Test 4: Valid user registration
  const userEmail = `user-${Date.now()}@test.com`;
  const regResult = await request('POST', '/api/auth/register', {
    name: 'Jane Doe',
    email: userEmail,
    password: 'securepassword123',
    tenantId,
  });
  console.log('\n4. Valid User Registration:', regResult.status, regResult.body.message);
  console.log('Returned password present?', Boolean(regResult.body.data?.user?.password));
  console.log('Returned user role:', regResult.body.data?.user?.role);
  console.log('Token received?', Boolean(regResult.body.data?.token));

  const userToken = regResult.body.data?.token;

  // Test 5: Login
  const loginResult = await request('POST', '/api/auth/login', {
    email: userEmail,
    password: 'securepassword123',
  });
  console.log('\n5. User Login:', loginResult.status, loginResult.body.message);
  console.log('Returned password present?', Boolean(loginResult.body.data?.user?.password));

  // Test 6: GET /api/auth/me
  const meResult = await request('GET', '/api/auth/me', null, userToken);
  console.log('\n6. GET /api/auth/me:', meResult.status, meResult.body.data?.email);

  // Test 7: GET /api/tenants/:id (Own Tenant) -> Should succeed 200
  const getOwnTenant = await request('GET', `/api/tenants/${tenantId}`, null, userToken);
  console.log('\n7. GET /api/tenants/:id (Own Tenant):', getOwnTenant.status, getOwnTenant.body.data?.name);

  // Test 8: GET /api/tenants/:id (Other Tenant) -> Should fail 403 (Tenant Isolation)
  const fakeOtherTenantId = new mongoose.Types.ObjectId().toString();
  const getOtherTenant = await request('GET', `/api/tenants/${fakeOtherTenantId}`, null, userToken);
  console.log('\n8. GET /api/tenants/:id (Other Tenant Isolation Test):', getOtherTenant.status, getOtherTenant.body.message);

  await mongoose.disconnect();
  console.log('\n--- TESTS COMPLETED SUCCESSFULLY ---');
  process.exit(0);
};

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
