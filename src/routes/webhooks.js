const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const logger = require('../utils/logger');
const { query } = require('../database');
const { validateWebhookSignature, validateWebhookPayload } = require('../middleware/validation');

/**
 * POST /webhooks/webconnex
 * Receive webhook events from Webconnex
 */
router.post('/webconnex', validateWebhookSignature, async (req, res) => {
  try {
    const { event_id, event_type, data, timestamp } = req.body;

    logger.info(`Received webhook event: ${event_type}`, { event_id });

    // Validate payload
    const { error, value } = validateWebhookPayload(req.body);
    if (error) {
      logger.warn('Invalid payload:', error.details);
      return res.status(400).json({ error: 'Invalid payload', details: error.details });
    }

    // Store event in database
    const result = await query(
      `INSERT INTO webconnex_events 
       (event_id, event_type, data, status) 
       VALUES ($1, $2, $3, $4)
       RETURNING id, event_id, event_type, created_at`,
      [event_id, event_type, JSON.stringify(data), 'pending']
    );

    logger.info(`Event stored: ${event_id}`, { db_id: result.rows[0].id });

    // Process event asynchronously
    processWebhookEvent(result.rows[0].id, event_type, data);

    res.status(202).json({
      success: true,
      message: 'Event received and queued for processing',
      event_id: event_id,
      db_id: result.rows[0].id,
    });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Process webhook event asynchronously
 */
async function processWebhookEvent(db_id, event_type, data) {
  try {
    // Add your event processing logic here
    logger.info(`Processing event: ${event_type}`, { db_id });

    // Example: Update status to processed
    await query(
      `UPDATE webconnex_events 
       SET status = $1, processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      ['processed', db_id]
    );

    logger.info(`Event processed successfully: ${db_id}`);
  } catch (error) {
    logger.error(`Error processing event ${db_id}:`, error);
    await query(
      `UPDATE webconnex_events 
       SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      ['error', error.message, db_id]
    );
  }
}

/**
 * GET /webhooks/events
 * Retrieve stored events
 */
router.get('/events', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let sql = 'SELECT * FROM webconnex_events';
    const params = [];

    if (status) {
      sql += ' WHERE status = $1';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    res.json({
      count: result.rows.length,
      events: result.rows,
    });
  } catch (error) {
    logger.error('Error retrieving events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
