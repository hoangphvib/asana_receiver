# Changelog: PUBLIC_URL Configuration

## 📅 Ngày: 2025-11-05

## 🎯 Mục đích

Cập nhật `asana_receiver` để hỗ trợ biến môi trường `PUBLIC_URL`, giúp người dùng dễ dàng copy URL webhook endpoint để đăng ký với Asana.

---

## ✨ Các thay đổi chính

### 1. **Environment Variable: `PUBLIC_URL`**

**File:** `env.example`

- Thêm biến `PUBLIC_URL` với các ví dụ thực tế (ngrok, Heroku, Railway, Render)
- Cung cấp hướng dẫn chi tiết cho từng môi trường (dev/production)
- Bao gồm "Quick Reference" section để dễ dàng copy các URL cần thiết

**Sử dụng:**

```env
# Development với ngrok
PUBLIC_URL=https://abc123def456.ngrok.io

# Production với Heroku
PUBLIC_URL=https://your-app-name.herokuapp.com

# Production với custom domain
PUBLIC_URL=https://asana-webhook.yourdomain.com
```

### 2. **Server Startup Message**

**File:** `server.js`

**Trước:**
```
║   Webhook URL: http://localhost:3000/webhook
```

**Sau:**
```
╟───────────────────────────────────────────────────────────────────────╢
║  📋 COPY THESE URLs:                                                  ║
╟───────────────────────────────────────────────────────────────────────╢
║  🔗 Webhook Endpoint (for Asana):                                     ║
║     https://abc123def456.ngrok.io/webhook                              ║
║                                                                       ║
║  🖥️  Dashboard (view events):                                         ║
║     https://abc123def456.ngrok.io                                      ║
║                                                                       ║
║  📡 SSE Stream (for integrations):                                    ║
║     https://abc123def456.ngrok.io/events                               ║
╟───────────────────────────────────────────────────────────────────────╢
```

**Tính năng bổ sung:**
- Hiển thị cả Local Server URL và Public URL
- Tự động phát hiện nếu dùng localhost và cảnh báo
- Đưa ra gợi ý sử dụng ngrok hoặc deploy lên cloud
- Hiển thí ví dụ cụ thể về cách đăng ký webhook với Asana

### 3. **API Endpoint: `/api/info`**

**File:** `server.js`

Endpoint mới trả về tất cả thông tin cần thiết để sử dụng webhook:

**Request:**
```bash
GET http://localhost:3000/api/info
```

**Response:**
```json
{
  "status": "running",
  "message": "Asana Webhook Receiver is active",
  "connectedClients": 0,
  "eventsInHistory": 0,
  "timestamp": "2025-11-05T14:38:29.395Z",
  "urls": {
    "public_url": "https://abc123def456.ngrok.io",
    "webhook_endpoint": "https://abc123def456.ngrok.io/webhook",
    "dashboard": "https://abc123def456.ngrok.io",
    "sse_stream": "https://abc123def456.ngrok.io/events",
    "event_history": "https://abc123def456.ngrok.io/api/events/history"
  },
  "instructions": {
    "register_webhook": "Use this URL when creating webhook in Asana: https://abc123def456.ngrok.io/webhook",
    "view_dashboard": "Open in browser: https://abc123def456.ngrok.io",
    "connect_sse": "Connect EventSource to: https://abc123def456.ngrok.io/events"
  }
}
```

### 4. **Dashboard URL Display**

**File:** `public/index.html`

Thêm section "🔗 Quick Copy URLs" ngay trên dashboard:

- Hiển thị Webhook Endpoint URL
- Hiển thị Dashboard URL
- Nút "📋 Copy" cho mỗi URL
- Tự động fetch từ `/api/info` để hiển thị đúng PUBLIC_URL
- Feedback "✅ Copied!" khi copy thành công

**Giao diện:**
```
🔗 Quick Copy URLs:

Webhook Endpoint: https://abc123def456.ngrok.io/webhook  [📋 Copy]
Dashboard URL:    https://abc123def456.ngrok.io          [📋 Copy]
```

### 5. **Documentation Updates**

#### a) **README.md**

- Cập nhật section "Cấu hình" với `PUBLIC_URL`
- Thêm giải thích chi tiết về từng biến môi trường
- Đánh dấu `PUBLIC_URL` là **BẮT BUỘC** với emoji 🔴

#### b) **SETUP_NGROK.md** (Mới)

Hướng dẫn setup chi tiết từ A-Z:

1. **Quick Start (5 minutes)**
   - Install dependencies
   - Start server
   - Expose with ngrok
   - Update PUBLIC_URL
   - Open dashboard
   - Register webhook

2. **Common Workflows**
   - Daily development routine
   - Handling ngrok URL changes

3. **Troubleshooting**
   - Handshake not received
   - Invalid signature
   - No events appearing
   - ngrok tunnel not found

4. **Pro Tips**
   - ngrok web interface
   - Manual handshake testing
   - SSE connection monitoring

---

## 📋 Cách sử dụng

### Development với ngrok:

1. **Terminal 1: Start server**
   ```bash
   cd asana_receiver
   npm start
   ```

2. **Terminal 2: Start ngrok**
   ```bash
   ngrok http 3000
   ```

3. **Copy ngrok URL và update .env**
   ```env
   PUBLIC_URL=https://abc123def456.ngrok.io
   ```

4. **Restart server** (Terminal 1: Ctrl+C, then `npm start`)

5. **Open dashboard**
   - Local: http://localhost:3000
   - Public: https://abc123def456.ngrok.io

6. **Copy webhook URL từ dashboard và đăng ký với Asana**

### Production deployment:

1. **Set environment variable**
   ```bash
   # Heroku
   heroku config:set PUBLIC_URL=https://your-app.herokuapp.com
   
   # Railway
   railway variables set PUBLIC_URL=https://your-app.up.railway.app
   
   # Docker
   docker run -e PUBLIC_URL=https://your-domain.com asana-receiver
   ```

2. **Deploy và mở dashboard**

3. **Copy webhook URL từ dashboard**

---

## 🎨 UI/UX Improvements

### Dashboard URLs Section

**Before:** Không có cách nào để biết URL công khai của server

**After:**
- Hiển thị rõ ràng webhook endpoint và dashboard URL
- Nút copy 1-click
- Feedback trực quan khi copy thành công
- Tự động cập nhật từ server configuration

### Server Startup Message

**Before:**
```
Webhook URL: http://localhost:3000/webhook
```
❌ URL localhost không dùng được với Asana

**After:**
```
║  🔗 Webhook Endpoint (for Asana):                                     ║
║     https://abc123def456.ngrok.io/webhook                              ║
```
✅ URL công khai HTTPS sẵn sàng để copy

### Warning for localhost

Khi `PUBLIC_URL` chứa "localhost", server sẽ hiển thị cảnh báo:

```
║  ⚠️  WARNING: Using localhost URL                                     ║
║     This will NOT work with Asana webhooks!                           ║
║     Use ngrok or deploy to make it publicly accessible:               ║
║                                                                       ║
║     Option 1 - ngrok (recommended for dev):                           ║
║       $ ngrok http 3000                                                 ║
║       Then update PUBLIC_URL in .env with ngrok URL                   ║
```

---

## 🧪 Testing

### Test 1: Server với PUBLIC_URL

```bash
cd asana_receiver
PUBLIC_URL=https://abc123def456.ngrok.io node server.js
```

**Expected:**
- Startup message hiển thị `https://abc123def456.ngrok.io`
- Không có warning về localhost

### Test 2: Server không có PUBLIC_URL (fallback)

```bash
cd asana_receiver
node server.js
```

**Expected:**
- Startup message hiển thị `http://localhost:3000`
- Có warning về localhost

### Test 3: `/api/info` endpoint

```bash
curl http://localhost:3000/api/info | jq '.urls'
```

**Expected:**
```json
{
  "public_url": "https://abc123def456.ngrok.io",
  "webhook_endpoint": "https://abc123def456.ngrok.io/webhook",
  "dashboard": "https://abc123def456.ngrok.io",
  "sse_stream": "https://abc123def456.ngrok.io/events",
  "event_history": "https://abc123def456.ngrok.io/api/events/history"
}
```

### Test 4: Dashboard URL display

1. Open http://localhost:3000
2. Kiểm tra "🔗 Quick Copy URLs" section
3. Click nút "📋 Copy"
4. Paste vào text editor

**Expected:**
- URL hiển thị đúng là PUBLIC_URL
- Copy thành công
- Nút hiển thị "✅ Copied!" trong 2 giây

---

## 📝 Files Changed

| File | Changes | Lines Changed |
|------|---------|---------------|
| `env.example` | Thêm PUBLIC_URL với documentation chi tiết | +42 |
| `server.js` | Thêm PUBLIC_URL support, /api/info endpoint, cải thiện startup message | +85 |
| `public/index.html` | Thêm Quick Copy URLs section | +40 |
| `README.md` | Cập nhật documentation | +9 |
| `SETUP_NGROK.md` | Hướng dẫn setup hoàn chỉnh (new file) | +350 |
| `CHANGELOG_PUBLIC_URL.md` | Changelog này (new file) | +300 |

**Total:** ~826 lines changed/added

---

## 🚀 Benefits

### For Developers:

1. **Không cần nhớ/gõ URL thủ công**: Copy 1-click từ dashboard
2. **Rõ ràng hơn về môi trường**: Startup message hiển thị cả local và public URL
3. **Dễ debug**: `/api/info` endpoint cung cấp tất cả URLs và instructions
4. **Cảnh báo sớm**: Warning ngay khi dùng localhost URL

### For Production:

1. **Environment-aware**: Tự động adapt với môi trường deploy
2. **Clear documentation**: Ví dụ cụ thể cho từng platform (Heroku, Railway, etc.)
3. **API for integrations**: `/api/info` có thể được gọi bởi scripts/tools khác

### For Testing:

1. **Faster webhook registration**: Copy URL chính xác từ dashboard
2. **Verification**: Xác nhận server đang dùng đúng PUBLIC_URL
3. **Troubleshooting**: Dễ dàng kiểm tra configuration

---

## 🔄 Migration Guide

### From old version (without PUBLIC_URL):

**Before:**
```bash
# .env (old)
PORT=3000
ASANA_WEBHOOK_SECRET=xxx
```

**After:**
```bash
# .env (new)
PORT=3000
PUBLIC_URL=https://your-ngrok-url.ngrok.io
ASANA_WEBHOOK_SECRET=xxx
```

**Steps:**

1. Copy `env.example` để xem full documentation
2. Thêm `PUBLIC_URL` vào `.env`
3. Restart server
4. Verify startup message hiển thị PUBLIC_URL
5. Open dashboard và xác nhận URLs hiển thị đúng

### Backward compatibility:

✅ Server vẫn chạy nếu không có `PUBLIC_URL` (fallback to `http://localhost:PORT`)

❌ Warning sẽ hiển thị để nhắc nhở thêm PUBLIC_URL

---

## 💡 Future Enhancements

Các tính năng có thể thêm trong tương lai:

1. **Auto-detect ngrok URL**: Tự động detect và suggest ngrok URL nếu ngrok đang chạy
2. **QR Code for mobile**: Generate QR code để dễ dàng mở dashboard trên mobile
3. **Share dashboard link**: Nút "📧 Email Link" để gửi dashboard link
4. **Webhook registration from dashboard**: Form đăng ký webhook trực tiếp trên dashboard
5. **Public URL health check**: Tự động ping PUBLIC_URL để verify nó accessible

---

## 🎓 Lessons Learned

1. **Environment variables are key**: PUBLIC_URL là một best practice cho mọi webhook/callback service
2. **Documentation in code**: `env.example` với comments chi tiết giúp user không cần đọc docs
3. **Visual feedback matters**: Copy button với "✅ Copied!" feedback tạo UX tốt hơn nhiều
4. **Warnings save time**: Cảnh báo localhost sớm tránh được 10 phút debug

---

## ✅ Checklist

- [x] Thêm `PUBLIC_URL` vào `env.example`
- [x] Cập nhật `server.js` để sử dụng `PUBLIC_URL`
- [x] Thêm `/api/info` endpoint
- [x] Cải thiện startup message
- [x] Thêm Quick Copy URLs trong dashboard
- [x] Cập nhật `README.md`
- [x] Tạo `SETUP_NGROK.md`
- [x] Test với ngrok URL
- [x] Test với localhost (fallback)
- [x] Test `/api/info` endpoint
- [x] Test dashboard copy buttons

---

**🎉 All done! Giờ việc đăng ký webhook với Asana dễ dàng hơn nhiều!**

