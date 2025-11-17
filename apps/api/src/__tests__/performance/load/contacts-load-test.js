/**
 * Load test for contacts endpoints
 * 
 * Tests CRUD operations on contacts under load
 * Run with: k6 run load/contacts-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 5 },
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };

  // Test GET /contacts
  const listRes = http.get(`${BASE_URL}/api/v1/contacts?page=1&limit=10`, {
    headers,
  });

  const listSuccess = check(listRes, {
    'list contacts status is 200': (r) => r.status === 200,
    'list contacts response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  if (!listSuccess) {
    errorRate.add(1);
  }

  // Test POST /contacts (create)
  const createPayload = JSON.stringify({
    firstName: `Test${__VU}${__ITER}`,
    lastName: 'Contact',
    email: `test${__VU}${__ITER}@example.com`,
  });

  const createRes = http.post(`${BASE_URL}/api/v1/contacts`, createPayload, {
    headers,
  });

  check(createRes, {
    'create contact status is 201': (r) => r.status === 201,
    'create contact response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  // If creation successful, test GET /contacts/:id
  if (createRes.status === 201) {
    const contactId = createRes.json().data?.id;
    
    if (contactId) {
      const getRes = http.get(`${BASE_URL}/api/v1/contacts/${contactId}`, {
        headers,
      });

      check(getRes, {
        'get contact status is 200': (r) => r.status === 200,
        'get contact response time < 500ms': (r) => r.timings.duration < 500,
      });
    }
  }

  sleep(1);
}

