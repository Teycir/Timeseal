'use client';

import { motion } from 'framer-motion';
import { BackgroundBeams } from '../components/ui/background-beams';
import { Card } from '../components/Card';
import DecryptedText from '../components/DecryptedText';
import { Lock, Handshake, Activity, ShieldCheck, ClipboardList, Trash2, Eye } from 'lucide-react';

export default function HowItWorksPage() {
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
            <DecryptedText text="HOW IT WORKS" animateOn="view" className="text-neon-green" speed={75} maxIterations={20} />
          </h1>
          <p className="text-neon-green/70 text-sm sm:text-base px-4 mb-6">Zero-Trust • Edge-Native</p>
          <a 
            href="https://www.youtube.com/watch?v=7nwcL-pt0pA" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-neon-green hover:text-neon-green/80 transition-colors text-sm sm:text-base"
          >
            <span>📺 Watch Explainer Video</span>
          </a>
        </motion.div>

        <Card className="p-4 sm:p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-neon-green mb-4 flex items-center gap-2">
              <Lock className="w-6 h-6" /> Layer 1: The Vault (Encrypted D1 Database Storage)
            </h2>
            <p className="text-neon-green/80 mb-2 text-sm sm:text-base">Triple-Layer Encryption</p>
            <p className="text-neon-green/60 text-sm leading-relaxed mb-3">
              All seals are encrypted in the database with multiple security layers:
            </p>
            <ul className="text-neon-green/60 text-sm space-y-2 list-disc list-inside">
              <li><strong className="text-neon-green">Client-Side Encryption:</strong> AES-GCM-256 in your browser before sending</li>
              <li><strong className="text-neon-green">Split-Key Architecture:</strong> Key A (client) + Key B (server)</li>
              <li><strong className="text-neon-green">Server-Side Key Encryption:</strong> Key B encrypted with MASTER_ENCRYPTION_KEY</li>
              <li><strong className="text-neon-green">Database Storage:</strong> Only encrypted blobs stored, never plaintext</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-neon-green mb-4 flex items-center gap-2">
              <Handshake className="w-6 h-6" /> Layer 2: The Handshake (Split-Key Crypto)
            </h2>
            <p className="text-neon-green/80 mb-2 text-sm sm:text-base">Trust-Minimized</p>
            <p className="text-neon-green/60 text-sm leading-relaxed mb-3">
              We use a Split-Key architecture to ensure no single party can decrypt the data early:
            </p>
            <ul className="text-neon-green/60 text-sm space-y-2 list-disc list-inside">
              <li><strong className="text-neon-green">Key A (User):</strong> Stored in the URL hash. Never sent to the server.</li>
              <li><strong className="text-neon-green">Key B (Server):</strong> Stored in D1 database inside the secure enclave.</li>
              <li><strong className="text-neon-green">The Check:</strong> The server refuses to release Key B until Now &gt; Unlock_Time.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-neon-green mb-4 flex items-center gap-2">
              <Activity className="w-6 h-6" /> Layer 3: The Pulse (Dead Man&apos;s Switch)
            </h2>
            <p className="text-neon-green/80 mb-2 text-sm sm:text-base">Automated Release</p>
            <p className="text-neon-green/60 text-sm leading-relaxed">
              If used as a Dead Man&apos;s Switch, the user must click a private &quot;Pulse Link&quot; periodically.
              If they fail to check in, the seal unlocks automatically for the recipient.
            </p>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-neon-green mb-4 flex items-center gap-2">
              <Eye className="w-6 h-6" /> Layer 3.5: Ephemeral Seals (Self-Destructing)
            </h2>
            <p className="text-neon-green/80 mb-2 text-sm sm:text-base">View-Limited Access</p>
            <p className="text-neon-green/60 text-sm leading-relaxed mb-3">
              Ephemeral seals unlock immediately but auto-delete after a set number of views:
            </p>
            <ul className="text-neon-green/60 text-sm space-y-2 list-disc list-inside">
              <li><strong className="text-neon-green">Max Views:</strong> Configure 1-100 views before deletion</li>
              <li><strong className="text-neon-green">Atomic Counting:</strong> Race-condition safe view tracking</li>
              <li><strong className="text-neon-green">Privacy-Preserving:</strong> SHA-256 hashed viewer fingerprints</li>
              <li><strong className="text-neon-green">Auto-Deletion:</strong> Blob and database cleanup on exhaustion</li>
              <li><strong className="text-neon-green">Perfect For:</strong> One-time passwords, confidential messages</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-neon-green mb-4 flex items-center gap-2">
              <Trash2 className="w-6 h-6" /> Layer 4: Auto-Cleanup (Database Protection)
            </h2>
            <p className="text-neon-green/80 mb-2 text-sm sm:text-base">30-Day Retention Policy</p>
            <p className="text-neon-green/60 text-sm leading-relaxed mb-3">
              To protect database resources, seals are automatically deleted 30 days after unlock:
            </p>
            <ul className="text-neon-green/60 text-sm space-y-2 list-disc list-inside">
              <li><strong className="text-neon-green">Max Duration:</strong> 30 days until unlock</li>
              <li><strong className="text-neon-green">Retention:</strong> 30 days after unlock</li>
              <li><strong className="text-neon-green">Total Lifetime:</strong> Maximum 60 days</li>
              <li><strong className="text-neon-green">Cleanup:</strong> Automated via cron job</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-neon-green mb-4 flex items-center gap-2">
              <ClipboardList className="w-6 h-6" /> Layer 5: Privacy-First Analytics
            </h2>
            <p className="text-neon-green/80 mb-2 text-sm sm:text-base">Zero External Dependencies</p>
            <p className="text-neon-green/60 text-sm leading-relaxed mb-3">
              Built-in analytics track aggregate metrics without compromising privacy:
            </p>
            <ul className="text-neon-green/60 text-sm space-y-2 list-disc list-inside">
              <li><strong className="text-neon-green">No Cookies:</strong> Zero tracking cookies or session storage</li>
              <li><strong className="text-neon-green">No IPs:</strong> IP addresses never stored or logged</li>
              <li><strong className="text-neon-green">No Personal Data:</strong> GDPR compliant by design</li>
              <li><strong className="text-neon-green">Aggregate Only:</strong> Page views, seal counts, country distribution</li>
            </ul>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 md:p-8 space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-neon-green mb-4 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" /> Encryption Standards
          </h2>
          <ul className="text-neon-green/60 text-sm space-y-2">
            <li><strong className="text-neon-green">Algorithm:</strong> AES-GCM (256-bit)</li>
            <li><strong className="text-neon-green">Key Generation:</strong> Web Crypto API (CSPRNG)</li>
            <li><strong className="text-neon-green">Key Derivation:</strong> HKDF for additional security</li>
            <li><strong className="text-neon-green">Storage:</strong> Cloudflare D1 (Encrypted Blobs + Encrypted Keys)</li>
            <li><strong className="text-neon-green">Master Key:</strong> Environment secret (never in database)</li>
            <li><strong className="text-neon-green">Audit Trail:</strong> Immutable access logs</li>
          </ul>
        </Card>

        <Card className="p-4 sm:p-6 md:p-8 space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-neon-green mb-4 flex items-center gap-2">
            <ClipboardList className="w-6 h-6" /> Quick Start Templates
          </h2>
          <p className="text-neon-green/80 mb-2 text-sm sm:text-base">10 Pre-Configured Scenarios</p>
          <p className="text-neon-green/60 text-sm leading-relaxed mb-3">
            Time-Seal includes ready-to-use templates that auto-configure settings for common use cases:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-neon-green/60 text-sm">
            <div>
              <p className="text-neon-green font-bold mb-1">Ephemeral (Self-Destructing):</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>One-Time Password (1 view)</li>
                <li>Shared Secret (1 view)</li>
              </ul>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-1">Dead Man&apos;s Switch:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Crypto Inheritance (30-day pulse)</li>
                <li>Whistleblower (7-day pulse)</li>
                <li>Emergency Backup (14-day pulse)</li>
              </ul>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-1">Timed Release:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Product Launch (24 hours)</li>
                <li>Birthday Gift (24 hours)</li>
                <li>Legal Hold (24 hours)</li>
              </ul>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-1">Progressive Disclosure:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Scavenger Hunt (chained clues)</li>
                <li>Course Content (drip content)</li>
              </ul>
            </div>
          </div>
          <p className="text-neon-green/50 text-xs mt-3 border-l-2 border-neon-green/20 pl-2">
            💡 Click any template button on the homepage to auto-fill message placeholders and settings
          </p>
        </Card>

        <Card className="p-4 sm:p-6 md:p-8 space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-neon-green mb-4 flex items-center gap-2">
            <ClipboardList className="w-6 h-6" /> What Happens After Creation
          </h2>
          <div className="space-y-4 text-neon-green/60 text-sm">
            <div>
              <p className="text-neon-green font-bold mb-1">1. You receive links:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Public Vault Link:</strong> Share with recipients (contains Key A in URL hash)</li>
                <li><strong>Pulse Token:</strong> Keep secret (only for Dead Man&apos;s Switch mode)</li>
              </ul>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-1">2. Save your seal:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>COPY:</strong> Copy vault link to clipboard</li>
                <li><strong>DOWNLOAD:</strong> Save markdown file with all links</li>
                <li><strong>SAVE:</strong> Encrypt and store in browser vault</li>
              </ul>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-1">3. Recipients view the vault:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>They see a countdown timer (timed seals)</li>
                <li>Content remains encrypted until unlock time</li>
                <li>No one can decrypt early—not even you</li>
              </ul>
            </div>
            <div>
              <p className="text-neon-green font-bold mb-1">4. At unlock time:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Server releases Key B</li>
                <li>Browser combines Key A + Key B</li>
                <li>Content decrypts automatically</li>
                <li>Ephemeral seals auto-delete after max views</li>
              </ul>
            </div>
          </div>
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
