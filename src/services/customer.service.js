const Customer = require('../models/customer.model');

/**
 * Create a new customer for a tenant
 */
const createCustomer = async (tenantId, customerData) => {
  const { name, email } = customerData;

  // Check if customer email already exists in this tenant
  const existingCustomer = await Customer.findOne({ email, tenantId });
  if (existingCustomer) {
    const error = new Error('A customer with this email already exists in your organization');
    error.statusCode = 409;
    throw error;
  }

  const customer = await Customer.create({
    name,
    email,
    tenantId,
  });

  return customer;
};

/**
 * Get all customers for a tenant
 */
const getCustomers = async (tenantId) => {
  const customers = await Customer.find({ tenantId }).sort({ createdAt: -1 });
  return customers;
};

/**
 * Get a single customer by ID scoped to tenant
 */
const getCustomerById = async (tenantId, customerId) => {
  const customer = await Customer.findOne({ _id: customerId, tenantId });
  return customer;
};

/**
 * Update customer details scoped to tenant
 */
const updateCustomer = async (tenantId, customerId, updateData) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: customerId, tenantId },
    updateData,
    { new: true, runValidators: true }
  );
  return customer;
};

/**
 * Delete a customer scoped to tenant
 */
const deleteCustomer = async (tenantId, customerId) => {
  const customer = await Customer.findOneAndDelete({ _id: customerId, tenantId });
  return customer;
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};
