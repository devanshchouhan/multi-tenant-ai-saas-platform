const Tenant = require('../models/tenant.model');

/**
 * Create a new tenant document in MongoDB
 */
const createTenant = async (tenantData) => {
  const existingTenant = await Tenant.findOne({ slug: tenantData.slug });
  if (existingTenant) {
    const error = new Error('A tenant with this slug already exists');
    error.statusCode = 400;
    throw error;
  }

  const tenant = await Tenant.create(tenantData);
  return tenant;
};

/**
 * Find a tenant by MongoDB ObjectId
 */
const getTenantById = async (id) => {
  const tenant = await Tenant.findById(id);
  return tenant;
};

module.exports = {
  createTenant,
  getTenantById,
};
