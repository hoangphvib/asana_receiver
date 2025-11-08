# Asana Webhook Flow Guide - Complete Trace

## 📋 Overview

Hệ thống `asana_receiver` xử lý webhook từ Asana với flow đầy đủ:
1. **Handshake** - Xác thực webhook
2. **Event Reception** - Nhận và xác minh events
3. **Storage** - Lưu vào PostgreSQL
4. **Real-time Broadcasting** - Phát qua SSE

---

## 🔄 FLOW 1: WEBHOOK HANDSHAKE

### Bước 1: Asana gửi handshake request

Khi bạn tạo webhook mới, Asana sẽ gửi POST request:

```
POST /webhook
Headers:
  X-Hook-Secret: abc123def456...
  Content-Type: application/json
Body: {}
```

### Bước 2: Server xử lý handshake

**File:** `server.js` - Line 167-266

**Logs trace:**
```
=== Incoming Webhook Request ===
Headers: {
  "x-hook-secret": "abc123def456..."
}

╔══════════════════════════════════════════════════════════════════╗
║  🤝 HANDSHAKE DETECTED!                                          ║
╟──────────────────────────────────────────────────────────────────╢
║  Secret: abc123def456...                                         ║
╚══════════════════════════════════════════════════════════════════╝

✅ Handshake successful! Secret echoed back to Asana.
💾 Secret saved to memory for this session
✅ Signature verification is now ENABLED for subsequent events
```

### Bước 3: Lưu vào database

**File:** `server.js` - Line 189-216

**Database operation:**
- Table: `webhooks`
- Action: `INSERT ON CONFLICT UPDATE`
- Fields: `webhook_gid`, `resource_gid`, `resource_type`, `target_url`, `secret`

**Logs trace:**
```
💾 ✅ Webhook saved to PostgreSQL database
   Webhook GID: webhook_1699123456789
   Resource GID: 1234567890123456
```

### Bước 4: Response to Asana

```http
HTTP/1.1 200 OK
X-Hook-Secret: abc123def456...
```

**Logs trace:**
```
╔══════════════════════════════════════════════════════════════════╗
║  ✅ SECRET READY!                                                ║
╟──────────────────────────────────────────────────────────────────╢
║  Storage: Memory + PostgreSQL + .env                             ║
║  Status:  Active & Ready to verify events                        ║
║                                                                  ║
║  📨 Next events will be automatically verified!                  ║
║     No restart needed!                                           ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 🔄 FLOW 2: RECEIVE WEBHOOK EVENTS

### Bước 1: Asana gửi event

Khi có thay đổi trong resource, Asana gửi:

```
POST /webhook
Headers:
  X-Hook-Signature: 3f7a8b9c...
  Content-Type: application/json
Body:
{
  "events": [
    {
      "action": "changed",
      "created_at": "2024-11-06T10:30:00.000Z",
      "parent": {
        "gid": "webhook_gid_here",
        "resource_type": "webhook"
      },
      "resource": {
        "gid": "task_gid_here",
        "resource_type": "task"
      },
      "user": {
        "gid": "user_gid_here",
        "resource_type": "user"
      }
    }
  ]
}
```

### Bước 2: Signature verification

**File:** `server.js` - Line 268-316

**Process:**
1. Extract signature from header: `X-Hook-Signature`
2. Compute HMAC-SHA256: `crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')`
3. Compare signatures

**Logs trace (SUCCESS):**
```
🔍 SIGNATURE VERIFICATION DEBUG:
   Has signature header? true
   Has WEBHOOK_SECRET? true
   WEBHOOK_SECRET value: abc123def456...
   Will verify? true
   Computing signature...
   Raw body length: 245
   Raw body preview: {"events":[{"action":"changed"...
   ✅ Signature verified!
```

**Logs trace (FAIL):**
```
❌ SIGNATURE MISMATCH!
   Expected (computed): 3f7a8b9c...
   Received (from Asana): 1a2b3c4d...
   Secret used: abc123def456...
   Body used: {"events":[...

HTTP/1.1 401 Unauthorized
{
  "error": "Invalid signature",
  "hint": "Secret mismatch or body format incorrect"
}
```

### Bước 3: Process events

**File:** `server.js` - Line 318-404

**For each event:**

#### 3.1 Parse event data
```javascript
{
  index: 1,
  action: "changed",
  resource_type: "task",
  resource_gid: "1234567890123456",
  resource_name: "Task name",
  created_at: "2024-11-06T10:30:00.000Z",
  user: { gid: "...", resource_type: "user" },
  parent: { gid: "...", resource_type: "webhook" },
  full_event: { ... },
  received_at: "2024-11-06T10:30:01.234Z"
}
```

**Logs trace:**
```
📨 Received 1 event(s)

Event 1: {
  action: "changed",
  resource: "task",
  gid: "1234567890123456",
  created_at: "2024-11-06T10:30:00.000Z"
}
```

#### 3.2 Save to in-memory history
- Array: `eventHistory`
- Max size: 50 events
- FIFO (First In, First Out)

#### 3.3 Save to PostgreSQL database

**File:** `db.js` - Function `saveEvent()` - Line 148-187

**Database operation:**
- Table: `webhook_events`
- Action: `INSERT`
- Fields: `webhook_gid`, `event_type`, `action`, `resource_gid`, `resource_type`, `user_gid`, `created_at`, `payload`, `signature_verified`

**Logs trace:**
```
💾 Event 1 saved to database (ID: 42)
```

#### 3.4 Update webhook statistics

**File:** `db.js` - Function `updateWebhookStats()` - Line 108-124

**Database operation:**
- Table: `webhooks`
- Action: `UPDATE`
- Fields: `event_count = event_count + 1`, `last_event_at = CURRENT_TIMESTAMP`

#### 3.5 Broadcast via SSE

**Function:** `broadcastToClients()` - Line 450-461

**Message:**
```json
{
  "type": "webhook_event",
  "event": { ... },
  "totalEvents": 1,
  "currentIndex": 1,
  "savedToDatabase": true
}
```

**Logs trace:**
```
📡 Broadcasted to 2 client(s): webhook_event
```

### Bước 4: Response to Asana

**IMPORTANT:** Response must be sent within 10 seconds!

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "received": true,
  "processed": 1,
  "timestamp": "2024-11-06T10:30:01.234Z"
}
```

**Logs trace:**
```
✅ Events processed successfully
```

---

## 📊 DATABASE SCHEMA

### Table: `webhooks`

```sql
CREATE TABLE webhooks (
  id SERIAL PRIMARY KEY,
  webhook_gid VARCHAR(255) UNIQUE NOT NULL,
  resource_gid VARCHAR(255) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  target_url TEXT NOT NULL,
  secret TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  event_count INTEGER DEFAULT 0,
  last_event_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `webhook_events`

```sql
CREATE TABLE webhook_events (
  id SERIAL PRIMARY KEY,
  webhook_gid VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  resource_gid VARCHAR(255),
  resource_type VARCHAR(50),
  user_gid VARCHAR(255),
  created_at TIMESTAMP NOT NULL,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payload JSONB NOT NULL,
  signature_verified BOOLEAN DEFAULT false,
  FOREIGN KEY (webhook_gid) REFERENCES webhooks(webhook_gid) ON DELETE CASCADE
);

CREATE INDEX idx_webhook_events_webhook_gid ON webhook_events(webhook_gid);
CREATE INDEX idx_webhook_events_resource_gid ON webhook_events(resource_gid);
CREATE INDEX idx_webhook_events_received_at ON webhook_events(received_at DESC);
```

---

## 🔍 API ENDPOINTS FOR TRACING

### 1. Test Database Connection
```bash
GET /api/database/test
```

**Response:**
```json
{
  "success": true,
  "message": "Database connection successful",
  "time": "2024-11-06T10:30:00.000Z"
}
```

### 2. Get Database Statistics
```bash
GET /api/database/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "active_webhooks": 3,
    "total_events": 150,
    "events_24h": 45,
    "total_events": 150,
    "verified_events": 148,
    "last_event_time": "2024-11-06T10:30:00.000Z"
  }
}
```

### 3. List All Webhooks
```bash
GET /api/webhooks
```

**Response:**
```json
{
  "success": true,
  "webhooks": [
    {
      "id": 1,
      "webhook_gid": "webhook_1234567890",
      "resource_gid": "1234567890123456",
      "resource_type": "project",
      "target_url": "https://your-domain.com/webhook",
      "active": true,
      "event_count": 42,
      "last_event_at": "2024-11-06T10:30:00.000Z",
      "created_at": "2024-11-05T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

### 4. Get Events from Database
```bash
GET /api/events/database?limit=10&offset=0
```

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "id": 42,
      "webhook_gid": "webhook_1234567890",
      "event_type": "webhook",
      "action": "changed",
      "resource_gid": "task_123",
      "resource_type": "task",
      "user_gid": "user_456",
      "created_at": "2024-11-06T10:30:00.000Z",
      "received_at": "2024-11-06T10:30:01.234Z",
      "payload": { ... },
      "signature_verified": true
    }
  ],
  "count": 10,
  "limit": 10,
  "offset": 0
}
```

### 5. Get In-Memory Event History
```bash
GET /api/events/history
```

**Response:**
```json
{
  "success": true,
  "events": [ ... ],
  "count": 50
}
```

---

## 🐛 DEBUGGING & TROUBLESHOOTING

### Enable Detailed Logging

All logs are automatically written to console with structured format:

1. **Handshake logs** - ASCII art boxes with clear sections
2. **Event logs** - JSON formatted with indentation
3. **Database logs** - Success/failure with error messages
4. **Signature verification** - Step-by-step trace

### Common Issues

#### Issue 1: Signature verification fails

**Symptoms:**
```
❌ SIGNATURE MISMATCH!
```

**Solutions:**
1. Check WEBHOOK_SECRET matches the one from handshake
2. Verify rawBody is properly captured (middleware order)
3. Check Content-Type header is `application/json`

#### Issue 2: Database connection fails

**Symptoms:**
```
❌ PostgreSQL: Connection error
```

**Solutions:**
1. Check `.env` DATABASE_* variables
2. Verify PostgreSQL is running
3. Run: `GET /api/database/test`

#### Issue 3: Events not saved to database

**Symptoms:**
- Events appear in logs but not in database
- Error: `relation "webhooks" does not exist`

**Solutions:**
1. Run `init-db.sql` to create tables
2. Check database permissions
3. Verify connection pool settings

---

## 📝 SETUP CHECKLIST

### 1. Environment Variables (.env)

```bash
# Server
PORT=3000
PUBLIC_URL=https://your-ngrok-url.ngrok.io

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5435
DATABASE_NAME=asana_receiver
DATABASE_USER=asana_admin
DATABASE_PASSWORD=asana_secure_pass_2024

# Webhook Secret (auto-filled during handshake)
ASANA_WEBHOOK_SECRET=
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

```bash
# Start PostgreSQL with Docker
docker-compose up -d

# Create tables
psql -h localhost -p 5435 -U asana_admin -d asana_receiver -f init-db.sql
```

### 4. Start Server

```bash
npm start
```

### 5. Expose with ngrok

```bash
ngrok http 3000
# Copy the https URL and update PUBLIC_URL in .env
```

### 6. Register Webhook with Asana

```bash
curl -X POST https://app.asana.com/api/1.0/webhooks \
  -H "Authorization: Bearer YOUR_ASANA_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "resource": "PROJECT_OR_TASK_GID",
      "target": "https://your-ngrok-url.ngrok.io/webhook"
    }
  }'
```

---

## 🎯 TESTING

### Test Handshake

```bash
node test-handshake.js
```

Expected output:
```
🧪 Testing Asana Webhook Receiver Flow
📋 TEST 1: Handshake
   ✅ PASS: Handshake successful!
📋 TEST 2: Event with VALID signature
   ✅ PASS: Event verified and accepted!
📋 TEST 3: Event with INVALID signature
   ✅ PASS: Invalid signature correctly rejected!
🎉 ALL CRITICAL TESTS PASSED!
```

### Monitor Real-time Events

1. Open dashboard: `http://localhost:3000`
2. Watch console logs
3. Query database: `GET /api/events/database`

---

## 📚 SUMMARY

✅ **Flow hoàn chỉnh:**
- Handshake → Save secret (Memory + PostgreSQL + .env)
- Event → Verify signature → Process → Save (Memory + PostgreSQL) → Broadcast (SSE)

✅ **Logging đầy đủ:**
- Console logs với ASCII art boxes
- Database logs với success/error
- Real-time SSE broadcasting

✅ **Easy to trace:**
- Structured logs with clear markers
- API endpoints để query data
- Test script để verify flow

✅ **Production ready:**
- Signature verification
- Database persistence
- Error handling
- Graceful shutdown

