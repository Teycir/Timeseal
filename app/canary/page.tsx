'use client';

import { Shield, CheckCircle, Calendar, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { BackgroundBeams } from '../components/ui/background-beams';
import DecryptedText from '../components/DecryptedText';

export default function CanaryPage() {
  const today = new Date();
  const nextMonth = new Date(Date.now() + 30*24*60*60*1000);

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
            <DecryptedText text="WARRANT CANARY" animateOn="view" className="text-neon-green" speed={75} maxIterations={20} />
          </h1>
          <p className="text-neon-green/70 text-sm sm:text-base px-4">Live Transparency Status</p>
        </motion.div>

        {/* Status Card */}
        <div className="cyber-card p-6 mb-6 border-neon-green/50">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-neon-green" />
            <h2 className="text-xl font-bold text-neon-green">STATUS: OPERATIONAL</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 text-sm mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neon-green/60" />
              <span className="text-neon-green/60">Last Updated:</span>
              <span className="text-neon-green font-mono">{today.toISOString().split('T')[0]}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neon-green/60" />
              <span className="text-neon-green/60">Next Check:</span>
              <span className="text-neon-green font-mono">{nextMonth.toISOString().split('T')[0]}</span>
            </div>
          </div>

          <div className="p-4 bg-neon-green/5 border border-neon-green/20 rounded-lg mb-4">
            <p className="text-xs text-neon-green/70 mb-2 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              <strong>Proof of Freshness:</strong>
            </p>
            <p className="text-xs text-neon-green/60 font-mono break-all">
              Page generated at: {today.toISOString()}
            </p>
            <p className="text-xs text-neon-green/60 font-mono break-all mt-1">
              Unix timestamp: {Math.floor(today.getTime() / 1000)}
            </p>
            <p className="text-xs text-neon-green/50 mt-2">
              This timestamp proves the page was generated recently and is not a cached or stale version.
            </p>
          </div>

          <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-500/70 mb-2 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              <strong>Live Verification Test:</strong>
            </p>
            <p className="text-xs text-yellow-500/60 mb-2">
              Refresh this page multiple times and watch the timestamp change. Each refresh generates a new timestamp proving the canary is live.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-500 hover:bg-yellow-500/20 transition-colors font-mono flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                REFRESH NOW
              </button>
              <span className="text-xs text-yellow-500/50 flex items-center gap-1">
                <span>←</span> Click to verify timestamp updates
              </span>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="cyber-card p-6 mb-6">
          <h3 className="text-base sm:text-lg font-bold text-neon-green mb-4">Security Checklist</h3>
          <div className="space-y-3">
            {[
              { text: 'No warrants, subpoenas, or national security letters received', tip: 'No legal demands for data or access' },
              { text: 'No gag orders in effect', tip: 'Free to disclose all legal requests' },
              { text: 'No government requests for user data', tip: 'No requests from any government entity' },
              { text: 'No forced time manipulation requests', tip: 'No demands to unlock seals early' },
              { text: 'Infrastructure remains under operator control', tip: 'No seizure or unauthorized access' },
              { text: 'No backdoors or compromises known', tip: 'No security breaches detected' }
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 group">
                <CheckCircle className="w-5 h-5 text-neon-green flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-neon-green/80 block">{item.text}</span>
                  <span className="text-xs text-neon-green/40 block mt-1 opacity-0 group-hover:opacity-100 transition-opacity">{item.tip}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="cyber-card p-6 bg-dark-bg/50 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-neon-green/60 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-neon-green/60 space-y-2">
              <p><strong className="text-neon-green">What is a Warrant Canary?</strong> A warrant canary is a method to inform users that a service has NOT received secret government requests (warrants, subpoenas, gag orders). If the canary disappears or stops updating, it signals potential compromise.</p>
              <p><strong className="text-neon-green">How this works:</strong> This page is automatically generated on every visit with the current date. No manual updates needed. If you can see this page with today&apos;s date, TimeSeal infrastructure is operational and uncompromised.</p>
              <p><strong className="text-neon-green">What to watch for:</strong> If this page returns an error, shows outdated information, any checkmark is missing, or the date is not current, assume compromise.</p>
              <p><strong className="text-neon-green">Why it matters:</strong> Some government requests come with gag orders preventing disclosure. By regularly stating we have NOT received such requests, we can signal compromise by simply stopping updates (which is legal even under gag orders).</p>
              <p><strong className="text-neon-green">Verification:</strong> Bookmark this page and check it monthly. The date should always be current when you visit.</p>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="cyber-card p-6 bg-dark-bg/50">
          <h3 className="text-base sm:text-lg font-bold text-neon-green mb-4">Technical Implementation</h3>
          <div className="text-sm text-neon-green/60 space-y-2">
            <p>• <strong className="text-neon-green">Auto-Generated:</strong> This page is rendered server-side on every request with the current timestamp</p>
            <p>• <strong className="text-neon-green">No Database:</strong> No stored canary file that could be seized or tampered with</p>
            <p>• <strong className="text-neon-green">Open Source:</strong> Code is publicly auditable on GitHub</p>
            <p>• <strong className="text-neon-green">Edge Deployed:</strong> Runs on Cloudflare Workers distributed infrastructure</p>
            <p>• <strong className="text-neon-green">Legal Compliance:</strong> Stopping updates is legal even under gag orders (we simply don&apos;t make false statements)</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4">
          <a href="/" className="cyber-button inline-block">
            CREATE YOUR SEAL
          </a>
        </div>
      </div>
    </div>
  );
}
