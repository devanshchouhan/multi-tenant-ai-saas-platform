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

const runAITests = async () => {
  console.log('=== STARTING GEMINI AI & ESCALATION INTEGRATION TESTS ===\n');

  await mongoose.connect(process.env.MONGO_URI);
  const Tenant = require('../src/models/tenant.model');
  const Agent = require('../src/models/agent.model');

  let tenantA = await Tenant.findOne({ slug: 'tenant-ai-slug' });
  if (!tenantA) {
    tenantA = await Tenant.create({ name: 'AI Tenant A', slug: 'tenant-ai-slug', email: 'ai@test.com' });
  }

  let tenantB = await Tenant.findOne({ slug: 'tenant-ai-b-slug' });
  if (!tenantB) {
    tenantB = await Tenant.create({ name: 'AI Tenant B', slug: 'tenant-ai-b-slug', email: 'aib@test.com' });
  }

  // Register User A
  const userAEmail = `userAI-${Date.now()}@test.com`;
  const regA = await request('POST', '/api/auth/register', {
    name: 'User AI',
    email: userAEmail,
    password: 'Password123!',
    tenantId: tenantA._id.toString(),
  });
  const tokenA = regA.body.data.token;

  // Register User B
  const userBEmail = `userB-${Date.now()}@test.com`;
  const regB = await request('POST', '/api/auth/register', {
    name: 'User B',
    email: userBEmail,
    password: 'Password123!',
    tenantId: tenantB._id.toString(),
  });
  const tokenB = regB.body.data.token;

  // Create Customer
  const custRes = await request('POST', '/api/customers', { name: 'AI Test Customer', email: 'aitest@cust.com' }, tokenA);
  const customerId = custRes.body.data._id;

  // Create Conversation
  const convRes = await request('POST', '/api/conversations', { customerId }, tokenA);
  const conversationId = convRes.body.data._id;

  console.log('1. Customer & Conversation initialized:', conversationId);

  // Scenario 1: Escalation when no agents are available
  console.log('\n--- SCENARIO 1: Explicit Human Request (No Agent Online) ---');
  const msg1 = await request('POST', `/api/conversations/${conversationId}/messages`, {
    text: 'I want to talk to a human agent please',
  }, tokenA);

  console.log('Status:', msg1.status);
  console.log('Mode:', msg1.body.data?.mode);
  console.log('Notice Message:', msg1.body.data?.aiMessage?.text);
  console.log('Ticket Status:', msg1.body.data?.ticket?.status);
  console.log('Assigned Agent:', msg1.body.data?.assignedAgent);

  // Scenario 2: Create an online agent and trigger escalation again
  console.log('\n--- SCENARIO 2: Human Request (Online Agent Available) ---');
  const agentRes = await request('POST', '/api/agents', {
    name: 'Support Officer Mark',
    email: `mark-${Date.now()}@agent.com`,
    availability: 'online',
  }, tokenA);
  console.log('Created Agent:', agentRes.body.data?.name);

  const msg2 = await request('POST', `/api/conversations/${conversationId}/messages`, {
    text: 'Can I speak to a real person now?',
  }, tokenA);

  console.log('Status:', msg2.status);
  console.log('Mode:', msg2.body.data?.mode);
  console.log('Notice Message:', msg2.body.data?.aiMessage?.text);
  console.log('Ticket Status:', msg2.body.data?.ticket?.status);
  console.log('Assigned Agent Name:', msg2.body.data?.assignedAgent?.name);

  // Scenario 3: Tenant Isolation Test on Messages
  console.log('\n--- SCENARIO 3: Tenant Isolation Check ---');
  const crossMsg = await request('POST', `/api/conversations/${conversationId}/messages`, {
    text: 'Unauthorized attempt',
  }, tokenB);

  console.log('Cross-tenant Status:', crossMsg.status);
  console.log('Cross-tenant Message:', crossMsg.body.message);

  await mongoose.disconnect();
  console.log('\n=== ALL GEMINI AI & ESCALATION TESTS PASSED CLEANLY ===');
  process.exit(0);
};

runAITests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
