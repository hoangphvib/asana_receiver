# 🚀 Quick Start - Asana Webhook Receiver

## Bước 1: Cài đặt (2 phút)

```bash
cd asana_receiver
npm install
```

## Bước 2: Chạy server local (1 phút)

```bash
npm start
```

✅ Server chạy tại: `http://localhost:3000`

## Bước 3: Expose ra Internet với ngrok (2 phút)

### Cài ngrok (nếu chưa có)
```bash
# Mac
brew install ngrok

# Hoặc download: https://ngrok.com/download
```

### Chạy ngrok
```bash
ngrok http 3000
```

Bạn sẽ thấy:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

📝 **Lưu lại URL này**: `https://abc123.ngrok.io`

## Bước 4: Đăng ký webhook với Asana (1 phút)

### Cách 1: Dùng script có sẵn

```bash
ASANA_PAT=your_token \
WEBHOOK_TARGET=https://abc123.ngrok.io/webhook \
RESOURCE_GID=your_task_or_project_gid \
node register-webhook.js
```

### Cách 2: Dùng curl

```bash
curl -X POST https://app.asana.com/api/1.0/webhooks \
  -H "Authorization: Bearer YOUR_ASANA_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "resource": "1234567890123456",
      "target": "https://abc123.ngrok.io/webhook"
    }
  }'
```

### Cách 3: Dùng code JavaScript

Tạo file `test.js`:

```javascript
const https = require('https');

const data = JSON.stringify({
  data: {
    resource: '1234567890123456',  // Task hoặc Project GID
    target: 'https://abc123.ngrok.io/webhook'
  }
});

const options = {
  hostname: 'app.asana.com',
  path: '/api/1.0/webhooks',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ASANA_PAT',
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(JSON.parse(body)));
});

req.write(data);
req.end();
```

Chạy: `node test.js`

## Bước 5: Test webhook (1 phút)

1. Mở Asana và thay đổi task/project mà bạn đã đăng ký webhook
2. Xem log trong terminal của server
3. Bạn sẽ thấy events được log ra!

```
=== Incoming Webhook Request ===
📨 Received 1 event(s)

Event 1: {
  action: 'changed',
  resource: 'task',
  gid: '1234567890123456',
  created_at: '2025-11-05T10:30:00.000Z'
}
✅ Events processed successfully
```

## 🎉 Xong! Bạn đã có webhook receiver hoạt động!

## 📋 Checklist

- [ ] Server chạy được (`npm start`)
- [ ] Ngrok expose được ra internet
- [ ] Webhook đăng ký thành công với Asana
- [ ] Handshake thành công (check server log)
- [ ] Test thay đổi task/project và thấy events

## ⚠️ Lưu ý

1. **Ngrok URL thay đổi mỗi lần restart** - Nếu restart ngrok, phải đăng ký webhook lại với URL mới
2. **Personal Access Token (PAT)** - Lấy tại: https://app.asana.com/0/my-apps
3. **Resource GID** - Mở task/project trong Asana, lấy số trong URL

## 🔍 Lấy Resource GID

### Từ Task
URL: `https://app.asana.com/0/123456789/987654321`
→ GID: `987654321` (số cuối cùng)

### Từ Project
URL: `https://app.asana.com/0/123456789/list`
→ GID: `123456789` (số giữa)

Hoặc dùng API:
```bash
curl https://app.asana.com/api/1.0/tasks/987654321 \
  -H "Authorization: Bearer YOUR_PAT"
```

## 🛠️ Troubleshooting

### Server không chạy được
```bash
# Check port đã được dùng chưa
lsof -i :3000

# Kill process nếu cần
kill -9 <PID>
```

### Webhook handshake fail
- Kiểm tra server có chạy không
- Kiểm tra ngrok URL có đúng không
- Kiểm tra firewall/antivirus

### Không nhận được events
- Kiểm tra webhook có active không (dùng `node register-webhook.js list`)
- Thử thay đổi task/project lại
- Check server logs

## 📚 Next Steps

1. **Thêm business logic** vào `server.js` (trong phần `events.forEach`)
2. **Lưu events vào database** (MongoDB, PostgreSQL, etc.)
3. **Deploy lên production** (Heroku, Railway, Render, etc.)
4. **Thêm xác thực** (API keys, OAuth, etc.)
5. **Thêm error handling** và retry logic

## 🚀 Deploy Production

### Heroku
```bash
heroku create
heroku config:set ASANA_WEBHOOK_SECRET=your-secret
git push heroku main
```

### Railway
1. Connect GitHub repo
2. Set environment variable
3. Deploy!

### Render
1. New Web Service
2. Connect repo
3. Set env vars
4. Deploy!

---

**Có vấn đề?** Kiểm tra logs và đọc README.md để biết thêm chi tiết!

