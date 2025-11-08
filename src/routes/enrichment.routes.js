/**
 * Enrichment Routes
 */

const express = require('express');
const EnrichmentController = require('../controllers/enrichment.controller');

const router = express.Router();

// GET /api/dct/test - Test DCT connection
router.get('/api/dct/test', EnrichmentController.testConnection);

// GET /api/dct/stats - Get DCT stats
router.get('/api/dct/stats', EnrichmentController.getStats);

// GET /api/events/:eventId/enrich - Enrich single event
router.get('/api/events/:eventId/enrich', EnrichmentController.enrichEvent);

// GET /api/events/enriched - Get enriched events
router.get('/api/events/enriched', EnrichmentController.getEnrichedEvents);

module.exports = router;

