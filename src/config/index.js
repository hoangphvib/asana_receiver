/**
 * Configuration Management
 * Centralized configuration with validation
 */

require('dotenv').config();

const config = {
  // Server
  server: {
    port: parseInt(process.env.PORT) || 3500,
    publicUrl: process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3500}`,
    env: process.env.NODE_ENV || 'development',
  },

  // Asana Receiver Database
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT) || 5433,
    name: process.env.DATABASE_NAME || 'asana_receiver',
    user: process.env.DATABASE_USER || 'asana_admin',
    password: process.env.DATABASE_PASSWORD || 'asana_secure_pass_2024',
    poolMin: parseInt(process.env.DATABASE_POOL_MIN) || 2,
    poolMax: parseInt(process.env.DATABASE_POOL_MAX) || 10,
  },

  // Webhook
  webhook: {
    secret: process.env.ASANA_WEBHOOK_SECRET || null,
    maxHistory: parseInt(process.env.WEBHOOK_MAX_HISTORY) || 50,
  },

};

/**
 * Validate required configuration
 */
function validateConfig() {
  const required = [
    ['database.host', config.database.host],
    ['database.name', config.database.name],
    ['database.user', config.database.user],
    ['database.password', config.database.password],
  ];

  const missing = required.filter(([key, value]) => !value).map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
}

// Validate on load
validateConfig();

module.exports = config;

