/**
 * Express App Configuration
 * Clean separation of app setup and server startup
 */

const express = require('express');
const path = require('path');
const config = require('./config');
const SSEManager = require('./utils/sse');
const { requestLogger, webhookLogger } = require('./middleware/logger.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const createWebhookRoutes = require('./routes/webhook.routes');
const databaseRoutes = require('./routes/database.routes');

/**
 * Create Express App
 */
function createApp() {
  const app = express();

  // In-memory event history
  const eventHistory = [];

  // SSE Manager
  const sseManager = new SSEManager();

  // Broadcast function
  const broadcast = (data) => sseManager.broadcast(data);

  // ============================================
  // MIDDLEWARE
  // ============================================

  // Parse JSON with raw body for signature verification
  app.use(express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  }));

  // CORS
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Logging
  if (config.server.env !== 'test') {
    app.use(requestLogger);
    app.use(webhookLogger);
  }

  // Serve static files
  app.use(express.static(path.join(__dirname, '../public')));

  // ============================================
  // ROUTES
  // ============================================

  // Info endpoint
  app.get('/api/info', (req, res) => {
    res.json({
      status: 'running',
      message: 'Asana Webhook Receiver is active',
      connectedClients: sseManager.getClientCount(),
      eventsInHistory: eventHistory.length,
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      urls: {
        public_url: config.server.publicUrl,
        webhook_endpoint: `${config.server.publicUrl}/webhook`,
        dashboard: config.server.publicUrl,
        sse_stream: `${config.server.publicUrl}/events`,
      },
    });
  });

  // Health check
  app.get('/', (req, res) => {
    if (req.accepts('html')) {
      res.sendFile(path.join(__dirname, '../public', 'index.html'));
    } else {
      res.json({
        status: 'running',
        message: 'Asana Webhook Receiver is active',
        webhook_url: `${config.server.publicUrl}/webhook`,
        info: `GET ${config.server.publicUrl}/api/info`,
      });
    }
  });

  // SSE endpoint
  sseManager.setupSSEEndpoint(app, eventHistory);

  // Webhook routes
  app.use(createWebhookRoutes(eventHistory, broadcast));

  // Database routes
  app.use(databaseRoutes);

  // ============================================
  // ERROR HANDLING
  // ============================================

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return {
    app,
    eventHistory,
    sseManager,
  };
}

module.exports = createApp;

