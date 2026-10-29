'use client';

import { motion } from 'framer-motion';
import { BackgroundBeams } from '../components/ui/background-beams';
import { Card } from '../components/Card';
import DecryptedText from '../components/DecryptedText';
import Link from 'next/link';

export default function LicensePage() {
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
            <DecryptedText text="LICENSE" animateOn="view" className="text-neon-green" speed={75} maxIterations={20} />
          </h1>
          <p className="text-neon-green/70 text-sm sm:text-base px-4">Business Source License (BSL)</p>
        </motion.div>

        <Card className="p-4 sm:p-6 md:p-8 space-y-6">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">What is the Business Source License?</h3>
            <p className="text-neon-green/60 text-sm mb-2">
              The Business Source License (BSL) is a source-available license that allows free use for non-commercial purposes 
              while requiring a commercial license for production use. After 4 years, the code automatically converts to Apache 2.0.
            </p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">What can I do with TimeSeal?</h3>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">✅ Allowed (Free):</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs text-neon-green/60 mb-2">
              <li>Personal use (send time-locked messages to friends/family)</li>
              <li>Educational use (learn cryptography, study the code)</li>
              <li>Research and development (academic projects, experiments)</li>
              <li>Non-profit organizations (charities, open source projects)</li>
              <li>Internal business tools (not customer-facing)</li>
              <li>Code inspection and security audits</li>
              <li>Self-hosting for personal use</li>
            </ul>
            <p className="text-neon-green/60 text-sm mb-2"><strong className="text-neon-green">❌ Requires License (Commercial):</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs text-neon-green/60">
              <li>Offering TimeSeal as a service to customers</li>
              <li>Embedding TimeSeal in commercial products</li>
              <li>Using TimeSeal for revenue-generating activities</li>
              <li>Providing TimeSeal hosting to third parties</li>
              <li>White-labeling TimeSeal for clients</li>
            </ul>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Why BSL instead of MIT/Apache?</h3>
            <p className="text-neon-green/60 text-sm mb-2">
              BSL protects the sustainability of open source projects while keeping code transparent. It prevents large companies 
              from taking the code, offering it as a service, and competing without contributing back.
            </p>
            <p className="text-neon-green/60 text-sm">
              After 4 years, the code becomes Apache 2.0 licensed, ensuring long-term open source availability.
            </p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">When does it convert to Apache 2.0?</h3>
            <p className="text-neon-green/60 text-sm mb-2">
              <strong className="text-neon-green">Change Date:</strong> 4 years from initial release
            </p>
            <p className="text-neon-green/60 text-sm mb-2">
              <strong className="text-neon-green">Change License:</strong> Apache License 2.0
            </p>
            <p className="text-neon-green/60 text-sm">
              After the change date, all restrictions are lifted and the code becomes fully open source under Apache 2.0.
            </p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">How do I get a commercial license?</h3>
            <p className="text-neon-green/60 text-sm mb-2">
              Contact us for commercial licensing inquiries:
            </p>
            <p className="text-neon-green/60 text-sm mb-2">
              <strong className="text-neon-green">Email:</strong> <a href="mailto:license@timeseal.dev" className="text-neon-green hover:underline">license@timeseal.dev</a>
            </p>
            <p className="text-neon-green/60 text-sm">
              We offer flexible licensing options for businesses of all sizes.
            </p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Can I self-host TimeSeal?</h3>
            <p className="text-neon-green/60 text-sm mb-2">
              <strong className="text-neon-green">✅ Yes, for non-commercial use.</strong> You can deploy your own instance on Cloudflare Workers for personal use, 
              internal business tools, or educational purposes.
            </p>
            <p className="text-neon-green/60 text-sm mb-2">
              <strong className="text-neon-green">❌ Commercial hosting requires a license.</strong> If you&apos;re offering TimeSeal as a service to customers 
              or using it for revenue-generating activities, you need a commercial license.
            </p>
            <p className="text-neon-green/60 text-sm">
              See our <a href="/docs/SELF-HOSTING.md" className="text-neon-green hover:underline">Self-Hosting Guide</a> for deployment instructions.
            </p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Can I modify the code?</h3>
            <p className="text-neon-green/60 text-sm mb-2">
              <strong className="text-neon-green">✅ Yes.</strong> You can modify the code for personal use, internal tools, or educational purposes. 
              You can also contribute improvements back to the project via pull requests.
            </p>
            <p className="text-neon-green/60 text-sm">
              <strong className="text-neon-green">❌ Commercial modifications require a license.</strong> If you&apos;re modifying the code for commercial 
              purposes (offering as a service, embedding in products), you need a commercial license.
            </p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Can I contribute to TimeSeal?</h3>
            <p className="text-neon-green/60 text-sm mb-2">
              <strong className="text-neon-green">✅ Yes!</strong> We welcome contributions from the community. All contributions are licensed under the same BSL terms.
            </p>
            <p className="text-neon-green/60 text-sm">
              Submit pull requests on <a href="https://github.com/teycir/timeseal" className="text-neon-green hover:underline" target="_blank" rel="noopener noreferrer">GitHub</a>.
            </p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">What about security audits?</h3>
            <p className="text-neon-green/60 text-sm">
              <strong className="text-neon-green">✅ Fully allowed.</strong> Security researchers, auditors, and anyone can inspect the code, 
              report vulnerabilities, and verify the cryptographic implementation. Transparency is a core principle of TimeSeal.
            </p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Is the license enforceable?</h3>
            <p className="text-neon-green/60 text-sm mb-2">
              <strong className="text-neon-green">Yes.</strong> The Business Source License is a legally binding license used by many companies 
              including HashiCorp, Elastic, and CockroachDB.
            </p>
            <p className="text-neon-green/60 text-sm">
              Violations of the license terms can result in legal action and termination of your license to use the software.
            </p>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neon-green mb-2">Where can I read the full license?</h3>
            <p className="text-neon-green/60 text-sm">
              The complete license text is available in the <a href="https://github.com/teycir/timeseal/blob/main/LICENSE" className="text-neon-green hover:underline" target="_blank" rel="noopener noreferrer">LICENSE</a> file 
              in the GitHub repository.
            </p>
          </div>

          <div className="border-t border-neon-green/20 pt-4 mt-6">
            <p className="text-neon-green/60 text-xs">
              <strong className="text-neon-green">Summary:</strong> TimeSeal is free for personal, educational, and non-commercial use. 
              Commercial use requires a license. After 4 years, the code becomes Apache 2.0 licensed. 
              The source code is always available for inspection and security audits.
            </p>
          </div>
        </Card>

        <div className="text-center pt-4">
          <Link href="/" className="cyber-button inline-block">
            CREATE YOUR SEAL
          </Link>
        </div>
      </div>
    </div>
  );
}
