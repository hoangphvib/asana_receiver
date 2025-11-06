# Tự động lưu Webhook Secret

## ❓ Vấn đề ban đầu

**Câu hỏi:** Secret do Asana cung cấp khi handshake, vậy làm sao đặt được vào `.env` trước khi tạo webhook?

**Trả lời:** KHÔNG THỂ! Đây là vấn đề "con gà - quả trứng":

```
1. Bạn tạo webhook
2. Asana gọi handshake với secret
3. Server nhận secret
4. ❓ Làm sao đưa secret vào .env?
5. Restart server để load secret
```

## ✅ Giải pháp: AUTO-SAVE

Server giờ **TỰ ĐỘNG LƯU** secret vào file `.env` khi nhận handshake!

### Code đã thêm:

```javascript
if (req.headers['x-hook-secret']) {
  const hookSecret = req.headers['x-hook-secret'];
  
  // 1. Echo lại cho Asana
  res.set('X-Hook-Secret', hookSecret);
  res.status(200).send();
  
  // 2. TỰ ĐỘNG LƯU vào .env
  const envPath = path.join(__dirname, '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    // Update existing .env
    envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('ASANA_WEBHOOK_SECRET=')) {
      // Update secret cũ
      envContent = envContent.replace(
        /ASANA_WEBHOOK_SECRET=.*/,
        `ASANA_WEBHOOK_SECRET=${hookSecret}`
      );
    } else {
      // Thêm secret mới
      envContent += `\nASANA_WEBHOOK_SECRET=${hookSecret}\n`;
    }
  } else {
    // Tạo .env mới
    envContent = `PORT=${PORT}\nPUBLIC_URL=${PUBLIC_URL}\nASANA_WEBHOOK_SECRET=${hookSecret}\n`;
  }
  
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ Secret saved to .env!');
  
  return;
}
```

## 🔄 Workflow mới (Đơn giản hơn nhiều!)

### Bước 1: Start server (Không cần .env)
```bash
cd /Users/hoang.phamho/Desktop/Projects/asana_receiver
npm start
```

### Bước 2: Expose với ngrok
```bash
ngrok http 3000
```

### Bước 3: Tạo webhook
```bash
# Từ asana_integration_site
# Target URL: https://your-ngrok-url.ngrok.io/webhook
```

### Bước 4: Server TỰ ĐỘNG làm mọi thứ!

**Console log:**
```
═══ Incoming Webhook Request ═══

╔══════════════════════════════════════════════════════════════════╗
║  🤝 HANDSHAKE DETECTED!                                          ║
╟──────────────────────────────────────────────────────────────────╢
║  Secret: $2a$12$Zt9GSEggG5RluXMGV1lkaeLaTqkzyl... ║
╚══════════════════════════════════════════════════════════════════╝

✅ Handshake successful! Secret echoed back to Asana.

📝 Added ASANA_WEBHOOK_SECRET to .env file

╔══════════════════════════════════════════════════════════════════╗
║  ✅ SECRET SAVED!                                                ║
╟──────────────────────────────────────────────────────────────────╢
║  Location: .env                                                  ║
║  Variable: ASANA_WEBHOOK_SECRET                                  ║
║                                                                  ║
║  ⚠️  IMPORTANT: Restart server to enable signature verification  ║
║     Press Ctrl+C then run: npm start                             ║
╚══════════════════════════════════════════════════════════════════╝
```

**File `.env` được tạo tự động:**
```env
# Asana Receiver Configuration
PORT=3000
PUBLIC_URL=https://abc123.ngrok.io

# Webhook secret from Asana handshake (auto-saved)
ASANA_WEBHOOK_SECRET=$2a$12$Zt9GSEggG5RluXMGV1lkaeLaTqkzyl72tSftDDXNvlYJFr2TrdZ7O
```

### Bước 5: (Optional) Restart để enable verification

```bash
# Ctrl+C
npm start
```

Giờ server sẽ verify signature của các events tiếp theo!

## 🎯 So sánh Workflow

### ❌ Cách cũ (Thủ công):
```
1. Start server (no secret)
2. Expose ngrok
3. Create webhook
4. Copy secret from console log        ← Phải copy thủ công
5. Create .env file manually           ← Phải tạo file
6. Paste secret                        ← Phải paste
7. Restart server                      ← Phải restart
```

### ✅ Cách mới (Tự động):
```
1. Start server (no secret needed)
2. Expose ngrok
3. Create webhook
   → Server TỰ ĐỘNG lưu secret!       ← Tự động!
4. (Optional) Restart if want verify
```

## 📂 File Structure

```
asana_receiver/
├── server.js              ← Code auto-save
├── .env                   ← TỰ ĐỘNG tạo khi handshake
├── .env.example           ← Template
├── .gitignore             ← .env trong này (không commit)
└── package.json
```

## 🔐 Security Notes

### 1. `.gitignore` PHẢI có `.env`

```gitignore
# .gitignore
node_modules/
.env          ← QUAN TRỌNG!
*.log
```

**Lý do:** `.env` chứa secret → KHÔNG ĐƯỢC commit lên Git!

### 2. Production Deployment

Với production (Heroku, Railway, etc.), KHÔNG DÙNG `.env` file mà dùng environment variables:

```bash
# Heroku
heroku config:set ASANA_WEBHOOK_SECRET=$2a$12$...

# Railway
railway variables set ASANA_WEBHOOK_SECRET $2a$12$...

# Docker
docker run -e ASANA_WEBHOOK_SECRET=$2a$12$... asana-receiver
```

### 3. Multiple Webhooks

Nếu bạn có nhiều webhooks, mỗi webhook có secret riêng:

**Option A: Store in database**
```javascript
// webhooks table
{
  webhook_gid: '123',
  resource: '456',
  target: 'https://...',
  secret: '$2a$12$...',
  created_at: '2025-11-05'
}

// Verify
const webhook = await db.findWebhookByGid(webhookGid);
verifySignature(webhook.secret, body, signature);
```

**Option B: Multiple env vars**
```env
WEBHOOK_1_SECRET=$2a$12$...
WEBHOOK_2_SECRET=$2b$13$...
WEBHOOK_3_SECRET=$2c$14$...
```

## 🧪 Testing

### Test 1: Handshake tạo file

```bash
# 1. Xóa .env nếu có
rm .env

# 2. Start server
npm start

# 3. Simulate handshake
curl -X POST http://localhost:3000/webhook \
  -H "X-Hook-Secret: test-secret-12345" \
  -d '{}'

# 4. Kiểm tra .env được tạo
cat .env
# Expected:
# ASANA_WEBHOOK_SECRET=test-secret-12345
```

### Test 2: Update secret existing

```bash
# 1. .env đã có secret cũ
echo "ASANA_WEBHOOK_SECRET=old-secret" > .env

# 2. Handshake với secret mới
curl -X POST http://localhost:3000/webhook \
  -H "X-Hook-Secret: new-secret-67890" \
  -d '{}'

# 3. Kiểm tra secret được update
cat .env
# Expected:
# ASANA_WEBHOOK_SECRET=new-secret-67890
```

### Test 3: Preserve other vars

```bash
# 1. .env có nhiều variables
cat > .env << EOF
PORT=3000
PUBLIC_URL=https://example.com
MY_CUSTOM_VAR=something
EOF

# 2. Handshake
curl -X POST http://localhost:3000/webhook \
  -H "X-Hook-Secret: secret-abc" \
  -d '{}'

# 3. Kiểm tra các vars khác không bị xóa
cat .env
# Expected:
# PORT=3000
# PUBLIC_URL=https://example.com
# MY_CUSTOM_VAR=something
# ASANA_WEBHOOK_SECRET=secret-abc
```

## ⚠️ Edge Cases

### 1. File permission denied

```javascript
try {
  fs.writeFileSync(envPath, envContent, 'utf8');
} catch (error) {
  console.error('❌ Failed to save:', error.message);
  console.log('⚠️  Manually add to .env:');
  console.log(`ASANA_WEBHOOK_SECRET=${hookSecret}`);
}
```

→ Fallback: User copy thủ công từ console

### 2. Disk full

→ Same as #1, show manual instruction

### 3. Concurrent handshakes

```javascript
// Race condition: 2 webhooks handshake cùng lúc
// → Last write wins
// → OK vì mỗi webhook có GID riêng, có thể identify sau
```

### 4. Server restart giữa chừng

```
1. Handshake received
2. Secret saved to .env  ✅
3. Server crash         💥
4. Restart server       🔄
5. Load .env            ✅
→ Secret vẫn còn!
```

## 📚 Best Practices

### 1. Always have .env.example

```env
# .env.example (commit to Git)
PORT=3000
PUBLIC_URL=https://your-ngrok-url.ngrok.io
ASANA_WEBHOOK_SECRET=will-be-auto-filled-during-handshake
```

### 2. Log secret location

```javascript
console.log('✅ Secret saved to:', path.resolve(envPath));
```

→ User biết chính xác file ở đâu

### 3. Backup old secret

```javascript
if (envContent.includes('ASANA_WEBHOOK_SECRET=')) {
  const oldSecret = envContent.match(/ASANA_WEBHOOK_SECRET=(.*)/)[1];
  fs.writeFileSync('.env.backup', envContent, 'utf8');
  console.log('📦 Old secret backed up to .env.backup');
}
```

### 4. Notify via dashboard

```javascript
broadcastToClients({
  type: 'handshake',
  message: 'Secret saved to .env',
  requiresRestart: true,
  timestamp: new Date().toISOString()
});
```

→ Dashboard hiển thị notification: "Secret saved! Restart server to enable verification"

## 🎉 Benefits

1. **✅ Zero manual work** - Server tự động lưu secret
2. **✅ No typos** - Không risk copy/paste sai
3. **✅ Instant feedback** - Console log ngay khi lưu xong
4. **✅ Idempotent** - Chạy nhiều lần cũng OK (update existing)
5. **✅ Backwards compatible** - Vẫn có thể manual edit `.env`

---

**🔑 TL;DR:** Secret được Asana gửi khi handshake → Server TỰ ĐỘNG lưu vào `.env` file → Restart server là xong!

