# 🚀 Quick Start - New Dashboard Features

## Overview

Dashboard mới có **3 tabs** với filtering, pagination và statistics.

## 📡 Tab 1: Real-time Events (In-Memory)

**Tự động hiển thị:**
- 50 events gần nhất (in-memory)
- Auto-update khi có event mới từ Asana
- SSE (Server-Sent Events) connection

**Features:**
- Clear history button
- Expand JSON payload
- Real-time animation khi event mới đến

---

## 💾 Tab 2: Database History (PostgreSQL)

**Xem tất cả events từ database:**

### Filters:
```
Resource Type: All | Task | Project | Story | Tag | Workspace
Action:        All | Added | Changed | Removed | Deleted
Resource GID:  [Text search - partial match]
Page Size:     20 | 50 | 100 | 200
```

### Pagination:
```
← Previous    [Showing 1-50 of 1234 events]    Next →
```

### Performance:
- ✅ Server-side pagination (LIMIT/OFFSET)
- ✅ Indexed queries (received_at DESC)
- ✅ Total count display
- ✅ Fast filtering

### Event Details:
```
✏️ changed - ✅ task ✅

ID:               1234
Resource GID:     1208471947194044
Resource Name:    My Task Name
User:             John Doe
Created:          11/8/2025, 10:30:00 AM
Received:         11/8/2025, 10:30:05 AM
Verified:         ✅ Yes

🔍 Show raw JSON
```

---

## 📊 Tab 3: Statistics

### Overview Cards:
```
┌─────────────────┐  ┌─────────────────┐
│ Total Events    │  │ Events (24h)    │
│      1,234      │  │       45        │
└─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐
│ Active Webhooks │  │ Verified Events │
│        3        │  │     1,200       │
└─────────────────┘  └─────────────────┘
```

### Registered Webhooks List:
```
🟢 project
Webhook GID:   1234567890
Resource GID:  9876543210
Target URL:    https://abc123.ngrok.io/webhook
Event Count:   156
Last Event:    11/8/2025, 10:30:00 AM
Active:        ✅ Yes
```

---

## 🔗 URL Management

### Automatic URL Detection:
Dashboard tự động lấy URL từ browser (không cần config):

```javascript
Webhook Endpoint: https://abc123.ngrok.io/webhook    📋 Copy
Dashboard URL:    https://abc123.ngrok.io            📋 Copy
```

**Lợi ích:**
- ✅ Hoạt động với ngrok, localhost, production
- ✅ Không cần update PUBLIC_URL
- ✅ Luôn chính xác với URL thực tế

---

## 🎯 Common Usage

### 1. Monitor Real-time Events
```
1. Open dashboard: https://your-url/
2. Default tab: Real-time Events
3. Watch events arrive automatically
```

### 2. Search Historical Events
```
1. Click "💾 Database History" tab
2. Select filters:
   - Resource Type: task
   - Action: changed
3. Events are filtered automatically
4. Navigate pages: ← Previous | Next →
```

### 3. Check Statistics
```
1. Click "📊 Statistics" tab
2. View overview cards
3. Review webhook list
4. Click "🔄 Refresh" to update
```

### 4. Export Event Details
```
1. Go to any event
2. Click "🔍 Show raw JSON"
3. Copy JSON payload
4. Use for debugging/analysis
```

---

## 🔧 Configuration

### Database Connection (`.env`):
```env
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_NAME=asana_receiver
DATABASE_USER=asana_admin
DATABASE_PASSWORD=asana_secure_pass_2024

DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

### Server Config:
```env
PORT=3500
PUBLIC_URL=https://your-ngrok-url.ngrok.io
ASANA_WEBHOOK_SECRET=<auto-saved-during-handshake>
```

---

## 📊 API Endpoints

### Get Database Events
```bash
GET /api/events/database?limit=50&offset=0&resource_type=task&action=changed

Response:
{
  "success": true,
  "events": [...],
  "count": 50,
  "total": 1234,
  "hasMore": true
}
```

### Get Statistics
```bash
GET /api/database/stats

Response:
{
  "success": true,
  "stats": {
    "total_events": 1234,
    "events_24h": 45,
    "active_webhooks": 3,
    "verified_events": 1200
  }
}
```

### Get Webhooks
```bash
GET /api/webhooks

Response:
{
  "success": true,
  "webhooks": [...],
  "count": 3
}
```

---

## 🐛 Troubleshooting

### No events in Database History tab?
```bash
# Check database connection
curl http://localhost:3500/api/database/test

# Check event count
curl http://localhost:3500/api/database/stats
```

### Tab not loading?
```bash
# Check browser console for errors
# Open DevTools (F12)
# Look for JavaScript errors or failed API calls
```

### Pagination not working?
```bash
# Verify API response
curl "http://localhost:3500/api/events/database?limit=50&offset=0"

# Check total count is being returned
```

---

## 💡 Tips

### Performance Tips:
1. Use smaller page sizes (20-50) for faster loading
2. Apply filters to reduce result set
3. Database has indexes on received_at for fast sorting

### Filtering Tips:
1. Resource Type + Action filters work together
2. Resource GID search is case-sensitive partial match
3. Filters are applied server-side for efficiency

### Navigation Tips:
1. Tab state is not saved (resets on refresh)
2. Use browser back/forward safely
3. Click "🔄 Refresh" to reload current tab data

---

## 🎉 Success!

You now have a powerful dashboard to:
- ✅ Monitor events in real-time
- ✅ Search historical events with filters
- ✅ View statistics and webhooks
- ✅ Export event data for analysis

**Next Steps:**
1. Register webhook with Asana
2. Trigger some events
3. Watch them appear in Real-time tab
4. Check Database History for persistence
5. Monitor Statistics for overview

Happy monitoring! 🚀

