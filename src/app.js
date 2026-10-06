const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const tenantRoutes = require('./routes/tenant.routes');
const customerRoutes = require('./routes/customer.routes');
const agentRoutes = require('./routes/agent.routes');
const conversationRoutes = require('./routes/conversation.routes');
const ticketRoutes = require('./routes/ticket.routes');
const { notFound, errorHandler } = require('./middlewares/error.middleware');

const app = express();

// Middleware configuration
app.use(cors());
app.use(express.json());

// Application routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/tickets', ticketRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
