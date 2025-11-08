/**
 * Server-Sent Events (SSE) Utilities
 */

class SSEManager {
  constructor() {
    this.clients = [];
  }

  /**
   * Add SSE client
   */
  addClient(res) {
    const clientId = Date.now();
    const client = { id: clientId, res };
    this.clients.push(client);

    console.log(`✅ SSE Client connected (ID: ${clientId}). Total: ${this.clients.length}`);

    return clientId;
  }

  /**
   * Remove SSE client
   */
  removeClient(clientId) {
    this.clients = this.clients.filter(c => c.id !== clientId);
    console.log(`❌ SSE Client disconnected (ID: ${clientId}). Total: ${this.clients.length}`);
  }

  /**
   * Broadcast message to all clients
   */
  broadcast(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    let sentCount = 0;

    this.clients.forEach(client => {
      try {
        client.res.write(message);
        sentCount++;
      } catch (error) {
        console.error('Error broadcasting to client:', error.message);
        this.removeClient(client.id);
      }
    });

    if (sentCount > 0) {
      console.log(`📡 Broadcasted to ${sentCount} client(s): ${data.type}`);
    }

    return sentCount;
  }

  /**
   * Send to specific client
   */
  sendToClient(clientId, data) {
    const client = this.clients.find(c => c.id === clientId);
    if (client) {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      try {
        client.res.write(message);
        return true;
      } catch (error) {
        console.error('Error sending to client:', error.message);
        this.removeClient(clientId);
        return false;
      }
    }
    return false;
  }

  /**
   * Get client count
   */
  getClientCount() {
    return this.clients.length;
  }

  /**
   * Setup SSE endpoint
   */
  setupSSEEndpoint(app, eventHistory) {
    app.get('/events', (req, res) => {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Send initial connection message
      res.write(`data: ${JSON.stringify({
        type: 'connected',
        message: 'Connected to Asana Webhook Receiver',
        timestamp: new Date().toISOString(),
        historyCount: eventHistory.length,
      })}\n\n`);

      // Send event history
      if (eventHistory.length > 0) {
        res.write(`data: ${JSON.stringify({
          type: 'history',
          events: eventHistory,
          count: eventHistory.length,
        })}\n\n`);
      }

      // Add client
      const clientId = this.addClient(res);

      // Heartbeat
      const heartbeat = setInterval(() => {
        try {
          res.write(`:heartbeat\n\n`);
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Handle client disconnect
      req.on('close', () => {
        clearInterval(heartbeat);
        this.removeClient(clientId);
      });
    });
  }
}

module.exports = SSEManager;

