# Asana Webhook Receiver

Production-ready webhook receiver for Asana with PostgreSQL persistence, real-time SSE broadcasting, and comprehensive logging.

## 🚀 Features

- ✅ **Complete Webhook Flow** - Handshake, signature verification, event processing
- ✅ **PostgreSQL Integration** - Persist webhooks and events to database
- ✅ **Real-time SSE** - Broadcast events to connected clients
- ✅ **Comprehensive Logging** - Detailed trace for debugging
- ✅ **RESTful API** - Query webhooks and events
- ✅ **Web Dashboard** - Monitor events in real-time
- ✅ **Production Ready** - Error handling, connection pooling, graceful shutdown

## 📋 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

```bash
# Start PostgreSQL with Docker
docker-compose up -d

# Create tables
psql -h localhost -p 5435 -U asana_admin -d asana_receiver -f init-db.sql
```

### 3. Configure Environment

Copy `.env.example` to `.env` and update:

```bash
cp env.example .env
```

**Important:** Update `PUBLIC_URL` with your public URL (ngrok or production domain)

```env
PORT=3000
PUBLIC_URL=https://your-ngrok-url.ngrok.io

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5435
DATABASE_NAME=asana_receiver
DATABASE_USER=asana_admin
DATABASE_PASSWORD=asana_secure_pass_2024
```

### 4. Start Server

```bash
npm start
```

### 5. Expose with ngrok (for development)

```bash
ngrok http 3000
```

Copy the https URL and update `PUBLIC_URL` in `.env`, then restart server.

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

## 📡 Endpoints

### Webhook Endpoint
- `POST /webhook` - Receive webhooks from Asana (handshake + events)

### Dashboard
- `GET /` - Web dashboard to monitor events in real-time

### API Endpoints

#### Server Info
```bash
GET /api/info
```

#### Webhooks
```bash
GET /api/webhooks                    # List all webhooks from database
```

#### Events
```bash
GET /api/events/history              # Get in-memory event history (last 50)
GET /api/events/database?limit=50    # Get events from PostgreSQL
POST /api/events/clear               # Clear in-memory history
```

#### Database
```bash
GET /api/database/test               # Test database connection
GET /api/database/stats              # Get database statistics
```

#### Real-time Stream
```bash
GET /events                          # SSE stream for real-time events
```

## 🔄 Webhook Flow

### 1. Handshake (Webhook Registration)

When you register a webhook with Asana:

1. Asana sends `POST /webhook` with `X-Hook-Secret` header
2. Server echoes the secret back in response header
3. Server saves secret to:
   - Memory (for current session)
   - PostgreSQL (persistent storage)
   - .env file (local development only)
4. Webhook is now registered and ready to receive events

**Logs:**
```
╔══════════════════════════════════════════════════════════════════╗
║  🤝 HANDSHAKE DETECTED!                                          ║
║  Secret: abc123...                                               ║
╚══════════════════════════════════════════════════════════════════╝
✅ Handshake successful!
💾 Secret saved to PostgreSQL database
```

### 2. Receive Events

When a resource changes in Asana:

1. Asana sends `POST /webhook` with `X-Hook-Signature` header
2. Server verifies HMAC-SHA256 signature
3. Server processes events:
   - Saves to in-memory history (last 50 events)
   - Saves to PostgreSQL database
   - Updates webhook statistics
   - Broadcasts via SSE to connected clients
4. Server responds with 200 OK within 10 seconds

**Logs:**
```
📨 Received 1 event(s)
Event 1: {
  action: "changed",
  resource: "task",
  gid: "1234567890123456"
}
💾 Event 1 saved to database (ID: 42)
📡 Broadcasted to 2 client(s): webhook_event
✅ Events processed successfully
```

## 📊 Database Schema

### Table: `webhooks`

Stores registered webhooks with their secrets.

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

Stores all received webhook events.

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
  signature_verified BOOLEAN DEFAULT false
);
```

## 🧪 Testing

### Test Handshake and Signature Verification

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

1. **Web Dashboard**: Open `http://localhost:3000` in browser
2. **Console Logs**: Watch server console for detailed trace
3. **Database Query**: Use API endpoints or direct SQL queries

## 🔍 Debugging

All operations are logged with clear markers:

### Handshake Logs
```
╔══════════════════════════════════════════════════════════════════╗
║  🤝 HANDSHAKE DETECTED!                                          ║
╚══════════════════════════════════════════════════════════════════╝
```

### Signature Verification Logs
```
🔍 SIGNATURE VERIFICATION DEBUG:
   Has signature header? true
   Has WEBHOOK_SECRET? true
   Will verify? true
   ✅ Signature verified!
```

### Event Processing Logs
```
📨 Received 1 event(s)
Event 1: { action: "changed", resource: "task", ... }
💾 Event 1 saved to database (ID: 42)
📡 Broadcasted to 2 client(s): webhook_event
```

### Database Logs
```
💾 DATABASE STATUS:
    ✅ PostgreSQL: Connected
    📈 Active Webhooks: 3
    📈 Total Events: 150
    📈 Events (24h): 45
```

## 📝 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `PUBLIC_URL` | Public URL for webhooks | `http://localhost:3000` |
| `DATABASE_HOST` | PostgreSQL host | `localhost` |
| `DATABASE_PORT` | PostgreSQL port | `5435` |
| `DATABASE_NAME` | Database name | `asana_receiver` |
| `DATABASE_USER` | Database user | `asana_admin` |
| `DATABASE_PASSWORD` | Database password | `asana_secure_pass_2024` |
| `DATABASE_POOL_MIN` | Connection pool min | `2` |
| `DATABASE_POOL_MAX` | Connection pool max | `10` |
| `ASANA_WEBHOOK_SECRET` | Webhook secret (auto-filled) | - |

### Database Connection Pool

Configured in `db.js`:
- Min connections: 2
- Max connections: 10
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

## 🚀 Deployment

### Option 1: Railway

1. Push code to GitHub
2. Create new project in Railway
3. Add PostgreSQL database
4. Set environment variables
5. Deploy

### Option 2: Render

1. Create new Web Service
2. Add PostgreSQL database
3. Set environment variables
4. Deploy

### Option 3: Heroku

1. Create new app
2. Add Heroku Postgres addon
3. Set environment variables
4. Deploy with Git

### Option 4: Vercel (Serverless)

**Note:** Requires serverless-compatible database (e.g., Vercel Postgres, Neon, Supabase)

1. Install Vercel CLI: `npm i -g vercel`
2. Configure `vercel.json`
3. Set environment variables
4. Deploy: `vercel --prod`

## 📚 Documentation

- [WEBHOOK_FLOW_GUIDE.md](./WEBHOOK_FLOW_GUIDE.md) - Complete flow trace and debugging guide
- [README_DATABASE.md](./README_DATABASE.md) - Database setup and schema details

## 🤝 Integration Examples

### JavaScript/Node.js Client

```javascript
// Connect to SSE stream
const eventSource = new EventSource('http://localhost:3000/events');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'webhook_event') {
    console.log('New event:', data.event);
  }
};

// Query events from database
const response = await fetch('http://localhost:3000/api/events/database?limit=10');
const { events } = await response.json();
```

### Python Client

```python
import requests
import sseclient

# Connect to SSE stream
response = requests.get('http://localhost:3000/events', stream=True)
client = sseclient.SSEClient(response)

for event in client.events():
    data = json.loads(event.data)
    if data['type'] == 'webhook_event':
        print('New event:', data['event'])

# Query events from database
response = requests.get('http://localhost:3000/api/events/database?limit=10')
events = response.json()['events']
```

## 🛠️ Troubleshooting

### Issue: Signature verification fails

**Symptoms:** `❌ SIGNATURE MISMATCH!`

**Solutions:**
1. Check WEBHOOK_SECRET is correctly set
2. Verify webhook was properly registered (handshake completed)
3. Check rawBody middleware is working

### Issue: Database connection fails

**Symptoms:** `❌ PostgreSQL: Connection error`

**Solutions:**
1. Verify PostgreSQL is running: `docker-compose ps`
2. Check DATABASE_* environment variables
3. Test connection: `curl http://localhost:3000/api/database/test`

### Issue: Events not appearing in dashboard

**Solutions:**
1. Check server logs for errors
2. Open browser console for SSE connection issues
3. Verify PUBLIC_URL is accessible from Asana

## 📄 License

ISC

## 👤 Author

Asana Integration Team

