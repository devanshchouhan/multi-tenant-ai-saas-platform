const express = require('express');
const {
  createTicket,
  getTickets,
  getTicketById,
  assignTicket,
  updateTicketStatus,
  replyToTicket,
} = require('../controllers/ticket.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// All ticket endpoints require authentication
router.use(authenticate);

router.post('/', createTicket);
router.get('/', getTickets);
router.get('/:id', getTicketById);

// Agent/Admin restricted actions
router.patch('/:id/assign', authorize('admin', 'agent'), assignTicket);
router.patch('/:id/status', updateTicketStatus);
router.post('/:id/reply', authorize('admin', 'agent'), replyToTicket);

module.exports = router;
