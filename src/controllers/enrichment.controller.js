/**
 * Enrichment Controller
 * Handle HTTP requests for DCT enrichment
 */

const EnrichmentService = require('../services/enrichment.service');

class EnrichmentController {
  /**
   * Test DCT connection
   */
  static async testConnection(req, res) {
    const result = await EnrichmentService.testConnection();
    
    res.json({
      success: result.success,
      message: result.success
        ? 'DCT database connection successful'
        : 'DCT database connection failed',
      time: result.time,
      database: result.database,
      error: result.error,
    });
  }

  /**
   * Get DCT stats
   */
  static async getStats(req, res) {
    const result = await EnrichmentService.getStats();
    res.json(result);
  }

  /**
   * Enrich single event
   */
  static async enrichEvent(req, res) {
    const eventId = parseInt(req.params.eventId);
    const result = await EnrichmentService.enrichEvent(eventId);

    if (!result.success) {
      return res.status(result.error === 'Event not found' ? 404 : 500).json(result);
    }

    res.json(result);
  }

  /**
   * Get enriched events
   */
  static async getEnrichedEvents(req, res) {
    const options = {
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
      resourceType: req.query.resource_type || null,
      action: req.query.action || null,
    };

    const result = await EnrichmentService.getEnrichedEvents(options);
    res.json(result);
  }
}

module.exports = EnrichmentController;

