# Changelog - Asana Receiver

## [2.0.0] - 2024-11-06

### 🎉 Major Update: PostgreSQL Integration

#### Added
- **PostgreSQL Integration**
  - Connection pool with configurable settings
  - `webhooks` table for storing webhook registrations and secrets
  - `webhook_events` table for storing all received events
  - Database functions in `db.js` module

- **Database Functions**
  - `saveWebhook()` - Save webhook registration with secret
  - `getWebhook()` - Get webhook by GID
  - `getWebhookByResource()` - Get webhook by resource GID
  - `getAllWebhooks()` - List all active webhooks
  - `updateWebhookStats()` - Update event count and last event time
  - `deactivateWebhook()` - Soft delete webhook
  - `saveEvent()` - Save webhook event to database
  - `getRecentEvents()` - Query recent events with pagination
  - `getEventsByWebhook()` - Get events for specific webhook
  - `getEventStats()` - Get event statistics
  - `cleanupOldEvents()` - Delete old events
  - `testConnection()` - Test database connectivity
  - `getDatabaseStats()` - Get database statistics

- **New API Endpoints**
  - `GET /api/webhooks` - List all webhooks from database
  - `GET /api/events/database` - Query events from database with pagination
  - `GET /api/database/stats` - Get database statistics
  - `GET /api/database/test` - Test database connection

- **Enhanced Handshake Flow**
  - Save webhook secret to PostgreSQL during handshake
  - Triple storage: Memory + PostgreSQL + .env file
  - Non-blocking database operations

- **Enhanced Event Processing**
  - Save all events to PostgreSQL
  - Update webhook statistics
  - Track signature verification status
  - Non-blocking database operations

- **Startup Database Check**
  - Test database connection on server start
  - Display database statistics in startup banner
  - Graceful degradation if database unavailable

- **Documentation**
  - `WEBHOOK_FLOW_GUIDE.md` - Complete flow trace and debugging guide
  - `INTEGRATION_SUMMARY.md` - Integration overview and checklist
  - Updated `README.md` with PostgreSQL setup instructions
  - `CHANGELOG.md` - This file

- **Dependencies**
  - Added `pg` (PostgreSQL client)
  - Added `dotenv` (Environment variable management)
  - Added `axios` (Dev dependency for testing)

#### Changed
- **server.js**
  - Import and initialize database module
  - Load environment variables with dotenv
  - Enhanced handshake logging with database save confirmation
  - Enhanced event processing with database persistence
  - Improved startup banner with database status
  - Added async startup to test database connection

- **package.json**
  - Updated description
  - Added PostgreSQL-related keywords
  - Added test script
  - Added new dependencies

#### Fixed
- Secret persistence across server restarts
- Event history loss on server restart
- Limited to single webhook in memory

#### Technical Details
- Database operations are wrapped in async IIFEs to not block webhook responses
- All database errors are caught and logged without crashing server
- Connection pool configured for production use (min: 2, max: 10)
- Graceful degradation if database is unavailable

---

## [1.0.0] - 2024-11-05

### Initial Release

#### Features
- Basic webhook receiver for Asana
- Handshake support with X-Hook-Secret
- Signature verification with HMAC-SHA256
- In-memory event storage (last 50 events)
- Real-time SSE broadcasting
- Web dashboard for monitoring
- .env file secret persistence (local dev)

#### Endpoints
- `POST /webhook` - Receive webhooks from Asana
- `GET /` - Web dashboard
- `GET /events` - SSE stream
- `GET /api/info` - Server information
- `GET /api/events/history` - In-memory event history
- `POST /api/events/clear` - Clear event history

#### Limitations
- Secrets lost on server restart (only .env persistence)
- No event history beyond last 50 events
- No webhook statistics
- Single webhook support only

---

## Migration Guide: v1.0 → v2.0

### Prerequisites
1. Install PostgreSQL (via Docker or native)
2. Create database and tables (use `init-db.sql`)

### Steps

#### 1. Update Dependencies
```bash
npm install
```

#### 2. Setup Database
```bash
# Using Docker
docker-compose up -d

# Verify
docker-compose ps
```

#### 3. Update Environment Variables
Add to `.env`:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5435
DATABASE_NAME=asana_receiver
DATABASE_USER=asana_admin
DATABASE_PASSWORD=asana_secure_pass_2024
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

#### 4. Restart Server
```bash
npm start
```

#### 5. Verify Database Connection
```bash
curl http://localhost:3000/api/database/test
```

Expected response:
```json
{
  "success": true,
  "message": "Database connection successful",
  "time": "2024-11-06T10:30:00.000Z"
}
```

#### 6. Re-register Webhooks (Optional)
Existing webhooks will continue to work, but:
- Secrets are still in memory from handshake
- Events will be saved to database automatically
- For persistence across restarts, consider re-registering webhooks

### Breaking Changes
None! v2.0 is fully backward compatible with v1.0.

### New Behavior
- Events are now saved to both memory AND database
- Webhooks registered after upgrade will persist across restarts
- Database operations are non-blocking and don't affect webhook response time

---

## Future Roadmap

### v2.1 (Planned)
- [ ] Webhook management UI
- [ ] Retry mechanism for failed database operations
- [ ] Event export functionality (CSV/JSON)
- [ ] Enhanced analytics dashboard

### v2.2 (Planned)
- [ ] Queue system (Bull/BullMQ) for event processing
- [ ] Alert system for webhook failures
- [ ] Rate limiting and throttling
- [ ] Multi-region support

### v3.0 (Planned)
- [ ] GraphQL API
- [ ] WebSocket support
- [ ] Event replay functionality
- [ ] Advanced filtering and search

---

## Support

For issues or questions:
1. Check [WEBHOOK_FLOW_GUIDE.md](./WEBHOOK_FLOW_GUIDE.md) for debugging
2. Check [README.md](./README.md) for setup instructions
3. Check [INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md) for overview

