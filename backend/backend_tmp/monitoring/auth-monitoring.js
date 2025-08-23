const { Counter, Histogram, Gauge, collectDefaultMetrics } = require('prom-client');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, json } = format;

// Prometheus Metrics
const authMetrics = {
  // Counters
  loginAttempts: new Counter({
    name: 'auth_login_attempts_total',
    help: 'Total number of login attempts',
    labelNames: ['status', 'method']
  }),
  
  tokenRefreshes: new Counter({
    name: 'auth_token_refreshes_total',
    help: 'Total number of token refresh attempts',
    labelNames: ['status']
  }),
  
  // Histograms
  authDuration: new Histogram({
    name: 'auth_request_duration_seconds',
    help: 'Duration of authentication requests in seconds',
    labelNames: ['endpoint', 'method'],
    buckets: [0.1, 0.5, 1, 2, 5]
  }),
  
  // Gauges
  activeSessions: new Gauge({
    name: 'auth_active_sessions',
    help: 'Number of active user sessions'
  })
};

// Collect default Node.js metrics
collectDefaultMetrics();

// Winston Logger
const authLogger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    json()
  ),
  transports: [
    new transports.File({ 
      filename: 'logs/auth-error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new transports.File({ 
      filename: 'logs/auth-combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Log to console in development
if (process.env.NODE_ENV !== 'production') {
  authLogger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple()
    )
  }));
}

// Monitoring middleware
function monitorAuth(req, res, next) {
  const start = Date.now();
  const path = req.path;
  const method = req.method;
  
  // Log the request
  authLogger.info({
    message: 'Auth request',
    path,
    method,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  // Track active sessions for login/logout
  if (path.endsWith('/login') && method === 'POST') {
    authMetrics.activeSessions.inc();
  } else if (path.endsWith('/logout') && method === 'POST') {
    authMetrics.activeSessions.dec();
  }
  
  // Record response time
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    authMetrics.authDuration
      .labels(path, method)
      .observe(duration / 1000); // Convert to seconds
    
    // Log the response
    authLogger.info({
      message: 'Auth response',
      path,
      method,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id || 'anonymous'
    });
  });
  
  next();
}

// Error handling middleware
function errorHandler(err, req, res, next) {
  authLogger.error({
    message: 'Auth error',
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id || 'anonymous'
  });
  
  // Track failed login attempts
  if (req.path.endsWith('/login') && req.method === 'POST') {
    authMetrics.loginAttempts.inc({
      status: 'failed',
      method: 'password'
    });
  }
  
  next(err);
}

// Security event logger
function logSecurityEvent(event, metadata = {}) {
  const securityLogger = createLogger({
    level: 'warn',
    format: combine(
      timestamp(),
      json()
    ),
    transports: [
      new transports.File({ 
        filename: 'logs/security.log',
        maxsize: 10485760, // 10MB
        maxFiles: 5
      })
    ]
  });
  
  securityLogger.warn({
    event,
    ...metadata,
    timestamp: new Date().toISOString()
  });
}

// Alerting function for suspicious activities
function alertSuspiciousActivity(activity, metadata = {}) {
  // In a real implementation, this would trigger alerts (email, Slack, PagerDuty, etc.)
  logSecurityEvent('suspicious_activity', {
    ...metadata,
    severity: 'high',
    action: 'alert_triggered'
  });
  
  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.warn('SECURITY ALERT:', activity, metadata);
  }
}

module.exports = {
  authMetrics,
  authLogger,
  monitorAuth,
  errorHandler,
  logSecurityEvent,
  alertSuspiciousActivity
};
