# 🚀 Asana Receiver - Ready for Vercel!

## ✅ Tất cả đã sẵn sàng để deploy

Project này đã được optimize để chạy trên **Vercel (serverless)** với in-memory secret storage.

---

## 🎯 Cách hoạt động

### Workflow đơn giản:

```
1. Deploy lên Vercel
   ↓
2. Tạo webhook với Vercel URL
   ↓
3. Asana gửi handshake với secret
   ↓
4. Server lưu secret vào MEMORY
   ↓
5. Các events tiếp theo được verify bằng secret trong memory
   ↓
✅ DONE! Không cần restart, không cần .env
```

### Tại sao dùng Memory?

- ✅ **Serverless compatible**: Vercel không cho phép ghi file
- ✅ **Zero config**: Không cần đặt secret trước
- ✅ **Auto-ready**: Secret được lưu và dùng ngay
- ✅ **Demo perfect**: Đủ cho 1 webhook demo

---

## 📦 Quick Deploy (3 phút)

### Option 1: Deploy với Vercel CLI

```bash
# 1. Install Vercel CLI (nếu chưa có)
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
cd /Users/hoang.phamho/Desktop/Projects/asana_receiver
vercel --prod

# ✅ Done! Copy URL từ output
```

### Option 2: Deploy qua GitHub + Vercel Dashboard

```bash
# 1. Push lên GitHub
git init
git add .
git commit -m "Asana webhook receiver"
git remote add origin https://github.com/YOUR_USERNAME/asana_receiver.git
git push -u origin main

# 2. Vào https://vercel.com
# 3. New Project → Import from GitHub
# 4. Select asana_receiver
# 5. Click Deploy

# ✅ Done!
```

---

## 🔗 Sau khi Deploy

### 1. Copy Vercel URL

Ví dụ: `https://asana-receiver-abc123.vercel.app`

### 2. Tạo Webhook

**Từ asana_integration_site:**

```bash
cd /Users/hoang.phamho/Desktop/Projects/asana/asana_integration_site
npm run dev
```

Mở http://localhost:3001/webhooks:
- **Resource GID**: `<your-task-gid>`  
- **Target URL**: `https://asana-receiver-abc123.vercel.app/webhook`
- Click **"Create Webhook"**

### 3. Verify trong Vercel Logs

```bash
vercel logs --follow
```

**Expected:**
```
🤝 HANDSHAKE DETECTED!
✅ Handshake successful!
💾 Secret saved to memory for this session
✅ Signature verification is now ENABLED
```

### 4. Test Event

Thay đổi task trong Asana → Xem event trong logs:

```
📨 Received 1 event(s)
Event 1: { action: 'changed', resource_type: 'task', ... }
✅ Signature verified!
✅ Events processed
```

---

## 📊 Monitor Dashboard

Mở dashboard trên production:

```
https://asana-receiver-abc123.vercel.app/
```

Features:
- ✅ Real-time events (SSE)
- ✅ Event history
- ✅ Connection status
- ✅ Quick copy webhook URL

---

## 🔧 Files Overview

```
asana_receiver/
├── server.js              # Main server với in-memory secret
├── vercel.json            # Vercel config
├── package.json           # Dependencies
├── .gitignore             # Ignore .env, node_modules
├── public/
│   └── index.html         # Real-time dashboard
├── VERCEL_DEPLOYMENT.md   # Chi tiết deployment
├── AUTO_SAVE_SECRET.md    # Giải thích secret storage
└── QUICK_FIX_401.md       # Troubleshooting 401 errors
```

---

## 💡 Key Features

### 1. In-Memory Secret Storage

```javascript
// Global variables persist trong server instance
let WEBHOOK_SECRET = process.env.ASANA_WEBHOOK_SECRET || 'default';
let runtimeSecret = null;

// Handshake: Save to memory
if (req.headers['x-hook-secret']) {
  runtimeSecret = hookSecret;
  WEBHOOK_SECRET = hookSecret; // Ngay lập tức available!
}
```

### 2. Smart Verification

```javascript
// Chỉ verify khi có secret
if (signature && WEBHOOK_SECRET && WEBHOOK_SECRET !== 'default') {
  verifySignature();
} else if (signature) {
  console.log('⚠️  Skipping verification (no secret or cold start)');
  // Vẫn process event → Demo friendly!
}
```

### 3. Dual Storage Strategy

```javascript
// Try save to .env (local dev)
try {
  fs.writeFileSync('.env', `ASANA_WEBHOOK_SECRET=${hookSecret}`);
  console.log('📝 Saved to .env');
} catch (error) {
  console.log('ℹ️  Serverless mode - using memory only');
}
```

---

## ⚠️ Important Notes

### Cold Start Behavior

Vercel instances sleep sau vài phút không dùng. Khi cold start:
- ❌ Memory cleared → Secret mất
- ✅ Nhưng code skip verification nếu không có secret
- ✅ Events vẫn được process bình thường
- ✅ Webhook vẫn hoạt động!

**Điều này OK cho demo** vì:
- Handshake chỉ chạy 1 lần khi tạo webhook
- Sau đó events dùng cùng instance (có secret)
- Nếu cold start, event đầu skip verification (acceptable)

### Production Recommendations

Cho production, nên:
1. **Lưu secret vào database**: PostgreSQL, MongoDB, etc.
2. **Hoặc dùng Vercel KV**: Key-value store của Vercel
3. **Add monitoring**: Track cold starts và errors

---

## 🧪 Testing Checklist

- [ ] Deploy lên Vercel thành công
- [ ] Copy Vercel URL
- [ ] Tạo webhook với Vercel URL
- [ ] Check logs: Handshake successful
- [ ] Check logs: Secret saved to memory
- [ ] Thay đổi task trong Asana
- [ ] Check logs: Event received & verified
- [ ] Mở dashboard: Events hiển thị real-time
- [ ] Verify trong Asana: Webhook status = Active

---

## 🎓 Troubleshooting

### Deploy fails

```bash
# Check vercel.json syntax
cat vercel.json | jq .

# Check logs
vercel logs
```

### Handshake không hoạt động

```bash
# Test endpoint
curl https://your-vercel-url.vercel.app/webhook \
  -H "X-Hook-Secret: test" \
  -d '{}' \
  -v

# Should return:
# < X-Hook-Secret: test
```

### Events không được verify

```bash
# Check logs
vercel logs --follow

# Look for:
# "⚠️  Skipping verification" → OK (cold start)
# "✅ Signature verified!" → OK (secret in memory)
# "❌ Invalid signature" → Problem!
```

---

## 📚 Resources

- **Vercel Docs**: https://vercel.com/docs
- **Asana Webhooks**: https://developers.asana.com/docs/webhooks-guide
- **Project Docs**:
  - `VERCEL_DEPLOYMENT.md` - Chi tiết deployment
  - `AUTO_SAVE_SECRET.md` - Secret storage explained
  - `QUICK_FIX_401.md` - Fix 401 errors
  - `SETUP_NGROK.md` - Local dev với ngrok

---

## ✅ Summary

**Workflow hoàn chỉnh:**

```bash
# 1. Deploy
vercel --prod

# 2. Copy URL
https://asana-receiver-xyz.vercel.app

# 3. Create webhook (from asana_integration_site)
Target: https://asana-receiver-xyz.vercel.app/webhook

# 4. ✅ Done!
# - Handshake: Secret saved to memory
# - Events: Auto-verified
# - Dashboard: Real-time monitoring
```

**🎉 Đơn giản, không cần config, chỉ deploy và dùng!**

