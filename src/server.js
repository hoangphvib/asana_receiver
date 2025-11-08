#!/usr/bin/env node

/**
 * Server Startup
 * Start the Express server and initialize database connections
 */

const createApp = require('./app');
const config = require('./config');
const db = require('../db');
const dctClient = require('../dct-client');

/**
 * Start Server
 */
async function startServer() {
  try {
    // Create app
    const { app } = createApp();

    // Test database connections
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║  🚀 Asana Webhook Receiver Starting...               ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    // Test main database
    console.log('📊 Testing database connections...');
    const dbTest = await db.testConnection();
    if (dbTest.success) {
      console.log(`✅ Main Database: Connected (${dbTest.time})`);
    } else {
      console.log(`❌ Main Database: Failed - ${dbTest.error}`);
      console.log('⚠️  Warning: Server will start but database features may not work');
    }

    // Test DCT database (if enabled)
    if (config.features.dctEnrichment) {
      const dctTest = await dctClient.testDCTConnection();
      if (dctTest.success) {
        console.log(`✅ DCT Database: Connected (${dctTest.database})`);
      } else {
        console.log(`⚠️  DCT Database: Not connected - Enrichment features disabled`);
      }
    }

    // Start server
    const server = app.listen(config.server.port, () => {
      console.log('\n╔═══════════════════════════════════════════════════════╗');
      console.log('║  ✅ Server is running!                                ║');
      console.log('╠═══════════════════════════════════════════════════════╣');
      console.log(`║  Port:        ${String(config.server.port).padEnd(40)} ║`);
      console.log(`║  Environment: ${config.server.env.padEnd(40)} ║`);
      console.log(`║  Public URL:  ${config.server.publicUrl.padEnd(40).substring(0, 40)} ║`);
      console.log('╠═══════════════════════════════════════════════════════╣');
      console.log('║  📋 Endpoints:                                        ║');
      console.log(`║    Dashboard:  ${config.server.publicUrl.padEnd(37).substring(0, 37)} ║`);
      console.log(`║    Webhook:    ${`${config.server.publicUrl}/webhook`.padEnd(37).substring(0, 37)} ║`);
      console.log(`║    API Info:   ${`${config.server.publicUrl}/api/info`.padEnd(37).substring(0, 37)} ║`);
      console.log(`║    SSE Stream: ${`${config.server.publicUrl}/events`.padEnd(37).substring(0, 37)} ║`);
      console.log('╚═══════════════════════════════════════════════════════╝\n');
      console.log('✅ Ready to receive webhooks!\n');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => shutdown(server));
    process.on('SIGINT', () => shutdown(server));

  } catch (error) {
    console.error('❌ Fatal error starting server:', error);
    process.exit(1);
  }
}

/**
 * Graceful Shutdown
 */
async function shutdown(server) {
  console.log('\n🛑 Shutting down gracefully...');

  // Stop accepting new connections
  server.close(() => {
    console.log('✅ HTTP server closed');
  });

  // Close database connections
  try {
    await db.closePool();
    if (config.features.dctEnrichment) {
      await dctClient.closeDCTPool();
    }
  } catch (error) {
    console.error('Error closing database connections:', error);
  }

  console.log('👋 Goodbye!\n');
  process.exit(0);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start if run directly
if (require.main === module) {
  startServer();
}

module.exports = startServer;

