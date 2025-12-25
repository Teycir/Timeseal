'use client';

import { motion } from 'framer-motion';
import { BackgroundBeams } from '../components/ui/background-beams';
import { Card } from '../components/Card';
import DecryptedText from '../components/DecryptedText';
import { Lock, Server, ShieldCheck, AlertTriangle, BookOpen, CheckCircle2 } from 'lucide-react';

export default function SecurityPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative w-full overflow-hidden pb-20">
      <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
      <div className="max-w-4xl w-full space-y-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold glow-text mb-4 px-2">
            <DecryptedText text="SECURITY" animateOn="view" className="text-neon-green" speed={75} maxIterations={20} />
          </h1>
          <p className="text-neon-green/70 text-sm sm:text-base px-4">Cryptographically Enforced at the Edge</p>
        </motion.div>

        <Card className="p-4 sm:p-6 md:p-8 space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-neon-green mb-4 flex items-center gap-2">
            <Lock className="w-6 h-6" /> Triple-Layer Encryption
          </h2>
          <div className="space-y-4 text-neon-green/60 text-sm">
            <div className="border-l-2 border-neon-green/30 pl-4">
              <p className="text-neon-green font-bold mb-2">Layer 1: Client-Side Encryption (AES-GCM-256)</p>
              <p className="mb-2">Your content is encrypted in your browser BEFORE sending to the server using split-key architecture.</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-xs">
                <li>Key A: Stored in URL hash (never sent to server)</li>
                <li>Key B: Sent to server (encrypted before storage)</li>
                <li>Master Key: Derived from Key A + Key B using HKDF</li>
                <li>Result: AES-GCM-256 encrypted ciphertext</li>
              </ul>
            </div>
            <div className="border-l-2 border-neon-green/30 pl-4">
              <p className="text-neon-green font-bold mb-2">Layer 2: Server-Side Key Encryption</p>
              <p className="mb-2">Key B is encrypted with MASTER_ENCRYPTION_KEY before database storage.</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-xs">
                <li>Master key stored as environment secret (not in database)</li>
                <li>Uses HKDF key derivation with seal ID as salt</li>
                <li>Even database breach cannot decrypt Key B</li>
              </ul>
            </div>
            <div className="border-l-2 border-neon-green/30 pl-4">
              <p className="text-neon-green font-bold mb-2">Layer 3: Encrypted Database Storage</p>
              <p className="mb-2">All seals stored encrypted in Cloudflare D1 database:</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-xs">
                <li>✅ Encrypted blob (AES-GCM-256 ciphertext as base64)</li>
                <li>✅ Encrypted Key B (AES-GCM-256 with master key)</li>
                <li>✅ IV (public, needed for decryption)</li>
                <li>✅ Metadata (unlock time, timestamps)</li>
                <li>❌ NO plaintext content EVER stored</li>
              </ul>
            </div>
            <div className="bg-neon-green/5 p-4 rounded border border-neon-green/20">
              <p className="text-neon-green font-bold mb-2">🛡️ What an Attacker with Database Access CANNOT Do:</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-xs">
                <li>Decrypt content (needs Key A from URL hash)</li>
                <li>Decrypt Key B (needs master encryption key)</li>
                <li>Modify unlock time (cryptographically signed)</li>
                <li>Access content early (server enforces time-lock)</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 md:p-8 space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-neon-green mb-4 flex items-center gap-2">
            <Server className="w-6 h-6" /> Infrastructure Security
          </h2>
          <div className="space-y-4 text-neon-green/60 text-sm">
            <div>
              <p className="text-neon-green font-bold mb-2">Cloudflare D1 Database Storage</p>
              <p>All seals stored encrypted in Cloudflare D1 (SQLite at the edge) with triple-layer encryption. Encrypted blobs stored as base64 TEXT. Maximum 560KB per seal (due to D1 column limits).</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2">Edge Runtime</p>
              <p>All API routes run on Cloudflare Workers at the edge, providing low latency and DDoS protection.</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2">Immutable Audit Logs</p>
              <p>Every access attempt is logged with timestamps, IP addresses, and outcomes. Logs cannot be modified or deleted.</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 md:p-8 space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-neon-green mb-4 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" /> Security Features (v0.9.1)
          </h2>
          <div className="space-y-4 text-neon-green/60 text-sm">
            <div>
              <p className="text-neon-green font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Encrypted Local Storage</p>
              <p>Browser-based encrypted vault for saving seals. AES-GCM-256 encryption with unique key per browser. No server-side storage of user&apos;s vault links. Privacy-first design.</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Simplified Security Model</p>
              <p>Removed seed phrase complexity. Always uses cryptographically random keys. No recovery mechanism (by design). Users control what&apos;s stored via COPY | DOWNLOAD | SAVE buttons.</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 md:p-8 space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-neon-green mb-4 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" /> Security Features (v0.6.2)
          </h2>
          <div className="space-y-4 text-neon-green/60 text-sm">
            <div>
              <p className="text-neon-green font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Replay Attack Prevention</p>
              <p>Nonce-first validation prevents concurrent token reuse. Database-backed nonce storage ensures replay detection across all worker instances.</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Atomic Database Updates</p>
              <p>All-or-nothing pulse updates prevent inconsistent state. Single SQL operation ensures both timestamp and unlock time update together.</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Strict Token Validation</p>
              <p>Format validation rejects malformed pulse tokens before processing. Seal ID, timestamp, nonce, and signature all validated with regex.</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Safe Deletion Order</p>
              <p>Database-first deletion prevents data loss. If blob deletion fails, seal record is already gone (acceptable orphan).</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Collision-Resistant Fingerprinting</p>
              <p>SHA-256 hashed fingerprints for rate limiting. Combines IP + User-Agent + Accept-Language without truncation.</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Memory Leak Protection</p>
              <p>Automatic cleanup of concurrent request tracker at 10K entries. Zero-count entries removed first.</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Accurate Access Metrics</p>
              <p>Only counts successful unlocks, not locked checks. Provides accurate usage analytics.</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> File Size Enforcement</p>
              <p>560KB limit (before encryption) enforced at all layers: UI validation, API validation, and database storage.</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 md:p-8 space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-neon-green mb-4 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" /> Defense Layers
          </h2>
          <div className="space-y-4 text-neon-green/60 text-sm">
            <div className="border-l-2 border-neon-green/30 pl-4">
              <p className="text-neon-green font-bold mb-2">Layer 1: Cryptographic Defenses</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-xs">
                <li>AES-GCM-256 encryption (client + server)</li>
                <li>Split-key architecture (Key A never leaves browser)</li>
                <li>HMAC-signed pulse tokens with nonce replay protection</li>
                <li>Master key encryption for Key B storage</li>
                <li>SHA-256 blob hashing for integrity verification</li>
              </ul>
            </div>
            <div className="border-l-2 border-neon-green/30 pl-4">
              <p className="text-neon-green font-bold mb-2">Layer 2: Time-Lock Enforcement</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-xs">
                <li>Server-side time validation (client clock irrelevant)</li>
                <li>Cloudflare NTP-synchronized timestamps</li>
                <li>Atomic database operations prevent race conditions</li>
                <li>Random jitter (0-100ms) prevents timing attacks</li>
              </ul>
            </div>
            <div className="border-l-2 border-neon-green/30 pl-4">
              <p className="text-neon-green font-bold mb-2">Layer 3: Access Control</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-xs">
                <li>Rate limiting with SHA-256 fingerprinting</li>
                <li>Database-backed nonce storage (replay detection)</li>
                <li>Cloudflare Turnstile bot protection</li>
                <li>Concurrent request limiting (5 per IP)</li>
                <li>Strict input validation and sanitization</li>
              </ul>
            </div>
            <div className="border-l-2 border-neon-green/30 pl-4">
              <p className="text-neon-green font-bold mb-2">Layer 4: Operational Security</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-xs">
                <li>Immutable audit logging (all access tracked)</li>
                <li>Transaction rollback on failures</li>
                <li>Circuit breakers with retry logic</li>
                <li>Error sanitization (no internal state leakage)</li>
                <li>
                  <a href="/canary" className="text-neon-green hover:underline">
                    Warrant canary for transparency
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 md:p-8 space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-neon-green mb-4 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" /> Security Guarantees
          </h2>
          <div className="space-y-4 text-neon-green/60 text-sm">
            <div>
              <p className="text-neon-green font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Zero-Knowledge Architecture</p>
              <p>No user accounts, no passwords, no authentication. Security is enforced through cryptography alone. This eliminates credential theft, phishing, and password database breaches.</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Time-Lock Enforcement</p>
              <p>The server will not release Key B before the unlock time. Server-side validation using Date.now() prevents client-side time manipulation.</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Rate Limiting with Fingerprinting</p>
              <p>API endpoints use browser fingerprinting (IP + User-Agent + Language) with D1 database persistence. Rate limits survive across all worker instances. 10-20 requests per minute per fingerprint.</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> No Single Point of Failure</p>
              <p>Split-key architecture means neither the server alone nor the client alone can decrypt content.</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Triple-Layer Encrypted Storage</p>
              <p>All seals encrypted with AES-GCM-256 client-side, Key B encrypted with master key server-side, and database encryption at rest. Zero plaintext storage.</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Client-Side Decryption</p>
              <p>Decryption happens in your browser. The server never sees the decrypted content.</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> CAPTCHA Protection</p>
              <p>Turnstile CAPTCHA on seal creation prevents automated abuse and bot attacks.</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 md:p-8 space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-neon-green mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" /> Threat Model
          </h2>
          <div className="space-y-4 text-neon-green/60 text-sm">
            <div>
              <p className="text-neon-green font-bold mb-2">Protected Against:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Unauthorized early access (time-lock enforced server-side)</li>
                <li>Client-side time manipulation (server validates with Date.now())</li>
                <li>Server compromise (split-key architecture)</li>
                <li>Data tampering (AEAD encryption + database integrity)</li>
                <li>Brute force attacks (256-bit keys + fingerprinted rate limiting)</li>
                <li>IP rotation bypass (browser fingerprinting)</li>
                <li>Timing attacks (response jitter)</li>
                <li>Serverless state bypass (D1-backed rate limits and nonces)</li>
                <li>Automated abuse (Turnstile CAPTCHA)</li>
                <li>Replay attacks (nonce validation in D1 database)</li>
              </ul>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2">Not Protected Against:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Loss of vault link (Key A is in URL hash - treat like a password)</li>
                <li>Browser history/bookmark exposure (inherent to client-side crypto)</li>
                <li>Compromised recipient device after unlock</li>
                <li>Cloudflare infrastructure failure</li>
                <li>Quantum computing attacks (future threat)</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 md:p-8 space-y-4 border-neon-green/40">
          <h2 className="text-xl sm:text-2xl font-bold text-neon-green mb-4 flex items-center gap-2">
            <BookOpen className="w-6 h-6" /> Open Source
          </h2>
          <p className="text-neon-green/60 text-sm">
            TimeSeal is open source under the Business Source License. The code is available for inspection and audit on GitHub.
          </p>
          <a
            href="https://github.com/teycir/timeseal"
            target="_blank"
            rel="noopener noreferrer"
            className="cyber-button inline-block text-sm"
          >
            VIEW SOURCE CODE
          </a>
        </Card>

        <div className="text-center pt-4">
          <a href="/" className="cyber-button inline-block">
            CREATE YOUR SEAL
          </a>
        </div>
      </div>
    </div>
  );
}
