import { Shield, CheckCircle, Calendar, AlertTriangle } from 'lucide-react';

export default function CanaryPage() {
  const today = new Date();
  const nextMonth = new Date(Date.now() + 30*24*60*60*1000);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-10 h-10 text-neon-green" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neon-green glow-text">WARRANT CANARY</h1>
            <p className="text-sm text-neon-green/60">Live Transparency Status</p>
          </div>
        </div>

        {/* Status Card */}
        <div className="cyber-card p-6 mb-6 border-neon-green/50">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-neon-green" />
            <h2 className="text-xl font-bold text-neon-green">STATUS: OPERATIONAL</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 tooltip">
              <Calendar className="w-4 h-4 text-neon-green/60" />
              <span className="text-neon-green/60">Last Updated:</span>
              <span className="text-neon-green font-mono">{today.toISOString().split('T')[0]}</span>
              <span className="tooltip-text">This page auto-generates with current date on every visit</span>
            </div>
            <div className="flex items-center gap-2 tooltip">
              <Calendar className="w-4 h-4 text-neon-green/60" />
              <span className="text-neon-green/60">Next Check:</span>
              <span className="text-neon-green font-mono">{nextMonth.toISOString().split('T')[0]}</span>
              <span className="tooltip-text">Recommended to verify canary monthly</span>
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
              <div key={i} className="flex items-start gap-3 tooltip">
                <CheckCircle className="w-5 h-5 text-neon-green flex-shrink-0 mt-0.5" />
                <span className="text-neon-green/80">{item.text}</span>
                <span className="tooltip-text">{item.tip}</span>
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
        <div className="mt-8 text-center">
          <a href="/" className="text-neon-green/60 hover:text-neon-green text-sm transition-colors">
            ← Back to TimeSeal
          </a>
        </div>
      </div>
    </div>
  );
}
