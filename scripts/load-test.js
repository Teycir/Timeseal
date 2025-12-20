import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 10 },   // Stay at 10 users
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
    errors: ['rate<0.05'],            // Custom error rate should be less than 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Generate test seal data
function generateSealData() {
  const unlockTime = Date.now() + 3600000; // 1 hour from now
  const secret = `Test secret ${Math.random()}`;
  
  return {
    encryptedBlob: new Uint8Array(1024), // 1KB test data
    keyB: `test-key-b-${Math.random()}`,
    unlockTime: unlockTime,
    isDMS: false,
  };
}

export default function () {
  // Test 1: Create seal
  const createPayload = generateSealData();
  const createRes = http.post(`${BASE_URL}/api/create-seal`, JSON.stringify(createPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const createSuccess = check(createRes, {
    'create seal status is 200': (r) => r.status === 200,
    'create seal has sealId': (r) => JSON.parse(r.body).sealId !== undefined,
  });
  
  errorRate.add(!createSuccess);
  
  if (createSuccess) {
    const sealId = JSON.parse(createRes.body).sealId;
    
    // Test 2: Get seal (locked)
    sleep(1);
    const getRes = http.get(`${BASE_URL}/api/seal/${sealId}`);
    
    const getSuccess = check(getRes, {
      'get seal status is 200': (r) => r.status === 200,
      'seal is locked': (r) => JSON.parse(r.body).isLocked === true,
    });
    
    errorRate.add(!getSuccess);
  }
  
  // Test 3: Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health check is 200': (r) => r.status === 200,
  });
  
  // Test 4: Metrics endpoint
  const metricsRes = http.get(`${BASE_URL}/api/metrics`);
  check(metricsRes, {
    'metrics endpoint is 200': (r) => r.status === 200,
  });
  
  sleep(1);
}

// Spike test scenario
export function spikeTest() {
  const res = http.get(`${BASE_URL}/api/health`);
  check(res, {
    'spike test health check': (r) => r.status === 200,
  });
}

// Stress test scenario
export function stressTest() {
  const payload = generateSealData();
  const res = http.post(`${BASE_URL}/api/create-seal`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(res, {
    'stress test create seal': (r) => r.status === 200 || r.status === 429, // Accept rate limit
  });
}
