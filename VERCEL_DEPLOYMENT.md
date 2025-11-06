# Deploy Asana Receiver lên Vercel

## 🎯 Cách hoạt động

### In-Memory Secret Storage

Code đã được optimize cho Vercel (serverless):

```javascript
// Global variables - persist trong server instance
let WEBHOOK_SECRET = process.env.ASANA_WEBHOOK_SECRET || 'your-webhook-secret-here';
let runtimeSecret = null;

// Khi nhận handshake
if (req.headers['x-hook-secret']) {
  const hookSecret = req.headers['x-hook-secret'];
  
  // Lưu vào memory
  runtimeSecret = hookSecret;
  WEBHOOK_SECRET = hookSecret;
  
  // Các requests tiếp theo sẽ dùng secret này để verify
}
```

### Vercel Serverless: Cách hoạt động

1. **Handshake request** → Vercel khởi tạo server instance → Lưu secret vào memory
2. **Event requests tiếp theo** → Vercel **reuse** cùng instance → Secret vẫn còn trong memory
3. **Cold start** (sau vài phút không dùng) → Instance mới → Secret mất → Cần handshake lại

**Điều này OK cho demo** vì:
- ✅ Bạn chỉ có 1 webhook
- ✅ Handshake chỉ chạy 1 lần khi tạo webhook
- ✅ Sau đó events sẽ được verify bằng secret đã lưu
- ⚠️ Nếu Vercel cold start, event đầu tiên sẽ skip verification (acceptable cho demo)

## 📦 Deploy Steps

### Bước 1: Chuẩn bị Repository

```bash
cd /Users/hoang.phamho/Desktop/Projects/asana_receiver

# Init git nếu chưa có
git init

# Add .gitignore
cat > .gitignore << EOF
node_modules/
.env
*.log
.DS_Store
.vercel
EOF

# Commit
git add .
git commit -m "Initial commit: Asana webhook receiver"

# Push lên GitHub
gh repo create asana_receiver --public --source=. --remote=origin --push
# Hoặc dùng GitHub UI để tạo repo và push
```

### Bước 2: Deploy lên Vercel

**Option A: Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# ? Set up and deploy? Y
# ? Which scope? Your account
# ? Link to existing project? N
# ? What's your project's name? asana-receiver
# ? In which directory is your code located? ./
# ? Want to override the settings? N

# Deploy to production
vercel --prod
```

**Option B: Vercel Dashboard**

1. Vào https://vercel.com
2. Click "Add New" → "Project"
3. Import từ GitHub repository `asana_receiver`
4. Settings:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
   - **Install Command**: `npm install`
5. Click "Deploy"

### Bước 3: Configure Environment Variables (Optional)

Trong Vercel Dashboard → Project → Settings → Environment Variables:

```
PORT = 3000
PUBLIC_URL = https://your-project.vercel.app
```

**Lưu ý:** `ASANA_WEBHOOK_SECRET` KHÔNG CẦN đặt trước! Nó sẽ được lưu vào memory khi handshake.

### Bước 4: Tạo Webhook với Vercel URL

```bash
# URL của bạn trên Vercel
https://asana-receiver-abc123.vercel.app

# Webhook endpoint
https://asana-receiver-abc123.vercel.app/webhook
```

Dùng `asana_integration_site`:
1. Mở http://localhost:3001/webhooks
2. Resource GID: `<your-task-gid>`
3. Target URL: `https://asana-receiver-abc123.vercel.app/webhook`
4. Click "Create Webhook"

### Bước 5: Verify

**Check logs:**
```bash
vercel logs https://asana-receiver-abc123.vercel.app
```

**Expected output:**
```
╔══════════════════════════════════════════════════════════════════╗
║  🤝 HANDSHAKE DETECTED!                                          ║
╚══════════════════════════════════════════════════════════════════╝

✅ Handshake successful! Secret echoed back to Asana.
💾 Secret saved to memory for this session
✅ Signature verification is now ENABLED for subsequent events
ℹ️  Running on serverless (Vercel) - .env file not writable (this is OK)
   Secret is stored in memory and will be used for verification
```

**Test event:**
Thay đổi task trong Asana → Event sẽ được verify thành công!

## 🔧 vercel.json Configuration

Tạo file `vercel.json` để config:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "env": {
    "PORT": "3000"
  }
}
```

## ⚠️ Limitations & Workarounds

### 1. Cold Start → Secret mất

**Problem:** Vercel instance sleep sau vài phút không dùng → Memory cleared

**Workaround:**
```javascript
// Trong signature verification
if (signature && WEBHOOK_SECRET && WEBHOOK_SECRET !== 'your-webhook-secret-here') {
  // Verify
} else if (signature) {
  console.log('⚠️  Cold start - secret not in memory, skipping verification');
  // Still process event
}
```

**Better solution (production):**

Lưu secret vào database hoặc Vercel KV:

```javascript
// Using Vercel KV
import { kv } from '@vercel/kv';

// Save on handshake
await kv.set('asana_webhook_secret', hookSecret);

// Load on verification
const secret = await kv.get('asana_webhook_secret');
```

### 2. Multiple Webhooks

Nếu có nhiều webhooks:

```javascript
// Save với resource GID làm key
const webhookId = req.body.resource || 'default';
runtimeSecrets[webhookId] = hookSecret;

// Verify
const secret = runtimeSecrets[webhookId];
```

### 3. Persistent Storage

Cho production, dùng database:

```javascript
// MongoDB/PostgreSQL/etc.
await db.webhooks.updateOne(
  { resource_gid: resourceGid },
  { $set: { secret: hookSecret } },
  { upsert: true }
);
```

## 📊 Monitoring

### View Logs

```bash
# Real-time logs
vercel logs --follow

# Filter by function
vercel logs --follow server.js

# Last 100 logs
vercel logs -n 100
```

### Check Function Stats

Vercel Dashboard → Project → Functions → `server.js`:
- Invocations
- Duration
- Memory usage
- Errors

## 🎨 Dashboard URL

Dashboard cũng work trên Vercel:

```
https://asana-receiver-abc123.vercel.app/
```

Features:
- ✅ Real-time SSE events
- ✅ Event history
- ✅ Connection status
- ✅ Copy webhook URL

## 🔐 Security Notes

### 1. Environment Variables

Sensitive data nên đặt trong Vercel Environment Variables, không hard-code:

```javascript
// ❌ BAD
const API_KEY = 'hardcoded-key';

// ✅ GOOD
const API_KEY = process.env.API_KEY;
```

### 2. CORS

Code đã có CORS enabled cho SSE:

```javascript
res.header('Access-Control-Allow-Origin', '*');
```

Production nên restrict:

```javascript
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
res.header('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
```

### 3. Rate Limiting

Thêm rate limiting cho webhook endpoint:

```javascript
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100 // max 100 requests per minute
});

app.post('/webhook', webhookLimiter, (req, res) => {
  // Handle webhook
});
```

## 🧪 Testing on Vercel

### Test Handshake

```bash
curl -X POST https://asana-receiver-abc123.vercel.app/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hook-Secret: test-secret-123" \
  -d '{}' \
  -v

# Expected:
# < HTTP/1.1 200 OK
# < X-Hook-Secret: test-secret-123
```

### Test Event

```bash
# Compute signature
BODY='{"events":[]}'
SECRET='test-secret-123'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

curl -X POST https://asana-receiver-abc123.vercel.app/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hook-Signature: $SIGNATURE" \
  -d "$BODY"
```

## 📚 Useful Commands

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View domains
vercel domains ls

# View deployments
vercel ls

# View logs
vercel logs

# Remove project
vercel remove asana-receiver
```

## 🎯 Summary

### ✅ What Works on Vercel:

- ✅ Webhook handshake
- ✅ Event reception
- ✅ In-memory secret storage
- ✅ Signature verification (same instance)
- ✅ SSE real-time events
- ✅ Dashboard

### ⚠️ Limitations:

- ⚠️ Secret mất sau cold start (acceptable cho demo)
- ⚠️ Không thể ghi file `.env`
- ⚠️ SSE connections có thể drop (Vercel timeout)

### 💡 For Production:

- Use Vercel KV hoặc database để lưu secret
- Implement reconnection logic cho SSE
- Add rate limiting
- Add monitoring/alerts

---

**🚀 Deploy ngay và test webhook của bạn trên production!**

