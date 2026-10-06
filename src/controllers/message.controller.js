const mongoose = require('mongoose');
const messageService = require('../services/message.service');

/**
 * @desc    Post a message to a conversation (Triggers Gemini AI / Ticket Escalation for Customer messages)
 * @route   POST /api/conversations/:id/messages
 * @access  Private
 */
const createMessage = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const { id: conversationId } = req.params;
    const { senderType, text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      const error = new Error('Invalid conversation ID format');
      error.statusCode = 400;
      throw error;
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      const error = new Error('Message text cannot be empty');
      error.statusCode = 400;
      throw error;
    }

    // Default senderType to 'customer' if not specified
    const type = senderType || 'customer';

    if (!['customer', 'agent', 'AI'].includes(type)) {
      const error = new Error('senderType must be one of: customer, agent, AI');
      error.statusCode = 400;
      throw error;
    }

    // If message is from customer, process via Gemini AI + Escalation workflow
    if (type === 'customer') {
      const result = await messageService.processCustomerMessage(tenantId, conversationId, text.trim());
      return res.status(201).json({
        success: true,
        message: result.mode === 'AI_RESPONSE' ? 'AI response generated' : 'Request escalated to human agent',
        data: result,
      });
    }

    // Manual message creation (agent / system)
    const message = await messageService.createMessage(tenantId, conversationId, {
      senderType: type,
      text: text.trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all messages for a conversation
 * @route   GET /api/conversations/:id/messages
 * @access  Private
 */
const getMessages = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const { id: conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      const error = new Error('Invalid conversation ID format');
      error.statusCode = 400;
      throw error;
    }

    const messages = await messageService.getMessagesByConversation(tenantId, conversationId);

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMessage,
  getMessages,
};
