const express = require('express');
const {
  createAgent,
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
} = require('../controllers/agent.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

// All agent routes require authentication
router.use(authenticate);

router.post('/', createAgent);
router.get('/', getAgents);
router.get('/:id', getAgentById);
router.put('/:id', updateAgent);
router.delete('/:id', deleteAgent);

module.exports = router;
