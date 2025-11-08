/**
 * Enrichment Service
 * Handle DCT database enrichment
 */

const dctClient = require('../../dct-client');
const db = require('../../db');

class EnrichmentService {
  /**
   * Test DCT connection
   */
  static async testConnection() {
    try {
      return await dctClient.testDCTConnection();
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get DCT statistics
   */
  static async getStats() {
    try {
      const stats = await dctClient.getDCTStats();
      return {
        success: true,
        stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Enrich single event
   */
  static async enrichEvent(eventId) {
    try {
      // Get event from database
      const events = await db.pool.query(
        'SELECT * FROM webhook_events WHERE id = $1',
        [eventId]
      );

      if (events.rows.length === 0) {
        return {
          success: false,
          error: 'Event not found',
        };
      }

      const event = events.rows[0];

      // Parse payload
      let payload = event.payload;
      if (typeof payload === 'string') {
        payload = JSON.parse(payload);
      }

      // Enrich
      const enriched = await dctClient.enrichEvent(payload);

      return {
        success: true,
        event: {
          id: event.id,
          event_type: event.event_type,
          action: event.action,
          resource_gid: event.resource_gid,
          resource_type: event.resource_type,
          received_at: event.received_at,
          signature_verified: event.signature_verified,
        },
        enrichment: enriched.enrichment,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get enriched events with pagination
   */
  static async getEnrichedEvents(options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        resourceType = null,
        action = null,
      } = options;

      // Get events
      const events = await db.getRecentEvents(limit, offset, {
        resourceType,
        action,
      });

      // Enrich all events
      const enrichedEvents = [];

      for (const event of events) {
        let payload = event.payload;
        if (typeof payload === 'string') {
          try {
            payload = JSON.parse(payload);
          } catch (e) {
            payload = event.payload;
          }
        }

        const enriched = await dctClient.enrichEvent(payload);

        enrichedEvents.push({
          id: event.id,
          event_type: event.event_type,
          action: event.action,
          resource_gid: event.resource_gid,
          resource_type: event.resource_type,
          user_gid: event.user_gid,
          created_at: event.created_at,
          received_at: event.received_at,
          signature_verified: event.signature_verified,
          enrichment: enriched.enrichment,
          original_payload: payload,
        });
      }

      // Get total count
      const totalCount = await db.getTotalEventCount({
        resourceType,
        action,
      });

      return {
        success: true,
        events: enrichedEvents,
        count: enrichedEvents.length,
        total: totalCount,
        limit,
        offset,
        hasMore: offset + enrichedEvents.length < totalCount,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = EnrichmentService;

