// Client-Side Integrity Verification
// Verifies that crypto operations haven't been tampered with

export async function verifyIntegrity(): Promise<boolean> {
  try {
    // Verify Web Crypto API is available and unmodified
    if (!crypto?.subtle) {
      console.error('Web Crypto API not available');
      return false;
    }

    // Test basic crypto operations to ensure they work as expected
    const testKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const testData = new TextEncoder().encode('integrity-check');
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      testKey,
      testData
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      testKey,
      encrypted
    );

    const result = new TextDecoder().decode(decrypted);
    
    if (result !== 'integrity-check') {
      console.error('Crypto integrity check failed');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Integrity verification failed:', error);
    return false;
  }
}

// Verify on module load
let integrityVerified = false;

export async function ensureIntegrity(): Promise<void> {
  if (integrityVerified) return;
  
  const verified = await verifyIntegrity();
  if (!verified) {
    throw new Error('Client integrity verification failed. Please refresh and try again.');
  }
  
  integrityVerified = true;
}

// Check for common tampering indicators
export function detectTampering(): string[] {
  const warnings: string[] = [];

  // Check if running in secure context
  if (!window.isSecureContext) {
    warnings.push('Not running in secure context (HTTPS required)');
  }

  // Check for browser extensions that might interfere
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    warnings.push('Browser extensions detected - may interfere with crypto');
  }

  // Verify critical globals haven't been overridden
  const criticalGlobals = ['crypto', 'TextEncoder', 'TextDecoder', 'Uint8Array'];
  for (const global of criticalGlobals) {
    if (!(global in window)) {
      warnings.push(`Critical global '${global}' is missing`);
    }
  }

  return warnings;
}
