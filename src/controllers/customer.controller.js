const mongoose = require('mongoose');
const customerService = require('../services/customer.service');

/**
 * Helper to validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * @desc    Create a new customer
 * @route   POST /api/customers
 * @access  Private
 */
const createCustomer = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const { name, email } = req.body;

    if (!name || !email) {
      const error = new Error('Please provide customer name and email');
      error.statusCode = 400;
      throw error;
    }

    if (!isValidEmail(email)) {
      const error = new Error('Please provide a valid email address');
      error.statusCode = 400;
      throw error;
    }

    const customer = await customerService.createCustomer(tenantId, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all customers for authenticated user's tenant
 * @route   GET /api/customers
 * @access  Private
 */
const getCustomers = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const customers = await customerService.getCustomers(tenantId);

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single customer by ID
 * @route   GET /api/customers/:id
 * @access  Private
 */
const getCustomerById = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid customer ID format');
      error.statusCode = 400;
      throw error;
    }

    const customer = await customerService.getCustomerById(tenantId, id);

    if (!customer) {
      const error = new Error('Customer not found in your organization');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update customer details
 * @route   PUT /api/customers/:id
 * @access  Private
 */
const updateCustomer = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const { id } = req.params;
    const { name, email } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid customer ID format');
      error.statusCode = 400;
      throw error;
    }

    if (email && !isValidEmail(email)) {
      const error = new Error('Please provide a valid email address');
      error.statusCode = 400;
      throw error;
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.trim().toLowerCase();

    const customer = await customerService.updateCustomer(tenantId, id, updateData);

    if (!customer) {
      const error = new Error('Customer not found in your organization');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete customer
 * @route   DELETE /api/customers/:id
 * @access  Private
 */
const deleteCustomer = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId._id ? req.user.tenantId._id : req.user.tenantId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid customer ID format');
      error.statusCode = 400;
      throw error;
    }

    const customer = await customerService.deleteCustomer(tenantId, id);

    if (!customer) {
      const error = new Error('Customer not found in your organization');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};
