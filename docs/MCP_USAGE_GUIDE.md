# 🤖 MCP Usage Guide - Webhook Event Analysis

## Overview

Sử dụng **MCP Server** (`asana_postgre_node_mcp`) để phân tích webhook events thay vì viết code trong business logic.

## 🎯 Philosophy

**MCP dùng để:**
- ✅ Phân tích event structure và patterns
- ✅ Đề xuất code và best practices
- ✅ Query và explore data
- ✅ Generate code snippets
- ✅ Debug và troubleshooting

**KHÔNG dùng để:**
- ❌ Xử lý business logic runtime
- ❌ Query data trong production flow
- ❌ Replace application code

## 🔧 Setup MCP Server

### 1. Configure Cursor MCP

Add to `~/.cursor/mcp.json` (hoặc Cursor settings):

```json
{
  "mcpServers": {
    "asana-receiver-mcp": {
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

### 2. Verify Connection

In Cursor chat:
```
@asana-receiver-mcp Test connection
```

Expected output:
```json
{
  "success": true,
  "connected": true,
  "serverVersion": "PostgreSQL 16.x..."
}
```

## 📊 MCP Tools Available

### 1. `get_webhook_events`
Get webhook events with filtering

**Parameters:**
- `webhook_gid` (optional): Filter by webhook
- `limit` (default: 50): Number of events
- `offset` (default: 0): Pagination offset

**Usage in Cursor:**
```
@asana-receiver-mcp Get the last 10 webhook events

@asana-receiver-mcp Get webhook events with limit 5 and offset 0

@asana-receiver-mcp Query webhook_events table for task events only
```

### 2. `get_asana_webhooks`
Get all registered webhooks

**Parameters:**
- `active_only` (default: true): Only active webhooks

**Usage:**
```
@asana-receiver-mcp Get all active webhooks

@asana-receiver-mcp Show me all webhooks including inactive ones
```

### 3. `query_database`
Execute custom SQL queries

**Parameters:**
- `sql`: SQL SELECT query

**Usage:**
```
@asana-receiver-mcp Query: SELECT COUNT(*) FROM webhook_events WHERE resource_type = 'task'

@asana-receiver-mcp Query database: 
SELECT action, COUNT(*) as count 
FROM webhook_events 
GROUP BY action 
ORDER BY count DESC
```

### 4. `get_schema`
Get complete database schema

**Usage:**
```
@asana-receiver-mcp Get database schema

@asana-receiver-mcp Show me all tables and columns in the database
```

### 5. `get_tables`
List all tables with row counts

**Usage:**
```
@asana-receiver-mcp Get all tables

@asana-receiver-mcp List tables in database
```

## 🎨 Use Cases

### Use Case 1: Analyze Event Patterns

**Goal:** Hiểu event structure và suggest handling code

**Cursor prompts:**
```
@asana-receiver-mcp Get the last 10 webhook events

Phân tích các events này và đề xuất:
1. Event structure patterns
2. Common fields
3. Code để handle từng loại event
4. Best practices
```

**Expected MCP response:**
- List of recent events với full payload
- AI sẽ analyze và generate code suggestions

**Example AI suggestions:**
```javascript
// Based on analysis of task events:
async function handleTaskEvent(event) {
  const { action, resource } = event.payload;
  
  switch (action) {
    case 'changed':
      if (resource.completed) {
        // Task completed - notify managers
        await notifyTaskCompletion(resource);
      }
      break;
    case 'added':
      // New task created
      await syncTaskToDCT(resource);
      break;
  }
}
```

### Use Case 2: Find Most Common Events

**Goal:** Identify patterns để optimize processing

**Cursor prompts:**
```
@asana-receiver-mcp Query: 
SELECT 
  resource_type, 
  action, 
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM webhook_events 
GROUP BY resource_type, action 
ORDER BY count DESC 
LIMIT 10

Based on this data, suggest optimization strategies
```

**Expected AI analysis:**
- "Task 'changed' events are 70% of traffic → optimize task processing"
- "Consider caching project data"
- "Implement queue for high-volume events"

### Use Case 3: Debug Specific Event

**Goal:** Understand event structure và suggest handling

**Cursor prompts:**
```
@asana-receiver-mcp Query:
SELECT * FROM webhook_events 
WHERE resource_type = 'task' 
AND action = 'changed'
LIMIT 1

Analyze this event structure and generate:
1. Type definitions
2. Handler code
3. Validation logic
4. Error handling patterns
```

### Use Case 4: Generate Handler Code

**Goal:** Create event-specific handlers

**Cursor prompts:**
```
@asana-receiver-mcp Get 5 recent task events

Generate a complete task event handler with:
- Structure validation
- Business logic based on action type
- Error handling
- Integration with DCT database
- TypeScript types
```

**Expected output:**
```typescript
// Generated Task Event Handler
interface TaskEvent {
  resource: {
    gid: string;
    name: string;
    completed: boolean;
    assignee?: {
      gid: string;
      name: string;
    };
  };
  action: 'added' | 'changed' | 'removed' | 'deleted';
}

async function handleTaskEvent(event: TaskEvent) {
  // Validation
  if (!event.resource?.gid) {
    throw new Error('Invalid event: missing resource GID');
  }

  // Business logic
  switch (event.action) {
    case 'changed':
      await handleTaskChanged(event.resource);
      break;
    case 'added':
      await handleTaskAdded(event.resource);
      break;
    // ...
  }
}
```

### Use Case 5: Analyze Event Performance

**Goal:** Find slow events để optimize

**Cursor prompts:**
```
@asana-receiver-mcp Query:
SELECT 
  resource_type,
  AVG(EXTRACT(EPOCH FROM (received_at - created_at))) as avg_delay_seconds,
  COUNT(*) as total_events
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY resource_type
ORDER BY avg_delay_seconds DESC

Suggest optimizations based on this data
```

### Use Case 6: Generate Test Data Insights

**Goal:** Create test cases from real data

**Cursor prompts:**
```
@asana-receiver-mcp Get 5 different task events (added, changed, removed)

Generate:
1. Test fixtures from these events
2. Unit test cases
3. Mock data
4. Validation test scenarios
```

## 🔍 Analysis Workflows

### Workflow 1: New Event Type Discovery

```
1. @asana-receiver-mcp Get recent events with resource_type = 'story'

2. Analyze structure:
   - What fields are present?
   - What actions are common?
   - What's the payload structure?

3. Generate handler:
   "Based on this structure, generate a story event handler"

4. Generate tests:
   "Create test cases for this handler"
```

### Workflow 2: Performance Investigation

```
1. @asana-receiver-mcp Query event counts by hour:
   SELECT 
     DATE_TRUNC('hour', received_at) as hour,
     COUNT(*) as event_count
   FROM webhook_events
   WHERE received_at > NOW() - INTERVAL '24 hours'
   GROUP BY hour
   ORDER BY hour DESC

2. Analyze patterns:
   "Which hours have highest traffic?"
   "Suggest caching or queuing strategies"

3. Generate optimization code:
   "Create a queue implementation for high-traffic periods"
```

### Workflow 3: Data Quality Check

```
1. @asana-receiver-mcp Query for events with missing data:
   SELECT 
     COUNT(*) as total,
     COUNT(CASE WHEN resource_gid IS NULL THEN 1 END) as missing_gid,
     COUNT(CASE WHEN signature_verified = false THEN 1 END) as unverified
   FROM webhook_events

2. Analyze issues:
   "Why are some events missing GIDs?"
   "How to handle unverified events?"

3. Generate validation code:
   "Create robust validation for incoming events"
```

## 💡 Best Practices

### DO's:
✅ Use MCP to **analyze** events and **generate** code
✅ Query patterns to **understand** data structure
✅ Get AI suggestions for **best practices**
✅ Generate **boilerplate** and **test cases**
✅ Debug issues by querying specific events
✅ Use for **documentation** and **understanding**

### DON'Ts:
❌ Don't use MCP in runtime application code
❌ Don't query MCP for every event processing
❌ Don't put MCP calls in business logic
❌ Don't use MCP instead of proper database layer
❌ Don't rely on MCP for production data access

## 📝 Example Session

```
Developer: @asana-receiver-mcp Get the last 10 webhook events

MCP: [Returns 10 events with full details]

Developer: Analyze these events. What patterns do you see?

AI: Based on the events:
1. 70% are task 'changed' events
2. Most changes are to 'completed' field
3. Average processing: 2-3 fields per event
4. Common pattern: assignee + completed together

Suggestions:
- Implement change detection to reduce processing
- Cache assignee information
- Batch process completion events

Developer: Generate a change detection function

AI: [Generates code]
```javascript
function detectSignificantChanges(oldState, newState) {
  const significantFields = ['completed', 'assignee_gid', 'due_on'];
  const changes = [];
  
  for (const field of significantFields) {
    if (oldState[field] !== newState[field]) {
      changes.push({
        field,
        oldValue: oldState[field],
        newValue: newState[field]
      });
    }
  }
  
  return changes;
}

// Usage
const changes = detectSignificantChanges(lastKnownState, event.resource);
if (changes.length > 0) {
  await processChanges(changes);
} else {
  console.log('No significant changes - skipping');
}
```

Developer: Perfect! Now generate tests for this

AI: [Generates test cases...]
```

## 🚀 Quick Reference

### Common Commands:

```bash
# Get events
@asana-receiver-mcp Get last 20 events

# Count by type
@asana-receiver-mcp Query: SELECT resource_type, COUNT(*) FROM webhook_events GROUP BY resource_type

# Get schema
@asana-receiver-mcp Show database schema

# Specific event
@asana-receiver-mcp Get event with ID 123

# Pattern analysis
@asana-receiver-mcp Analyze event patterns in last 100 events
```

### Analysis Prompts:

```
"Analyze these events and suggest handler code"
"What are the most common fields in these events?"
"Generate TypeScript types for this event structure"
"Suggest error handling for these event types"
"Create test fixtures from these events"
"What optimizations would you suggest?"
```

## 🎯 Summary

**MCP is your AI-powered database analyst:**
- 🔍 Query and explore data
- 💡 Get insights and suggestions
- 📝 Generate code from patterns
- 🧪 Create tests from real data
- 🚀 Optimize based on analysis

**Use MCP during development, not in production runtime!**

---

Ready to analyze your webhook events! 🚀

**Next steps:**
1. Configure MCP in Cursor
2. Test connection
3. Start analyzing events
4. Generate handlers
5. Optimize your code

