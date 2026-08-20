import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const TOKEN = __ENV.AUTH_TOKEN || '';

const latencyTrend = new Trend('latency');
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 10 },    // Warmup
    { duration: '5m', target: 50 },   // Normal load
    { duration: '3m', target: 100 },  // Peak load
    { duration: '2m', target: 200 },  // Stress test
    { duration: '1m', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.02'],
  },
};

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
};

// Test database-optimized endpoints that exercise common queries
testData = {
  contactInsert: JSON.stringify({
    name: `Perf Test Contact ${Date.now()}`,
    phone: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    email: `perf${Date.now()}${Math.floor(Math.random() * 10000)}@perf.com`,
    source: 'api_test',
    stage: 'new',
    value: Math.floor(Math.random() * 50000),
  }),
  
  dealUpdate: JSON.stringify({
    stage: 'interested',
    probability: 45,
    value: Math.floor(Math.random() * 25000) + 5000,
  }),
  
  inquiryData: JSON.stringify({
    name: 'API Performance Test',
    email: `api_perf_${Date.now()}@test.com`,
    company: 'Performance Inc',
    message: 'Testing API performance under load',
  }),
};

const responses = [];

export default function () {
  const iterationStart = Date.now();
  
  // Parallel request simulation (concurrent requests within a single iteration)
  const requests = [];
  
  // Multiple GET operations that exercise list queries with indexes
  requests.push(http.get(`${BASE_URL}/api/analytics/performance`, { headers }));
  requests.push(http.get(`${BASE_URL}/api/contacts/search?name=Test`, { headers }));
  requests.push(http.get(`${BASE_URL}/api/deals?stage=proposal&sort=created_at`, { headers }));
  
  // POST operation that exercises insert
  requests.push(http.post(`${BASE_URL}/api/contacts`, testData.contactInsert, { headers }));
  
  // PUT operation for update
  requests.push(http.put(`${BASE_URL}/api/contacts/1`, testData.dealUpdate, { headers }));
  
  // Service inquiry (no auth required)
  requests.push(http.post(`${BASE_URL}/api/services/inquiry`, testData.inquiryData));
  
  // Wait for all requests to complete
  const responses = [];
  for (const request of requests) {
    if (request.status) {  // If request was made
      responses.push(request);
    }
  }
  
  // Check responses
  for (let i = 0; i < responses.length; i++) {
    const res = responses[i];
    const endpoint = requests[i] ? requests[i].url : 'unknown';
    
    // Record latency
    if (res.timings) {
      latencyTrend.add(res.timings.duration);
    }
    
    // Check for errors
    if (res.status === 200 || res.status === 201 || res.status === 204) {
      check(res, { [`${endpoint} - success`]: () => true });
    } else {
      errorRate.add(1);
      check(res, { [`${endpoint} - error < ${res.status}`]: () => false });
    }
  }
  
  // Simulate transaction processing with small delay
  sleep(Math.random() * 0.5 + 0.1);
  
  const iterationEnd = Date.now();
  responses.push({
    avgLatency: latencyTrend.average || 0,
    errorRate: errorRate.rate || 0,
    iterationTime: iterationEnd - iterationStart,
    timestamp: new Date().toISOString()
  });
}

export function handleSummary(data) {
  return {
    'tests/api-performance-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}