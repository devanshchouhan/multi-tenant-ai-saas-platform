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

const runTicketTests = async () => {
  console.log('=== STARTING TICKET MODULE INTEGRATION TESTS ===\n');

  await mongoose.connect(process.env.MONGO_URI);
  const Tenant = require('../src/models/tenant.model');

  let tenantA = await Tenant.findOne({ slug: 'tenant-t1-slug' });
  if (!tenantA) {
    tenantA = await Tenant.create({ name: 'Ticket Tenant A', slug: 'tenant-t1-slug', email: 't1@test.com' });
  }

  let tenantB = await Tenant.findOne({ slug: 'tenant-t2-slug' });
  if (!tenantB) {
    tenantB = await Tenant.create({ name: 'Ticket Tenant B', slug: 'tenant-t2-slug', email: 't2@test.com' });
  }

  // Register Admin A for Tenant A
  const adminAEmail = `adminA-${Date.now()}@test.com`;
  const regA = await request('POST', '/api/auth/register', {
    name: 'Admin A',
    email: adminAEmail,
    password: 'Password123!',
    tenantId: tenantA._id.toString(),
  });
  const tokenA = regA.body.data.token;
  console.log('Registered Admin A for Tenant A:', regA.status);

  // Manually update Admin A role in DB to 'admin' for privileged route testing
  const User = require('../src/models/user.model');
  await User.findByIdAndUpdate(regA.body.data.user._id, { role: 'admin' });
  
  // Re-login to get JWT with 'admin' role
  const loginA = await request('POST', '/api/auth/login', {
    email: adminAEmail,
    password: 'Password123!',
  });
  const adminTokenA = loginA.body.data.token;

  // Register User B for Tenant B
  const userBEmail = `userB-${Date.now()}@test.com`;
  const regB = await request('POST', '/api/auth/register', {
    name: 'User B',
    email: userBEmail,
    password: 'Password123!',
    tenantId: tenantB._id.toString(),
  });
  const tokenB = regB.body.data.token;

  // 1. Create Customer and Agent under Tenant A
  const custRes = await request('POST', '/api/customers', { name: 'Ticket Customer', email: 'cust@ticket.com' }, adminTokenA);
  const customerId = custRes.body.data._id;

  const agentRes = await request('POST', '/api/agents', { name: 'Support Agent 1', email: 'agent1@ticket.com' }, adminTokenA);
  const agentId = agentRes.body.data._id;

  const convRes = await request('POST', '/api/conversations', { customerId, assignedAgentId: agentId }, adminTokenA);
  const conversationId = convRes.body.data._id;

  console.log('\n--- TICKET LIFECYCLE TESTS ---');

  // Test 2: Create Ticket
  const createTicketRes = await request('POST', '/api/tickets', {
    title: 'Payment failed on checkout',
    description: 'User tried to pay via UPI but transaction timed out.',
    customerId,
    conversationId,
    priority: 'high',
  }, adminTokenA);
  console.log('1. POST /api/tickets (Create):', createTicketRes.status, createTicketRes.body.data?.title);
  const ticketId = createTicketRes.body.data._id;

  // Test 3: Get All Tickets
  const getTicketsRes = await request('GET', '/api/tickets', null, adminTokenA);
  console.log('2. GET /api/tickets (List):', getTicketsRes.status, `Count: ${getTicketsRes.body.count}`);

  // Test 4: Get Single Ticket By ID
  const getTicketRes = await request('GET', `/api/tickets/${ticketId}`, null, adminTokenA);
  console.log('3. GET /api/tickets/:id:', getTicketRes.status, getTicketRes.body.data?.priority);

  // Test 5: Assign Ticket to Agent
  const assignRes = await request('PATCH', `/api/tickets/${ticketId}/assign`, { agentId }, adminTokenA);
  console.log('4. PATCH /api/tickets/:id/assign:', assignRes.status, 'Status updated to:', assignRes.body.data?.status);

  // Test 6: Update Ticket Status
  const statusRes = await request('PATCH', `/api/tickets/${ticketId}/status`, { status: 'in_progress' }, adminTokenA);
  console.log('5. PATCH /api/tickets/:id/status:', statusRes.status, statusRes.body.data?.status);

  // Test 7: Agent Reply to Ticket (creates Message)
  const replyRes = await request('POST', `/api/tickets/${ticketId}/reply`, { text: 'We have initiated a refund for your timed out payment.' }, adminTokenA);
  console.log('6. POST /api/tickets/:id/reply:', replyRes.status, 'Message created:', replyRes.body.data?.message?.text);

  // Test 8: Verify message exists in conversation
  const msgsRes = await request('GET', `/api/conversations/${conversationId}/messages`, null, adminTokenA);
  console.log('7. GET /api/conversations/:id/messages (Verify reply):', msgsRes.status, `Message count: ${msgsRes.body.count}`);

  // Test 9: Tenant Isolation check (Tenant B accessing Tenant A Ticket)
  const crossTicketRes = await request('GET', `/api/tickets/${ticketId}`, null, tokenB);
  console.log('8. GET /api/tickets/:id (Tenant B cross-access test):', crossTicketRes.status, crossTicketRes.body.message);

  await mongoose.disconnect();
  console.log('\n=== TICKET MODULE TESTS COMPLETED SUCCESSFULLY ===');
  process.exit(0);
};

runTicketTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
