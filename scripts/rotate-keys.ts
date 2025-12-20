#!/usr/bin/env node
// Master Key Rotation Worker
// Usage: node scripts/rotate-keys.ts <OLD_KEY> <NEW_KEY>

import { decryptKeyB, encryptKeyB } from '../lib/keyEncryption';

async function rotateKeys(oldKey: string, newKey: string) {
  console.log('🔄 Starting key rotation...');
  
  const db = process.env.DB; // D1 binding
  if (!db) throw new Error('DB binding not found');
  
  // Fetch all active seals
  const seals = await db.prepare(
    'SELECT seal_id, keyb_encrypted FROM seals WHERE unlock_time > ?'
  ).bind(Date.now()).all();
  
  console.log(`📦 Found ${seals.results.length} active seals`);
  
  let rotated = 0;
  for (const seal of seals.results) {
    try {
      // Decrypt with old key
      const keyB = await decryptKeyB(seal.keyb_encrypted, oldKey, seal.seal_id);
      
      // Re-encrypt with new key
      const newEncrypted = await encryptKeyB(keyB, newKey, seal.seal_id);
      
      // Update database
      await db.prepare(
        'UPDATE seals SET keyb_encrypted_new = ? WHERE seal_id = ?'
      ).bind(newEncrypted, seal.seal_id).run();
      
      rotated++;
      if (rotated % 100 === 0) {
        console.log(`✅ Rotated ${rotated}/${seals.results.length}`);
      }
    } catch (error) {
      console.error(`❌ Failed to rotate seal ${seal.seal_id}:`, error);
    }
  }
  
  console.log(`✨ Rotation complete: ${rotated}/${seals.results.length} seals`);
  
  // Log rotation
  const oldHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(oldKey));
  const newHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(newKey));
  
  await db.prepare(
    'INSERT INTO key_rotation_log (rotation_date, seals_rotated, previous_key_hash, new_key_hash) VALUES (?, ?, ?, ?)'
  ).bind(
    Date.now(),
    rotated,
    Buffer.from(oldHash).toString('hex'),
    Buffer.from(newHash).toString('hex')
  ).run();
}

const [oldKey, newKey] = process.argv.slice(2);
if (!oldKey || !newKey) {
  console.error('Usage: node rotate-keys.ts <OLD_KEY> <NEW_KEY>');
  process.exit(1);
}

rotateKeys(oldKey, newKey).catch(console.error);
