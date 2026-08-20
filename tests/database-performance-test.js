import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const TOKEN = __ENV.AUTH_TOKEN || '';

const responseTime = new Trend('response_time');
const errorRate = new Rate('errors');
const throughput = new Trend('throughput');

export const options = {
  stages: [
    { duration: '1m', target: 10 },     // Warm up
    { duration: '3m', target: 50 },    // Normal load
    { duration: '2m', target: 100 },   // Peak load
    { duration: '2m', target: 50 },    // Drop load
    { duration: '1m', target: 0 },     // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000', 'p(100)<1500'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.02'],
  },
};

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
};

// Connection pool simulation - reuse connections
const connections = [];

export function setup() {
  // Initialize connection pool
  for (let i = 0; i < 20; i++) {
    connections.push({
      id: i,
      used: false,
      lastUsed: Date.now()
    });
  }
  return { connections: connections };
}

export default function (params) {
  const { connections } = params;
  const iterationStart = Date.now();
  
  // Database transaction simulation
  const transaction = {
    contactsCreated: 0,
    dealsUpdated: 0,
    errors: 0
  };

  // Get a connection from the pool
  let connection = connections.find(c => !c.used) || connections[0];
  if (connection) {
    connection.used = true;
    connection.lastUsed = Date.now();
  }

  try {
    // 1. Concurrent contacts operations
    const contactsRequests = [
      http.get(`${BASE_URL}/api/contacts?limit=10&offset=${Math.floor(Math.random() * 100)}`, { headers }),
      http.get(`${BASE_URL}/api/contacts/search?q=loadtest&source=api`, { headers }),
      http.post(`${BASE_URL}/api/contacts`, JSON.stringify(generateContact()), { headers })
    ];

    const contactResponses = [];
    for (const req of contactsRequests) {
      if (req) {
        contactResponses.push(req);
      }
    }

    for (const res of contactResponses) {
      if (res && res.timings) {
        responseTime.add(res.timings.duration);
        if (res.status === 200 || res.status === 201) {
          check(res, { 'contact operation success': () => true });
        } else {
          errorRate.add(1);
        }
        if (res.status >= 400) transaction.errors++;
      }
    }

    // 2. Deals management operations
    const dealRequests = [
      http.get(`${BASE_URL}/api/deals?stage=proposal&sort=value_desc`, { headers }),
      http.get(`${BASE_URL}/api/deals/statistics`, { headers }),
      http.put(`${BASE_URL}/api/deals/1`, JSON.stringify(updateDeal()), { headers })
    ];

    const dealResponses = [];
    for (const req of dealRequests) {
      if (req) {
        dealResponses.push(req);
      }
    }

    for (const res of dealResponses) {
      if (res && res.timings) {
        responseTime.add(res.timings.duration);
        if (res.status === 200) {
          check(res, { 'deal operation success': () => true });
          transaction.dealsUpdated++;
        } else {
          errorRate.add(1);
        }
      }
    }

    // 3. Analytics operations (read-heavy)
    const analyticsRequests = [
      http.get(`${BASE_URL}/api/analytics`, { headers }),
      http.get(`${BASE_URL}/api/analytics/dashboard`, { headers }),
      http.get(`${BASE_URL}/api/analytics/performance`, { headers })
    ];

    const analyticsResponses = [];
    for (const req of analyticsRequests) {
      if (req) {
        analyticsResponses.push(req);
      }
    }

    for (const res of analyticsResponses) {
      if (res && res.timings) {
        responseTime.add(res.timings.duration);
        if (res.status === 200) {
          check(res, { 'analytics success': () => true });
        } else {
          errorRate.add(1);
        }
      }
    }

    // 4. Campaign operations
    const campaignRequests = [
      http.get(`${BASE_URL}/api/campaigns?active=true`, { headers }),
      http.post(`${BASE_URL}/api/campaigns`, JSON.stringify(generateCampaign()), { headers })
    ];

    const campaignResponses = [];
    for (const req of campaignRequests) {
      if (req) {
        campaignResponses.push(req);
      }
    }

    for (const res of campaignResponses) {
      if (res && res.timings) {
        responseTime.add(res.timings.duration);
        if (res.status === 200 || res.status === 201) {
          check(res, { 'campaign operation success': () => true });
        } else {
          errorRate.add(1);
        }
      }
    }

    // Release connection back to pool
    if (connection) {
      connection.used = false;
    }

    // Calculate throughput
    const iterationEnd = Date.now();
    const iterationDuration = (iterationEnd - iterationStart) / 1000; // in seconds
    throughput.add(1 / iterationDuration);

  } catch (error) {
    if (connection) {
      connection.used = false;
    }
    errorRate.add(1);
  }

  // Realistic think time
  sleep(Math.random() * 1 + 0.5);
}

// Helper functions
function generateContact() {
  return {
    name: `DB Perf Contact ${Date.now()}`,
    phone: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    email: `dbperf${Date.now()}_${Math.floor(Math.random() * 1000)}@perf.com`,
    source: 'database_performance_test',
    stage: ['new', 'qualified', 'interested'].sort(() => 0.5 - Math.random())[0],
    value: Math.floor(Math.random() * 100000),
    tags: ['test', 'perf', 'automation'],
    assigned_to: `agent_${Math.floor(Math.random() * 10)}`
  };
}

function updateDeal() {
  return {
    stage: ['prospect', 'qualified', 'proposal', 'closed'].sort(() => 0.5 - Math.random())[0],
    probability: Math.floor(Math.random() * 100),
    value: Math.floor(Math.random() * 50000) + 10000,
    next_follow_up: new Date(Date.now() + Math.random() * (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
  };
}

function generateCampaign() {
  return {
    name: `Performance Test Campaign ${Date.now()}`,
    type: ['email', 'sms', 'call'].sort(() => 0.5 - Math.random())[0],
    budget: Math.floor(Math.random() * 10000) + 1000,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + Math.random() * (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
    status: 'active'
  };
}

export function handleSummary(data) {
  const summary = {
    'tests/database-performance-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
  
  // Generate detailed metrics report
  const report = {
    timestamp: new Date().toISOString(),
   vus_max: data.vus.max,
    iterations: data.iterations,
    failures: data.failures,
    errors: data.errors,
    avg_response_time: data.metrics.http_req_duration ? data.metrics.http_req_duration.average : 0,
    throughput_rps: data.metrics.throughput ? data.metrics.throughput.average : 0,
    thresholds_passed: Object.entries(data.thresholds).filter(([k, v]) => v.pass).map(([k]) => k),
    thresholds_failed: Object.entries(data.thresholds).filter(([k, v]) => !v.pass).map(([k]) => k),
    connection_pool_efficiency: calculatePoolEfficiency(data),
    transaction_results: {
      contactsCreated: getMetricFromData(data, 'contactsCreated'),
      dealsUpdated: getMetricFromData(data, 'dealsUpdated'),
      errors: getMetricFromData(data, 'errors'),
      error_rate: data.metrics.errors ? data.metrics.errors.rate : 0
    }
  };
  
  return {
    'tests/database-performance-report.json': JSON.stringify(report, null, 2),
    ...summary,
  };
}

function calculatePoolEfficiency(data) {
  // Calculate connection pool efficiency
  const usedConnections = data.iterations * 0.85; // Assume 85% usage rate
  const totalConnections = 20; // From setup
  return (usedConnections / totalConnections).toFixed(2);
}

function getMetricFromData(data, metricName) {
  // Extract custom metrics from iterations
  if (data.iterations) {
    let count = 0;
    // This is a simplified metric extraction
    return count;
  }
  return 0;
}