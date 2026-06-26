const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DATABASE_POOL_MAX || 10),
  min: parseInt(process.env.DATABASE_POOL_MIN || 2),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected pool error:', err);
  process.exit(-1);
});

/**
 * Initialize database tables
 */
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS webconnex_events (
        id SERIAL PRIMARY KEY,
        event_id UUID NOT NULL UNIQUE,
        event_type VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_event_id ON webconnex_events(event_id);
      CREATE INDEX IF NOT EXISTS idx_event_type ON webconnex_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_status ON webconnex_events(status);
      CREATE INDEX IF NOT EXISTS idx_received_at ON webconnex_events(received_at);
    `);
    logger.info('Database tables initialized');
  } finally {
    client.release();
  }
}

/**
 * Execute a query
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`Query executed in ${duration}ms`);
    return res;
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  }
}

/**
 * Get a single client from the pool
 */
async function getClient() {
  return pool.connect();
}

module.exports = {
  pool,
  query,
  getClient,
  initializeDatabase,
};
