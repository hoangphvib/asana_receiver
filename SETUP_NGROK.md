# 🚀 Quick Setup Guide: Exposing Asana Receiver with ngrok

This guide will help you quickly expose your local `asana_receiver` to the internet using ngrok, so Asana can send webhook events to it.

---

## 📋 Prerequisites

1. **Node.js** installed (v14 or higher)
2. **ngrok** installed ([https://ngrok.com/download](https://ngrok.com/download))
3. **Asana Personal Access Token (PAT)** for registering webhooks

---

## ⚡ Quick Start (5 minutes)

### Step 1: Install Dependencies

```bash
cd asana_receiver
npm install
```

### Step 2: Start the Asana Receiver

```bash
npm start
```

You should see:
```
╔═══════════════════════════════════════════════════════════════════════╗
║                🚀 Asana Webhook Receiver is Running!                  ║
╟───────────────────────────────────────────────────────────────────────╢
║  Local Server:  http://localhost:3000                                 ║
║  Public URL:    http://localhost:3000                                 ║
╟───────────────────────────────────────────────────────────────────────╢
║  ⚠️  WARNING: Using localhost URL                                     ║
║     This will NOT work with Asana webhooks!                           ║
║     Use ngrok or deploy to make it publicly accessible:               ║
...
```

**⚠️ Keep this terminal running!**

### Step 3: Expose with ngrok (New Terminal)

Open a **new terminal** and run:

```bash
ngrok http 3000
```

You will see output like:

```
ngrok                                                                     

Session Status                online                                      
Account                       your-account (Plan: Free)                   
Version                       3.x.x                                       
Region                        United States (us)                          
Latency                       -                                           
Web Interface                 http://127.0.0.1:4040                       
Forwarding                    https://abc123def456.ngrok.io -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90 
                              0       0       0.00    0.00    0.00    0.00
```

**🔗 Copy the HTTPS URL:** `https://abc123def456.ngrok.io`

**⚠️ Keep this terminal running too!**

### Step 4: Update Environment Variable

**Option A: Quick Test (No .env file)**

Just restart the server with the PUBLIC_URL inline:

```bash
# Stop the server (Ctrl+C in the first terminal)
# Then run with PUBLIC_URL:
PUBLIC_URL=https://abc123def456.ngrok.io npm start
```

**Option B: Permanent Setup (Recommended)**

Create a `.env` file:

```bash
cp env.example .env
```

Edit `.env` and update `PUBLIC_URL`:

```env
PORT=3000
PUBLIC_URL=https://abc123def456.ngrok.io
ASANA_WEBHOOK_SECRET=your-webhook-secret-here
```

Restart the server:

```bash
npm start
```

Now you should see your ngrok URL in the startup message:

```
╔═══════════════════════════════════════════════════════════════════════╗
║                🚀 Asana Webhook Receiver is Running!                  ║
╟───────────────────────────────────────────────────────────────────────╢
║  Local Server:  http://localhost:3000                                 ║
║  Public URL:    https://abc123def456.ngrok.io                         ║
╟───────────────────────────────────────────────────────────────────────╢
║  📋 COPY THESE URLs:                                                  ║
╟───────────────────────────────────────────────────────────────────────╢
║  🔗 Webhook Endpoint (for Asana):                                     ║
║     https://abc123def456.ngrok.io/webhook                             ║
```

### Step 5: Open the Dashboard

Open your browser to:

- **Local:** [http://localhost:3000](http://localhost:3000)
- **Public (ngrok):** `https://abc123def456.ngrok.io` (your ngrok URL)

You'll see:
- Real-time connection status
- **Quick Copy URLs** section with your webhook endpoint
- Empty events list (waiting for Asana to send events)

### Step 6: Register Webhook with Asana

You have 3 options:

#### Option A: Use the Integration Site (Easiest)

1. Open the `asana_integration_site`:
   ```bash
   cd ../asana_integration_site
   npm run dev
   ```

2. Navigate to [http://localhost:3001/webhooks](http://localhost:3001/webhooks)

3. In the "Create Webhook" section:
   - **Resource GID:** Enter the GID of the task/project you want to watch
   - **Target URL:** Click "Copy" button in the dashboard, or paste: `https://abc123def456.ngrok.io/webhook`
   - Click "Create Webhook"

#### Option B: Use Postman or cURL

**Postman:**

```
POST https://app.asana.com/api/1.0/webhooks
Headers:
  Authorization: Bearer YOUR_ASANA_PAT
  Content-Type: application/json
Body (raw JSON):
{
  "data": {
    "resource": "1234567890123456",
    "target": "https://abc123def456.ngrok.io/webhook"
  }
}
```

**cURL:**

```bash
curl -X POST https://app.asana.com/api/1.0/webhooks \
  -H "Authorization: Bearer YOUR_ASANA_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "resource": "1234567890123456",
      "target": "https://abc123def456.ngrok.io/webhook"
    }
  }'
```

#### Option C: Via Asana UI (If Available)

1. Go to Asana **Admin Console** > **Apps** > **Manage webhooks**
2. Click "Add webhook"
3. Set **Target URL:** `https://abc123def456.ngrok.io/webhook`
4. Select the **Resource** you want to monitor
5. Click "Create"

---

## ✅ Verify It's Working

### Step 1: Check Server Logs

In your `asana_receiver` terminal, you should see:

```
=== Incoming Webhook Request ===
Headers: {...}
Body: {...}
🤝 Handshake detected! Hook Secret: xxx...
✅ Handshake successful!
```

### Step 2: Check Dashboard

In your browser dashboard, you should see:
- ✅ Connection status: **Connected**
- The webhook endpoint URL is now visible in "Quick Copy URLs"

### Step 3: Test Event Reception

1. Go to Asana and make a change to the resource you're watching:
   - Update a task name
   - Change a status
   - Add a comment
   - Etc.

2. Within seconds, you should see the event appear in:
   - **Server logs** (terminal)
   - **Dashboard** (browser) - a new event card will appear

---

## 🔄 Common Workflows

### Every Time You Start Development:

1. **Terminal 1:**
   ```bash
   cd asana_receiver
   npm start
   ```

2. **Terminal 2:**
   ```bash
   ngrok http 3000
   ```

3. **Copy ngrok URL** and update `.env` if it changed

4. **Open dashboard:** [http://localhost:3000](http://localhost:3000)

### If ngrok URL Changes (Free Plan):

On ngrok's free plan, your URL changes every time you restart ngrok.

**Quick Fix:**

1. Copy the new ngrok URL
2. Update `.env` file with new `PUBLIC_URL`
3. Restart `asana_receiver`
4. **Re-register your webhooks** with the new URL (old webhooks will fail)

**Alternative: Use ngrok Static Domain (Paid Plans)**

With ngrok's paid plans, you can get a static domain like `your-app.ngrok.io` that never changes.

---

## 🐛 Troubleshooting

### Problem: "Handshake not received"

**Causes:**
- ngrok not running
- Wrong PUBLIC_URL in .env
- Firewall blocking ngrok

**Solutions:**
1. Verify ngrok is running: `curl https://your-ngrok-url.ngrok.io`
2. Check `.env` has correct `PUBLIC_URL`
3. Restart both ngrok and asana_receiver

### Problem: "Invalid Signature"

**Causes:**
- `ASANA_WEBHOOK_SECRET` doesn't match what Asana used

**Solutions:**
1. Check server logs for the `X-Hook-Secret` during handshake
2. Update `.env` with the correct secret
3. Restart server

### Problem: "No events appearing in dashboard"

**Causes:**
- SSE connection failed
- Browser closed connection
- Server not broadcasting events

**Solutions:**
1. Check browser console for SSE errors
2. Verify connection status shows "Connected"
3. Refresh the page
4. Check server logs to confirm events are being received

### Problem: ngrok says "Tunnel Not Found"

**Causes:**
- ngrok process stopped
- Wrong port

**Solutions:**
1. Verify ngrok is running: `ps aux | grep ngrok`
2. Make sure you're using `ngrok http 3000` (not a different port)
3. Restart ngrok

---

## 📚 Additional Resources

- **Asana Webhooks Guide:** [https://developers.asana.com/docs/webhooks-guide](https://developers.asana.com/docs/webhooks-guide)
- **ngrok Documentation:** [https://ngrok.com/docs](https://ngrok.com/docs)
- **Integration Site Webhooks Page:** [http://localhost:3001/webhooks](http://localhost:3001/webhooks)

---

## 🎯 Next Steps

Once your webhook is set up and receiving events:

1. **Implement Custom Logic:** Edit `server.js` to add your business logic in the webhook handler
2. **Integrate with Other Services:** Use the SSE stream to push events to other systems
3. **Deploy to Production:** Move from ngrok to a permanent hosting solution (Heroku, Railway, Render, etc.)
4. **Set Up Monitoring:** Add logging, alerting, and error tracking

---

## 💡 Pro Tips

1. **Use ngrok Web Interface:** Visit [http://127.0.0.1:4040](http://127.0.0.1:4040) to inspect all HTTP requests going through ngrok
2. **Test Handshake Manually:** Use Postman to send a test request with `X-Hook-Secret` header to verify your server responds correctly
3. **Monitor SSE Connection:** Open browser DevTools > Network tab and filter for `events` to see the SSE stream
4. **Bookmark Your URLs:** Save your ngrok URLs and resource GIDs for quick re-registration

---

**🎉 You're all set!** Your Asana webhook receiver is now publicly accessible and ready to receive real-time events from Asana.

