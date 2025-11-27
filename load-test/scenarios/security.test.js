import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';
import { randomIntBetween, randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { SharedArray } from 'k6/data';
import { env } from '../k6.config.js';

// Custom metrics
const errorRate = new Rate('errors');
const authAttempts = new Rate('auth_attempts');
const securityEvents = new Rate('security_events');

// Test data
const testUsers = new SharedArray('users', function () {
  return JSON.parse(open('../test-data/users.json'));
});

// Security test scenarios
export function bruteForce() {
  // Test for account lockout after multiple failed attempts
  const testUser = testUsers[0];
  const url = `${env.BASE_URL}/api/auth/login`;

  // Generate random passwords to simulate brute force
  for (let i = 0; i < 10; i++) {
    const payload = JSON.stringify({
      email: testUser.email,
      password: `wrongpass${randomString(8)}`,
    });

    const res = http.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { test_type: 'brute_force' },
    });

    check(res, {
      'status is not 200': (r) => r.status !== 200,
      'has rate limit headers': (r) =>
        r.headers['X-RateLimit-Limit'] !== undefined &&
        r.headers['X-RateLimit-Remaining'] !== undefined,
    });

    // Check for account lockout
    if (res.status === 429 || res.status === 423) {
      securityEvents.add(1, { type: 'account_locked' });
      break;
    }

    sleep(0.1);
  }

  // Verify account is locked
  const res = http.post(
    url,
    JSON.stringify({
      email: testUser.email,
      password: testUser.password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { test_type: 'account_lock_verify' },
    }
  );

  check(res, {
    'account is locked': (r) => r.status === 423,
  });
}

export function sqlInjection() {
  // Test for SQL injection vulnerabilities
  const injectionPayloads = [
    "' OR '1'='1",
    '"; DROP TABLE users; --',
    "' OR 1=CONVERT(int, (SELECT table_name FROM information_schema.tables))--",
    '1; SELECT pg_sleep(10)--',
  ];

  const url = `${env.BASE_URL}/api/auth/login`;

  injectionPayloads.forEach((payload, i) => {
    const res = http.post(
      url,
      JSON.stringify({
        email: `test${i}@example.com`,
        password: payload,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { test_type: 'sql_injection' },
      }
    );

    // We expect these to fail, but with proper error handling (not 500 errors)
    check(res, {
      'status is not 500': (r) => r.status !== 500,
      'no SQL errors in response': (r) =>
        !r.body.includes('SQL syntax') && !r.body.includes('syntax error at'),
    });

    securityEvents.add(1, { type: 'injection_attempt' });
    sleep(0.5);
  });
}

export function xssAndInjection() {
  // Test for XSS and other injection attacks
  const xssPayloads = ['<script>alert(1)</script>', '${7*7}', '{{7*7}}', 'javascript:alert(1)'];

  const url = `${env.BASE_URL}/api/auth/register`;

  xssPayloads.forEach((payload, i) => {
    const user = {
      email: `xss${i}@example.com`,
      password: 'TestPass123!',
      username: `xss_test_${i}`,
      name: payload,
    };

    const res = http.post(url, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
      tags: { test_type: 'xss_test' },
    });

    check(res, {
      'input sanitization works': (r) =>
        r.status === 400 || // Should reject bad input
        (r.status === 201 && !r.body.includes(payload)), // Or sanitize it
    });

    securityEvents.add(1, { type: 'xss_attempt' });
    sleep(0.5);
  });
}

export function tokenSecurity() {
  // Test JWT token security
  const user = testUsers[1];
  const loginUrl = `${env.BASE_URL}/api/auth/login`;
  const protectedUrl = `${env.BASE_URL}/api/auth/me`;

  // 1. Get valid token
  const loginRes = http.post(
    loginUrl,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { test_type: 'token_security' },
    }
  );

  if (loginRes.status !== 200) return;

  const token = loginRes.json('tokens.accessToken');

  // 2. Test token tampering
  const parts = token.split('.');
  const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

  // Tamper with the payload
  payload.role = 'admin';

  // Reconstruct token with tampered payload
  const tamperedToken = [
    parts[0],
    Buffer.from(JSON.stringify(payload)).toString('base64'),
    parts[2],
  ].join('.');

  // 3. Try to use tampered token
  const tamperedRes = http.get(protectedUrl, {
    headers: {
      Authorization: `Bearer ${tamperedToken}`,
    },
    tags: { test_type: 'token_tamper' },
  });

  check(tamperedRes, {
    'rejects tampered token': (r) => r.status === 401,
  });

  // 4. Test expired token
  const expiredToken = generateExpiredToken(user);
  const expiredRes = http.get(protectedUrl, {
    headers: {
      Authorization: `Bearer ${expiredToken}`,
    },
    tags: { test_type: 'expired_token' },
  });

  check(expiredRes, {
    'rejects expired token': (r) => r.status === 401,
  });

  securityEvents.add(1, { type: 'token_tests_complete' });
}

// Helper functions
function generateExpiredToken(user) {
  // This would use the same JWT library as your auth service
  // For testing, we'll just return a mock expired token
  return (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJ1c2VySWQiOiIxMjM0NTY3ODkwIiwicm9sZSI6InVzZXIiLCJpYXQiOjE2NTk4MzkwMjIsImV4cCI6MTY1OTg0MjYyMn0.' +
    'invalid-signature-for-testing'
  );
}

export function rateLimiting() {
  // Test rate limiting
  const url = `${env.BASE_URL}/api/auth/login`;
  let rateLimited = false;

  for (let i = 0; i < 100; i++) {
    const res = http.post(
      url,
      JSON.stringify({
        email: `rate-test-${i}@example.com`,
        password: 'wrongpassword',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { test_type: 'rate_limit_test' },
      }
    );

    if (res.status === 429) {
      rateLimited = true;
      securityEvents.add(1, { type: 'rate_limited' });
      break;
    }

    authAttempts.add(1);
  }

  check(
    { rateLimited },
    {
      'eventually gets rate limited': (r) => r.rateLimited === true,
    }
  );

  // Test if rate limit resets after window
  sleep(60); // Wait for rate limit window to reset

  const finalRes = http.post(
    url,
    JSON.stringify({
      email: 'final-test@example.com',
      password: 'testpass',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { test_type: 'rate_limit_reset' },
    }
  );

  check(finalRes, {
    'rate limit resets after window': (r) => r.status !== 429,
  });
}

// Main test function
export default function () {
  const testType = __ENV.SCENARIO || 'bruteForce';

  switch (testType) {
    case 'bruteForce':
      bruteForce();
      break;
    case 'sqlInjection':
      sqlInjection();
      break;
    case 'xss':
      xssAndInjection();
      break;
    case 'tokenSecurity':
      tokenSecurity();
      break;
    case 'rateLimiting':
      rateLimiting();
      break;
    default:
      // Run all security tests
      bruteForce();
      sqlInjection();
      xssAndInjection();
      tokenSecurity();
      rateLimiting();
  }

  sleep(1);
}
