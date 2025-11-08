/**
 * Logger Middleware
 */

/**
 * Request Logger
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Log request
  console.log(`→ ${req.method} ${req.path}`);

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '❌' : '✅';
    console.log(
      `${statusColor} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });

  next();
}

/**
 * Webhook Logger (detailed)
 */
function webhookLogger(req, res, next) {
  if (req.path === '/webhook') {
    console.log('\n=== Incoming Webhook Request ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Method:', req.method);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    
    if (req.body) {
      console.log('Body:', JSON.stringify(req.body, null, 2));
    }
  }
  
  next();
}

module.exports = {
  requestLogger,
  webhookLogger,
};

