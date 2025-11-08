/**
 * DCT Site Database Client
 * Connects to asana-dct-site database to enrich webhook events
 */

const { Pool } = require('pg');

// Create connection pool for DCT Site database
const dctPool = new Pool({
  host: process.env.DCT_DATABASE_HOST || 'localhost',
  port: process.env.DCT_DATABASE_PORT || 5432,
  database: process.env.DCT_DATABASE_NAME || 'asana_dct',
  user: process.env.DCT_DATABASE_USER || 'asana_admin',
  password: process.env.DCT_DATABASE_PASSWORD || 'asana_secure_pass_2024',
  min: 1,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

dctPool.on('connect', () => {
  console.log('✅ DCT Database connected');
});

dctPool.on('error', (err) => {
  console.error('❌ DCT Database error:', err);
});

// ============================================
// WORKSPACE ENRICHMENT
// ============================================

async function getWorkspaceInfo(workspace_gid) {
  const query = `
    SELECT 
      workspace_gid,
      name,
      is_organization,
      synced_at,
      created_at
    FROM workspaces
    WHERE workspace_gid = $1
  `;
  
  try {
    const result = await dctPool.query(query, [workspace_gid]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting workspace:', error);
    return null;
  }
}

// ============================================
// PROJECT ENRICHMENT
// ============================================

async function getProjectInfo(project_gid) {
  const query = `
    SELECT 
      p.project_gid,
      p.workspace_gid,
      p.name,
      p.notes,
      p.color,
      p.archived,
      p.owner_gid,
      p.owner_name,
      p.team_gid,
      p.team_name,
      p.task_count,
      p.customer_count,
      p.permalink_url,
      p.synced_at,
      w.name as workspace_name
    FROM projects p
    LEFT JOIN workspaces w ON p.workspace_gid = w.workspace_gid
    WHERE p.project_gid = $1
  `;
  
  try {
    const result = await dctPool.query(query, [project_gid]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting project:', error);
    return null;
  }
}

// ============================================
// TASK ENRICHMENT
// ============================================

async function getTaskInfo(task_gid) {
  const query = `
    SELECT 
      t.task_gid,
      t.customer_id,
      t.project_gid,
      t.workspace_gid,
      t.name as task_name,
      t.notes,
      t.completed,
      t.assignee_gid,
      t.assignee_name,
      t.due_on,
      t.permalink_url,
      t.custom_fields,
      t.created_by,
      t.synced_at,
      c.name as customer_name,
      c.cif as customer_cif,
      c.uuid as customer_uuid,
      c.total_amount,
      c.principal_amount,
      p.name as project_name,
      p.color as project_color,
      w.name as workspace_name
    FROM tasks t
    LEFT JOIN customers c ON t.customer_id = c.id
    LEFT JOIN projects p ON t.project_gid = p.project_gid
    LEFT JOIN workspaces w ON t.workspace_gid = w.workspace_gid
    WHERE t.task_gid = $1
  `;
  
  try {
    const result = await dctPool.query(query, [task_gid]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting task:', error);
    return null;
  }
}

// ============================================
// CUSTOMER ENRICHMENT
// ============================================

async function getCustomerByTaskGid(task_gid) {
  const query = `
    SELECT 
      c.id,
      c.uuid,
      c.name,
      c.cif,
      c.total_amount,
      c.principal_amount,
      c.import_batch_id,
      c.imported_by,
      c.imported_at
    FROM customers c
    INNER JOIN tasks t ON c.id = t.customer_id
    WHERE t.task_gid = $1
  `;
  
  try {
    const result = await dctPool.query(query, [task_gid]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting customer:', error);
    return null;
  }
}

// ============================================
// EVENT ENRICHMENT (Main Function)
// ============================================

async function enrichEvent(event) {
  const enriched = {
    original: event,
    enrichment: {
      found: false,
      resource_type: event.resource?.resource_type || 'unknown',
      resource_gid: event.resource?.gid,
      data: null
    }
  };

  try {
    const resourceType = event.resource?.resource_type;
    const resourceGid = event.resource?.gid;

    if (!resourceGid) {
      return enriched;
    }

    switch (resourceType) {
      case 'task':
        const taskInfo = await getTaskInfo(resourceGid);
        if (taskInfo) {
          enriched.enrichment.found = true;
          enriched.enrichment.data = {
            type: 'task',
            task: taskInfo,
            has_customer: !!taskInfo.customer_id,
            customer: taskInfo.customer_id ? {
              id: taskInfo.customer_id,
              name: taskInfo.customer_name,
              cif: taskInfo.customer_cif,
              uuid: taskInfo.customer_uuid,
              total_amount: taskInfo.total_amount,
              principal_amount: taskInfo.principal_amount
            } : null,
            project: {
              gid: taskInfo.project_gid,
              name: taskInfo.project_name,
              color: taskInfo.project_color
            },
            workspace: {
              gid: taskInfo.workspace_gid,
              name: taskInfo.workspace_name
            }
          };
        }
        break;

      case 'project':
        const projectInfo = await getProjectInfo(resourceGid);
        if (projectInfo) {
          enriched.enrichment.found = true;
          enriched.enrichment.data = {
            type: 'project',
            project: projectInfo,
            workspace: {
              gid: projectInfo.workspace_gid,
              name: projectInfo.workspace_name
            },
            stats: {
              task_count: projectInfo.task_count || 0,
              customer_count: projectInfo.customer_count || 0
            }
          };
        }
        break;

      case 'workspace':
        const workspaceInfo = await getWorkspaceInfo(resourceGid);
        if (workspaceInfo) {
          enriched.enrichment.found = true;
          enriched.enrichment.data = {
            type: 'workspace',
            workspace: workspaceInfo
          };
        }
        break;

      default:
        // Unknown resource type - return as is
        break;
    }

    return enriched;

  } catch (error) {
    console.error('Error enriching event:', error);
    enriched.enrichment.error = error.message;
    return enriched;
  }
}

// ============================================
// BATCH ENRICHMENT
// ============================================

async function enrichEvents(events) {
  const enrichedEvents = [];
  
  for (const event of events) {
    const enriched = await enrichEvent(event);
    enrichedEvents.push(enriched);
  }
  
  return enrichedEvents;
}

// ============================================
// STATISTICS
// ============================================

async function getDCTStats() {
  try {
    const [workspaces, projects, tasks, customers] = await Promise.all([
      dctPool.query('SELECT COUNT(*) as count FROM workspaces'),
      dctPool.query('SELECT COUNT(*) as count FROM projects WHERE archived = false'),
      dctPool.query('SELECT COUNT(*) as count FROM tasks'),
      dctPool.query('SELECT COUNT(*) as count FROM customers')
    ]);

    return {
      workspaces: parseInt(workspaces.rows[0].count),
      projects: parseInt(projects.rows[0].count),
      tasks: parseInt(tasks.rows[0].count),
      customers: parseInt(customers.rows[0].count)
    };
  } catch (error) {
    console.error('Error getting DCT stats:', error);
    return null;
  }
}

// ============================================
// CONNECTION TEST
// ============================================

async function testDCTConnection() {
  try {
    const result = await dctPool.query('SELECT NOW() as current_time, current_database() as db_name');
    return {
      success: true,
      time: result.rows[0].current_time,
      database: result.rows[0].db_name
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// CLOSE POOL
// ============================================

async function closeDCTPool() {
  await dctPool.end();
  console.log('🔒 DCT Database pool closed');
}

module.exports = {
  enrichEvent,
  enrichEvents,
  getWorkspaceInfo,
  getProjectInfo,
  getTaskInfo,
  getCustomerByTaskGid,
  getDCTStats,
  testDCTConnection,
  closeDCTPool,
  dctPool
};

