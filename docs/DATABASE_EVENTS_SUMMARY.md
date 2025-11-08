# Database Events - Summary & Verification

## ✅ Xác nhận: Events ĐÃ được lưu vào Database

Sau khi kiểm tra mã nguồn `asana_receiver`, tôi xác nhận rằng:

### 1. Events ĐƯỢC LƯU vào PostgreSQL Database

**File: `server.js` (lines 476-506)**
```javascript
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
    }
  } catch (error) {
    console.error(`❌ Database error for event ${index + 1}:`, error.message);
  }
})();
```

### 2. Database Schema

**Table: `webhook_events`**
```sql
CREATE TABLE IF NOT EXISTS webhook_events (
    id SERIAL PRIMARY KEY,
    webhook_gid VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_gid VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    user_gid VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payload JSONB NOT NULL,
    signature_verified BOOLEAN DEFAULT false
);

-- Indexes for optimal performance
CREATE INDEX idx_events_webhook ON webhook_events(webhook_gid);
CREATE INDEX idx_events_resource ON webhook_events(resource_gid);
CREATE INDEX idx_events_created ON webhook_events(created_at DESC);
CREATE INDEX idx_events_received ON webhook_events(received_at DESC);  -- ⚡ For sorted queries
```

### 3. Performance Optimization

#### Indexes đã được tạo:
- ✅ `idx_events_received` - Index trên `received_at DESC` cho sorting hiệu quả
- ✅ `idx_events_resource` - Index trên `resource_gid` cho filtering
- ✅ `idx_events_webhook` - Index trên `webhook_gid`

#### Query được optimize:
```javascript
// db.js - getRecentEvents() với pagination và filters
SELECT * FROM webhook_events 
WHERE 1=1
  AND resource_type = $1  -- optional filter
  AND action = $2         -- optional filter
  AND resource_gid LIKE $3 -- optional filter
ORDER BY received_at DESC  -- Sử dụng index
LIMIT $4 OFFSET $5;
```

---

## 🎨 Cải tiến mới: Tab "Database History"

### Tính năng đã bổ sung:

#### 1. **Tab System** - 3 tabs:
   - 📡 **Real-time Events** - Events in-memory (50 gần nhất)
   - 💾 **Database History** - Tất cả events từ database
   - 📊 **Statistics** - Thống kê và webhooks

#### 2. **Database History Tab** - Features:

##### A. **Filtering (Client-side + Server-side)**
```javascript
- Resource Type: Task, Project, Story, Tag, Workspace
- Action: Added, Changed, Removed, Deleted
- Resource GID: Search by partial GID
```

##### B. **Pagination với Performance tối ưu**
```javascript
- Page sizes: 20, 50, 100, 200 per page
- Server-side pagination (LIMIT/OFFSET)
- Total count display
- Navigation: Previous/Next buttons
```

##### C. **Sorting**
```javascript
- Mặc định: received_at DESC (mới nhất → cũ nhất)
- Sử dụng index idx_events_received
```

##### D. **Event Display**
```javascript
- Event ID
- Resource GID & Name
- User information
- Created & Received timestamps
- Signature verification status (✅/⚠️)
- Full JSON payload (expandable)
```

#### 3. **Statistics Tab**

Hiển thị:
- Total Events (DB)
- Events (24h)
- Active Webhooks
- Verified Events
- List of registered webhooks with details

### API Endpoints đã nâng cấp:

#### **GET `/api/events/database`**
```javascript
Query Parameters:
  - limit: number (default: 50)
  - offset: number (default: 0)
  - resource_type: string (optional)
  - action: string (optional)
  - resource_gid: string (optional)

Response:
{
  success: true,
  events: [...],
  count: 50,
  total: 1234,
  limit: 50,
  offset: 0,
  hasMore: true
}
```

#### **GET `/api/database/stats`**
```javascript
Response:
{
  success: true,
  stats: {
    total_events: 1234,
    events_24h: 45,
    active_webhooks: 3,
    verified_events: 1200
  }
}
```

#### **GET `/api/webhooks`**
```javascript
Response:
{
  success: true,
  webhooks: [
    {
      webhook_gid: "...",
      resource_gid: "...",
      resource_type: "project",
      target_url: "...",
      event_count: 156,
      last_event_at: "2025-11-08T...",
      active: true
    }
  ]
}
```

---

## 🎯 Performance Best Practices

### 1. **Database Layer**
- ✅ Indexes trên các columns thường query
- ✅ JSONB type cho payload (flexible & searchable)
- ✅ Server-side pagination
- ✅ Query optimization với WHERE conditions

### 2. **Frontend Layer**
- ✅ Lazy loading (chỉ load khi switch tab)
- ✅ Client-side filtering bổ sung
- ✅ Pagination controls
- ✅ Debounce trên filter inputs (recommended to add)

### 3. **Server Layer**
- ✅ Non-blocking async saves
- ✅ Connection pooling (PostgreSQL)
- ✅ Proper error handling
- ✅ SSE for real-time updates

---

## 🔧 Cải tiến Dashboard URL

### Thay đổi từ Server-side sang Client-side

**Trước:**
```javascript
// Phải fetch từ server để lấy PUBLIC_URL
fetch('/api/info')
  .then(res => res.json())
  .then(data => {
    document.getElementById('webhookUrl').textContent = data.urls.webhook_endpoint;
  });
```

**Sau (✅ Better):**
```javascript
// Lấy trực tiếp từ browser's current URL - chính xác hơn!
const currentOrigin = window.location.origin;
const webhookUrl = currentOrigin + '/webhook';
const dashboardUrl = currentOrigin;

document.getElementById('webhookUrl').textContent = webhookUrl;
document.getElementById('dashboardUrl').textContent = dashboardUrl;
```

**Lý do tốt hơn:**
- ✅ Không cần network request
- ✅ Instant display (không có "Loading...")
- ✅ Luôn đúng với URL thực tế user đang truy cập
- ✅ Hoạt động tốt với ngrok, proxy, load balancer

---

## 📊 Usage Examples

### View Database Events:
1. Mở dashboard: `https://your-ngrok-url.ngrok.io`
2. Click tab "💾 Database History"
3. Chọn filters nếu cần
4. Navigate qua các pages
5. Click "🔍 Show raw JSON" để xem chi tiết

### Check Statistics:
1. Click tab "📊 Statistics"
2. Xem tổng quan events và webhooks
3. Click "🔄 Refresh" để update

### Real-time Monitoring:
1. Tab "📡 Real-time Events" (default)
2. Events tự động hiện khi nhận từ Asana
3. 50 events gần nhất in-memory

---

## 🚀 Testing

```bash
# Start server
cd asana_receiver
node server.js

# Access dashboard
open http://localhost:3500

# Or with ngrok
ngrok http 3500
# Then open: https://abc123.ngrok.io
```

### Verify Database Events:
```bash
# Connect to PostgreSQL
psql -h localhost -p 5433 -U asana_admin -d asana_receiver

# Check events
SELECT COUNT(*) FROM webhook_events;

# Recent events
SELECT id, action, resource_type, received_at 
FROM webhook_events 
ORDER BY received_at DESC 
LIMIT 10;
```

---

## ✨ Summary

### Câu trả lời cho câu hỏi ban đầu:

1. ✅ **Events ĐÃ được lưu vào database** - Mỗi event từ Asana đều được lưu vào `webhook_events` table
2. ✅ **Tab Database History đã được bổ sung** với:
   - Pagination (20/50/100/200 per page)
   - Filtering (resource type, action, GID)
   - Sorting (DESC by received_at - mới nhất trước)
   - Performance optimization với indexes
3. ✅ **Dashboard URL được lấy từ client-side** - chính xác hơn với ngrok/proxy

### Files đã được cập nhật:
- ✅ `public/index.html` - Added tabs, database viewer, pagination
- ✅ `server.js` - Enhanced API with filtering
- ✅ `db.js` - Added getTotalEventCount(), enhanced getRecentEvents()
- ✅ Database schema already optimal with indexes

Tất cả đã sẵn sàng để sử dụng! 🎉

