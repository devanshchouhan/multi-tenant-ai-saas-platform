const express = require('express');
const { createTenant, getTenantById } = require('../controllers/tenant.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Protected Tenant Routes
router.post('/', authenticate, authorize('admin'), createTenant);
router.get('/:id', authenticate, getTenantById);

module.exports = router;
