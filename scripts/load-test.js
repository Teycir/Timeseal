#!/usr/bin/env node
const autocannon = require('autocannon');

const url = process.argv[2] || 'http://localhost:3000';
const connections = parseInt(process.argv[3]) || 100;
const duration = parseInt(process.argv[4]) || 60;

console.log(`Load Testing TimeSeal`);
console.log(`URL: ${url}`);
console.log(`Connections: ${connections}`);
console.log(`Duration: ${duration}s\n`);

const instance = autocannon({
  url: `${url}/api/health`,
  connections,
  duration,
  pipelining: 1,
  requests: [
    {
      method: 'GET',
      path: '/api/health'
    },
    {
      method: 'GET',
      path: '/api/stats'
    }
  ]
}, (err, result) => {
  if (err) {
    console.error('Load test failed:', err);
    process.exit(1);
  }
  
  console.log('\n=== LOAD TEST RESULTS ===\n');
  console.log(`Requests: ${result.requests.total}`);
  console.log(`Duration: ${result.duration}s`);
  console.log(`Throughput: ${result.throughput.mean} req/sec`);
  console.log(`Latency:`);
  console.log(`  Mean: ${result.latency.mean}ms`);
  console.log(`  P50: ${result.latency.p50}ms`);
  console.log(`  P95: ${result.latency.p95}ms`);
  console.log(`  P99: ${result.latency.p99}ms`);
  console.log(`Errors: ${result.errors}`);
  console.log(`Timeouts: ${result.timeouts}`);
  console.log(`2xx: ${result['2xx']}`);
  console.log(`4xx: ${result['4xx']}`);
  console.log(`5xx: ${result['5xx']}`);
  
  if (result.errors > 0 || result['5xx'] > 0) {
    console.log('\n⚠️  FAILED: Errors detected');
    process.exit(1);
  }
  
  if (result.latency.p95 > 1000) {
    console.log('\n⚠️  WARNING: P95 latency > 1s');
  }
  
  console.log('\n✓ Load test passed');
});

autocannon.track(instance, { renderProgressBar: true });
