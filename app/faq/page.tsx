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
            <p className="text-neon-green/60 text-sm">750KB per seal (D1 database limit with base64 encoding overhead).</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">How does Time-Seal prevent early access?</h3>
            <p className="text-neon-green/60 text-sm mb-2">Split-key architecture: Your browser generates Key A (stays in URL hash) and Key B (sent to server). Both keys required for decryption. Server refuses to release Key B until unlock time.</p>
            <p className="text-neon-green/60 text-sm">Server-side time validation using Cloudflare NTP-synchronized timestamps. Your local clock is irrelevant.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">How do I create a seal?</h3>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">Timed Release:</strong> Enter message/file, select "Timed Release", choose unlock date (up to 30 days), complete security check, save vault link.</p>
            <p className="text-neon-green/60 text-sm"><strong className="text-neon-green">Dead Man&apos;s Switch:</strong> Same as above but select "Dead Man&apos;s Switch", set pulse interval, save both vault link (public) and pulse link (private).</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">How does Dead Man&apos;s Switch work?</h3>
            <p className="text-neon-green/60 text-sm">Set pulse interval (e.g., 7 days). Visit private pulse link before interval expires to reset timer. If you miss a pulse, seal auto-unlocks for recipient. Use pulse link to "burn" seal permanently.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Can I decrypt my seal early?</h3>
            <p className="text-neon-green/60 text-sm">No. The time-lock is cryptographically enforced. Not even the creator can decrypt before the unlock time.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">What happens if I lose the vault link?</h3>
            <p className="text-neon-green/60 text-sm">The link contains Key A in the URL hash. If lost, the content cannot be decrypted. Save it securely.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">What happens if I miss a pulse?</h3>
            <p className="text-neon-green/60 text-sm">The seal will automatically unlock for recipients after the pulse interval expires.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Can I cancel or delete a seal?</h3>
            <p className="text-neon-green/60 text-sm">Dead Man&apos;s Switch seals can be burned (permanently destroyed) using the pulse token. Timed seals cannot be deleted.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Where is my data stored?</h3>
            <p className="text-neon-green/60 text-sm">Encrypted blobs are stored in Cloudflare D1 database. Metadata and keys are also in D1.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Is this really secure?</h3>
            <p className="text-neon-green/60 text-sm">Yes. We use AES-GCM 256-bit encryption, split-key architecture, and database-backed storage. The code is open source for audit.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Do you have access to my content?</h3>
            <p className="text-neon-green/60 text-sm">No. Encryption happens client-side. We only store the encrypted blob and Key B. Both keys are required for decryption.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">What file formats are supported?</h3>
            <p className="text-neon-green/60 text-sm">All file types. The system encrypts raw bytes, so any file format works.</p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Is there a cost to use TimeSeal?</h3>
            <p className="text-neon-green/60 text-sm">Free for non-commercial use. Commercial use requires a license (see BSL license).</p>
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
