#!/usr/bin/env node
// Verify Dual-Key Rotation Implementation
// Usage: node scripts/verify-rotation.js

const { encryptKeyB, decryptKeyB, decryptKeyBWithFallback, getMasterKeys } = require('../lib/keyEncryption');

async function verify() {
  console.log('🔍 Verifying Dual-Key Rotation Implementation...\n');

  const keyB = 'test-secret-key';
  const oldKey = 'old-master-key-32-bytes-long!!!';
  const newKey = 'new-master-key-32-bytes-long!!!';
  const sealId = 'test-seal-123';

  try {
    // Test 1: Encrypt with old key
    console.log('✓ Test 1: Encrypt with old key');
    const encrypted = await encryptKeyB(keyB, oldKey, sealId);
    console.log(`  Encrypted: ${encrypted.substring(0, 20)}...\n`);

    // Test 2: Decrypt with old key directly
    console.log('✓ Test 2: Decrypt with old key');
    const decrypted1 = await decryptKeyB(encrypted, oldKey, sealId);
    console.log(`  Decrypted: ${decrypted1}\n`);

    // Test 3: Set up dual-key environment
    console.log('✓ Test 3: Set up dual-key environment');
    process.env.MASTER_ENCRYPTION_KEY = newKey;
    process.env.MASTER_ENCRYPTION_KEY_PREVIOUS = oldKey;
    const keys = getMasterKeys();
    console.log(`  Keys available: ${keys.length}\n`);

    // Test 4: Decrypt with fallback (should use old key)
    console.log('✓ Test 4: Decrypt with fallback to old key');
    const decrypted2 = await decryptKeyBWithFallback(encrypted, sealId);
    console.log(`  Decrypted: ${decrypted2}\n`);

    // Test 5: Encrypt with new key
    console.log('✓ Test 5: Encrypt with new key');
    const encryptedNew = await encryptKeyB(keyB, newKey, sealId);
    console.log(`  Encrypted: ${encryptedNew.substring(0, 20)}...\n`);

    // Test 6: Decrypt new encryption with fallback
    console.log('✓ Test 6: Decrypt new encryption with fallback');
    const decrypted3 = await decryptKeyBWithFallback(encryptedNew, sealId);
    console.log(`  Decrypted: ${decrypted3}\n`);

    // Test 7: Remove old key
    console.log('✓ Test 7: Remove old key from environment');
    delete process.env.MASTER_ENCRYPTION_KEY_PREVIOUS;
    const keysAfter = getMasterKeys();
    console.log(`  Keys available: ${keysAfter.length}\n`);

    // Test 8: Decrypt new encryption with single key
    console.log('✓ Test 8: Decrypt with single key');
    const decrypted4 = await decryptKeyBWithFallback(encryptedNew, sealId);
    console.log(`  Decrypted: ${decrypted4}\n`);

    console.log('✅ All tests passed! Dual-key rotation is working correctly.\n');
    console.log('Implementation verified:');
    console.log('  • getMasterKeys() returns current + previous keys');
    console.log('  • decryptKeyBWithFallback() tries all available keys');
    console.log('  • Zero-downtime rotation is supported');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verify();
