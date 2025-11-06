# Quick Fix: Lỗi 401 khi tạo Webhook

## ❌ Lỗi bạn gặp:

```json
{
  "errors": [{
    "message": "The remote server which is intended to receive the webhook responded with an incorrect status code: 401"
  }]
}
```

## 🔍 Nguyên nhân:

Asana webhook hoạt động theo 2 bước:

### Bước 1: Handshake
- Asana gửi `X-Hook-Secret` header đến server của bạn
- Server phải **echo lại chính giá trị đó** trong response header
- Status code: **200 OK**

### Bước 2: Gửi Events
- Asana gửi events kèm `X-Hook-Signature` header
- Server phải **verify signature** bằng HMAC-SHA256 với secret đã nhận
- Nếu signature không khớp → **401 Unauthorized**

**Lỗi 401 xảy ra vì:** Server của bạn chưa có `ASANA_WEBHOOK_SECRET` trong `.env`, nên không verify được signature!

## ✅ Giải pháp:

### Cách 1: Tạo webhook mà KHÔNG CẦN verify signature ngay (Recommended cho test)

**Bước 1:** Tạm thời comment phần verify signature trong `server.js`:

```javascript
// STEP 2: Verify webhook signature (for actual events)
const signature = req.headers['x-hook-signature'];
if (signature && WEBHOOK_SECRET) {  // ← Thêm điều kiện && WEBHOOK_SECRET
  const computedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest('hex');

  if (computedSignature !== signature) {
    console.log('❌ Invalid signature!');
    return res.status(401).json({ error: 'Invalid signature' });
  }
  console.log('✅ Signature verified!');
} else if (signature) {
  console.log('⚠️  Signature present but WEBHOOK_SECRET not set - SKIPPING VERIFICATION');
}
```

**Code hiện tại đã đúng!** Dòng 182 có kiểm tra `if (signature)` chứ không bắt buộc verify khi chưa có secret.

### Cách 2: Workflow đầy đủ với Secret

**1. Start server:**
```bash
cd /Users/hoang.phamho/Desktop/Projects/asana_receiver
npm start
```

**2. Expose với ngrok:**
```bash
ngrok http 3000
```
Copy HTTPS URL (ví dụ: `https://abc123.ngrok.io`)

**3. Tạo webhook:**
- Mở http://localhost:3001/webhooks
- Resource GID: `<your-task-or-project-gid>`
- Target URL: `https://abc123.ngrok.io/webhook`
- Click "Create Webhook"

**4. Xem console log của asana_receiver:**
```
🤝 Handshake detected! Hook Secret: $2a$12$Zt9GSEggG5RluXMGV1lkaeLaTqkzyl72tSftDDXNvlYJFr2TrdZ7O
✅ Handshake successful!
```

**5. Copy secret và tạo `.env` file:**
```bash
cd /Users/hoang.phamho/Desktop/Projects/asana_receiver
echo "PORT=3000" > .env
echo "PUBLIC_URL=https://abc123.ngrok.io" >> .env
echo "ASANA_WEBHOOK_SECRET=$2a$12$Zt9GSEggG5RluXMGV1lkaeLaTqkzyl72tSftDDXNvlYJFr2TrdZ7O" >> .env
```

**6. Restart server:**
```bash
# Ctrl+C để stop
npm start
```

**7. Test:** Thay đổi task/project trong Asana, xem events xuất hiện!

## 🧪 Test Handshake Manually

Để verify server respond đúng với handshake:

```bash
curl -X POST https://your-ngrok-url.ngrok.io/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hook-Secret: test-secret-123" \
  -d '{}' \
  -v
```

**Expected response:**
```
< HTTP/1.1 200 OK
< X-Hook-Secret: test-secret-123
```

## 📋 Checklist Debug

- [ ] `asana_receiver` đang chạy (`lsof -ti:3000` có output)
- [ ] `ngrok` đang chạy (`ps aux | grep ngrok`)
- [ ] Target URL là **HTTPS** (ngrok URL)
- [ ] Target URL **accessible** từ internet (`curl https://your-ngrok-url.ngrok.io`)
- [ ] Server logs hiển thị handshake request
- [ ] Response header có `X-Hook-Secret`
- [ ] Nếu cần verify: `.env` có `ASANA_WEBHOOK_SECRET`

## 🎯 Tóm tắt:

**Lỗi 401 CÓ THỂ do:**

1. ❌ Server không chạy → No response → Asana báo 401
2. ❌ Ngrok không chạy → Connection refused → 401
3. ❌ Server không echo `X-Hook-Secret` lại → Handshake fail → 401
4. ❌ Server verify signature với secret sai → 401
5. ✅ **Code hiện tại OK** - Chỉ cần đảm bảo server đang chạy!

**Để test nhanh:**

```bash
# Terminal 1: Start receiver
cd /Users/hoang.phamho/Desktop/Projects/asana_receiver
npm start

# Terminal 2: Start ngrok
ngrok http 3000

# Terminal 3: Test endpoint
curl https://your-ngrok-url.ngrok.io/

# Nếu thấy {"status":"running",...} → Server OK!
# Giờ có thể tạo webhook từ asana_integration_site
```

---

**✅ Với code hiện tại, bạn KHÔNG CẦN secret trước khi tạo webhook. Server sẽ tự động skip verification nếu chưa có secret!**

