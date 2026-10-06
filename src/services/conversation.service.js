const Conversation = require('../models/conversation.model');
const Customer = require('../models/customer.model');
const Agent = require('../models/agent.model');

/**
 * Create a new conversation scoped to tenant
 */
const createConversation = async (tenantId, conversationData) => {
  const { customerId, assignedAgentId, status } = conversationData;

  // Verify customer exists under this tenant
  const customer = await Customer.findOne({ _id: customerId, tenantId });
  if (!customer) {
    const error = new Error('Customer not found in your organization');
    error.statusCode = 404;
    throw error;
  }

  // If agent ID is provided, verify agent exists under this tenant
  if (assignedAgentId) {
    const agent = await Agent.findOne({ _id: assignedAgentId, tenantId });
    if (!agent) {
      const error = new Error('Assigned agent not found in your organization');
      error.statusCode = 404;
      throw error;
    }
  }

  const conversation = await Conversation.create({
    customerId,
    tenantId,
    status: status || 'open',
    assignedAgentId: assignedAgentId || null,
  });

  await conversation.populate([
    { path: 'customerId', select: 'name email' },
    { path: 'assignedAgentId', select: 'name email availability' },
  ]);

  return conversation;
};

/**
 * Get all conversations for a tenant
 */
const getConversations = async (tenantId) => {
  const conversations = await Conversation.find({ tenantId })
    .populate('customerId', 'name email')
    .populate('assignedAgentId', 'name email availability')
    .sort({ createdAt: -1 });

  return conversations;
};

/**
 * Get a single conversation by ID scoped to tenant
 */
const getConversationById = async (tenantId, conversationId) => {
  const conversation = await Conversation.findOne({ _id: conversationId, tenantId })
    .populate('customerId', 'name email')
    .populate('assignedAgentId', 'name email availability');

  return conversation;
};

/**
 * Update conversation status or assigned agent scoped to tenant
 */
const updateConversation = async (tenantId, conversationId, updateData) => {
  const { status, assignedAgentId } = updateData;

  // If assignedAgentId is provided, verify agent exists under tenant
  if (assignedAgentId) {
    const agent = await Agent.findOne({ _id: assignedAgentId, tenantId });
    if (!agent) {
      const error = new Error('Assigned agent not found in your organization');
      error.statusCode = 404;
      throw error;
    }
  }

  const conversation = await Conversation.findOneAndUpdate(
    { _id: conversationId, tenantId },
    { ...(status && { status }), ...(assignedAgentId !== undefined && { assignedAgentId }) },
    { new: true, runValidators: true }
  )
    .populate('customerId', 'name email')
    .populate('assignedAgentId', 'name email availability');

  return conversation;
};

module.exports = {
  createConversation,
  getConversations,
  getConversationById,
  updateConversation,
};
