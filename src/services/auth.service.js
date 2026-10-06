const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Tenant = require('../models/tenant.model');

/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
  const tenantId = user.tenantId._id ? user.tenantId._id : user.tenantId;

  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      tenantId: tenantId,
    },
    process.env.JWT_SECRET || 'fallback_secret',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

/**
 * Register a new user under a specific Tenant
 */
const registerUser = async (userData) => {
  const { name, email, password, role, tenantId } = userData;

  // 1. Verify that the specified tenant exists and is active
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    const error = new Error('Tenant not found');
    error.statusCode = 404;
    throw error;
  }

  if (tenant.status === 'suspended') {
    const error = new Error('Cannot register under a suspended tenant');
    error.statusCode = 403;
    throw error;
  }

  // 2. Check if user with same email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error('A user with this email already exists');
    error.statusCode = 409;
    throw error;
  }

  // 3. Security: Prevent public self-assignment of privileged roles (admin, agent)
  // Public registration defaults to 'customer'. Privileged roles cannot be self-assigned.
  let assignedRole = 'customer';
  if (role && role !== 'customer') {
    const error = new Error('Privileged roles (admin, agent) cannot be self-assigned during registration');
    error.statusCode = 400;
    throw error;
  }

  // 4. Create the new user
  const user = await User.create({
    name,
    email,
    password,
    role: assignedRole,
    tenantId,
  });

  // Populate tenant info
  await user.populate('tenantId', 'name slug email status');

  // Generate JWT token
  const token = generateToken(user);

  // Return user object (toJSON automatically removes password) and token
  return {
    user: user.toJSON(),
    token,
  };
};

/**
 * Authenticate user login credentials
 */
const loginUser = async ({ email, password }) => {
  // 1. Find user by email
  const user = await User.findOne({ email }).populate('tenantId', 'name slug email status');
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // 2. Verify password using bcrypt compare
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // 3. Check if associated tenant is active
  if (user.tenantId && user.tenantId.status === 'suspended') {
    const error = new Error('Tenant account is suspended');
    error.statusCode = 403;
    throw error;
  }

  // 4. Generate JWT token
  const token = generateToken(user);

  return {
    user: user.toJSON(),
    token,
  };
};

/**
 * Fetch profile of currently authenticated user
 */
const getUserProfile = async (userId) => {
  const user = await User.findById(userId).populate('tenantId', 'name slug email status');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return user.toJSON();
};

module.exports = {
  generateToken,
  registerUser,
  loginUser,
  getUserProfile,
};
