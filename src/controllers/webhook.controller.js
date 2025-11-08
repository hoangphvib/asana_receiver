/**
 * Webhook Controller
 * Handle HTTP requests for webhooks
 */

const WebhookService = require('../services/webhook.service');
const config = require('../config');

class WebhookController {
  /**
   * Handle webhook endpoint (handshake + events)
   */
  static async handleWebhook(req, res, eventHistory, broadcastFn) {
    const { headers, body, rawBody } = req;

    // STEP 1: Handle Handshake
    const hookSecret = headers['x-hook-secret'] || headers['X-Hook-Secret'];
    if (hookSecret) {
      console.log('\n🤝 HANDSHAKE DETECTED');
      
      // Echo secret back
      res.set('X-Hook-Secret', hookSecret);
      res.status(200).send();

      // Save webhook (async)
      const requestInfo = {
        webhook_gid: body.webhook_gid,
        resource_gid: body.resource,
        resource_type: body.resource_type,
        target_url: `${config.server.publicUrl}/webhook`,
      };

      WebhookService.handleHandshake(hookSecret, requestInfo);

      // Broadcast to SSE clients
      broadcastFn({
        type: 'handshake',
        hookSecret: hookSecret.substring(0, 10) + '...',
        secretSaved: true,
        timestamp: new Date().toISOString(),
      });

      return;
    }

    // STEP 2: Verify Signature
    const signature = headers['x-hook-signature'];
    const webhookSecret = config.webhook.secret || process.env.ASANA_WEBHOOK_SECRET;
    
    const signatureVerified = WebhookService.verifySignature(
      rawBody,
      signature,
      webhookSecret
    );

    if (signature && webhookSecret && !signatureVerified) {
      console.log('❌ Invalid signature');
      
      broadcastFn({
        type: 'error',
        error: 'Invalid signature',
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({
        error: 'Invalid signature',
      });
    }

    // STEP 3: Process Events
    const events = body.events || [];
    console.log(`📨 Received ${events.length} event(s)`);

    const processResult = await WebhookService.processEvents(
      events,
      signatureVerified,
      body.parent?.gid
    );

    // Add to in-memory history
    events.forEach((event) => {
      const eventData = {
        action: event.action,
        resource_type: event.resource?.resource_type,
        resource_gid: event.resource?.gid,
        resource_name: event.resource?.name,
        created_at: event.created_at,
        user: event.user,
        full_event: event,
        received_at: new Date().toISOString(),
      };

      eventHistory.unshift(eventData);
      if (eventHistory.length > config.webhook.maxHistory) {
        eventHistory.pop();
      }

      // Broadcast to SSE
      broadcastFn({
        type: 'webhook_event',
        event: eventData,
        savedToDatabase: true,
      });
    });

    // Respond
    res.status(200).json({
      received: true,
      processed: processResult.processed.length,
      errors: processResult.errors.length,
      timestamp: new Date().toISOString(),
    });

    console.log('✅ Events processed');
  }

  /**
   * Get event history (in-memory)
   */
  static getHistory(req, res, eventHistory) {
    const result = WebhookService.getEventHistory(eventHistory);
    res.json(result);
  }

  /**
   * Clear event history
   */
  static clearHistory(req, res, eventHistory, broadcastFn) {
    const count = eventHistory.length;
    eventHistory.length = 0;

    broadcastFn({
      type: 'history_cleared',
      clearedCount: count,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `Cleared ${count} events`,
    });
  }
}

module.exports = WebhookController;

