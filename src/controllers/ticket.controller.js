const mongoose = require('mongoose');
const ticketService = require('../services/ticket.service');

/**
 * @desc    Create a new ticket
 * @route   POST /api/tickets
 * @access  Private
 */
const createTicket = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const { title, description, customerId, conversationId, assignedAgentId, priority, status } = req.body;

    if (!title || !description || !customerId || !conversationId) {
      const error = new Error('Please provide title, description, customerId, and conversationId');
      error.statusCode = 400;
      throw error;
    }

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      const error = new Error('Invalid customer ID format');
      error.statusCode = 400;
      throw error;
    }

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      const error = new Error('Invalid conversation ID format');
      error.statusCode = 400;
      throw error;
    }

    if (assignedAgentId && !mongoose.Types.ObjectId.isValid(assignedAgentId)) {
      const error = new Error('Invalid agent ID format');
      error.statusCode = 400;
      throw error;
    }

    if (priority && !['low', 'medium', 'high'].includes(priority)) {
      const error = new Error('Priority must be one of: low, medium, high');
      error.statusCode = 400;
      throw error;
    }

    if (status && !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      const error = new Error('Status must be one of: open, in_progress, resolved, closed');
      error.statusCode = 400;
      throw error;
    }

    const ticket = await ticketService.createTicket(tenantId, {
      title: title.trim(),
      description: description.trim(),
      customerId,
      conversationId,
      assignedAgentId,
      priority,
      status,
    });

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all tickets for logged-in user's tenant
 * @route   GET /api/tickets
 * @access  Private
 */
const getTickets = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const tickets = await ticketService.getTickets(tenantId);

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single ticket by ID
 * @route   GET /api/tickets/:id
 * @access  Private
 */
const getTicketById = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid ticket ID format');
      error.statusCode = 400;
      throw error;
    }

    const ticket = await ticketService.getTicketById(tenantId, id);

    if (!ticket) {
      const error = new Error('Ticket not found in your organization');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign ticket to an agent belonging to the same tenant
 * @route   PATCH /api/tickets/:id/assign
 * @access  Private (Admin or Agent)
 */
const assignTicket = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const { id } = req.params;
    const { agentId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid ticket ID format');
      error.statusCode = 400;
      throw error;
    }

    if (!agentId || !mongoose.Types.ObjectId.isValid(agentId)) {
      const error = new Error('Please provide a valid agentId');
      error.statusCode = 400;
      throw error;
    }

    const ticket = await ticketService.assignTicket(tenantId, id, agentId);

    res.status(200).json({
      success: true,
      message: 'Ticket assigned successfully',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update ticket status
 * @route   PATCH /api/tickets/:id/status
 * @access  Private
 */
const updateTicketStatus = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid ticket ID format');
      error.statusCode = 400;
      throw error;
    }

    if (!status || !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      const error = new Error('Status must be one of: open, in_progress, resolved, closed');
      error.statusCode = 400;
      throw error;
    }

    const ticket = await ticketService.updateTicketStatus(tenantId, id, status);

    res.status(200).json({
      success: true,
      message: 'Ticket status updated successfully',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Agent reply to ticket (saved as a conversation Message)
 * @route   POST /api/tickets/:id/reply
 * @access  Private (Admin or Agent)
 */
const replyToTicket = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const { id } = req.params;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid ticket ID format');
      error.statusCode = 400;
      throw error;
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      const error = new Error('Reply text cannot be empty');
      error.statusCode = 400;
      throw error;
    }

    const result = await ticketService.replyToTicket(tenantId, id, text.trim());

    res.status(201).json({
      success: true,
      message: 'Reply sent successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  assignTicket,
  updateTicketStatus,
  replyToTicket,
};
