import { defineConfig } from 'k6/options';

export const options = {
  // Test scenarios with different workloads
  scenarios: {
    // Smoke test - verify script works with minimal load
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
      exec: 'smoke',
      startTime: '0s',
    },

    // Load test - normal load
    load: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '5m', target: 50 }, // Ramp up to 50 VUs
        { duration: '10m', target: 50 }, // Stay at 50 VUs
        { duration: '5m', target: 0 }, // Ramp down
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'load' },
      exec: 'default',
      startTime: '2m',
    },

    // Stress test - beyond normal load
    stress: {
      executor: 'ramping-arrival-rate',
      preAllocatedVUs: 100,
      timeUnit: '1s',
      stages: [
        { target: 20, duration: '5m' }, // 20 iterations per second
        { target: 50, duration: '10m' }, // 50 iterations per second
        { target: 0, duration: '5m' }, // Ramp down
      ],
      tags: { test_type: 'stress' },
      exec: 'stress',
      startTime: '25m',
    },
  },

  // Thresholds for pass/fail criteria
  thresholds: {
    http_req_failed: ['rate<0.01'], // <1% errors
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
  },

  // Test-wide tags
  tags: {
    project: 'safesoundarena',
    environment: `${__ENV.ENV || 'staging'}`,
  },

  // Extensions
  ext: {
    loadimpact: {
      projectID: 1234567, // Set your project ID
      name: 'SafeSoundArena Load Test',
    },
  },
};

// Environment variables
export const env = {
  BASE_URL: __ENV.BASE_URL || 'https://api.staging.safesoundarena.com',
  TEST_USER_EMAIL: __ENV.TEST_USER_EMAIL || 'loadtest@example.com',
  TEST_USER_PASSWORD: __ENV.TEST_USER_PASSWORD || 'testpass123!',
  TEST_USER_COUNT: parseInt(__ENV.TEST_USER_COUNT || '1000'),
  RAMP_UP_TIME: __ENV.RAMP_UP_TIME || '5m',
};

export default function () {
  // This is a placeholder - actual test logic is in scenario files
  console.log('Running default scenario');
}
