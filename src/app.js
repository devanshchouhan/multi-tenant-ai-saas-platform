const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const tenantRoutes = require('./routes/tenant.routes');
const { notFound, errorHandler } = require('./middlewares/error.middleware');

const app = express();

// Middleware configuration
app.use(cors());
app.use(express.json());

// Application routes
app.use('/api/health', healthRoutes);
app.use('/api/tenants', tenantRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
