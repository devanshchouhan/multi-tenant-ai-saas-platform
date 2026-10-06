const Ticket = require('../models/ticket.model');
const Customer = require('../models/customer.model');
const Conversation = require('../models/conversation.model');
const Agent = require('../models/agent.model');
const Message = require('../models/message.model');

/**
 * Create a new ticket scoped to tenant
 */
const createTicket = async (tenantId, ticketData) => {
  const { title, description, customerId, conversationId, assignedAgentId, priority, status } = ticketData;

  // 1. Verify customer exists under this tenant
  const customer = await Customer.findOne({ _id: customerId, tenantId });
  if (!customer) {
    const error = new Error('Customer not found in your organization');
    error.statusCode = 404;
    throw error;
  }

  // 2. Verify conversation exists under this tenant
  const conversation = await Conversation.findOne({ _id: conversationId, tenantId });
  if (!conversation) {
    const error = new Error('Conversation not found in your organization');
    error.statusCode = 404;
    throw error;
  }

  // 3. Verify assigned agent if provided
  if (assignedAgentId) {
    const agent = await Agent.findOne({ _id: assignedAgentId, tenantId });
    if (!agent) {
      const error = new Error('Assigned agent not found in your organization');
      error.statusCode = 404;
      throw error;
    }
  }

  const ticket = await Ticket.create({
    title,
    description,
    customerId,
    conversationId,
    tenantId,
    assignedAgentId: assignedAgentId || null,
    priority: priority || 'medium',
    status: status || 'open',
  });

  await ticket.populate([
    { path: 'customerId', select: 'name email' },
    { path: 'conversationId', select: 'status' },
    { path: 'assignedAgentId', select: 'name email availability' },
  ]);

  return ticket;
};

/**
 * Get all tickets for a tenant
 */
const getTickets = async (tenantId) => {
  const tickets = await Ticket.find({ tenantId })
    .populate('customerId', 'name email')
    .populate('conversationId', 'status')
    .populate('assignedAgentId', 'name email availability')
    .sort({ createdAt: -1 });

  return tickets;
};

/**
 * Get single ticket by ID scoped to tenant
 */
const getTicketById = async (tenantId, ticketId) => {
  const ticket = await Ticket.findOne({ _id: ticketId, tenantId })
    .populate('customerId', 'name email')
    .populate('conversationId', 'status')
    .populate('assignedAgentId', 'name email availability');

  return ticket;
};

/**
 * Assign ticket to an agent belonging to the same tenant
 */
const assignTicket = async (tenantId, ticketId, agentId) => {
  // Verify agent exists under this tenant
  const agent = await Agent.findOne({ _id: agentId, tenantId });
  if (!agent) {
    const error = new Error('Agent not found in your organization');
    error.statusCode = 404;
    throw error;
  }

  const ticket = await Ticket.findOne({ _id: ticketId, tenantId });
  if (!ticket) {
    const error = new Error('Ticket not found in your organization');
    error.statusCode = 404;
    throw error;
  }

  ticket.assignedAgentId = agentId;
  // If ticket is open, update status to in_progress upon assignment
  if (ticket.status === 'open') {
    ticket.status = 'in_progress';
  }

  await ticket.save();

  await ticket.populate([
    { path: 'customerId', select: 'name email' },
    { path: 'conversationId', select: 'status' },
    { path: 'assignedAgentId', select: 'name email availability' },
  ]);

  return ticket;
};

/**
 * Update ticket status scoped to tenant
 */
const updateTicketStatus = async (tenantId, ticketId, status) => {
  const ticket = await Ticket.findOneAndUpdate(
    { _id: ticketId, tenantId },
    { status },
    { new: true, runValidators: true }
  )
    .populate('customerId', 'name email')
    .populate('conversationId', 'status')
    .populate('assignedAgentId', 'name email availability');

  if (!ticket) {
    const error = new Error('Ticket not found in your organization');
    error.statusCode = 404;
    throw error;
  }

  return ticket;
};

/**
 * Agent reply to a ticket, creating a Message entry in the ticket's conversation
 */
const replyToTicket = async (tenantId, ticketId, replyText) => {
  // Find ticket scoped to tenant
  const ticket = await Ticket.findOne({ _id: ticketId, tenantId });
  if (!ticket) {
    const error = new Error('Ticket not found in your organization');
    error.statusCode = 404;
    throw error;
  }

  // Create message in the associated conversation
  const message = await Message.create({
    conversationId: ticket.conversationId,
    tenantId,
    senderType: 'agent',
    text: replyText,
  });

  // Update ticket status to in_progress if currently open
  if (ticket.status === 'open') {
    ticket.status = 'in_progress';
    await ticket.save();
  }

  return {
    ticket,
    message,
  };
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  assignTicket,
  updateTicketStatus,
  replyToTicket,
};
