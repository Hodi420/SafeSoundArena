import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { SharedArray } from 'k6/data';
import { Rate } from 'k6/metrics';
import { env } from '../k6.config.js';

// Custom metrics
const errorRate = new Rate('errors');
const securityEvents = new Rate('security_events');

// Test data
const testUsers = new SharedArray('users', function () {
  return JSON.parse(open('../test-data/users.json'));
});

// Helper functions
function generateMaliciousInput(length = 20) {
  const maliciousStrings = [
    // SQL Injection
    "' OR '1'='1",
    '"; DROP TABLE users; --',
    '1; SELECT pg_sleep(10)--',
    // XSS
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    // Command Injection
    '; ls -la /',
    '| cat /etc/passwd',
    // Path Traversal
    '../../../etc/passwd',
    '%2e%2e%2fetc%2fpasswd',
    // NoSQL Injection
    '{"$ne": null}',
    '{"$gt": ""}',
  ];

  return maliciousStrings[Math.floor(Math.random() * maliciousStrings.length)];
}

// Test scenarios
export function testInjectionAttacks() {
  const url = `${env.BASE_URL}/api/auth/login`;
  const maliciousInput = generateMaliciousInput();

  const payloads = [
    { email: maliciousInput, password: 'test' },
    { email: 'test@example.com', password: maliciousInput },
    { [maliciousInput]: 'test' },
    JSON.parse(`{"${maliciousInput}": "${maliciousInput}"}`),
  ];

  payloads.forEach((payload, i) => {
    const res = http.post(url, JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json' },
      tags: { test_type: 'injection_test', payload_type: `type_${i + 1}` },
    });

    // We expect these to be rejected with 4xx status
    const passed = res.status >= 400 && res.status < 500;

    check(res, {
      [`injection test ${i + 1} blocked`]: () => passed,
      'no server errors': (r) => r.status < 500,
      'no sensitive data exposed': (r) =>
        !r.body.includes('SQL') && !r.body.includes('syntax error') && !r.body.includes('at '),
    });

    if (!passed) {
      securityEvents.add(1, { type: 'injection_vulnerability', payload_type: `type_${i + 1}` });
    }

    sleep(0.5);
  });
}

export function testBrokenAccessControl() {
  const testUser = testUsers[0];
  const adminUser = testUsers.find((u) => u.role === 'admin') || testUsers[0];

  // 1. Test horizontal privilege escalation
  const userUrl = `${env.BASE_URL}/api/users/${testUser.id}`;

  // Try to access another user's data
  const res1 = http.get(userUrl, {
    headers: { Authorization: `Bearer ${testUser.accessToken}` },
    tags: { test_type: 'access_control', test: 'horizontal' },
  });

  check(res1, {
    'cannot access other user data': (r) => r.status === 403 || r.status === 404,
  });

  // 2. Test vertical privilege escalation
  const adminUrl = `${env.BASE_URL}/api/admin/users`;

  const res2 = http.get(adminUrl, {
    headers: { Authorization: `Bearer ${testUser.accessToken}` },
    tags: { test_type: 'access_control', test: 'vertical' },
  });

  check(res2, {
    'non-admin cannot access admin endpoint': (r) => r.status === 403,
  });

  // 3. Test with missing/expired token
  const res3 = http.get(userUrl, {
    headers: { Authorization: 'Bearer invalid.token.here' },
    tags: { test_type: 'access_control', test: 'invalid_token' },
  });

  check(res3, {
    'invalid token rejected': (r) => r.status === 401,
  });

  // Log any failures
  if (res1.status < 400 || res2.status !== 403 || res3.status !== 401) {
    securityEvents.add(1, { type: 'access_control_violation' });
  }

  sleep(1);
}

export function testMassAssignment() {
  const testUser = testUsers[0];
  const updateUrl = `${env.BASE_URL}/api/users/${testUser.id}`;

  // Try to update privileged fields
  const payload = {
    email: testUser.email,
    role: 'admin',
    isEmailVerified: true,
    password: 'newpassword123!',
    // Try to inject additional fields
    ['__proto__']: { isAdmin: true },
    constructor: { prototype: { isAdmin: true } },
  };

  const res = http.put(updateUrl, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testUser.accessToken}`,
    },
    tags: { test_type: 'mass_assignment' },
  });

  // Verify the user wasn't actually made admin
  const checkRes = http.get(updateUrl, {
    headers: { Authorization: `Bearer ${testUser.accessToken}` },
  });

  const userData = checkRes.json();
  const isStillUser = userData.role !== 'admin';

  check(
    {
      status: res.status,
      role_not_changed: isStillUser,
    },
    {
      'mass assignment prevented': (r) =>
        r.status === 400 || (r.status === 200 && r.role_not_changed === true),
    }
  );

  if (!isStillUser) {
    securityEvents.add(1, { type: 'mass_assignment_vulnerability' });
  }

  sleep(1);
}

export function testRateLimiting() {
  const url = `${env.BASE_URL}/api/auth/login`;
  let rateLimited = false;

  // Make rapid requests to trigger rate limiting
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
      break;
    }

    // Small delay to avoid overwhelming the server too quickly
    sleep(0.1);
  }

  check(
    { rateLimited },
    {
      'rate limiting works': (r) => r.rateLimited === true,
    }
  );

  if (!rateLimited) {
    securityEvents.add(1, { type: 'rate_limit_bypass' });
  }

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

  sleep(1);
}

// Main test function
export default function () {
  const testType = __ENV.SCENARIO || 'all';

  const tests = {
    injection: testInjectionAttacks,
    access: testBrokenAccessControl,
    massAssignment: testMassAssignment,
    rateLimit: testRateLimiting,
  };

  if (testType === 'all') {
    // Run all tests
    Object.values(tests).forEach((test) => test());
  } else if (tests[testType]) {
    // Run specific test
    tests[testType]();
  } else {
    console.error(`Unknown test scenario: ${testType}`);
  }

  // Add a small delay between test iterations
  sleep(1);
}
