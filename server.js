const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

// Asana webhook secret (set this in your environment variables)
let WEBHOOK_SECRET = null;

// In-memory secret storage (for serverless/Vercel compatibility)
// This will be populated during handshake and persist for the lifetime of the server instance
let runtimeSecret = null;

// Store connected SSE clients
let sseClients = [];

// Store recent events (last 50)
const eventHistory = [];
const MAX_HISTORY = 50;

// Middleware to parse JSON with raw body for signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

// CORS middleware for SSE
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static files
app.use(express.static('public'));

// API Info endpoint
app.get('/api/info', (req, res) => {
  res.json({ 
    status: 'running',
    message: 'Asana Webhook Receiver is active',
    connectedClients: sseClients.length,
    eventsInHistory: eventHistory.length,
    timestamp: new Date().toISOString(),
    urls: {
      public_url: PUBLIC_URL,
      webhook_endpoint: `${PUBLIC_URL}/webhook`,
      dashboard: PUBLIC_URL,
      sse_stream: `${PUBLIC_URL}/events`,
      event_history: `${PUBLIC_URL}/api/events/history`
    },
    instructions: {
      register_webhook: `Use this URL when creating webhook in Asana: ${PUBLIC_URL}/webhook`,
      view_dashboard: `Open in browser: ${PUBLIC_URL}`,
      connect_sse: `Connect EventSource to: ${PUBLIC_URL}/events`
    }
  });
});

// Health check endpoint (serves dashboard HTML)
app.get('/', (req, res) => {
  // If request accepts HTML, serve dashboard, otherwise return JSON
  if (req.accepts('html')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.json({ 
      status: 'running',
      message: 'Asana Webhook Receiver is active',
      webhook_url: `${PUBLIC_URL}/webhook`,
      dashboard_url: PUBLIC_URL,
      info: `GET ${PUBLIC_URL}/api/info for detailed information`
    });
  }
});

// SSE endpoint - clients connect here to receive real-time events
app.get('/events', (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: 'Connected to Asana Webhook Receiver',
    timestamp: new Date().toISOString(),
    historyCount: eventHistory.length
  })}\n\n`);

  // Send event history
  if (eventHistory.length > 0) {
    res.write(`data: ${JSON.stringify({
      type: 'history',
      events: eventHistory,
      count: eventHistory.length
    })}\n\n`);
  }

  // Add this client to the list
  const clientId = Date.now();
  const client = { id: clientId, res };
  sseClients.push(client);

  console.log(`✅ SSE Client connected (ID: ${clientId}). Total clients: ${sseClients.length}`);

  // Remove client when connection closes
  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
    console.log(`❌ SSE Client disconnected (ID: ${clientId}). Total clients: ${sseClients.length}`);
  });

  // Keep connection alive with periodic heartbeat
  const heartbeat = setInterval(() => {
    res.write(`:heartbeat\n\n`);
  }, 30000); // Every 30 seconds

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// Get event history
app.get('/api/events/history', (req, res) => {
  res.json({
    success: true,
    events: eventHistory,
    count: eventHistory.length
  });
});

// Clear event history
app.post('/api/events/clear', (req, res) => {
  const count = eventHistory.length;
  eventHistory.length = 0;
  
  // Notify all connected clients
  broadcastToClients({
    type: 'history_cleared',
    clearedCount: count,
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    message: `Cleared ${count} events from history`
  });
});

// Webhook endpoint - handles both handshake and events
app.post('/webhook', (req, res) => {
  console.log('\n=== Incoming Webhook Request ===');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));

  // STEP 1: Handle Asana webhook handshake
  if (req.headers['x-hook-secret']) {
    const hookSecret = req.headers['x-hook-secret'];
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║  🤝 HANDSHAKE DETECTED!                                          ║');
    console.log('╟──────────────────────────────────────────────────────────────────╢');
    console.log(`║  Secret: ${hookSecret.substring(0, 40)}... ║`);
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
    
    // Echo secret back to Asana
    res.set('X-Hook-Secret', hookSecret);
    res.status(200).send();
    
    console.log('✅ Handshake successful! Secret echoed back to Asana.\n');

    // SAVE secret to memory (for this server instance)
    runtimeSecret = hookSecret;
    WEBHOOK_SECRET = hookSecret;
    
    console.log('💾 Secret saved to memory for this session');
    console.log('✅ Signature verification is now ENABLED for subsequent events');
    
    // Also try to save to .env file (for local dev, will fail on Vercel)
    try {
      const envPath = path.join(__dirname, '.env');
      let envContent = '';
      
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
        if (envContent.includes('ASANA_WEBHOOK_SECRET=')) {
          envContent = envContent.replace(
            /ASANA_WEBHOOK_SECRET=.*/,
            `ASANA_WEBHOOK_SECRET=${hookSecret}`
          );
        } else {
          envContent += `\n# Webhook secret from Asana handshake (auto-saved)\nASANA_WEBHOOK_SECRET=${hookSecret}\n`;
        }
      } else {
        envContent = `# Asana Receiver Configuration\nPORT=${PORT}\nPUBLIC_URL=${PUBLIC_URL}\n\n# Webhook secret from Asana handshake (auto-saved)\nASANA_WEBHOOK_SECRET=${hookSecret}\n`;
      }
      
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('📝 Also saved to .env file (local dev only)');
      
    } catch (error) {
      console.log('ℹ️  Running on serverless (Vercel) - .env file not writable (this is OK)');
      console.log('   Secret is stored in memory and will be used for verification');
    }
    
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ SECRET READY!                                                ║');
    console.log('╟──────────────────────────────────────────────────────────────────╢');
    console.log('║  Storage: In-memory (runtime)                                    ║');
    console.log('║  Status:  Active & Ready to verify events                        ║');
    console.log('║                                                                  ║');
    console.log('║  📨 Next events will be automatically verified!                  ║');
    console.log('║     No restart needed!                                           ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');


    // Broadcast handshake to SSE clients
    broadcastToClients({
      type: 'handshake',
      hookSecret: hookSecret.substring(0, 10) + '...',
      secretSaved: true,
      timestamp: new Date().toISOString()
    });

    return;
  }

  // STEP 2: Verify webhook signature (for actual events)
  const signature = req.headers['x-hook-signature'];
  
  // DEBUG: Log verification state
  console.log('\n🔍 SIGNATURE VERIFICATION DEBUG:');
  console.log('   Has signature header?', !!signature);
  console.log('   Has WEBHOOK_SECRET?', !!WEBHOOK_SECRET);
  console.log('   WEBHOOK_SECRET value:', WEBHOOK_SECRET ? WEBHOOK_SECRET.substring(0, 20) + '...' : 'NONE');
  console.log('   Will verify?', !!(signature && WEBHOOK_SECRET && WEBHOOK_SECRET !== 'your-webhook-secret-here'));
  
  if (signature && WEBHOOK_SECRET && WEBHOOK_SECRET !== 'your-webhook-secret-here') {
    // Only verify if we have a valid secret configured
    console.log('   Computing signature...');
    console.log('   Raw body length:', req.rawBody ? req.rawBody.length : 'UNDEFINED');
    console.log('   Raw body preview:', req.rawBody ? req.rawBody.substring(0, 100) : 'UNDEFINED');
    
    const computedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(req.rawBody)
      .digest('hex');

    if (computedSignature !== signature) {
      console.log('\n❌ SIGNATURE MISMATCH!');
      console.log('   Expected (computed):', computedSignature);
      console.log('   Received (from Asana):', signature);
      console.log('   Secret used:', WEBHOOK_SECRET.substring(0, 20) + '...');
      console.log('   Body used:', req.rawBody ? req.rawBody.substring(0, 200) : 'UNDEFINED');
      
      // Broadcast error to SSE clients
      broadcastToClients({
        type: 'error',
        error: 'Invalid signature',
        computed: computedSignature,
        received: signature,
        timestamp: new Date().toISOString()
      });

      return res.status(401).json({ 
        error: 'Invalid signature',
        hint: 'Secret mismatch or body format incorrect'
      });
    }
    console.log('   ✅ Signature verified!\n');
  } else if (signature) {
    console.log('   ⚠️  SKIPPING VERIFICATION');
    console.log('   Reason: WEBHOOK_SECRET not configured or is default value\n');
  } else {
    console.log('   ℹ️  No signature header - this might be a test request\n');
  }

  // STEP 3: Process webhook events
  const events = req.body.events || [];
  console.log(`📨 Received ${events.length} event(s)`);

  const processedEvents = [];

  events.forEach((event, index) => {
    const eventData = {
      index: index + 1,
      action: event.action,
      resource_type: event.resource?.resource_type,
      resource_gid: event.resource?.gid,
      resource_name: event.resource?.name,
      created_at: event.created_at,
      user: event.user,
      parent: event.parent,
      full_event: event,
      received_at: new Date().toISOString()
    };

    console.log(`\nEvent ${index + 1}:`, {
      action: eventData.action,
      resource: eventData.resource_type,
      gid: eventData.resource_gid,
      created_at: eventData.created_at
    });

    processedEvents.push(eventData);

    // Add to history
    eventHistory.unshift(eventData);
    if (eventHistory.length > MAX_HISTORY) {
      eventHistory.pop();
    }

    // Broadcast event to all connected SSE clients
    broadcastToClients({
      type: 'webhook_event',
      event: eventData,
      totalEvents: events.length,
      currentIndex: index + 1
    });
  });

  // STEP 4: Respond quickly (Asana expects response within 10 seconds)
  res.status(200).json({ 
    received: true,
    processed: events.length,
    timestamp: new Date().toISOString()
  });

  console.log('✅ Events processed successfully\n');
});

// Function to broadcast message to all SSE clients
function broadcastToClients(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(message);
    } catch (error) {
      console.error('Error broadcasting to client:', error.message);
    }
  });
  console.log(`📡 Broadcasted to ${sseClients.length} client(s): ${data.type}`);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  const webhookUrl = `${PUBLIC_URL}/webhook`;
  const dashboardUrl = PUBLIC_URL;
  const sseUrl = `${PUBLIC_URL}/events`;
  const isLocal = PUBLIC_URL.includes('localhost');
  
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                🚀 Asana Webhook Receiver is Running!                  ║
╟───────────────────────────────────────────────────────────────────────╢
║  Local Server:  http://localhost:${PORT}                                  ║
║  Public URL:    ${PUBLIC_URL.padEnd(50)} ║
╟───────────────────────────────────────────────────────────────────────╢
║  📋 COPY THESE URLs:                                                  ║
╟───────────────────────────────────────────────────────────────────────╢
║  🔗 Webhook Endpoint (for Asana):                                     ║
║     ${webhookUrl.padEnd(66)} ║
║                                                                       ║
║  🖥️  Dashboard (view events):                                         ║
║     ${dashboardUrl.padEnd(66)} ║
║                                                                       ║
║  📡 SSE Stream (for integrations):                                    ║
║     ${sseUrl.padEnd(66)} ║
╟───────────────────────────────────────────────────────────────────────╢`);

  if (isLocal) {
    console.log(`║  ⚠️  WARNING: Using localhost URL                                     ║
║     This will NOT work with Asana webhooks!                           ║
║     Use ngrok or deploy to make it publicly accessible:               ║
║                                                                       ║
║     Option 1 - ngrok (recommended for dev):                           ║
║       $ ngrok http ${PORT}                                                 ║
║       Then update PUBLIC_URL in .env with ngrok URL                   ║
║                                                                       ║
║     Option 2 - Deploy to cloud:                                       ║
║       - Heroku: https://heroku.com                                    ║
║       - Railway: https://railway.app                                  ║
║       - Render: https://render.com                                    ║
╟───────────────────────────────────────────────────────────────────────╢`);
  }

  console.log(`║  📝 Register Webhook with Asana:                                      ║
║                                                                       ║
║  POST https://app.asana.com/api/1.0/webhooks                          ║
║  Headers:                                                             ║
║    Authorization: Bearer YOUR_ASANA_PAT                               ║
║    Content-Type: application/json                                     ║
║  Body:                                                                ║
║  {                                                                    ║
║    "data": {                                                          ║
║      "resource": "1234567890123456",                                  ║
║      "target": "${webhookUrl}"${' '.repeat(Math.max(0, 31 - webhookUrl.length))} ║
║    }                                                                  ║
║  }                                                                    ║
╟───────────────────────────────────────────────────────────────────────╢
║  💡 Quick Tips:                                                       ║
║     • Open dashboard in browser to see events in real-time            ║
║     • Use integration site at localhost:3001/webhooks                 ║
║     • Check /api/info endpoint for all URLs                           ║
╚═══════════════════════════════════════════════════════════════════════╝
  `);
  
  console.log('✅ Server ready! Waiting for webhook requests...\n');
  
  if (isLocal) {
    console.log('⚠️  Remember to expose this server with ngrok for Asana to reach it!\n');
  }
});
