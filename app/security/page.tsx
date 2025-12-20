'use client';

import { motion } from 'framer-motion';
import { BackgroundBeams } from '../components/ui/background-beams';
import { Card } from '../components/Card';
import DecryptedText from '../components/DecryptedText';

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
          <h1 className="text-5xl font-bold glow-text mb-4">
            <DecryptedText text="SECURITY" animateOn="view" className="text-neon-green" speed={75} maxIterations={20} />
          </h1>
          <p className="text-neon-green/70">Cryptographically Enforced at the Edge</p>
        </motion.div>

        <Card className="p-8 space-y-6">
          <h2 className="text-2xl font-bold text-neon-green mb-4">🔐 Encryption Implementation</h2>
          <div className="space-y-4 text-neon-green/60 text-sm">
            <div>
              <p className="text-neon-green font-bold mb-2">AES-GCM 256-bit Encryption</p>
              <p>All content is encrypted using AES-GCM with 256-bit keys, providing authenticated encryption with associated data (AEAD).</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2">Split-Key Architecture</p>
              <p>Encryption uses two keys: Key A (client-side, in URL hash) and Key B (server-side, time-locked). Both are required for decryption.</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2">Cryptographically Secure Random Number Generation</p>
              <p>All keys and IVs are generated using the Web Crypto API&apos;s CSPRNG, ensuring unpredictability.</p>
            </div>
          </div>
        </Card>

        <Card className="p-8 space-y-6">
          <h2 className="text-2xl font-bold text-neon-green mb-4">🏗️ Infrastructure Security</h2>
          <div className="space-y-4 text-neon-green/60 text-sm">
            <div>
              <p className="text-neon-green font-bold mb-2">Cloudflare R2 Object Lock (WORM)</p>
              <p>Encrypted blobs are stored with Write Once, Read Many compliance. Files cannot be deleted or modified until the retention period expires—even by administrators.</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2">Cloudflare D1 Database</p>
              <p>Metadata and Key B are stored in Cloudflare&apos;s edge database with automatic replication and encryption at rest.</p>
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

        <Card className="p-8 space-y-6">
          <h2 className="text-2xl font-bold text-neon-green mb-4">🛡️ Security Guarantees</h2>
          <div className="space-y-4 text-neon-green/60 text-sm">
            <div>
              <p className="text-neon-green font-bold mb-2">✅ Time-Lock Enforcement</p>
              <p>The server will not release Key B before the unlock time. This is enforced at the API level with timestamp validation.</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2">✅ No Single Point of Failure</p>
              <p>Split-key architecture means neither the server alone nor the client alone can decrypt content.</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2">✅ Immutable Storage</p>
              <p>R2 Object Lock prevents premature deletion or modification of encrypted content.</p>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2">✅ Client-Side Decryption</p>
              <p>Decryption happens in your browser. The server never sees the decrypted content.</p>
            </div>
          </div>
        </Card>

        <Card className="p-8 space-y-6">
          <h2 className="text-2xl font-bold text-neon-green mb-4">⚠️ Threat Model</h2>
          <div className="space-y-4 text-neon-green/60 text-sm">
            <div>
              <p className="text-neon-green font-bold mb-2">Protected Against:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Unauthorized early access (time-lock enforced)</li>
                <li>Server compromise (split-key architecture)</li>
                <li>Data tampering (WORM storage + AEAD)</li>
                <li>Brute force attacks (256-bit keys)</li>
              </ul>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-2">Not Protected Against:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Loss of vault link (Key A is in URL hash)</li>
                <li>Compromised recipient device after unlock</li>
                <li>Cloudflare infrastructure failure</li>
                <li>Quantum computing attacks (future threat)</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-8 space-y-4 border-neon-green/40">
          <h2 className="text-2xl font-bold text-neon-green mb-4">📖 Open Source</h2>
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
