# Asana Webhook Receiver

Backend đơn giản để nhận và xử lý webhooks từ Asana.

## 🎯 Chức năng

- ✅ Xử lý handshake từ Asana khi đăng ký webhook
- ✅ Xác thực chữ ký webhook (signature verification)
- ✅ Nhận và log các events từ Asana
- ✅ Health check endpoint
- ✅ Cấu trúc đơn giản, dễ mở rộng

## 🚀 Cài đặt và Chạy

### 1. Cài đặt dependencies

```bash
cd asana_receiver
npm install
```

### 2. Cấu hình

Tạo file `.env` từ template:

```bash
cp env.example .env
```

Chỉnh sửa `.env`:

```env
PORT=3000
PUBLIC_URL=https://abc123def456.ngrok.io
ASANA_WEBHOOK_SECRET=your-webhook-secret-here
```

**Biến môi trường quan trọng:**

- **`PORT`**: Cổng local cho server (mặc định: 3000)
- **`PUBLIC_URL`**: 🔴 **BẮT BUỘC** - URL công khai HTTPS để Asana có thể gọi đến server của bạn
  - Development: URL ngrok (ví dụ: `https://abc123def456.ngrok.io`)
  - Production: URL đã deploy (ví dụ: `https://your-app.herokuapp.com`)
- **`ASANA_WEBHOOK_SECRET`**: Secret để xác thực chữ ký webhook (Asana cung cấp khi handshake)

### 3. Chạy server

```bash
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

## 📡 Endpoints

### `GET /`
Health check - kiểm tra server đang hoạt động

**Response:**
```json
{
  "status": "running",
  "message": "Asana Webhook Receiver is active",
  "timestamp": "2025-11-05T10:30:00.000Z"
}
```

### `POST /webhook`
Endpoint nhận webhooks từ Asana

**Chức năng:**
1. Xử lý handshake khi đăng ký webhook mới
2. Xác thực chữ ký (signature) của webhook events
3. Xử lý và log các events

## 🔗 Đăng ký Webhook với Asana

### Sử dụng API

```javascript
const axios = require('axios');

const response = await axios.post(
  'https://app.asana.com/api/1.0/webhooks',
  {
    resource: '1234567890123456',  // Task hoặc Project GID
    target: 'https://your-domain.com/webhook'
  },
  {
    headers: {
      'Authorization': 'Bearer YOUR_ASANA_PAT'
    }
  }
);

console.log('Webhook created:', response.data);
```

### Sử dụng curl

```bash
curl -X POST https://app.asana.com/api/1.0/webhooks \
  -H "Authorization: Bearer YOUR_ASANA_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "resource": "1234567890123456",
      "target": "https://your-domain.com/webhook"
    }
  }'
```

## 🔒 Bảo mật

### Handshake Process

Khi Asana tạo webhook, nó sẽ gửi một handshake request:

```
Header: X-Hook-Secret: random-secret-string
```

Server phải trả về cùng secret trong response header để xác nhận:

```
Response Header: X-Hook-Secret: random-secret-string
Response Status: 200
```

### Signature Verification

Mỗi webhook event được ký với HMAC-SHA256:

```javascript
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(rawBody)
  .digest('hex');
```

Server kiểm tra signature trong header `X-Hook-Signature`.

## 📝 Ví dụ Webhook Event

```json
{
  "events": [
    {
      "action": "changed",
      "created_at": "2025-11-05T10:30:00.000Z",
      "parent": null,
      "resource": {
        "gid": "1234567890123456",
        "resource_type": "task"
      },
      "type": "task",
      "user": {
        "gid": "9876543210987654",
        "resource_type": "user"
      }
    }
  ]
}
```

## 🛠️ Development

### Test local với ngrok

1. Cài ngrok: https://ngrok.com/
2. Chạy server local: `npm start`
3. Expose với ngrok:
   ```bash
   ngrok http 3000
   ```
4. Dùng URL ngrok để đăng ký webhook với Asana

### Xem logs

Server sẽ log tất cả requests đến console:

```
=== Incoming Webhook Request ===
Headers: { ... }
Body: { ... }
🤝 Handshake detected! Hook Secret: abc123...
✅ Handshake successful!
```

## 📦 Cấu trúc Project

```
asana_receiver/
├── server.js           # Main server file
├── package.json        # Dependencies
├── .env.example        # Environment variables template
├── .gitignore         # Git ignore rules
└── README.md          # Documentation
```

## 🔧 Tùy chỉnh

Để thêm business logic, chỉnh sửa phần xử lý events trong `server.js`:

```javascript
events.forEach((event, index) => {
  // TODO: Add your business logic here
  
  if (event.action === 'changed' && event.resource.resource_type === 'task') {
    // Xử lý khi task thay đổi
  }
  
  if (event.action === 'added') {
    // Xử lý khi có resource mới
  }
});
```

## 📚 Tài liệu tham khảo

- [Asana Webhooks Guide](https://developers.asana.com/docs/webhooks)
- [Asana API Reference](https://developers.asana.com/docs/asana)

## ⚠️ Lưu ý quan trọng

1. **Response time**: Asana yêu cầu server phải response trong vòng 10 giây
2. **HTTPS**: Production phải dùng HTTPS (dùng ngrok cho development)
3. **Secret**: Giữ `ASANA_WEBHOOK_SECRET` an toàn, không commit lên git
4. **Rate limit**: Mỗi resource có thể có tối đa 1 webhook đến cùng một target URL

## 🚀 Deploy lên Production

### Heroku

```bash
heroku create your-app-name
heroku config:set ASANA_WEBHOOK_SECRET=your-secret
git push heroku main
```

### Railway/Render/Vercel

Upload project và set environment variable `ASANA_WEBHOOK_SECRET`.

## 📞 Support

Nếu có vấn đề, kiểm tra:
1. Server có đang chạy không? (GET /)
2. URL có accessible từ internet không?
3. Webhook secret có đúng không?
4. Logs hiển thị gì?

