const express = require('express');
const { createTenant, getTenantById } = require('../controllers/tenant.controller');

const router = express.Router();

router.post('/', createTenant);
router.get('/:id', getTenantById);

module.exports = router;
