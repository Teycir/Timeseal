// Pre-deploy guard: NEXT_PUBLIC_* values are inlined into the client bundle at
// build time, so a missing Turnstile site key ships a site that can't validate seals.
import { existsSync, readFileSync } from 'node:fs';

const REQUIRED = ['NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'NEXT_PUBLIC_APP_URL'];

// Mirror Next.js precedence: real env > .env.production.local > .env.local > .env.production > .env
const files = ['.env.production.local', '.env.local', '.env.production', '.env'];
const fromFiles = {};
for (const f of files.reverse()) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) fromFiles[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const value = (k) => (process.env[k] || fromFiles[k] || '').trim();
const missing = REQUIRED.filter((k) => !value(k));
if (missing.length) {
  console.error(`\n✖ Deploy blocked. Missing build-time env: ${missing.join(', ')}`);
  console.error('  Add them to .env.production (site key is public; NEVER put the secret key there).\n');
  process.exit(1);
}

const siteKey = value('NEXT_PUBLIC_TURNSTILE_SITE_KEY');
if (!/^0x4[A-Za-z0-9_-]{15,}$/.test(siteKey)) {
  console.error('\n✖ NEXT_PUBLIC_TURNSTILE_SITE_KEY does not look like a Turnstile site key (expected 0x4…).\n');
  process.exit(1);
}
console.log('✓ Build-time env OK (Turnstile site key present)');
