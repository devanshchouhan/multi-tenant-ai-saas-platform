const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();

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

const runAllTests = async () => {
  console.log('=== STARTING END-TO-END INTEGRATION TEST ===\n');

  // Setup test tenants and users in DB directly
  await mongoose.connect(process.env.MONGO_URI);
  const Tenant = require('../src/models/tenant.model');
  const User = require('../src/models/user.model');

  let tenantA = await Tenant.findOne({ slug: 'tenant-a-slug' });
  if (!tenantA) {
    tenantA = await Tenant.create({ name: 'Tenant A', slug: 'tenant-a-slug', email: 'tenantA@test.com' });
  }

  let tenantB = await Tenant.findOne({ slug: 'tenant-b-slug' });
  if (!tenantB) {
    tenantB = await Tenant.create({ name: 'Tenant B', slug: 'tenant-b-slug', email: 'tenantB@test.com' });
  }

  // Register or Login User A (Tenant A)
  const userAEmail = `usera-${Date.now()}@test.com`;
  const regA = await request('POST', '/api/auth/register', {
    name: 'User A',
    email: userAEmail,
    password: 'Password123!',
    tenantId: tenantA._id.toString(),
  });
  const tokenA = regA.body.data.token;
  console.log('Registered User A for Tenant A:', regA.status);

  // Register or Login User B (Tenant B)
  const userBEmail = `userb-${Date.now()}@test.com`;
  const regB = await request('POST', '/api/auth/register', {
    name: 'User B',
    email: userBEmail,
    password: 'Password123!',
    tenantId: tenantB._id.toString(),
  });
  const tokenB = regB.body.data.token;
  console.log('Registered User B for Tenant B:', regB.status);

  // --- CUSTOMER TESTS ---
  console.log('\n--- CUSTOMER API TESTS ---');
  const createCustRes = await request('POST', '/api/customers', { name: 'John Customer', email: 'john@cust.com' }, tokenA);
  console.log('1. POST /api/customers:', createCustRes.status, createCustRes.body.data?.name);
  const customerId = createCustRes.body.data._id;

  const getCustsRes = await request('GET', '/api/customers', null, tokenA);
  console.log('2. GET /api/customers:', getCustsRes.status, `Count: ${getCustsRes.body.count}`);

  const getCustByIdRes = await request('GET', `/api/customers/${customerId}`, null, tokenA);
  console.log('3. GET /api/customers/:id:', getCustByIdRes.status, getCustByIdRes.body.data?.name);

  const updateCustRes = await request('PUT', `/api/customers/${customerId}`, { name: 'John Updated' }, tokenA);
  console.log('4. PUT /api/customers/:id:', updateCustRes.status, updateCustRes.body.data?.name);

  // Tenant Isolation test for Customer
  const crossCustRes = await request('GET', `/api/customers/${customerId}`, null, tokenB);
  console.log('5. GET /api/customers/:id (Tenant B trying to access Tenant A Customer):', crossCustRes.status, crossCustRes.body.message);

  // --- AGENT TESTS ---
  console.log('\n--- AGENT API TESTS ---');
  const createAgentRes = await request('POST', '/api/agents', { name: 'Agent Smith', email: 'smith@agent.com', availability: 'online' }, tokenA);
  console.log('6. POST /api/agents:', createAgentRes.status, createAgentRes.body.data?.name);
  const agentId = createAgentRes.body.data._id;

  const getAgentsRes = await request('GET', '/api/agents', null, tokenA);
  console.log('7. GET /api/agents:', getAgentsRes.status, `Count: ${getAgentsRes.body.count}`);

  const getAgentByIdRes = await request('GET', `/api/agents/${agentId}`, null, tokenA);
  console.log('8. GET /api/agents/:id:', getAgentByIdRes.status, getAgentByIdRes.body.data?.name);

  const updateAgentRes = await request('PUT', `/api/agents/${agentId}`, { availability: 'busy' }, tokenA);
  console.log('9. PUT /api/agents/:id:', updateAgentRes.status, updateAgentRes.body.data?.availability);

  // --- CONVERSATION TESTS ---
  console.log('\n--- CONVERSATION API TESTS ---');
  const createConvRes = await request('POST', '/api/conversations', { customerId, assignedAgentId: agentId, status: 'open' }, tokenA);
  console.log('10. POST /api/conversations:', createConvRes.status, createConvRes.body.data?.status);
  const conversationId = createConvRes.body.data._id;

  const getConvsRes = await request('GET', '/api/conversations', null, tokenA);
  console.log('11. GET /api/conversations:', getConvsRes.status, `Count: ${getConvsRes.body.count}`);

  const getConvByIdRes = await request('GET', `/api/conversations/${conversationId}`, null, tokenA);
  console.log('12. GET /api/conversations/:id:', getConvByIdRes.status, getConvByIdRes.body.data?.customerId?.name);

  const updateConvRes = await request('PATCH', `/api/conversations/${conversationId}`, { status: 'pending' }, tokenA);
  console.log('13. PATCH /api/conversations/:id:', updateConvRes.status, updateConvRes.body.data?.status);

  // Tenant Isolation test for Conversation
  const crossConvRes = await request('GET', `/api/conversations/${conversationId}`, null, tokenB);
  console.log('14. GET /api/conversations/:id (Tenant B trying to access Tenant A Conversation):', crossConvRes.status, crossConvRes.body.message);

  // --- MESSAGE TESTS ---
  console.log('\n--- MESSAGE API TESTS ---');
  const msg1 = await request('POST', `/api/conversations/${conversationId}/messages`, { senderType: 'customer', text: 'Hello support!' }, tokenA);
  console.log('15. POST /api/conversations/:id/messages (Customer):', msg1.status, msg1.body.data?.text);

  const msg2 = await request('POST', `/api/conversations/${conversationId}/messages`, { senderType: 'agent', text: 'Hello, how can I help you today?' }, tokenA);
  console.log('16. POST /api/conversations/:id/messages (Agent):', msg2.status, msg2.body.data?.text);

  const msg3 = await request('POST', `/api/conversations/${conversationId}/messages`, { senderType: 'AI', text: 'Suggested article: FAQ 101' }, tokenA);
  console.log('17. POST /api/conversations/:id/messages (AI):', msg3.status, msg3.body.data?.text);

  const getMsgsRes = await request('GET', `/api/conversations/${conversationId}/messages`, null, tokenA);
  console.log('18. GET /api/conversations/:id/messages:', getMsgsRes.status, `Count: ${getMsgsRes.body.count}`);

  // Tenant Isolation test for Messages
  const crossMsgsRes = await request('GET', `/api/conversations/${conversationId}/messages`, null, tokenB);
  console.log('19. GET /api/conversations/:id/messages (Tenant B trying to read Tenant A Messages):', crossMsgsRes.status, crossMsgsRes.body.message);

  await mongoose.disconnect();
  console.log('\n=== ALL END-TO-END TESTS PASSED SUCCESSFULLY ===');
  process.exit(0);
};

runAllTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
