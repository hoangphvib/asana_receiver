# 🚀 Quick Reference - Asana Receiver v2.0

## Commands

```bash
# Start server
npm start

# Development mode with logging
npm run dev

# Production mode
npm run prod
```

## File Structure

```
src/
├── config/index.js              # Configuration
├── controllers/                 # Request handlers
│   ├── webhook.controller.js
│   └── enrichment.controller.js
├── services/                    # Business logic
│   ├── webhook.service.js
│   └── enrichment.service.js
├── routes/                      # API routes
│   ├── webhook.routes.js
│   ├── enrichment.routes.js
│   └── database.routes.js
├── middleware/                  # Express middleware
│   ├── error.middleware.js
│   └── logger.middleware.js
├── utils/                       # Utilities
│   └── sse.js
├── app.js                       # Express setup
└── server.js                    # Server startup
```

## API Endpoints

### Core
- `GET /` - Dashboard UI
- `GET /api/info` - Server information
- `POST /webhook` - Webhook endpoint

### Database
- `GET /api/database/test` - Test connection
- `GET /api/database/stats` - Statistics
- `GET /api/events/database` - Query events

### Enrichment
- `GET /api/dct/test` - Test DCT connection
- `GET /api/events/enriched` - Enriched events

### SSE
- `GET /events` - Server-Sent Events stream

## Environment Variables

```env
# Server
PORT=3500
NODE_ENV=development

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_NAME=asana_receiver

# DCT (enrichment)
DCT_DATABASE_HOST=localhost
DCT_DATABASE_PORT=5432
```

## Adding New Feature

### 1. Create Service
```javascript
// src/services/my-feature.service.js
class MyFeatureService {
  static async doSomething() {
    return { success: true };
  }
}
module.exports = MyFeatureService;
```

### 2. Create Controller
```javascript
// src/controllers/my-feature.controller.js
class MyFeatureController {
  static async handle(req, res) {
    const result = await MyFeatureService.doSomething();
    res.json(result);
  }
}
module.exports = MyFeatureController;
```

### 3. Create Route
```javascript
// src/routes/my-feature.routes.js
const router = require('express').Router();
const MyFeatureController = require('../controllers/my-feature.controller');

router.get('/api/my-feature', MyFeatureController.handle);

module.exports = router;
```

### 4. Register in App
```javascript
// src/app.js
const myFeatureRoutes = require('./routes/my-feature.routes');
app.use(myFeatureRoutes);
```

## Common Tasks

### Check Server Status
```bash
curl http://localhost:3500/api/info
```

### Test Database
```bash
curl http://localhost:3500/api/database/test
```

### Query Events
```bash
curl "http://localhost:3500/api/events/database?limit=10"
```

### Test Webhook
```bash
curl -X POST http://localhost:3500/webhook \
  -H "Content-Type: application/json" \
  -d '{"events": []}'
```

## Troubleshooting

### Server won't start
```bash
# Check port
lsof -ti:3500 | xargs kill

# Check database
docker-compose ps
```

### Database error
```bash
# Test connection
psql -h localhost -p 5433 -U asana_admin -d asana_receiver
```


## Documentation

- **ARCHITECTURE.md** - Detailed architecture
- **README.md** - Complete guide
- **env.example** - Configuration template

## Quick Tips

✅ Each file has ONE responsibility  
✅ Services contain business logic  
✅ Controllers handle HTTP  
✅ Routes map URLs  
✅ Config is centralized  
✅ Errors are handled globally  

---

**Version:** 2.0.0  
**Last Updated:** November 8, 2025

