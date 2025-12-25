import autocannon from 'autocannon';

const target = process.env.TARGET_URL || 'http://localhost:3000';

console.log('🔥 TimeSeal Load Test\n');
console.log(`Target: ${target}`);
console.log(`Duration: 10 seconds per endpoint\n`);

// Test critical endpoints
const tests = [
  {
    name: 'Seal Creation',
    url: `${target}/api/seal`,
    method: 'POST',
    body: JSON.stringify({
      encryptedBlob: 'test'.repeat(100),
      encryptedKeyB: 'key'.repeat(10),
      iv: 'iv'.repeat(8),
      unlockTime: Date.now() + 86400000,
      mode: 'TIMED',
      turnstileToken: 'test'
    }),
    headers: { 'Content-Type': 'application/json' }
  },
  {
    name: 'Seal Status Check',
    url: `${target}/api/seal/test123`,
    method: 'GET'
  },
  {
    name: 'Analytics Tracking',
    url: `${target}/api/analytics`,
    method: 'POST',
    body: JSON.stringify({
      eventType: 'seal_created',
      component: 'test'
    }),
    headers: { 'Content-Type': 'application/json' }
  }
];

async function runTest(test) {
  console.log(`\n📊 Testing: ${test.name}`);
  
  const result = await autocannon({
    url: test.url,
    method: test.method || 'GET',
    body: test.body,
    headers: test.headers,
    connections: 10,
    duration: 10,
    pipelining: 1
  });

  console.log(`   Requests: ${result.requests.total}`);
  console.log(`   Throughput: ${(result.throughput.mean / 1024).toFixed(2)} KB/s`);
  console.log(`   Latency: ${result.latency.mean.toFixed(2)}ms avg`);
  console.log(`   Errors: ${result.errors}`);
}

(async () => {
  for (const test of tests) {
    await runTest(test);
  }
  console.log('\n✓ Load test complete\n');
})();
