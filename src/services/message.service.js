const Message = require('../models/message.model');
const Conversation = require('../models/conversation.model');
const Ticket = require('../models/ticket.model');
const Agent = require('../models/agent.model');
const { generateGeminiResponse } = require('./ai.service');

/**
 * Handle incoming customer message with Gemini AI response & Ticket Escalation Fallback
 */
const processCustomerMessage = async (tenantId, conversationId, text) => {
  // 1. Verify conversation belongs to tenant
  const conversation = await Conversation.findOne({ _id: conversationId, tenantId });
  if (!conversation) {
    const error = new Error('Conversation not found in your organization');
    error.statusCode = 404;
    throw error;
  }

  // 2. Save incoming customer message
  const customerMessage = await Message.create({
    conversationId,
    tenantId,
    senderType: 'customer',
    text,
  });

  // 3. Check for explicit human support request keywords
  const humanKeywords = ['human', 'agent', 'support person', 'representative', 'real person', 'escalate', 'talk to human', 'live agent'];
  const isExplicitHumanRequest = humanKeywords.some((keyword) => text.toLowerCase().includes(keyword));

  let aiResult = { success: false, reason: 'EXPLICIT_HUMAN_REQUEST' };

  // 4. Call Gemini AI if customer didn't explicitly demand human support
  if (!isExplicitHumanRequest) {
    const historyMessages = await Message.find({ conversationId, tenantId })
      .sort({ createdAt: 1 })
      .limit(10);

    aiResult = await generateGeminiResponse(historyMessages, text);
  }

  // 5. If Gemini generates a useful answer (no escalation needed)
  if (aiResult.success) {
    const aiMessage = await Message.create({
      conversationId,
      tenantId,
      senderType: 'AI',
      text: aiResult.text,
    });

    return {
      mode: 'AI_RESPONSE',
      customerMessage,
      aiMessage,
    };
  }

  // 6. Escalation Flow: Customer requested human OR AI failed / needs fallback
  let ticket = await Ticket.findOne({
    conversationId,
    tenantId,
    status: { $in: ['open', 'in_progress'] },
  });

  // Reuse existing open ticket or create a new one
  if (!ticket) {
    const shortText = text.length > 40 ? `${text.substring(0, 40)}...` : text;
    ticket = await Ticket.create({
      title: `Escalated Inquiry: ${shortText}`,
      description: text,
      customerId: conversation.customerId,
      conversationId,
      tenantId,
      status: 'open',
      priority: 'medium',
    });
  }

  // Check for available agent in the same tenant
  const availableAgent = await Agent.findOne({ tenantId, availability: 'online' });

  let escalationNoticeText = '';

  if (availableAgent) {
    ticket.assignedAgentId = availableAgent._id;
    ticket.status = 'in_progress';
    await ticket.save();

    conversation.assignedAgentId = availableAgent._id;
    await conversation.save();

    escalationNoticeText = `Your request has been escalated to human support. Agent ${availableAgent.name} has been assigned to your ticket.`;
  } else {
    escalationNoticeText = `Your request has been escalated to human support. All our agents are currently busy; ticket #${ticket._id} is open and awaiting agent assignment.`;
  }

  // Save escalation notice as AI/System message
  const aiEscalationMessage = await Message.create({
    conversationId,
    tenantId,
    senderType: 'AI',
    text: escalationNoticeText,
  });

  await ticket.populate([
    { path: 'customerId', select: 'name email' },
    { path: 'assignedAgentId', select: 'name email availability' },
  ]);

  return {
    mode: 'ESCALATED_TO_HUMAN',
    reason: aiResult.reason || 'HUMAN_REQUIRED',
    customerMessage,
    aiMessage: aiEscalationMessage,
    ticket,
    assignedAgent: availableAgent || null,
  };
};

/**
 * Direct message creation (for explicit manual posting)
 */
const createMessage = async (tenantId, conversationId, messageData) => {
  const { senderType, text } = messageData;

  const conversation = await Conversation.findOne({ _id: conversationId, tenantId });
  if (!conversation) {
    const error = new Error('Conversation not found in your organization');
    error.statusCode = 404;
    throw error;
  }

  const message = await Message.create({
    conversationId,
    tenantId,
    senderType,
    text,
  });

  return message;
};

/**
 * Get messages by conversation ID
 */
const getMessagesByConversation = async (tenantId, conversationId) => {
  const conversation = await Conversation.findOne({ _id: conversationId, tenantId });
  if (!conversation) {
    const error = new Error('Conversation not found in your organization');
    error.statusCode = 404;
    throw error;
  }

  const messages = await Message.find({ conversationId, tenantId }).sort({ createdAt: 1 });
  return messages;
};

module.exports = {
  processCustomerMessage,
  createMessage,
  getMessagesByConversation,
};
