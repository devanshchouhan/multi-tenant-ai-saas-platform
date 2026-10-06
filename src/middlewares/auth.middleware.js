const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * Authentication Middleware: Verifies JWT token and attaches authenticated user to req.user
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      const error = new Error('Not authorized: No token provided');
      error.statusCode = 401;
      throw error;
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    // Find user from decoded token payload
    const user = await User.findById(decoded.id).populate('tenantId', 'name slug email status');

    if (!user) {
      const error = new Error('Not authorized: User no longer exists');
      error.statusCode = 401;
      throw error;
    }

    // Check if tenant is suspended
    if (user.tenantId && user.tenantId.status === 'suspended') {
      const error = new Error('Access denied: Tenant account is suspended');
      error.statusCode = 403;
      throw error;
    }

    // Attach user information to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      const jwtError = new Error('Not authorized: Invalid token');
      jwtError.statusCode = 401;
      return next(jwtError);
    }
    if (error.name === 'TokenExpiredError') {
      const expiredError = new Error('Not authorized: Token has expired');
      expiredError.statusCode = 401;
      return next(expiredError);
    }
    next(error);
  }
};

/**
 * Role-based Authorization Middleware
 * @param {...String} roles Allowed roles (e.g. 'admin', 'agent', 'customer')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      const error = new Error('Not authorized: User context missing');
      error.statusCode = 401;
      return next(error);
    }

    if (!roles.includes(req.user.role)) {
      const error = new Error(`Forbidden: Access denied for role '${req.user.role}'`);
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
};

/**
 * Tenant Isolation Middleware: Ensures users can only access resources belonging to their organization
 */
const enforceTenantIsolation = (req, res, next) => {
  if (!req.user || !req.user.tenantId) {
    const error = new Error('Not authorized: Tenant context missing');
    error.statusCode = 401;
    return next(error);
  }

  // Get target tenant ID from request params
  const targetTenantId = req.params.tenantId || req.params.id;

  if (targetTenantId) {
    const userTenantIdStr = req.user.tenantId._id
      ? req.user.tenantId._id.toString()
      : req.user.tenantId.toString();

    if (userTenantIdStr !== targetTenantId.toString()) {
      const error = new Error('Forbidden: Access denied. Cannot access another organization\'s data');
      error.statusCode = 403;
      return next(error);
    }
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  enforceTenantIsolation,
};
