'use client';

import { motion } from 'framer-motion';
import { BackgroundBeams } from '../components/ui/background-beams';
import { Card } from '../components/Card';
import DecryptedText from '../components/DecryptedText';

export default function FAQPage() {
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
            <DecryptedText text="FAQ" animateOn="view" className="text-neon-green" speed={75} maxIterations={20} />
          </h1>
          <p className="text-neon-green/70 text-sm sm:text-base px-4">Frequently Asked Questions</p>
        </motion.div>

        <Card className="p-4 sm:p-6 md:p-8 space-y-6">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">What is the maximum file size?</h3>
            <p className="text-neon-green/60 text-sm mb-2">560KB per seal.</p>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">Workarounds for larger files:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs text-neon-green/60">
              <li>Compress before upload (ZIP can reduce size 50-90%)</li>
              <li>Split into multiple seals (500KB chunks)</li>
              <li>Upload to cloud storage and seal the download link</li>
              <li>Self-host with R2 storage for files up to 5GB</li>
            </ul>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">How does Time-Seal prevent early access?</h3>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">Split-Key Architecture:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs text-neon-green/60 mb-2">
              <li>Browser generates Key A and Key B</li>
              <li>Key A stays in URL hash (never sent to server)</li>
              <li>Key B sent to server (encrypted with master key before storage)</li>
              <li>Both keys required for decryption</li>
              <li>Server refuses to release Key B until unlock time</li>
            </ul>
            <p className="text-neon-green/60 text-sm"><strong className="text-neon-green">Server-Side Time Enforcement:</strong> Cloudflare NTP-synchronized timestamps. Your local clock is completely irrelevant.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">How do I create a seal?</h3>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">Timed Release:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs text-neon-green/60 mb-2">
              <li>Enter message or upload file (max 560KB)</li>
              <li>Select &quot;TIMED&quot; mode</li>
              <li>Choose unlock date/time (up to 30 days)</li>
              <li>Complete Cloudflare Turnstile security check</li>
              <li>Choose how to save: COPY | DOWNLOAD (MD) | SAVE (encrypted vault)</li>
            </ul>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">Dead Man&apos;s Switch:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs text-neon-green/60 mb-2">
              <li>Follow steps 1-2 above</li>
              <li>Select &quot;DEADMAN&quot; mode</li>
              <li>Set pulse interval (how often you check in)</li>
              <li>Save TWO links: vault link (public) and pulse link (private)</li>
              <li>Visit pulse link before interval expires to keep sealed</li>
            </ul>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">Ephemeral (Self-Destructing):</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs text-neon-green/60">
              <li>Follow steps 1-2 above</li>
              <li>Select &quot;EPHEMERAL&quot; mode</li>
              <li>Set max views (1-100, default: 1 for read-once)</li>
              <li>Complete security check and create seal</li>
              <li>Seal unlocks immediately but auto-deletes after N views</li>
              <li>Perfect for one-time passwords and confidential messages</li>
            </ul>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">How do I save my seals for later?</h3>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">Three options after creating a seal:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs text-neon-green/60 mb-2">
              <li><strong className="text-neon-green">COPY</strong> - Copy vault link to clipboard (paste into password manager)</li>
              <li><strong className="text-neon-green">DOWNLOAD (MD)</strong> - Download markdown file with both vault and pulse links</li>
              <li><strong className="text-neon-green">SAVE</strong> - Encrypt and save to browser vault (AES-GCM-256)</li>
            </ul>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">Encrypted Local Storage:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs text-neon-green/60 mb-2">
              <li>Seals encrypted with AES-GCM-256 in your browser</li>
              <li>Unique encryption key per browser (stored locally)</li>
              <li>No server-side storage of your vault links</li>
              <li>Access saved seals at /dashboard</li>
            </ul>
            <p className="text-neon-green/60 text-sm"><strong className="text-neon-green">Best practices:</strong> Use all three methods for important seals. Store markdown files in encrypted cloud storage. Never share vault links over unencrypted channels.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">How do I unlock a seal?</h3>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs text-neon-green/60">
              <li>Open vault link (contains Key A in URL hash)</li>
              <li>If locked: See countdown timer</li>
              <li>If unlocked: Content automatically decrypts in browser</li>
              <li>Download or copy decrypted content</li>
            </ul>
            <p className="text-neon-green/60 text-sm mt-2">Decryption happens entirely in your browser. Server never sees decrypted content.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">How does Dead Man&apos;s Switch work?</h3>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">Setup:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs text-neon-green/60 mb-2">
              <li>Set pulse interval (e.g., 7 days)</li>
              <li>Seal unlocks if you don&apos;t check in within that time</li>
              <li>Get private pulse link to reset timer</li>
            </ul>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">Checking In:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs text-neon-green/60 mb-2">
              <li>Visit private pulse link (from any device)</li>
              <li>Click &quot;Pulse&quot; button</li>
              <li>Timer resets for another interval</li>
              <li>Repeat before each interval expires</li>
            </ul>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">If You Miss a Pulse:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs text-neon-green/60 mb-2">
              <li>Seal automatically unlocks at deadline</li>
              <li>Recipient can access with vault link</li>
              <li>Cannot be reversed once unlocked</li>
            </ul>
            <p className="text-neon-green/60 text-sm"><strong className="text-neon-green">Burning a Seal:</strong> Use pulse link to permanently delete seal. Content destroyed immediately and cannot be recovered.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Can I decrypt my seal early?</h3>
            <p className="text-neon-green/60 text-sm">No. The time-lock is cryptographically enforced. Not even the creator can decrypt before unlock time. This is by design for security.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">What happens if I lose the vault link?</h3>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">Lost forever.</strong> Key A is in the URL hash. Without it, server cannot decrypt (doesn&apos;t have Key A) and you cannot decrypt (don&apos;t have the link). No recovery mechanism exists by design.</p>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">Best practices:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs text-neon-green/60">
              <li>Save vault links in password manager</li>
              <li>Email to yourself (encrypted email recommended)</li>
              <li>Print QR code for physical backup</li>
              <li>Never share vault links over unencrypted channels</li>
            </ul>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">What happens if I miss a pulse?</h3>
            <p className="text-neon-green/60 text-sm">The seal will automatically unlock for recipients after the pulse interval expires. This is the intended behavior for Dead Man&apos;s Switch mode.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Can I cancel or delete a seal?</h3>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">Timed Release:</strong> ❌ No. Cannot be deleted once created.</p>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">Dead Man&apos;s Switch:</strong> ✅ Yes. Use pulse link to &quot;burn&quot; the seal (permanently destroy content).</p>
            <p className="text-neon-green/60 text-sm"><strong className="text-neon-green">Ephemeral:</strong> ⚠️ Auto-deletes after max views reached. Cannot be manually deleted.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Where is my data stored?</h3>
            <p className="text-neon-green/60 text-sm mb-2">Encrypted blobs stored in Cloudflare D1 database (SQLite at the edge). All data encrypted with triple-layer encryption:</p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs text-neon-green/60">
              <li>Client-side AES-GCM-256 encryption</li>
              <li>Server-side Key B encryption with master key</li>
              <li>Database encryption at rest</li>
              <li>Zero plaintext storage</li>
            </ul>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Is this really secure?</h3>
            <p className="text-neon-green/60 text-sm mb-2">Yes. Security features include:</p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs text-neon-green/60">
              <li>AES-GCM 256-bit encryption</li>
              <li>Split-key architecture (no single point of failure)</li>
              <li>Server-side time-lock enforcement</li>
              <li>Triple-layer encrypted storage</li>
              <li>Rate limiting with SHA-256 fingerprinting</li>
              <li>Cloudflare Turnstile bot protection</li>
              <li>Replay attack prevention with nonce validation</li>
              <li>Open source code for audit</li>
            </ul>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Do you have access to my content?</h3>
            <p className="text-neon-green/60 text-sm mb-2">No. Encryption happens client-side in your browser. We only store:</p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs text-neon-green/60">
              <li>Encrypted blob (AES-GCM-256 ciphertext)</li>
              <li>Encrypted Key B (encrypted with master key)</li>
              <li>IV (public, needed for decryption)</li>
              <li>Metadata (unlock time, timestamps)</li>
            </ul>
            <p className="text-neon-green/60 text-sm mt-2">Both Key A (from URL) and Key B (from server) are required for decryption. We never have both keys at the same time.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">What file formats are supported?</h3>
            <p className="text-neon-green/60 text-sm">All file types. The system encrypts raw bytes, so any file format works (documents, images, videos, archives, etc.).</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Is there a cost to use TimeSeal?</h3>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">License:</strong> Business Source License (BSL)</p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs text-neon-green/60">
              <li>✅ Free for non-commercial use</li>
              <li>❌ Commercial use requires license</li>
              <li>✅ Source code available for inspection</li>
              <li>✅ Converts to Apache 2.0 after 4 years</li>
            </ul>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">How long do seals last?</h3>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">Maximum Duration:</strong> 30 days until unlock</p>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">Retention:</strong> Seals auto-delete 30 days after unlock</p>
            <p className="text-neon-green/60 text-sm"><strong className="text-neon-green">Total Lifetime:</strong> Maximum 60 days (30 + 30)</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Is the URL hash secure?</h3>
            <p className="text-neon-green/60 text-sm mb-2">Yes. The URL hash (#KeyA) is never sent to the server. HTTPS protects it in transit. However, it&apos;s visible in browser history and bookmarks.</p>
            <p className="text-neon-green/60 text-sm"><strong className="text-neon-green">Best practices:</strong> Use incognito mode for sensitive seals, clear browser history after use, treat vault links like passwords.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Can someone guess my seal ID?</h3>
            <p className="text-neon-green/60 text-sm mb-2">Extremely unlikely. Seal IDs are 32 hex characters (16 bytes) = 2^128 possible combinations. Would take billions of years to guess.</p>
            <p className="text-neon-green/60 text-sm">Even if guessed, they cannot decrypt without Key A from your vault link.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">What if Cloudflare goes down?</h3>
            <p className="text-neon-green/60 text-sm">Your seal remains safe in the database. Countdown pauses during outage and resumes when service restored. No data loss.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Does TimeSeal track my activity?</h3>
            <p className="text-neon-green/60 text-sm mb-2">We use privacy-first analytics with zero external dependencies. No cookies, no IP addresses, no personal data.</p>
            <p className="text-neon-green/60 text-sm">We only track: page views, seal creation count, unlock events, and country (from Cloudflare headers). All data is aggregate and GDPR compliant.</p>
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
