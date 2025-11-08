# 🏗️ Architecture Documentation

## Overview

Asana Receiver v2.0 follows **Clean Architecture** principles with clear separation of concerns.

## Project Structure

```
asana_receiver/
├── src/                          # Source code
│   ├── config/                   # Configuration management
│   │   └── index.js              # Centralized config with validation
│   │
│   ├── controllers/              # HTTP request handlers
│   │   ├── webhook.controller.js        # Webhook endpoints
│   │   └── enrichment.controller.js     # DCT enrichment endpoints
│   │
│   ├── services/                 # Business logic
│   │   ├── webhook.service.js           # Webhook processing logic
│   │   └── enrichment.service.js        # DCT enrichment logic
│   │
│   ├── routes/                   # Route definitions
│   │   ├── webhook.routes.js            # Webhook routes
│   │   ├── enrichment.routes.js         # Enrichment routes
│   │   └── database.routes.js           # Database routes
│   │
│   ├── middleware/               # Express middleware
│   │   ├── error.middleware.js          # Error handling
│   │   └── logger.middleware.js         # Request logging
│   │
│   ├── utils/                    # Utilities
│   │   └── sse.js                       # SSE manager
│   │
│   ├── app.js                    # Express app setup
│   └── server.js                 # Server startup & lifecycle
│
├── db.js                         # Database client (Main DB)
├── dct-client.js                 # DCT database client
├── public/                       # Static files
│   └── index.html                # Dashboard UI
├── database/                     # Database setup
│   ├── docker-compose.yml
│   └── init-db.sql
├── .env                          # Environment variables
└── package.json                  # Dependencies

```

## Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    HTTP Request                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  ROUTES LAYER                           │
│  • Define endpoints                                     │
│  • Parameter validation                                 │
│  • Route to controllers                                 │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│               CONTROLLERS LAYER                         │
│  • Handle HTTP requests/responses                       │
│  • Parse request data                                   │
│  • Call services                                        │
│  • Format responses                                     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                SERVICES LAYER                           │
│  • Business logic                                       │
│  • Validation                                           │
│  • Orchestration                                        │
│  • Call database/external services                      │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
┌────────▼─────────┐   ┌────────▼─────────┐
│   DATABASE       │   │   DCT CLIENT     │
│   (db.js)        │   │   (dct-client.js)│
│                  │   │                  │
│  • Queries       │   │  • Enrichment    │
│  • Transactions  │   │  • Mapping       │
└──────────────────┘   └──────────────────┘
```

## Module Descriptions

### 1. Config (`src/config/`)

**Purpose:** Centralized configuration management

**Features:**
- Environment variable loading
- Configuration validation
- Type conversion
- Default values
- Feature flags

**Example:**
```javascript
const config = require('./config');

console.log(config.server.port);        // 3500
console.log(config.database.host);      // localhost
console.log(config.features.dctEnrichment); // true
```

### 2. Controllers (`src/controllers/`)

**Purpose:** Handle HTTP requests and responses

**Responsibilities:**
- Parse request parameters
- Validate input
- Call appropriate services
- Format responses
- Handle errors

**Example:**
```javascript
// webhook.controller.js
class WebhookController {
  static async handleWebhook(req, res, eventHistory, broadcastFn) {
    // 1. Parse request
    // 2. Call service
    // 3. Format response
  }
}
```

### 3. Services (`src/services/`)

**Purpose:** Business logic implementation

**Responsibilities:**
- Core business logic
- Data validation
- Orchestrate multiple operations
- Call database/external services
- Return structured results

**Example:**
```javascript
// webhook.service.js
class WebhookService {
  static async processEvents(events, signatureVerified) {
    // Business logic here
    return { success: true, processed: [...] };
  }
}
```

### 4. Routes (`src/routes/`)

**Purpose:** Define API endpoints

**Responsibilities:**
- Map URLs to controllers
- Define HTTP methods
- Apply middleware
- Route organization

**Example:**
```javascript
// webhook.routes.js
router.post('/webhook', WebhookController.handleWebhook);
router.get('/api/events/history', WebhookController.getHistory);
```

### 5. Middleware (`src/middleware/`)

**Purpose:** Request/response processing pipeline

**Types:**

**Error Middleware:**
- 404 handler
- Global error handler
- Async error wrapper

**Logger Middleware:**
- Request logging
- Response logging
- Performance tracking

**Example:**
```javascript
// error.middleware.js
function errorHandler(err, req, res, next) {
  res.status(500).json({
    success: false,
    error: err.message
  });
}
```

### 6. Utils (`src/utils/`)

**Purpose:** Reusable utilities

**SSE Manager:**
- Client management
- Broadcasting
- Heartbeat
- Connection handling

**Example:**
```javascript
const SSEManager = require('./utils/sse');
const sseManager = new SSEManager();
sseManager.broadcast({ type: 'event', data: {...} });
```

### 7. Database Clients

**db.js (Main Database):**
- Webhook management
- Event storage
- Statistics
- Connection pooling

**dct-client.js (DCT Database):**
- Event enrichment
- Entity mapping
- Customer data
- Project data

## Request Flow

### Example: Webhook Received

```
1. HTTP POST /webhook
   │
2. ├─> Middleware: logger.middleware.js
   │    └─> Log request
   │
3. ├─> Middleware: express.json()
   │    └─> Parse body + raw body
   │
4. ├─> Routes: webhook.routes.js
   │    └─> Match /webhook route
   │
5. ├─> Controller: webhook.controller.js
   │    ├─> Parse headers
   │    ├─> Check for handshake
   │    └─> Call service
   │
6. ├─> Service: webhook.service.js
   │    ├─> Verify signature
   │    ├─> Process events
   │    ├─> Save to database
   │    └─> Return result
   │
7. ├─> Database: db.js
   │    ├─> saveEvent()
   │    └─> updateWebhookStats()
   │
8. ├─> Utils: sse.js
   │    └─> Broadcast to clients
   │
9. └─> Response: JSON
       { received: true, processed: 5 }
```

## Configuration Management

### Environment Variables

```env
# Server
PORT=3500
PUBLIC_URL=http://localhost:3500
NODE_ENV=development

# Main Database
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_NAME=asana_receiver
DATABASE_USER=asana_admin
DATABASE_PASSWORD=***

# DCT Database
DCT_DATABASE_HOST=localhost
DCT_DATABASE_PORT=5432
DCT_DATABASE_NAME=asana_dct

# Features
ENABLE_DCT_ENRICHMENT=true
```

### Config Loading

```javascript
// src/config/index.js
const config = {
  server: {
    port: parseInt(process.env.PORT) || 3500,
    // ...
  },
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    // ...
  }
};

// Validate required config
validateConfig();

module.exports = config;
```

## Error Handling

### Strategy

1. **Try-Catch in Services**: Catch domain errors
2. **Async Handler**: Wrap async route handlers
3. **Global Error Handler**: Catch all uncaught errors
4. **404 Handler**: Handle unknown routes

### Example

```javascript
// Service
async function processEvents() {
  try {
    // Business logic
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Controller
async function handleWebhook(req, res) {
  const result = await WebhookService.processEvents();
  if (!result.success) {
    return res.status(500).json(result);
  }
  res.json(result);
}

// Global handler
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});
```


## Deployment

### Development

```bash
npm run dev
```

### Production

```bash
NODE_ENV=production npm start
```

### Docker (Planned)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3500
CMD ["npm", "start"]
```

## Performance Optimizations

1. **Connection Pooling**: Reuse database connections
2. **Async Processing**: Non-blocking event processing
3. **SSE Heartbeat**: Keep connections alive efficiently
4. **Indexed Queries**: Fast database lookups
5. **Lazy Loading**: Load data only when needed

## Security

1. **Signature Verification**: Validate webhook authenticity
2. **Environment Variables**: Sensitive data not in code
3. **SQL Parameterization**: Prevent SQL injection
4. **Error Messages**: Don't expose internal details in production
5. **CORS**: Controlled cross-origin access

## Monitoring

### Logs

```javascript
// Request logging
→ POST /webhook
✅ POST /webhook - 200 (45ms)

// Event logging
📨 Received 5 event(s)
✅ Events processed

// SSE logging
✅ SSE Client connected (ID: 123). Total: 3
📡 Broadcasted to 3 client(s): webhook_event
```

### Metrics (Future)

- Request count by endpoint
- Response times
- Error rates
- Database query performance
- SSE client count


## Best Practices Applied

1. ✅ **Single Responsibility**: Each module has one job
2. ✅ **Dependency Injection**: Pass dependencies explicitly
3. ✅ **Configuration Management**: Centralized config
4. ✅ **Error Handling**: Consistent error patterns
5. ✅ **Logging**: Structured logging
6. ✅ **Graceful Shutdown**: Clean resource cleanup
7. ✅ **Code Organization**: Clear folder structure
8. ✅ **Documentation**: Inline and external docs

## Future Enhancements

- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Add metrics/monitoring
- [ ] Add rate limiting
- [ ] Add request validation (Joi/Yup)
- [ ] Add caching layer (Redis)
- [ ] Add queue system (Bull/RabbitMQ)
- [ ] Docker containerization
- [ ] CI/CD pipeline

---

**Version:** 2.0.0  
**Last Updated:** November 8, 2025  
**Status:** ✅ Production Ready

