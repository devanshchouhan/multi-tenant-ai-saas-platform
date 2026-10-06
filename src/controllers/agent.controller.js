const mongoose = require('mongoose');
const agentService = require('../services/agent.service');

/**
 * Helper to validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * @desc    Create a new agent
 * @route   POST /api/agents
 * @access  Private
 */
const createAgent = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const { name, email, availability } = req.body;

    if (!name || !email) {
      const error = new Error('Please provide agent name and email');
      error.statusCode = 400;
      throw error;
    }

    if (!isValidEmail(email)) {
      const error = new Error('Please provide a valid email address');
      error.statusCode = 400;
      throw error;
    }

    if (availability && !['online', 'offline', 'busy'].includes(availability)) {
      const error = new Error('Availability must be one of: online, offline, busy');
      error.statusCode = 400;
      throw error;
    }

    const agent = await agentService.createAgent(tenantId, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      availability,
    });

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      data: agent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all agents for authenticated user's tenant
 * @route   GET /api/agents
 * @access  Private
 */
const getAgents = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const agents = await agentService.getAgents(tenantId);

    res.status(200).json({
      success: true,
      count: agents.length,
      data: agents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single agent by ID
 * @route   GET /api/agents/:id
 * @access  Private
 */
const getAgentById = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid agent ID format');
      error.statusCode = 400;
      throw error;
    }

    const agent = await agentService.getAgentById(tenantId, id);

    if (!agent) {
      const error = new Error('Agent not found in your organization');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: agent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update agent details
 * @route   PUT /api/agents/:id
 * @access  Private
 */
const updateAgent = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const { id } = req.params;
    const { name, email, availability } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid agent ID format');
      error.statusCode = 400;
      throw error;
    }

    if (email && !isValidEmail(email)) {
      const error = new Error('Please provide a valid email address');
      error.statusCode = 400;
      throw error;
    }

    if (availability && !['online', 'offline', 'busy'].includes(availability)) {
      const error = new Error('Availability must be one of: online, offline, busy');
      error.statusCode = 400;
      throw error;
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (availability) updateData.availability = availability;

    const agent = await agentService.updateAgent(tenantId, id, updateData);

    if (!agent) {
      const error = new Error('Agent not found in your organization');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Agent updated successfully',
      data: agent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete agent
 * @route   DELETE /api/agents/:id
 * @access  Private
 */
const deleteAgent = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid agent ID format');
      error.statusCode = 400;
      throw error;
    }

    const agent = await agentService.deleteAgent(tenantId, id);

    if (!agent) {
      const error = new Error('Agent not found in your organization');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Agent deleted successfully',
      data: agent,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAgent,
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
};
