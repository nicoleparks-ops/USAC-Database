const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const logger = require('../utils/logger');

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'ok',
      timestamp: result.rows[0].now,
      uptime: process.uptime(),
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'error',
      error: 'Database connection failed',
    });
  }
});

module.exports = router;
