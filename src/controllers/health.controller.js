/**
 * @desc    Health check endpoint handler
 * @route   GET /api/health
 * @access  Public
 */
const getHealthStatus = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SupportHub API is running',
  });
};

module.exports = {
  getHealthStatus,
};
