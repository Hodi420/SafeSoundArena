const client = require('prom-client');
const responseTime = require('response-time');

// Create a Registry to register the metrics
const register = new client.Registry();

// Enable collection of default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const authRequests = new client.Counter({
  name: 'auth_requests_total',
  help: 'Total number of authentication requests',
  labelNames: ['method', 'endpoint', 'status'],
  registers: [register]
});

const authDurations = new client.Histogram({
  name: 'auth_request_duration_seconds',
  help: 'Duration of authentication requests in seconds',
  labelNames: ['method', 'endpoint'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10],
  registers: [register]
});

const activeSessions = new client.Gauge({
  name: 'auth_active_sessions',
  help: 'Number of active user sessions',
  labelNames: ['user_type'],
  registers: [register]
});

const failedLoginAttempts = new client.Counter({
  name: 'auth_failed_login_attempts_total',
  help: 'Total number of failed login attempts',
  labelNames: ['reason'],
  registers: [register]
});

const tokenRefreshes = new client.Counter({
  name: 'auth_token_refreshes_total',
  help: 'Total number of token refresh operations',
  labelNames: ['status'],
  registers: [register]
});

const passwordResets = new client.Counter({
  name: 'auth_password_resets_total',
  help: 'Total number of password reset requests',
  labelNames: ['status'],
  registers: [register]
});

const accountLocks = new client.Counter({
  name: 'auth_account_locks_total',
  help: 'Total number of account lock events',
  labelNames: ['reason'],
  registers: [register]
});

const securityEvents = new client.Counter({
  name: 'auth_security_events_total',
  help: 'Security-related events',
  labelNames: ['type'],
  registers: [register]
});

// Business metrics
const userRegistrations = new client.Counter({
  name: 'auth_user_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['registration_method'],
  registers: [register]
});

const userLogins = new client.Counter({
  name: 'auth_user_logins_total',
  help: 'Total number of user logins',
  labelNames: ['method'],
  registers: [register]
});

const mfaAttempts = new client.Counter({
  name: 'auth_mfa_attempts_total',
  help: 'Total number of MFA attempts',
  labelNames: ['type', 'status'],
  registers: [register]
});

// Rate limiting metrics
const rateLimitEvents = new client.Counter({
  name: 'auth_rate_limit_events_total',
  help: 'Rate limiting events',
  labelNames: ['type', 'key'],
  registers: [register]
});

// Token metrics
const tokenIssued = new client.Counter({
  name: 'auth_tokens_issued_total',
  help: 'Total number of tokens issued',
  labelNames: ['token_type'],
  registers: [register]
});

const tokenRevoked = new client.Counter({
  name: 'auth_tokens_revoked_total',
  help: 'Total number of tokens revoked',
  labelNames: ['token_type', 'reason'],
  registers: [register]
});

// Session metrics
const sessionDurations = new client.Histogram({
  name: 'auth_session_duration_seconds',
  help: 'Duration of user sessions in seconds',
  labelNames: ['user_type'],
  buckets: [60, 300, 900, 1800, 3600, 14400, 28800, 86400],
  registers: [register]
});

// Request metrics middleware
const requestMetrics = responseTime((req, res, time) => {
  const route = req.route ? req.route.path : req.path;
  const method = req.method;
  const status = res.statusCode;

  // Record request metrics
  authRequests.inc({ method, endpoint: route, status });
  authDurations.observe({ method, endpoint: route }, time / 1000);

  // Track active sessions
  if (req.user) {
    activeSessions.inc({ user_type: req.user.role || 'user' });
  }
});

// Track failed login attempts
function trackFailedLogin(reason = 'invalid_credentials') {
  failedLoginAttempts.inc({ reason });
  
  // If multiple failed attempts, trigger security event
  if (reason === 'invalid_credentials') {
    securityEvents.inc({ type: 'failed_login_attempt' });
  }
}

// Track successful login
function trackSuccessfulLogin(method = 'password') {
  userLogins.inc({ method });
  securityEvents.inc({ type: 'successful_login' });
}

// Track MFA attempt
function trackMFAAttempt(type, success) {
  mfaAttempts.inc({ 
    type, 
    status: success ? 'success' : 'failure' 
  });
}

// Track token operations
function trackTokenIssued(tokenType = 'access_token') {
  tokenIssued.inc({ token_type: tokenType });
}

function trackTokenRevoked(tokenType, reason = 'logout') {
  tokenRevoked.inc({ token_type: tokenType, reason });
}

// Track rate limiting events
function trackRateLimit(key, type = 'global') {
  rateLimitEvents.inc({ type, key });
}

// Track session duration
function trackSessionDuration(user, durationInSeconds) {
  sessionDurations.observe(
    { user_type: user.role || 'user' },
    durationInSeconds
  );
  
  if (activeSessions) {
    activeSessions.dec({ user_type: user.role || 'user' });
  }
}

// Track account lock events
function trackAccountLock(reason = 'too_many_attempts') {
  accountLocks.inc({ reason });
  securityEvents.inc({ type: 'account_locked' });
}

// Track user registration
function trackUserRegistration(method = 'email') {
  userRegistrations.inc({ registration_method: method });
}

// Track password reset
function trackPasswordReset(status = 'requested') {
  passwordResets.inc({ status });
}

// Track token refresh
function trackTokenRefresh(success = true) {
  tokenRefreshes.inc({ status: success ? 'success' : 'failure' });
}

// Export all metrics and functions
module.exports = {
  register,
  requestMetrics,
  metrics: {
    authRequests,
    authDurations,
    activeSessions,
    failedLoginAttempts,
    tokenRefreshes,
    passwordResets,
    accountLocks,
    securityEvents,
    userRegistrations,
    userLogins,
    mfaAttempts,
    rateLimitEvents,
    tokenIssued,
    tokenRevoked,
    sessionDurations
  },
  trackers: {
    trackFailedLogin,
    trackSuccessfulLogin,
    trackMFAAttempt,
    trackTokenIssued,
    trackTokenRevoked,
    trackRateLimit,
    trackSessionDuration,
    trackAccountLock,
    trackUserRegistration,
    trackPasswordReset,
    trackTokenRefresh
  }
};
