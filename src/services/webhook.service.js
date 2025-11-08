/**
 * Webhook Service
 * Business logic for webhook processing
 */

const crypto = require('crypto');
const db = require('../../db');

class WebhookService {
  /**
   * Verify webhook signature
   */
  static verifySignature(rawBody, signature, secret) {
    if (!secret || !signature) {
      return false;
    }

    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    return computedSignature === signature;
  }

  /**
   * Process webhook handshake
   */
  static async handleHandshake(hookSecret, requestInfo) {
    try {
      // Save webhook to database
      const webhookData = {
        webhook_gid: requestInfo.webhook_gid || `webhook_${Date.now()}`,
        resource_gid: requestInfo.resource_gid || 'unknown',
        resource_type: requestInfo.resource_type || 'unknown',
        target_url: requestInfo.target_url,
        secret: hookSecret,
      };

      const result = await db.saveWebhook(webhookData);

      return {
        success: true,
        webhook: result.data,
      };
    } catch (error) {
      console.error('Error handling handshake:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process webhook events
   */
  static async processEvents(events, signatureVerified, parentGid) {
    const processed = [];
    const errors = [];

    for (let i = 0; i < events.length; i++) {
      try {
        const event = events[i];
        
        // Save to database
        const dbEventData = {
          webhook_gid: parentGid || `webhook_${Date.now()}`,
          event_type: event.type || 'webhook',
          action: event.action,
          resource_gid: event.resource?.gid,
          resource_type: event.resource?.resource_type,
          user_gid: event.user?.gid,
          created_at: event.created_at || new Date().toISOString(),
          payload: event,
          signature_verified: signatureVerified,
        };

        const dbResult = await db.saveEvent(dbEventData);

        if (dbResult.success) {
          processed.push({
            index: i,
            eventId: dbResult.data.id,
            action: event.action,
            resource_type: event.resource?.resource_type,
          });

          // Update webhook stats
          if (parentGid) {
            await db.updateWebhookStats(parentGid);
          }
        } else {
          errors.push({
            index: i,
            error: dbResult.error,
          });
        }
      } catch (error) {
        console.error(`Error processing event ${i}:`, error);
        errors.push({
          index: i,
          error: error.message,
        });
      }
    }

    return {
      success: errors.length === 0,
      processed,
      errors,
    };
  }

  /**
   * Get event history (in-memory)
   */
  static getEventHistory(history) {
    return {
      success: true,
      events: history,
      count: history.length,
    };
  }

  /**
   * Clear event history
   */
  static clearEventHistory() {
    return {
      success: true,
      message: 'Event history cleared',
    };
  }
}

module.exports = WebhookService;

