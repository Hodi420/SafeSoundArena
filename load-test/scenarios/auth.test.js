import { check, sleep } from 'k6';
import http from 'k6/http';
import { SharedArray } from 'k6/data';
import { Rate } from 'k6/metrics';
import { env } from '../k6.config.js';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const tokenRefreshDuration = new Trend('token_refresh_duration');

// Test data
const testUsers = new SharedArray('users', function() {
  return JSON.parse(open('./test-data/users.json'));
});

// Shared variables
let authTokens = {};

// Helper functions
function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

// Test scenarios
export function smoke() {
  const url = `${env.BASE_URL}/api/auth/health`;
  const res = http.get(url);
  
  check(res, {
    'health check status is 200': (r) => r.status === 200,
  });
  
  errorRate.add(res.status >= 400);
  sleep(1);
}

export function defaultScenario() {
  // 70% login, 20% refresh, 10% other operations
  const rand = Math.random();
  
  if (rand < 0.7) {
    testLogin();
  } else if (rand < 0.9) {
    testTokenRefresh();
  } else {
    testProtectedEndpoint();
  }
  
  sleep(Math.random() * 2); // Random sleep between 0-2 seconds
}

export function stress() {
  // More aggressive testing for stress scenarios
  const rand = Math.random();
  
  if (rand < 0.8) {
    testLogin();
  } else {
    testTokenRefresh();
  }
  
  sleep(Math.random()); // Shorter sleep for stress testing
}

// Test cases
function testLogin() {
  const user = getRandomUser();
  const url = `${env.BASE_URL}/api/auth/login`;
  
  const start = new Date();
  const res = http.post(url, JSON.stringify({
    email: user.email,
    password: user.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const duration = new Date() - start;
  loginDuration.add(duration);
  
  const success = check(res, {
    'login status is 200': (r) => r.status === 200,
    'login response has tokens': (r) => {
      if (r.status === 200) {
        const body = JSON.parse(r.body);
        return body.tokens && body.tokens.accessToken && body.tokens.refreshToken;
      }
      return true;
    },
  });
  
  if (success && res.status === 200) {
    const body = JSON.parse(res.body);
    authTokens[user.id] = body.tokens;
  }
  
  errorRate.add(!success || res.status >= 400);
}

function testTokenRefresh() {
  const user = getRandomUser();
  const tokens = authTokens[user.id];
  
  if (!tokens || !tokens.refreshToken) {
    // Skip if no refresh token available
    return;
  }
  
  const url = `${env.BASE_URL}/api/auth/refresh-token`;
  const start = new Date();
  
  const res = http.post(url, JSON.stringify({
    refreshToken: tokens.refreshToken,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.accessToken}`,
    },
  });
  
  const duration = new Date() - start;
  tokenRefreshDuration.add(duration);
  
  const success = check(res, {
    'refresh status is 200': (r) => r.status === 200,
    'refresh returns new tokens': (r) => {
      if (r.status === 200) {
        const body = JSON.parse(r.body);
        return body.accessToken && body.refreshToken;
      }
      return true;
    },
  });
  
  if (success && res.status === 200) {
    const body = JSON.parse(res.body);
    authTokens[user.id] = {
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
    };
  }
  
  errorRate.add(!success || res.status >= 400);
}

function testProtectedEndpoint() {
  const user = getRandomUser();
  const tokens = authTokens[user.id];
  
  if (!tokens || !tokens.accessToken) {
    // Skip if no access token available
    return;
  }
  
  const endpoints = [
    '/api/auth/me',
    '/api/user/preferences',
    '/api/user/notifications',
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const url = `${env.BASE_URL}${endpoint}`;
  
  const res = http.get(url, {
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`,
    },
  });
  
  check(res, {
    [`${endpoint} status is 200`]: (r) => r.status === 200,
  });
  
  errorRate.add(res.status >= 400);
}
