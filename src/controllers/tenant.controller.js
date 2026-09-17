const mongoose = require('mongoose');
const tenantService = require('../services/tenant.service');

/**
 * @desc    Create a new tenant
 * @route   POST /api/tenants
 * @access  Public
 */
const createTenant = async (req, res, next) => {
  try {
    const { name, slug, email, status } = req.body;

    if (!name || !slug || !email) {
      const error = new Error('Please provide name, slug, and email');
      error.statusCode = 400;
      throw error;
    }

    const tenant = await tenantService.createTenant({ name, slug, email, status });

    res.status(201).json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get tenant details by ID
 * @route   GET /api/tenants/:id
 * @access  Public
 */
const getTenantById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid tenant ID format');
      error.statusCode = 400;
      throw error;
    }

    const tenant = await tenantService.getTenantById(id);

    if (!tenant) {
      const error = new Error('Tenant not found');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTenant,
  getTenantById,
};
