const express = require('express');
const {
  createConversation,
  getConversations,
  getConversationById,
  updateConversation,
} = require('../controllers/conversation.controller');
const {
  createMessage,
  getMessages,
} = require('../controllers/message.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

// All conversation & message routes require authentication
router.use(authenticate);

// Conversation endpoints
router.post('/', createConversation);
router.get('/', getConversations);
router.get('/:id', getConversationById);
router.patch('/:id', updateConversation);

// Message endpoints nested under conversation
router.post('/:id/messages', createMessage);
router.get('/:id/messages', getMessages);

module.exports = router;
