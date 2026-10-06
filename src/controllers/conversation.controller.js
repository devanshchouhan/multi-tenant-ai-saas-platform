const mongoose = require('mongoose');
const conversationService = require('../services/conversation.service');

/**
 * @desc    Create a new conversation
 * @route   POST /api/conversations
 * @access  Private
 */
const createConversation = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const { customerId, assignedAgentId, status } = req.body;

    if (!customerId) {
      const error = new Error('Please provide customerId');
      error.statusCode = 400;
      throw error;
    }

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      const error = new Error('Invalid customer ID format');
      error.statusCode = 400;
      throw error;
    }

    if (assignedAgentId && !mongoose.Types.ObjectId.isValid(assignedAgentId)) {
      const error = new Error('Invalid agent ID format');
      error.statusCode = 400;
      throw error;
    }

    if (status && !['open', 'closed', 'pending'].includes(status)) {
      const error = new Error('Status must be one of: open, closed, pending');
      error.statusCode = 400;
      throw error;
    }

    const conversation = await conversationService.createConversation(tenantId, {
      customerId,
      assignedAgentId,
      status,
    });

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all conversations for authenticated user's tenant
 * @route   GET /api/conversations
 * @access  Private
 */
const getConversations = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const conversations = await conversationService.getConversations(tenantId);

    res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single conversation by ID
 * @route   GET /api/conversations/:id
 * @access  Private
 */
const getConversationById = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid conversation ID format');
      error.statusCode = 400;
      throw error;
    }

    const conversation = await conversationService.getConversationById(tenantId, id);

    if (!conversation) {
      const error = new Error('Conversation not found in your organization');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update conversation status or assigned agent
 * @route   PATCH /api/conversations/:id
 * @access  Private
 */
const updateConversation = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const { id } = req.params;
    const { status, assignedAgentId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid conversation ID format');
      error.statusCode = 400;
      throw error;
    }

    if (assignedAgentId && !mongoose.Types.ObjectId.isValid(assignedAgentId)) {
      const error = new Error('Invalid agent ID format');
      error.statusCode = 400;
      throw error;
    }

    if (status && !['open', 'closed', 'pending'].includes(status)) {
      const error = new Error('Status must be one of: open, closed, pending');
      error.statusCode = 400;
      throw error;
    }

    const conversation = await conversationService.updateConversation(tenantId, id, {
      status,
      assignedAgentId,
    });

    if (!conversation) {
      const error = new Error('Conversation not found in your organization');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Conversation updated successfully',
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createConversation,
  getConversations,
  getConversationById,
  updateConversation,
};
