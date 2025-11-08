/**
 * Database Routes
 */

const express = require('express');
const db = require('../../db');

const router = express.Router();

// GET /api/database/test - Test database connection
router.get('/api/database/test', async (req, res) => {
  try {
    const result = await db.testConnection();
    res.json({
      success: result.success,
      message: result.success
        ? 'Database connection successful'
        : 'Database connection failed',
      time: result.time,
      error: result.error,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/database/stats - Get database statistics
router.get('/api/database/stats', async (req, res) => {
  try {
    const stats = await db.getDatabaseStats();
    const eventStats = await db.getEventStats();

    res.json({
      success: true,
      stats: {
        ...stats,
        ...eventStats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/webhooks - Get all webhooks
router.get('/api/webhooks', async (req, res) => {
  try {
    const webhooks = await db.getAllWebhooks();

    res.json({
      success: true,
      webhooks: webhooks,
      count: webhooks.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/events/database - Get events from database
router.get('/api/events/database', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const resourceType = req.query.resource_type || null;
    const action = req.query.action || null;
    const resourceGid = req.query.resource_gid || null;

    const events = await db.getRecentEvents(limit, offset, {
      resourceType,
      action,
      resourceGid,
    });

    const totalCount = await db.getTotalEventCount({
      resourceType,
      action,
      resourceGid,
    });

    res.json({
      success: true,
      events: events,
      count: events.length,
      total: totalCount,
      limit: limit,
      offset: offset,
      hasMore: offset + events.length < totalCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

