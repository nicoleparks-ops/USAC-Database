const crypto = require('crypto');
const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Validate webhook signature
 */
function validateWebhookSignature(req, res, next) {
  const signature = req.headers['x-webconnex-signature'];
  const secret = process.env.WEBCONNEX_WEBHOOK_SECRET;

  if (!signature || !secret) {
    logger.warn('Missing webhook signature or secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payload = JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  if (signature !== hash) {
    logger.warn('Invalid webhook signature');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

/**
 * Validate webhook payload structure
 */
function validateWebhookPayload(data) {
  const schema = Joi.object({
    event_id: Joi.string().uuid().required(),
    event_type: Joi.string().required(),
    data: Joi.object().required(),
    timestamp: Joi.string().isoDate().required(),
  });

  return schema.validate(data, { abortEarly: false });
}

module.exports = {
  validateWebhookSignature,
  validateWebhookPayload,
};
