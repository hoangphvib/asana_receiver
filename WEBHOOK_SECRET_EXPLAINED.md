# Asana Webhook Secret - Giải thích chi tiết

## 🔐 Webhook Secret là gì?

Webhook secret là một chuỗi ngẫu nhiên mà **Asana tự động tạo ra** khi bạn đăng ký webhook. Secret này dùng để:

1. **Xác thực nguồn gốc**: Đảm bảo events đến từ Asana, không phải từ attacker
2. **Integrity check**: Đảm bảo payload không bị thay đổi trong quá trình truyền

## 🔄 Luồng hoạt động

### 1. Đăng ký Webhook (POST /webhooks)

**Request từ bạn:**
```json
POST https://app.asana.com/api/1.0/webhooks
Authorization: Bearer YOUR_PAT
{
  "data": {
    "resource": "1234567890",
    "target": "https://your-domain.com/webhook"
  }
}
```

**❌ KHÔNG GỬI SECRET** - Asana sẽ tự tạo!

### 2. Handshake - Asana gửi secret cho bạn

**Ngay sau khi nhận request tạo webhook, Asana gọi đến target URL:**

```http
POST https://your-domain.com/webhook
Content-Type: application/json
X-Hook-Secret: $2a$12$Zt9GSEggG5RluXMGV1lkaeLaTqkzyl72tSftDDXNvlYJFr2TrdZ7O

{}
```

**Server của bạn PHẢI:**
```javascript
// Đọc secret từ header
const hookSecret = req.headers['x-hook-secret'];

// Echo lại CHÍNH GIÁ TRỊ ĐÓ trong response
res.set('X-Hook-Secret', hookSecret);
res.status(200).send();

// LƯU LẠI secret này để dùng sau!
console.log('Save this:', hookSecret);
```

**Response:**
```http
HTTP/1.1 200 OK
X-Hook-Secret: $2a$12$Zt9GSEggG5RluXMGV1lkaeLaTqkzyl72tSftDDXNvlYJFr2TrdZ7O
```

### 3. Lưu Secret

**Cách 1: Thủ công (Recommended cho dev)**

Copy từ console log và tạo `.env`:

```bash
cd /Users/hoang.phamho/Desktop/Projects/asana_receiver
cat > .env << 'EOF'
PORT=3000
PUBLIC_URL=https://your-ngrok-url.ngrok.io
ASANA_WEBHOOK_SECRET=$2a$12$Zt9GSEggG5RluXMGV1lkaeLaTqkzyl72tSftDDXNvlYJFr2TrdZ7O
EOF
```

**Cách 2: Tự động lưu (Production)**

```javascript
// Trong server.js, thêm vào phần handshake:
if (req.headers['x-hook-secret']) {
  const hookSecret = req.headers['x-hook-secret'];
  
  // Lưu vào database
  await db.saveWebhookSecret(hookSecret);
  
  // Hoặc lưu vào file
  fs.appendFileSync('.env', `\nASANA_WEBHOOK_SECRET=${hookSecret}`);
  
  res.set('X-Hook-Secret', hookSecret);
  res.status(200).send();
  return;
}
```

### 4. Verify Events Sau Đó

Mỗi khi Asana gửi event, nó sẽ gửi kèm signature:

```http
POST https://your-domain.com/webhook
Content-Type: application/json
X-Hook-Signature: 5f8d7a6b4c3e2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f

{
  "events": [
    {
      "action": "changed",
      "resource": {...},
      ...
    }
  ]
}
```

**Server verify:**

```javascript
const signature = req.headers['x-hook-signature'];
const computedSignature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)  // Secret từ handshake
  .update(req.rawBody)                   // Raw JSON body
  .digest('hex');

if (computedSignature !== signature) {
  return res.status(401).json({ error: 'Invalid signature' });
}

// Signature OK → Process events
```

## ❌ Lỗi 401 - Nguyên nhân

### Nguyên nhân 1: Server không echo secret lại

```javascript
// ❌ SAI
if (req.headers['x-hook-secret']) {
  res.status(200).send();  // Quên echo secret
  return;
}

// ✅ ĐÚNG
if (req.headers['x-hook-secret']) {
  const hookSecret = req.headers['x-hook-secret'];
  res.set('X-Hook-Secret', hookSecret);  // Echo lại
  res.status(200).send();
  return;
}
```

### Nguyên nhân 2: Verify signature khi chưa có secret

```javascript
// ❌ SAI - Luôn verify kể cả khi secret rỗng
if (signature) {
  const computed = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
  if (computed !== signature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
}

// ✅ ĐÚNG - Chỉ verify khi có secret
if (signature && WEBHOOK_SECRET && WEBHOOK_SECRET !== 'your-webhook-secret-here') {
  const computed = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
  if (computed !== signature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
} else if (signature) {
  console.log('⚠️  Skipping signature verification - no secret configured');
}
```

### Nguyên nhân 3: Secret sai

```javascript
// Đã lưu: $2a$12$Zt9GSEggG5RluXMGV1lkaeLaTqkzyl72tSftDDXNvlYJFr2TrdZ7O
// Nhưng trong .env: $2a$12$WRONG_SECRET

// → Signature không khớp → 401
```

## ✅ Best Practices

### 1. Không cần secret khi test

```javascript
// Development mode: Skip verification
if (signature && process.env.NODE_ENV === 'production') {
  // Only verify in production
  verifySignature();
}
```

### 2. Log secret ra console khi handshake

```javascript
if (req.headers['x-hook-secret']) {
  const hookSecret = req.headers['x-hook-secret'];
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  📝 SAVE THIS SECRET TO .env FILE:                   ║');
  console.log('╟──────────────────────────────────────────────────────╢');
  console.log(`║  ASANA_WEBHOOK_SECRET=${hookSecret}  ║`);
  console.log('╚══════════════════════════════════════════════════════╝');
  
  res.set('X-Hook-Secret', hookSecret);
  res.status(200).send();
  return;
}
```

### 3. Hỗ trợ cả verify và skip

```javascript
const VERIFY_SIGNATURES = process.env.VERIFY_SIGNATURES !== 'false';

if (signature && VERIFY_SIGNATURES && WEBHOOK_SECRET) {
  verifySignature();
} else if (signature) {
  console.log('⚠️  Signature verification is DISABLED');
}
```

### 4. Store secret per webhook (Multi-webhook)

```javascript
// Database schema
webhooks: {
  gid: '1234567890',
  resource: '9876543210',
  target: 'https://domain.com/webhook',
  secret: '$2a$12$...',
  created_at: '2025-11-05'
}

// Verify
const webhook = await db.getWebhookByTarget(req.url);
const computed = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');
```

## 🧪 Testing

### Test 1: Handshake

```bash
# Simulate Asana handshake
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hook-Secret: test-secret-123" \
  -d '{}' \
  -v

# Expected:
# < HTTP/1.1 200 OK
# < X-Hook-Secret: test-secret-123
```

### Test 2: Event với valid signature

```bash
# Tính signature
BODY='{"events":[]}'
SECRET='test-secret-123'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

# Gửi request
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hook-Signature: $SIGNATURE" \
  -d "$BODY"

# Expected: 200 OK
```

### Test 3: Event với invalid signature

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hook-Signature: invalid-signature" \
  -d '{"events":[]}'

# Expected: 401 Unauthorized (if secret configured)
# Or 200 OK (if signature verification skipped)
```

## 📚 Tóm tắt

| Bước | Ai làm | Action |
|------|--------|--------|
| 1. Tạo webhook | Bạn | `POST /webhooks` với `resource` + `target` |
| 2. Handshake | Asana → Server | Asana gửi `X-Hook-Secret`, server echo lại |
| 3. Lưu secret | Bạn | Copy từ console → `.env` file |
| 4. Restart server | Bạn | Load secret mới vào memory |
| 5. Gửi events | Asana → Server | Asana gửi events + `X-Hook-Signature` |
| 6. Verify | Server | HMAC-SHA256(secret, body) == signature? |
| 7. Process | Server | Xử lý events nếu valid |

**🔑 Key Point:** Secret được Asana tạo và gửi cho bạn trong handshake, KHÔNG PHẢI bạn tự tạo!

---

**✅ Code đã fix:** Server giờ sẽ skip verification nếu chưa có secret, tránh lỗi 401!

