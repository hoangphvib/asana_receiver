# Asana Receiver with PostgreSQL

## 🎯 Tính năng mới

asana_receiver giờ đã được nâng cấp với PostgreSQL để:

✅ **Lưu trữ webhook secrets persistently** - Không mất secret khi restart  
✅ **Audit trail đầy đủ** - Lưu tất cả events nhận được  
✅ **Statistics & Analytics** - Thống kê events theo thời gian  
✅ **Multiple webhooks support** - Quản lý nhiều webhooks cùng lúc  

---

## 🚀 Quick Start

### 1. Start PostgreSQL với Docker

```bash
cd /Users/hoang.phamho/Desktop/Projects/asana_receiver

# Start database
docker-compose up -d

# Check logs
docker-compose logs -f postgres

# Expected output:
# "database system is ready to accept connections"
# "Database initialized successfully!"
```

### 2. Configure Environment

```bash
# Copy example config
cp env.example .env

# Edit .env - Database section already configured:
# DATABASE_HOST=localhost
# DATABASE_PORT=5433
# DATABASE_NAME=asana_receiver
# DATABASE_USER=asana_admin
# DATABASE_PASSWORD=asana_secure_pass_2024
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Server

```bash
npm start
```

**Expected output:**
```
✅ Database connected
🚀 Asana Webhook Receiver is Running!
...
```

---

## 📊 Database Schema

### Table: `webhooks`

Lưu trữ thông tin webhook subscriptions

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `webhook_gid` | VARCHAR(255) | Asana webhook GID (unique) |
| `resource_gid` | VARCHAR(255) | Resource being watched |
| `resource_type` | VARCHAR(50) | task/project/workspace |
| `target_url` | TEXT | Webhook endpoint URL |
| `secret` | TEXT | X-Hook-Secret for verification |
| `active` | BOOLEAN | Is webhook active? |
| `created_at` | TIMESTAMP | When webhook was created |
| `updated_at` | TIMESTAMP | Last update time |
| `last_event_at` | TIMESTAMP | Last event received |
| `event_count` | INTEGER | Total events received |

### Table: `webhook_events`

Lưu trữ tất cả webhook events nhận được

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `webhook_gid` | VARCHAR(255) | Related webhook |
| `event_type` | VARCHAR(50) | Event type |
| `action` | VARCHAR(50) | changed/added/removed |
| `resource_gid` | VARCHAR(255) | Resource affected |
| `resource_type` | VARCHAR(50) | Resource type |
| `user_gid` | VARCHAR(255) | User who triggered |
| `created_at` | TIMESTAMP | When event occurred in Asana |
| `received_at` | TIMESTAMP | When we received it |
| `payload` | JSONB | Full event payload |
| `signature_verified` | BOOLEAN | Was signature valid? |

---

## 🔧 Database Functions

### Webhook Management

```javascript
const db = require('./db');

// Save webhook after handshake
await db.saveWebhook({
  webhook_gid: '123456',
  resource_gid: '789012',
  resource_type: 'task',
  target_url: 'https://example.com/webhook',
  secret: '$2a$12$...'
});

// Get webhook by GID
const webhook = await db.getWebhook('123456');

// Get webhook by resource
const webhook = await db.getWebhookByResource('789012');

// Get all active webhooks
const webhooks = await db.getAllWebhooks();

// Update webhook stats
await db.updateWebhookStats('123456');

// Deactivate webhook
await db.deactivateWebhook('123456');
```

### Event Storage

```javascript
// Save event
await db.saveEvent({
  webhook_gid: '123456',
  event_type: 'story',
  action: 'changed',
  resource_gid: '789012',
  resource_type: 'task',
  user_gid: '345678',
  created_at: new Date().toISOString(),
  payload: {...},
  signature_verified: true
});

// Get recent events
const events = await db.getRecentEvents(50, 0);

// Get events by webhook
const events = await db.getEventsByWebhook('123456', 100);

// Get statistics
const stats = await db.getEventStats();
// Returns: { total_events, active_webhooks, verified_events, last_event_time }

// Cleanup old events
await db.cleanupOldEvents(30); // Delete events older than 30 days
```

### Utilities

```javascript
// Test connection
const result = await db.testConnection();
// { success: true, time: '2025-11-05...' }

// Get database stats
const stats = await db.getDatabaseStats();
// { active_webhooks: 5, total_events: 1234, events_24h: 56 }
```

---

## 📈 Workflow với Database

### 1. Handshake - Lưu Secret

```
Asana → POST /webhook
        X-Hook-Secret: abc123

Server → 1. Echo secret back
         2. Save to database:
            db.saveWebhook({
              webhook_gid: '<from Asana response>',
              secret: 'abc123',
              ...
            })
         3. Response 200 OK

✅ Secret now persisted in database!
```

### 2. Event - Load Secret & Verify

```
Asana → POST /webhook
        X-Hook-Signature: xyz789
        Body: {...}

Server → 1. Extract resource_gid from body
         2. Load secret from database:
            webhook = db.getWebhookByResource(resource_gid)
         3. Verify signature:
            HMAC-SHA256(webhook.secret, body) === xyz789?
         4. Save event:
            db.saveEvent({...})
         5. Update stats:
            db.updateWebhookStats(webhook.webhook_gid)

✅ Event verified, saved, and counted!
```

### 3. Restart Server - Secret Persists

```
Server restart → Load secret from database
              → No need to re-handshake!

✅ Zero downtime for webhooks!
```

---

## 🔍 Query Examples

### Connect to database

```bash
# Using docker exec
docker exec -it asana_receiver_db psql -U asana_admin -d asana_receiver

# Or using psql client locally
psql -h localhost -p 5433 -U asana_admin -d asana_receiver
```

### Useful queries

```sql
-- List all active webhooks
SELECT webhook_gid, resource_type, resource_gid, event_count, last_event_at
FROM webhooks
WHERE active = true
ORDER BY created_at DESC;

-- Get recent events
SELECT event_type, action, resource_type, created_at, signature_verified
FROM webhook_events
ORDER BY received_at DESC
LIMIT 20;

-- Events by webhook
SELECT action, resource_type, created_at
FROM webhook_events
WHERE webhook_gid = '123456'
ORDER BY received_at DESC;

-- Event statistics
SELECT 
  resource_type,
  action,
  COUNT(*) as count
FROM webhook_events
WHERE received_at > NOW() - INTERVAL '24 hours'
GROUP BY resource_type, action
ORDER BY count DESC;

-- Webhook with most events
SELECT 
  w.webhook_gid,
  w.resource_type,
  w.event_count,
  COUNT(e.id) as db_events
FROM webhooks w
LEFT JOIN webhook_events e ON w.webhook_gid = e.webhook_gid
GROUP BY w.webhook_gid, w.resource_type, w.event_count
ORDER BY w.event_count DESC;
```

---

## 🛠️ Maintenance

### Backup Database

```bash
# Full backup
docker exec asana_receiver_db pg_dump -U asana_admin asana_receiver > backup.sql

# Restore
docker exec -i asana_receiver_db psql -U asana_admin asana_receiver < backup.sql
```

### Clean up old data

```bash
# In Node.js
const db = require('./db');
await db.cleanupOldEvents(30); // Delete events older than 30 days
```

```sql
-- In SQL
DELETE FROM webhook_events 
WHERE received_at < NOW() - INTERVAL '30 days';

-- Vacuum to reclaim space
VACUUM ANALYZE webhook_events;
```

### Monitor Performance

```sql
-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
WHERE query LIKE '%webhook%'
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 🚀 Docker Commands

```bash
# Start database
docker-compose up -d

# Stop database
docker-compose down

# Stop and remove data
docker-compose down -v

# View logs
docker-compose logs -f postgres

# Restart database
docker-compose restart postgres

# Check status
docker-compose ps

# Execute SQL
docker-compose exec postgres psql -U asana_admin -d asana_receiver

# Shell access
docker-compose exec postgres sh
```

---

## 🔐 Security Notes

### 1. Change Default Password

```yaml
# docker-compose.yml
environment:
  POSTGRES_PASSWORD: YOUR_SECURE_PASSWORD_HERE
```

```bash
# .env
DATABASE_PASSWORD=YOUR_SECURE_PASSWORD_HERE
```

### 2. Don't Commit Secrets

```bash
# .gitignore already includes:
.env
docker-compose.override.yml
```

### 3. Production Recommendations

- Use managed PostgreSQL (AWS RDS, Google Cloud SQL, etc.)
- Enable SSL/TLS connections
- Set up automated backups
- Monitor database performance
- Rotate passwords regularly

---

## 📊 Monitoring Dashboard (Coming Soon)

Planned features:
- Real-time webhook statistics
- Event timeline visualization
- Webhook health monitoring
- Alert on failed deliveries

---

## 🎯 Benefits of Database Integration

| Before (Memory) | After (PostgreSQL) |
|----------------|-------------------|
| ❌ Secrets lost on restart | ✅ Persistent storage |
| ❌ No event history | ✅ Full audit trail |
| ❌ Single webhook only | ✅ Multiple webhooks |
| ❌ No analytics | ✅ Statistics & reporting |
| ❌ Lost on Vercel cold start | ✅ Always available |

---

## 🧪 Testing

```bash
# Test database connection
node -e "const db = require('./db'); db.testConnection().then(console.log)"

# Get stats
node -e "const db = require('./db'); db.getDatabaseStats().then(console.log)"

# Run integration tests
npm test  # (if tests are configured)
```

---

**🎉 asana_receiver is now production-ready with PostgreSQL!**

