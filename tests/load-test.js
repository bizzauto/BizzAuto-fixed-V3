import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const userScenario = new Rate('user_scenario');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const USERS_FILE = __ENV.USERS_FILE || './users.json';

// Load user scenarios based on existing user types
const userScenarios = {
  'admin': { weight: 10, endpoints: ['/api/contacts', '/api/deals', '/api/analytics'] },
  'agent': { weight: 30, endpoints: ['/api/contacts', '/api/deals'] },
  'guest': { weight: 60, endpoints: ['/api/contacts', '/api/deals'] },
};

export const options = {
  stages: [
    { duration: '1m', target: 10 },    // Warm up
    { duration: '3m', target: 100 },  // Normal load  
    { duration: '2m', target: 500 },  // Peak load
    { duration: '1m', target: 1000 }, // Stress test
    { duration: '1m', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000', 'p(100)<1500'],
    http_req_failed: ['rate<0.01'],
    error_rate: ['rate<0.02'],
  },
};

// User session simulation
let authToken = '';

export function setup() {
  // Load authenticated user from users file or use provided token
  if (AUTH_TOKEN) {
    authToken = AUTH_TOKEN;
  }
  return { token: authToken };
}

export default function (params) {
  const token = params.token || AUTH_TOKEN;
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  // Random weighted scenario selection
  const totalWeight = Object.values(userScenarios).reduce((sum, s) => sum + s.weight, 0);
  const pick = Math.random() * totalWeight;
  let currentWeight = 0;
  let selectedScenario = 'guest';
  
  for (const [scenario, config] of Object.entries(userScenarios)) {
    currentWeight += config.weight;
    if (pick <= currentWeight) {
      selectedScenario = scenario;
      break;
    }
  }

  userScenario.add(true);

  switch (selectedScenario) {
    case 'admin':
      // Admin with full access
      checkAdminTasks(headers);
      break;
    case 'agent':
      // Agent with moderate access
      checkAgentTasks(headers);
      break;
    case 'guest':
      // Guest with limited access
      checkGuestTasks(headers);
      break;
  }

  // Occasional sleep to simulate human behavior
  sleep(Math.random() * 2 + 0.5);
}

function checkAdminTasks(headers) {
  // Admin endpoints
  http.get(`${BASE_URL}/api/users`, { headers });
  http.get(`${BASE_URL}/api/settings`, { headers });
  http.get(`${BASE_URL}/api/analytics`, { headers });
  
  // CRUD operations
  const contact = http.post(`${BASE_URL}/api/contacts`, JSON.stringify(generateContact()), { headers });
  check(contact, { 'contact created': (r) => r.status === 201 });
  
  const deal = http.post(`${BASE_URL}/api/deals`, JSON.stringify(generateDeal()), { headers });
  check(deal, { 'deal created': (r) => r.status === 201 });
}

function checkAgentTasks(headers) {
  // Agent endpoints - no administrative access
  http.get(`${BASE_URL}/api/contacts`, { headers });
  http.get(`${BASE_URL}/api/deals`, { headers });
  
  // Limited updates (only assigned contacts/deals)
  http.put(`${BASE_URL}/api/contacts/assigned`, {}, { headers });
  http.put(`${BASE_URL}/api/deals/assigned`, {}, { headers });
}

function checkGuestTasks(headers) {
  // Guest endpoints - read-only access
  http.get(`${BASE_URL}/api/contacts`, { headers });
  http.get(`${BASE_URL}/api/deals`, { headers });
  
  // Service requests (no auth)
  http.post(`${BASE_URL}/api/services/inquiry`, JSON.stringify(generateInquiry()), { headers: { ...headers, 'X-Guest-Token': generateGuestToken() } });
}

// Helper functions for realistic data generation
function generateContact() {
  const names = ['John Doe', 'Jane Smith', 'Robert Johnson', 'Emily Brown', 'Michael Davis'];
  const companies = ['Acme Corp', 'Tech Solutions', 'Global Industries', 'Startup XYZ'];
  return {
    name: names[Math.floor(Math.random() * names.length)],
    phone: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    email: `user${Math.floor(Math.random() * 10000)}@example.com`,
    company: companies[Math.floor(Math.random() * companies.length)],
    source: Math.random() > 0.5 ? 'website' : 'referral',
    stage: ['new', 'qualified', 'interested', 'proposal', 'won'].sort(() => 0.5 - Math.random())[0],
    value: Math.floor(Math.random() * 100000),
  };
}

function generateDeal() {
  return {
    name: 'Q4 Enterprise Deal',
    value: Math.floor(Math.random() * 50000) + 10000,
    stage: 'proposal',
    probability: Math.floor(Math.random() * 50) + 50,
    closeDate: new Date(Date.now() + Math.random() * (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
  };
}

function generateInquiry() {
  return {
    name: 'Inquiry about CRM features',
    email: `inquiry${Date.now()}@example.com`,
    company: 'Prospect Company',
    message: 'I am interested in your enterprise CRM solution for team collaboration.',
  };
}

function generateGuestToken() {
  return `guest_${Math.random().toString(36).substr(2, 9)}`;
}

export function handleSummary(data) {
  const summary = {
    'load-test/stats.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
  
  // Generate detailed report
  const report = {
    timestamp: new Date().toISOString(),
    VUs: dataVU ? dataVU : { iterations: data.iterations, failures: data.failures, errors: data.errors },
    thresholds_passed: Object.entries(data.thresholds).filter(([k, v]) => v.pass).map(([k]) => k),
    thresholds_failed: Object.entries(data.thresholds).filter(([k, v]) => !v.pass).map(([k]) => k),
  };
  
  return {
    'load-test/report.json': JSON.stringify(report, null, 2),
    ...summary,
  };
}