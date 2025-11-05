# Asana Webhook Receiver with SSE (Server-Sent Events)

## 🎯 Overview

This upgraded webhook receiver streams events in real-time to connected clients using **Server-Sent Events (SSE)**.

### Key Features:

- ✅ **Real-time event streaming** - Events pushed to browser instantly
- ✅ **Live dashboard** - Visual interface with auto-updating event list  
- ✅ **Event history** - Stores last 50 events
- ✅ **Multiple clients** - Supports multiple connected browsers
- ✅ **Auto-reconnect** - Automatically reconnects if connection drops
- ✅ **CORS enabled** - Can be used from any origin

## 🚀 Quick Start

### 1. Install & Run

```bash
cd asana_receiver
npm install
npm start
```

Server runs at: `http://localhost:3000`

### 2. Open Dashboard

Navigate to: `http://localhost:3000`

You'll see the real-time dashboard with connection status.

### 3. Register Webhook

Use Postman or the Integration Site to register a webhook pointing to your server.

### 4. Watch Events Flow

As Asana sends events, they appear automatically in the dashboard!

## 📡 How SSE Works

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Browser   │         │  Receiver   │         │    Asana    │
│  Dashboard  │         │   Server    │         │   Servers   │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │ 1. Connect to /events │                       │
       │ (SSE connection)      │                       │
       ├──────────────────────>│                       │
       │                       │                       │
       │ 2. Connected message  │                       │
       │<──────────────────────┤                       │
       │                       │                       │
       │                       │ 3. Webhook event      │
       │                       │<──────────────────────┤
       │                       │                       │
       │ 4. Event streamed     │                       │
       │    (real-time)        │                       │
       │<──────────────────────┤                       │
       │                       │                       │
       │ ✨ Event appears      │                       │
       │    in dashboard       │                       │
```

## 🔌 Endpoints

### 1. `GET /` - Health Check & Dashboard

Returns HTML dashboard with real-time event viewer.

**Response (when accessed via API):**
```json
{
  "status": "running",
  "message": "Asana Webhook Receiver is active",
  "connectedClients": 2,
  "eventsInHistory": 15,
  "timestamp": "2025-11-05T10:30:00.000Z"
}
```

### 2. `GET /events` - SSE Stream

Connect here to receive real-time events.

**Connection:**
```javascript
const eventSource = new EventSource('http://localhost:3000/events');

eventSource.onmessage = (e) => {
  const data = JSON.parse(e.data);
  console.log('Event received:', data);
};
```

**Message Types:**

#### `connected`
Sent when client first connects:
```json
{
  "type": "connected",
  "message": "Connected to Asana Webhook Receiver",
  "timestamp": "2025-11-05T10:30:00.000Z",
  "historyCount": 15
}
```

#### `history`
Sent after connection with recent events:
```json
{
  "type": "history",
  "events": [...],
  "count": 15
}
```

#### `webhook_event`
Sent when new webhook event received:
```json
{
  "type": "webhook_event",
  "event": {
    "action": "changed",
    "resource_type": "task",
    "resource_gid": "1234567890123456",
    "resource_name": "My Task",
    "created_at": "2025-11-05T10:30:00.000Z",
    "user": { ... },
    "full_event": { ... },
    "received_at": "2025-11-05T10:30:01.000Z"
  },
  "totalEvents": 1,
  "currentIndex": 1
}
```

#### `handshake`
Sent when webhook handshake occurs:
```json
{
  "type": "handshake",
  "hookSecret": "abc123def4...",
  "timestamp": "2025-11-05T10:30:00.000Z"
}
```

#### `history_cleared`
Sent when event history is cleared:
```json
{
  "type": "history_cleared",
  "clearedCount": 15,
  "timestamp": "2025-11-05T10:30:00.000Z"
}
```

### 3. `POST /webhook` - Webhook Endpoint

Receives webhooks from Asana. Events are:
1. Logged to console
2. Stored in history (last 50)
3. Broadcasted to all connected SSE clients

### 4. `GET /api/events/history` - Get Event History

Retrieve stored events.

**Response:**
```json
{
  "success": true,
  "events": [...],
  "count": 15
}
```

### 5. `POST /api/events/clear` - Clear History

Clear all stored events and notify connected clients.

**Response:**
```json
{
  "success": true,
  "message": "Cleared 15 events from history"
}
```

## 💻 Client Implementation Examples

### Vanilla JavaScript

```javascript
const eventSource = new EventSource('http://localhost:3000/events');

eventSource.onopen = () => {
  console.log('✅ Connected');
};

eventSource.onmessage = (e) => {
  const data = JSON.parse(e.data);
  
  switch (data.type) {
    case 'connected':
      console.log('Connected to server');
      break;
      
    case 'webhook_event':
      console.log('New event:', data.event);
      // Update your UI here
      break;
      
    case 'handshake':
      console.log('Handshake completed');
      break;
  }
};

eventSource.onerror = (error) => {
  console.error('❌ Connection error:', error);
};
```

### React Hook

```typescript
import { useEffect, useState } from 'react';

function useWebhookEvents() {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:3000/events');

    eventSource.onopen = () => setConnected(true);
    
    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      
      if (data.type === 'webhook_event') {
        setEvents(prev => [data.event, ...prev]);
      }
    };

    eventSource.onerror = () => setConnected(false);

    return () => eventSource.close();
  }, []);

  return { events, connected };
}

// Usage in component
function Dashboard() {
  const { events, connected } = useWebhookEvents();
  
  return (
    <div>
      <div>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      {events.map(event => (
        <div key={event.received_at}>
          {event.action} - {event.resource_type}
        </div>
      ))}
    </div>
  );
}
```

### Next.js (Client Component)

```typescript
'use client';

import { useEffect, useState } from 'react';

export default function WebhookMonitor() {
  const [events, setEvents] = useState<any[]>([]);
  const [status, setStatus] = useState('disconnected');

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:3000/events');

    eventSource.onopen = () => {
      setStatus('connected');
    };

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      
      if (data.type === 'webhook_event') {
        setEvents(prev => [data.event, ...prev].slice(0, 50));
      }
    };

    eventSource.onerror = () => {
      setStatus('disconnected');
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div>
      <h2>Status: {status}</h2>
      <div>
        {events.map((event, i) => (
          <div key={i}>
            {event.action} - {event.resource_type} - {event.resource_gid}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 🔒 CORS Configuration

CORS is enabled for all origins by default:

```javascript
res.header('Access-Control-Allow-Origin', '*');
```

To restrict to specific domains:

```javascript
res.header('Access-Control-Allow-Origin', 'https://yourdomain.com');
```

## ⚙️ Configuration

### Environment Variables

Create `.env`:

```bash
PORT=3000
ASANA_WEBHOOK_SECRET=your-secret-here
```

### Event History Limit

Change in `server.js`:

```javascript
const MAX_HISTORY = 50;  // Change to desired limit
```

## 🎨 Dashboard Features

The built-in dashboard (`http://localhost:3000`) includes:

- ✅ **Connection status** - Real-time connection indicator
- ✅ **Event counter** - Total events received
- ✅ **Client counter** - Number of connected browsers
- ✅ **Auto-refresh** - Events appear automatically
- ✅ **Event details** - Action, resource type, timestamps
- ✅ **Raw JSON viewer** - Toggle to see full event data
- ✅ **Clear history** - Button to clear all events
- ✅ **Animations** - Smooth slide-in for new events
- ✅ **Auto-reconnect** - Reconnects if connection drops

## 📊 Monitoring Multiple Clients

Open the dashboard in multiple browser tabs/windows - all will receive events simultaneously:

```
Client 1 (Chrome) ─────┐
                       ├───> Server ───> Asana
Client 2 (Firefox) ────┤
                       │
Client 3 (Safari) ─────┘
```

Check connected clients:

```bash
curl http://localhost:3000

# Response:
{
  "status": "running",
  "connectedClients": 3,  # <-- Number of connected browsers
  "eventsInHistory": 25
}
```

## 🐛 Troubleshooting

### SSE connection fails

**Check:**
1. Server is running: `curl http://localhost:3000`
2. CORS enabled (already done in code)
3. Browser supports SSE (all modern browsers do)

### Events not appearing

**Check:**
1. SSE connection established (check console)
2. Webhook registered correctly
3. Changes being made to watched resource in Asana

### Connection drops frequently

**Possible causes:**
- Server restarted
- Network issues
- Firewall blocking

**Solution:** Auto-reconnect is built-in (5 second delay)

## 🚀 Production Deployment

### Deploy to Cloud

```bash
# Heroku
heroku create
git push heroku main

# Railway
railway init
railway up

# Render
# Connect GitHub repo and deploy
```

### Use with Integration Site

The `asana_integration_site` webhooks page works perfectly with this receiver:

1. Start receiver: `npm start`
2. Expose: `ngrok http 3000`
3. Open integration site: `http://localhost:3001/webhooks`
4. Create webhook with ngrok URL
5. Open receiver dashboard: `http://localhost:3000`
6. Watch events flow in real-time! 🎉

## 📚 Resources

- [Server-Sent Events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Asana Webhooks Guide](https://developers.asana.com/docs/webhooks-guide)
- [EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)

## 💡 Use Cases

1. **Real-time monitoring** - Watch Asana changes live
2. **Debugging** - See webhook payloads instantly
3. **Team dashboards** - Display recent activity
4. **Event logging** - Track all changes with timestamps
5. **Integration testing** - Verify webhooks working correctly

## 🎉 Summary

This SSE-enabled receiver provides:
- ✅ Real-time event streaming
- ✅ Beautiful visual dashboard
- ✅ Multiple client support
- ✅ Event history
- ✅ Auto-reconnection
- ✅ Easy integration with any client

Perfect for development, testing, and production monitoring of Asana webhooks!

