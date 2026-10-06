const Agent = require('../models/agent.model');

/**
 * Create a new agent for a tenant
 */
const createAgent = async (tenantId, agentData) => {
  const { name, email, availability } = agentData;

  // Check if agent email already exists under this tenant
  const existingAgent = await Agent.findOne({ email, tenantId });
  if (existingAgent) {
    const error = new Error('An agent with this email already exists in your organization');
    error.statusCode = 409;
    throw error;
  }

  const agent = await Agent.create({
    name,
    email,
    availability: availability || 'online',
    tenantId,
  });

  return agent;
};

/**
 * Get all agents for a tenant
 */
const getAgents = async (tenantId) => {
  const agents = await Agent.find({ tenantId }).sort({ createdAt: -1 });
  return agents;
};

/**
 * Get a single agent by ID scoped to tenant
 */
const getAgentById = async (tenantId, agentId) => {
  const agent = await Agent.findOne({ _id: agentId, tenantId });
  return agent;
};

/**
 * Update agent details scoped to tenant
 */
const updateAgent = async (tenantId, agentId, updateData) => {
  const agent = await Agent.findOneAndUpdate(
    { _id: agentId, tenantId },
    updateData,
    { new: true, runValidators: true }
  );
  return agent;
};

/**
 * Delete an agent scoped to tenant
 */
const deleteAgent = async (tenantId, agentId) => {
  const agent = await Agent.findOneAndDelete({ _id: agentId, tenantId });
  return agent;
};

module.exports = {
  createAgent,
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
};
