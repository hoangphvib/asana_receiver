# ⚡ Quick MCP Setup Guide

## 🎯 Goal

Sử dụng MCP Server để phân tích webhook events và generate code suggestions.

## 📦 Setup Steps

### 1. Configure Cursor MCP

**Mở Cursor Settings:**
- Mac: `Cmd + ,`
- Windows: `Ctrl + ,`

**Tìm "MCP" trong settings**

**Hoặc edit file trực tiếp:**

**Mac:**
```bash
nano ~/.cursor/mcp.json
```

**Windows:**
```bash
notepad %USERPROFILE%\.cursor\mcp.json
```

**Add configuration:**

```json
{
  "mcpServers": {
    "asana-receiver": {
      "command": "node",
      "args": ["/Users/hoang.phamho/Desktop/Projects/asana/asana_postgre_node_mcp/index.js"],
      "env": {
        "DB_HOST": "localhost",
        "DB_PORT": "5433",
        "DB_DATABASE": "asana_receiver",
        "DB_USERNAME": "asana_admin",
        "DB_PASSWORD": "asana_secure_pass_2024"
      }
    }
  }
}
```

### 2. Restart Cursor

Close và reopen Cursor để load MCP configuration.

### 3. Test Connection

In Cursor chat:
```
@asana-receiver Test connection
```

**Expected response:**
```json
{
  "success": true,
  "connected": true,
  "serverVersion": "PostgreSQL 16.x..."
}
```

### 4. Try First Query

```
@asana-receiver Get last 5 webhook events
```

**Expected:** List of 5 recent webhook events

## 🎨 Quick Examples

### Example 1: Analyze Events
```
@asana-receiver Get 10 recent task events

Phân tích và đề xuất:
- Event structure
- Common patterns
- Handler code
```

### Example 2: Count Events
```
@asana-receiver Query: 
SELECT resource_type, action, COUNT(*) as count 
FROM webhook_events 
GROUP BY resource_type, action 
ORDER BY count DESC
```

### Example 3: Generate Handler
```
@asana-receiver Get a sample task changed event

Generate a complete handler function for this event type
```

## ✅ Verification Checklist

- [ ] MCP configured in Cursor settings
- [ ] Cursor restarted
- [ ] Test connection successful
- [ ] Can query webhook_events table
- [ ] AI can analyze events
- [ ] AI generates code suggestions

## 🚀 You're Ready!

Now you can:
- ✅ Query webhook events via MCP
- ✅ Get AI analysis and suggestions
- ✅ Generate handler code
- ✅ Create test cases
- ✅ Optimize based on patterns

See `MCP_USAGE_GUIDE.md` for detailed use cases.

