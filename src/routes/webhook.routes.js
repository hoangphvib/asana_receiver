/**
 * Webhook Routes
 */

const express = require('express');
const WebhookController = require('../controllers/webhook.controller');

function createWebhookRoutes(eventHistory, broadcastFn) {
  const router = express.Router();

  // POST /webhook - Main webhook endpoint
  router.post(
    '/webhook',
    (req, res) => WebhookController.handleWebhook(req, res, eventHistory, broadcastFn)
  );

  // GET /api/events/history - Get in-memory history
  router.get(
    '/api/events/history',
    (req, res) => WebhookController.getHistory(req, res, eventHistory)
  );

  // POST /api/events/clear - Clear history
  router.post(
    '/api/events/clear',
    (req, res) => WebhookController.clearHistory(req, res, eventHistory, broadcastFn)
  );

  return router;
}

module.exports = createWebhookRoutes;

