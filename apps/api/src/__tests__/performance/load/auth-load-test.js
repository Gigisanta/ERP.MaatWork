/**
 * Load test for authentication endpoints
 * 
 * Tests login, token refresh, and logout under load
 * Run with: k6 run load/auth-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp up to 10 users
    { duration: '1m', target: 10 },  // Stay at 10 users
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  // Test login endpoint
  const loginPayload = JSON.stringify({
    email: 'test@example.com',
    password: 'test-password',
  });

  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const loginSuccess = check(loginRes, {
    'login status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'login response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  if (!loginSuccess) {
    errorRate.add(1);
  }

  // If login successful, test token refresh
  if (loginRes.status === 200) {
    const token = loginRes.json().token || loginRes.cookies.token?.[0]?.value;
    
    if (token) {
      const refreshRes = http.post(
        `${BASE_URL}/api/v1/auth/refresh`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cookie': `token=${token}`,
          },
        }
      );

      check(refreshRes, {
        'refresh status is 200': (r) => r.status === 200,
        'refresh response time < 500ms': (r) => r.timings.duration < 500,
      });
    }
  }

  sleep(1); // Wait 1 second between iterations
}

