# Quick Reference - Asana Receiver

## 🚀 Start Server

```bash
# 1. Start database
docker-compose up -d

# 2. Start server
npm start

# 3. Expose with ngrok (dev only)
ngrok http 3000
```

## 📋 Register Webhook

```bash
curl -X POST https://app.asana.com/api/1.0/webhooks \
  -H "Authorization: Bearer YOUR_ASANA_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "resource": "PROJECT_OR_TASK_GID",
      "target": "https://your-url.ngrok.io/webhook"
    }
  }'
```

## 🔍 Monitor Events

### Web Dashboard
```
http://localhost:3000
```

### API Queries
```bash
# Recent events from database
curl http://localhost:3000/api/events/database?limit=10

# In-memory history
curl http://localhost:3000/api/events/history

# All webhooks
curl http://localhost:3000/api/webhooks

# Database stats
curl http://localhost:3000/api/database/stats

# Test DB connection
curl http://localhost:3000/api/database/test
```

### Direct SQL
```bash
docker exec -it asana_receiver_db psql -U asana_admin -d asana_receiver

# List webhooks
SELECT * FROM webhooks WHERE active = true;

# Recent events
SELECT * FROM webhook_events ORDER BY received_at DESC LIMIT 10;

# Event stats
SELECT action, resource_type, COUNT(*) 
FROM webhook_events 
WHERE received_at > NOW() - INTERVAL '24 hours'
GROUP BY action, resource_type;
```

## 🎯 Expected Logs

### Handshake
```
╔══════════════════════════════════════════════════════════════════╗
║  🤝 HANDSHAKE DETECTED!                                          ║
╚══════════════════════════════════════════════════════════════════╝
✅ Handshake successful!
💾 Secret saved to memory
💾 ✅ Webhook saved to PostgreSQL database
```

### Event
```
📨 Received 1 event(s)
🔍 SIGNATURE VERIFICATION DEBUG:
   ✅ Signature verified!
Event 1: { action: "changed", resource: "task", gid: "..." }
💾 Event 1 saved to database (ID: 42)
📡 Broadcasted to 2 client(s)
✅ Events processed successfully
```

## 🐛 Troubleshooting

### Database connection fails
```bash
# Check container
docker-compose ps

# Check logs
docker-compose logs postgres

# Restart
docker-compose restart postgres

# Test connection
curl http://localhost:3000/api/database/test
```

### Signature verification fails
```
❌ SIGNATURE MISMATCH!
```
**Solution:** Check webhook was properly registered (handshake completed)

### Events not appearing
1. Check server logs for errors
2. Check database connection: `curl http://localhost:3000/api/database/test`
3. Query database: `curl http://localhost:3000/api/events/database`

## 📁 Key Files

| File | Purpose |
|------|---------|
| `server.js` | Main server - webhook endpoints |
| `db.js` | Database module - all DB functions |
| `package.json` | Dependencies |
| `.env` | Configuration |
| `docker-compose.yml` | PostgreSQL setup |
| `init-db.sql` | Database schema |
| `test-handshake.js` | Test script |

## 📚 Full Documentation

- [README.md](./README.md) - Complete setup guide
- [WEBHOOK_FLOW_GUIDE.md](./WEBHOOK_FLOW_GUIDE.md) - Detailed flow trace
- [INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md) - Integration overview
- [CHANGELOG.md](./CHANGELOG.md) - Version history

## 🧪 Test

```bash
npm test
```

Expected:
```
✅ PASS: Handshake successful!
✅ PASS: Event verified and accepted!
✅ PASS: Invalid signature correctly rejected!
🎉 ALL CRITICAL TESTS PASSED!
```

## 🔐 Environment Variables

```env
# Server
PORT=3000
PUBLIC_URL=https://your-url.ngrok.io

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5435
DATABASE_NAME=asana_receiver
DATABASE_USER=asana_admin
DATABASE_PASSWORD=asana_secure_pass_2024

# Auto-filled during handshake
ASANA_WEBHOOK_SECRET=
```

## 💡 Tips

✅ **Always use ngrok/public URL** - localhost won't work with Asana
✅ **Check logs first** - Detailed trace helps debug issues
✅ **Test with npm test** - Verify flow before registering real webhook
✅ **Query database** - Events persist across restarts
✅ **Monitor SSE** - Real-time updates in dashboard

