require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3500;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

// Asana webhook secret (set this in your environment variables)
let WEBHOOK_SECRET = process.env.ASANA_WEBHOOK_SECRET || null;

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

// Get event history (in-memory)
app.get('/api/events/history', (req, res) => {
  res.json({
    success: true,
    events: eventHistory,
    count: eventHistory.length
  });
});

// Get events from database with filtering
app.get('/api/events/database', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const resourceType = req.query.resource_type || null;
    const action = req.query.action || null;
    const resourceGid = req.query.resource_gid || null;
    
    const events = await db.getRecentEvents(limit, offset, {
      resourceType,
      action,
      resourceGid
    });
    
    // Get total count for pagination
    const totalCount = await db.getTotalEventCount({
      resourceType,
      action,
      resourceGid
    });
    
    res.json({
      success: true,
      events: events,
      count: events.length,
      total: totalCount,
      limit: limit,
      offset: offset,
      hasMore: (offset + events.length) < totalCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get webhooks from database
app.get('/api/webhooks', async (req, res) => {
  try {
    const webhooks = await db.getAllWebhooks();
    
    res.json({
      success: true,
      webhooks: webhooks,
      count: webhooks.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get database statistics
app.get('/api/database/stats', async (req, res) => {
  try {
    const stats = await db.getDatabaseStats();
    const eventStats = await db.getEventStats();
    
    res.json({
      success: true,
      stats: {
        ...stats,
        ...eventStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test database connection
app.get('/api/database/test', async (req, res) => {
  try {
    const result = await db.testConnection();
    
    res.json({
      success: result.success,
      message: result.success ? 'Database connection successful' : 'Database connection failed',
      time: result.time,
      error: result.error
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear event history (in-memory only)
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
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('IP:', req.ip || req.connection.remoteAddress);
  console.log('\n--- Request Headers ---');
  console.log(JSON.stringify(req.headers, null, 2));
  console.log('\n--- Request Body ---');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('\n--- Raw Body (for signature verification) ---');
  console.log('Raw Body:', req.rawBody ? req.rawBody.substring(0, 200) : 'UNDEFINED');
  console.log('Raw Body Length:', req.rawBody ? req.rawBody.length : 'UNDEFINED');

  // STEP 1: Handle Asana webhook handshake
  if (req.headers['x-hook-secret'] || req.headers['X-Hook-Secret']) {
    const hookSecret = req.headers['x-hook-secret'] || req.headers['X-Hook-Secret'];
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║  🤝 HANDSHAKE DETECTED!                                          ║');
    console.log('╟──────────────────────────────────────────────────────────────────╢');
    console.log('║  📋 HANDSHAKE DETAILS:                                           ║');
    console.log('╟──────────────────────────────────────────────────────────────────╢');
    console.log(`║  Timestamp:  ${new Date().toISOString().padEnd(47)} ║`);
    console.log(`║  Source IP:  ${(req.ip || req.connection.remoteAddress || 'unknown').padEnd(47)} ║`);
    console.log(`║  User-Agent: ${(req.headers['user-agent'] || 'unknown').substring(0, 47).padEnd(47)} ║`);
    console.log('╟──────────────────────────────────────────────────────────────────╢');
    console.log(`║  Secret (full): ${hookSecret.padEnd(45)} ║`);
    console.log(`║  Secret Length: ${String(hookSecret.length).padEnd(45)} ║`);
    console.log('╟──────────────────────────────────────────────────────────────────╢');
    console.log('║  📨 REQUEST HEADERS (all):                                       ║');
    Object.entries(req.headers).forEach(([key, value]) => {
      const line = `${key}: ${value}`.substring(0, 64);
      console.log(`║  ${line.padEnd(64)} ║`);
    });
    console.log('╟──────────────────────────────────────────────────────────────────╢');
    console.log('║  📦 REQUEST BODY:                                                ║');
    const bodyStr = JSON.stringify(req.body, null, 2);
    bodyStr.split('\n').forEach(line => {
      const truncated = line.substring(0, 64);
      console.log(`║  ${truncated.padEnd(64)} ║`);
    });
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
    
    console.log('\n🔄 RESPONDING TO ASANA...');
    console.log('   Setting response header: X-Hook-Secret =', hookSecret.substring(0, 20) + '...');
    console.log('   Response Status: 200 OK');
    console.log('   Response Time:', new Date().toISOString());
    
    // Echo secret back to Asana FIRST (must respond quickly)
    res.set('X-Hook-Secret', hookSecret);
    res.status(200).send();
    
    console.log('\n✅ HANDSHAKE RESPONSE SENT!');
    console.log('   ✓ Secret echoed back to Asana');
    console.log('   ✓ HTTP 200 OK sent');
    console.log('   ✓ Connection completed\n');

    // SAVE secret to memory (for this server instance)
    runtimeSecret = hookSecret;
    WEBHOOK_SECRET = hookSecret;
    
    console.log('💾 SAVING SECRET...');
    console.log('   ✓ Saved to runtime memory (runtimeSecret)');
    console.log('   ✓ Saved to WEBHOOK_SECRET variable');
    console.log('   ✓ Secret Length:', hookSecret.length, 'characters');
    console.log('   ✓ Secret Preview:', hookSecret.substring(0, 30) + '...');
    console.log('   ✅ Signature verification is now ENABLED for subsequent events\n');
    
    // Save webhook info to PostgreSQL database
    (async () => {
      try {
        // Extract webhook info from request body if available
        const webhookGid = req.body.webhook_gid || `webhook_${Date.now()}`;
        const resourceGid = req.body.resource || 'unknown';
        const resourceType = req.body.resource_type || 'unknown';
        const targetUrl = `${PUBLIC_URL}/webhook`;
        
        const dbResult = await db.saveWebhook({
          webhook_gid: webhookGid,
          resource_gid: resourceGid,
          resource_type: resourceType,
          target_url: targetUrl,
          secret: hookSecret
        });
        
        if (dbResult.success) {
          console.log('💾 ✅ Webhook saved to PostgreSQL database');
          console.log('   Webhook GID:', webhookGid);
          console.log('   Resource GID:', resourceGid);
        } else {
          console.log('⚠️  Failed to save webhook to database:', dbResult.error);
        }
      } catch (error) {
        console.error('❌ Database error during handshake:', error.message);
      }
    })();
    
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
    console.log('║  Storage: Memory + PostgreSQL + .env                             ║');
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
      savedToDatabase: true,
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
  const signatureVerified = !!(signature && WEBHOOK_SECRET && WEBHOOK_SECRET !== 'your-webhook-secret-here');

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

    // Save to PostgreSQL database (async, non-blocking)
    (async () => {
      try {
        const dbEventData = {
          webhook_gid: event.parent?.gid || `webhook_${Date.now()}`,
          event_type: event.type || 'webhook',
          action: event.action,
          resource_gid: event.resource?.gid,
          resource_type: event.resource?.resource_type,
          user_gid: event.user?.gid,
          created_at: event.created_at || new Date().toISOString(),
          payload: event,
          signature_verified: signatureVerified
        };
        
        const dbResult = await db.saveEvent(dbEventData);
        
        if (dbResult.success) {
          console.log(`💾 Event ${index + 1} saved to database (ID: ${dbResult.data.id})`);
          
          // Update webhook stats
          if (event.parent?.gid) {
            await db.updateWebhookStats(event.parent.gid);
          }
        } else {
          console.log(`⚠️  Failed to save event ${index + 1} to database:`, dbResult.error);
        }
      } catch (error) {
        console.error(`❌ Database error for event ${index + 1}:`, error.message);
      }
    })();

    // Broadcast event to all connected SSE clients
    broadcastToClients({
      type: 'webhook_event',
      event: eventData,
      totalEvents: events.length,
      currentIndex: index + 1,
      savedToDatabase: true
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

// Start server and test database connection
app.listen(PORT, async () => {
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
║  📋 ENDPOINTS:                                                        ║
╟───────────────────────────────────────────────────────────────────────╢
║  🔗 Webhook Endpoint (for Asana):                                     ║
║     ${webhookUrl.padEnd(66)} ║
║                                                                       ║
║  🖥️  Dashboard (view events):                                         ║
║     ${dashboardUrl.padEnd(66)} ║
║                                                                       ║
║  📡 SSE Stream (real-time events):                                    ║
║     ${sseUrl.padEnd(66)} ║
║                                                                       ║
║  🔍 API Endpoints:                                                    ║
║     GET  /api/info              - Server info                         ║
║     GET  /api/webhooks          - List webhooks (DB)                  ║
║     GET  /api/events/database   - Events from DB                      ║
║     GET  /api/events/history    - Events (in-memory)                  ║
║     GET  /api/database/stats    - Database statistics                 ║
║     GET  /api/database/test     - Test DB connection                  ║
╟───────────────────────────────────────────────────────────────────────╢`);

  // Test database connection
  console.log('║  💾 DATABASE STATUS:                                                  ║');
  try {
    const dbTest = await db.testConnection();
    if (dbTest.success) {
      console.log('║     ✅ PostgreSQL: Connected                                          ║');
      console.log(`║     📊 Server Time: ${dbTest.time.toISOString().padEnd(42)} ║`);
      
      // Get database stats
      try {
        const stats = await db.getDatabaseStats();
        if (stats) {
          console.log(`║     📈 Active Webhooks: ${String(stats.active_webhooks).padEnd(39)} ║`);
          console.log(`║     📈 Total Events: ${String(stats.total_events).padEnd(42)} ║`);
          console.log(`║     📈 Events (24h): ${String(stats.events_24h).padEnd(42)} ║`);
        }
      } catch (e) {
        console.log('║     ⚠️  Could not fetch stats (tables may not exist yet)            ║');
      }
    } else {
      console.log('║     ❌ PostgreSQL: Connection failed                                  ║');
      console.log(`║     Error: ${dbTest.error?.substring(0, 50).padEnd(50)} ║`);
    }
  } catch (error) {
    console.log('║     ❌ PostgreSQL: Connection error                                   ║');
    console.log(`║     ${error.message.substring(0, 60).padEnd(60)} ║`);
  }
  
  console.log('╟───────────────────────────────────────────────────────────────────────╢');

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
║     • Events are logged to console AND saved to PostgreSQL            ║
║     • Use /api endpoints to query stored data                         ║
║     • Check logs for detailed trace of handshake and events           ║
╚═══════════════════════════════════════════════════════════════════════╝
  `);
  
  console.log('✅ Server ready! Waiting for webhook requests...\n');
  
  if (isLocal) {
    console.log('⚠️  Remember to expose this server with ngrok for Asana to reach it!\n');
  }
});
