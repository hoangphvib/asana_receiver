/**
 * Database connection and query functions for asana_receiver
 * Using PostgreSQL to store webhook secrets and events
 */

const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5433,
  database: process.env.DATABASE_NAME || 'asana_receiver',
  user: process.env.DATABASE_USER || 'asana_admin',
  password: process.env.DATABASE_PASSWORD || 'asana_secure_pass_2024',
  min: parseInt(process.env.DATABASE_POOL_MIN) || 2,
  max: parseInt(process.env.DATABASE_POOL_MAX) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

// ============================================
// WEBHOOK MANAGEMENT
// ============================================

/**
 * Save or update webhook information
 */
async function saveWebhook(webhookData) {
  const { webhook_gid, resource_gid, resource_type, target_url, secret } = webhookData;
  
  const query = `
    INSERT INTO webhooks (webhook_gid, resource_gid, resource_type, target_url, secret, active)
    VALUES ($1, $2, $3, $4, $5, true)
    ON CONFLICT (webhook_gid) 
    DO UPDATE SET 
      secret = EXCLUDED.secret,
      updated_at = CURRENT_TIMESTAMP,
      active = true
    RETURNING *;
  `;
  
  try {
    const result = await pool.query(query, [webhook_gid, resource_gid, resource_type, target_url, secret]);
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error('Error saving webhook:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get webhook by GID
 */
async function getWebhook(webhook_gid) {
  const query = 'SELECT * FROM webhooks WHERE webhook_gid = $1';
  
  try {
    const result = await pool.query(query, [webhook_gid]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting webhook:', error);
    return null;
  }
}

/**
 * Get webhook by resource GID
 */
async function getWebhookByResource(resource_gid) {
  const query = 'SELECT * FROM webhooks WHERE resource_gid = $1 AND active = true ORDER BY created_at DESC LIMIT 1';
  
  try {
    const result = await pool.query(query, [resource_gid]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting webhook by resource:', error);
    return null;
  }
}

/**
 * Get all active webhooks
 */
async function getAllWebhooks() {
  const query = 'SELECT * FROM webhooks WHERE active = true ORDER BY created_at DESC';
  
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error getting webhooks:', error);
    return [];
  }
}

/**
 * Update webhook event count and last event time
 */
async function updateWebhookStats(webhook_gid) {
  const query = `
    UPDATE webhooks 
    SET event_count = event_count + 1, 
        last_event_at = CURRENT_TIMESTAMP 
    WHERE webhook_gid = $1
    RETURNING *;
  `;
  
  try {
    const result = await pool.query(query, [webhook_gid]);
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error('Error updating webhook stats:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Deactivate webhook
 */
async function deactivateWebhook(webhook_gid) {
  const query = 'UPDATE webhooks SET active = false WHERE webhook_gid = $1 RETURNING *';
  
  try {
    const result = await pool.query(query, [webhook_gid]);
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error('Error deactivating webhook:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// EVENT STORAGE
// ============================================

/**
 * Save webhook event to database
 */
async function saveEvent(eventData) {
  const {
    webhook_gid,
    event_type,
    action,
    resource_gid,
    resource_type,
    user_gid,
    created_at,
    payload,
    signature_verified
  } = eventData;
  
  const query = `
    INSERT INTO webhook_events (
      webhook_gid, event_type, action, resource_gid, resource_type, 
      user_gid, created_at, payload, signature_verified
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;
  
  try {
    const result = await pool.query(query, [
      webhook_gid,
      event_type,
      action,
      resource_gid,
      resource_type,
      user_gid,
      created_at,
      JSON.stringify(payload),
      signature_verified
    ]);
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error('Error saving event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get recent events (paginated with optional filters)
 */
async function getRecentEvents(limit = 50, offset = 0, filters = {}) {
  let query = 'SELECT * FROM webhook_events WHERE 1=1';
  const params = [];
  let paramCount = 0;
  
  // Add filters
  if (filters.resourceType) {
    paramCount++;
    query += ` AND resource_type = $${paramCount}`;
    params.push(filters.resourceType);
  }
  
  if (filters.action) {
    paramCount++;
    query += ` AND action = $${paramCount}`;
    params.push(filters.action);
  }
  
  if (filters.resourceGid) {
    paramCount++;
    query += ` AND resource_gid LIKE $${paramCount}`;
    params.push(`%${filters.resourceGid}%`);
  }
  
  // Add ordering and pagination
  query += ` ORDER BY received_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);
  
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error getting events:', error);
    return [];
  }
}

/**
 * Get total count of events (with optional filters)
 */
async function getTotalEventCount(filters = {}) {
  let query = 'SELECT COUNT(*) as total FROM webhook_events WHERE 1=1';
  const params = [];
  let paramCount = 0;
  
  // Add filters
  if (filters.resourceType) {
    paramCount++;
    query += ` AND resource_type = $${paramCount}`;
    params.push(filters.resourceType);
  }
  
  if (filters.action) {
    paramCount++;
    query += ` AND action = $${paramCount}`;
    params.push(filters.action);
  }
  
  if (filters.resourceGid) {
    paramCount++;
    query += ` AND resource_gid LIKE $${paramCount}`;
    params.push(`%${filters.resourceGid}%`);
  }
  
  try {
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].total);
  } catch (error) {
    console.error('Error getting event count:', error);
    return 0;
  }
}

/**
 * Get events by webhook GID
 */
async function getEventsByWebhook(webhook_gid, limit = 50) {
  const query = `
    SELECT * FROM webhook_events 
    WHERE webhook_gid = $1 
    ORDER BY received_at DESC 
    LIMIT $2;
  `;
  
  try {
    const result = await pool.query(query, [webhook_gid, limit]);
    return result.rows;
  } catch (error) {
    console.error('Error getting events by webhook:', error);
    return [];
  }
}

/**
 * Get event statistics
 */
async function getEventStats() {
  const query = `
    SELECT 
      COUNT(*) as total_events,
      COUNT(DISTINCT webhook_gid) as active_webhooks,
      COUNT(CASE WHEN signature_verified = true THEN 1 END) as verified_events,
      MAX(received_at) as last_event_time
    FROM webhook_events
    WHERE received_at > NOW() - INTERVAL '24 hours';
  `;
  
  try {
    const result = await pool.query(query);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting event stats:', error);
    return null;
  }
}

/**
 * Clean up old events (older than 30 days)
 */
async function cleanupOldEvents(days = 30) {
  const query = `
    DELETE FROM webhook_events 
    WHERE received_at < NOW() - INTERVAL '${days} days'
    RETURNING COUNT(*);
  `;
  
  try {
    const result = await pool.query(query);
    return { success: true, deleted: result.rowCount };
  } catch (error) {
    console.error('Error cleaning up events:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    return { success: true, time: result.rows[0].current_time };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get database stats
 */
async function getDatabaseStats() {
  try {
    const webhookCount = await pool.query('SELECT COUNT(*) FROM webhooks WHERE active = true');
    const eventCount = await pool.query('SELECT COUNT(*) FROM webhook_events');
    const recentEvents = await pool.query(`
      SELECT COUNT(*) FROM webhook_events 
      WHERE received_at > NOW() - INTERVAL '24 hours'
    `);
    
    return {
      active_webhooks: parseInt(webhookCount.rows[0].count),
      total_events: parseInt(eventCount.rows[0].count),
      events_24h: parseInt(recentEvents.rows[0].count)
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return null;
  }
}

/**
 * Close pool (for graceful shutdown)
 */
async function closePool() {
  await pool.end();
  console.log('🔒 Database pool closed');
}

// Export functions
module.exports = {
  // Webhook functions
  saveWebhook,
  getWebhook,
  getWebhookByResource,
  getAllWebhooks,
  updateWebhookStats,
  deactivateWebhook,
  
  // Event functions
  saveEvent,
  getRecentEvents,
  getTotalEventCount,
  getEventsByWebhook,
  getEventStats,
  cleanupOldEvents,
  
  // Utility functions
  testConnection,
  getDatabaseStats,
  closePool,
  
  // Export pool for custom queries
  pool
};

