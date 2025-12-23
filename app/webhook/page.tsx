'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { BackgroundBeams } from '../components/ui/background-beams';
import { FloatingIcons } from '../components/FloatingIcons';
import DecryptedText from '../components/DecryptedText';
import { Card } from '../components/Card';

export default function WebhookPage() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const handleTest = async () => {
    if (!webhookUrl) {
      toast.error('Please enter a webhook URL');
      return;
    }

    if (!webhookUrl.startsWith('https://')) {
      toast.error('Webhook URL must use HTTPS');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test',
          message: 'TimeSeal webhook test',
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast.success('Webhook test successful!');
      } else {
        toast.error(`Webhook returned ${response.status}`);
      }
    } catch (error) {
      toast.error('Failed to reach webhook endpoint');
      console.error(error);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied to clipboard');
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 p-4 relative w-full overflow-x-hidden">
      <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
      <FloatingIcons />

      <motion.a
        href="https://github.com/teycir/timeseal#readme"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-dark-bg/80 backdrop-blur-sm border-2 border-neon-green/30 rounded-xl hover:border-neon-green transition-all group"
        whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)' }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-xs text-neon-green/70 font-mono group-hover:text-neon-green transition-colors">SOURCE CODE</span>
        <svg className="w-5 h-5 text-neon-green animate-subtle-shimmer" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
        </svg>
      </motion.a>

      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        <motion.a
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 bg-dark-bg/80 backdrop-blur-sm border-2 border-neon-green/30 rounded-xl hover:border-neon-green transition-all group"
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)' }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-xs text-neon-green/70 font-mono group-hover:text-neon-green transition-colors">MY SEALS</span>
        </motion.a>

        <motion.a
          href="/"
          className="flex items-center gap-2 px-4 py-2 bg-dark-bg/80 backdrop-blur-sm border-2 border-neon-green/30 rounded-xl hover:border-neon-green transition-all group"
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)' }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-xs text-neon-green/70 font-mono group-hover:text-neon-green transition-colors">HOME</span>
        </motion.a>

        <motion.a
          href="/generate-seed"
          className="flex items-center gap-2 px-4 py-2 bg-dark-bg/80 backdrop-blur-sm border-2 border-neon-green/30 rounded-xl hover:border-neon-green transition-all group"
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)' }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-xs text-neon-green/70 font-mono group-hover:text-neon-green transition-colors">GENERATE SEED PHRASE</span>
        </motion.a>
      </div>

      <div className="max-w-4xl w-full relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold glow-text pulse-glow mb-4">
            <DecryptedText
              text="WEBHOOK CONFIGURATION"
              animateOn="view"
              speed={75}
              maxIterations={20}
              className="text-neon-green"
              encryptedClassName="text-neon-green/30"
            />
          </h1>
          <p className="text-neon-green/70 text-sm">Get notified when your seals unlock</p>
        </div>

        <Card className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-neon-green font-mono text-sm font-bold">WEBHOOK URL (HTTPS ONLY)</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full px-4 py-3 bg-black/50 border-2 border-neon-green/30 rounded-xl text-neon-green font-mono focus:border-neon-green outline-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleTest}
              disabled={isTesting || !webhookUrl}
              className="flex-1 cyber-button py-3"
            >
              {isTesting ? 'TESTING...' : 'TEST WEBHOOK'}
            </button>
            <button
              onClick={handleCopy}
              disabled={!webhookUrl}
              className="cyber-button py-3 px-6"
            >
              COPY
            </button>
          </div>

          <div className="space-y-3 pt-4 border-t border-neon-green/20">
            <h2 className="text-neon-green font-mono text-sm font-bold">SUPPORTED SERVICES</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-black/50 rounded-lg border border-neon-green/20">
                <p className="text-neon-green font-mono text-xs font-bold">🎮 Discord</p>
                <p className="text-neon-green/50 font-mono text-xs mt-1">Server webhooks</p>
              </div>
              <div className="p-3 bg-black/50 rounded-lg border border-neon-green/20">
                <p className="text-neon-green font-mono text-xs font-bold">💬 Slack</p>
                <p className="text-neon-green/50 font-mono text-xs mt-1">Incoming webhooks</p>
              </div>
              <div className="p-3 bg-black/50 rounded-lg border border-neon-green/20">
                <p className="text-neon-green font-mono text-xs font-bold">⚡ Zapier</p>
                <p className="text-neon-green/50 font-mono text-xs mt-1">5000+ integrations</p>
              </div>
              <div className="p-3 bg-black/50 rounded-lg border border-neon-green/20">
                <p className="text-neon-green font-mono text-xs font-bold">🔗 IFTTT</p>
                <p className="text-neon-green/50 font-mono text-xs mt-1">SMS, email, IoT</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-neon-green/10 border border-neon-green/30 rounded-lg">
            <p className="text-neon-green/70 font-mono text-xs">
              💡 TIP: Add your webhook URL when creating a seal. You&apos;ll receive a notification when it unlocks.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-neon-green font-mono text-xs font-bold">WEBHOOK PAYLOAD EXAMPLE</h3>
            <pre className="p-4 bg-black/50 rounded-lg border border-neon-green/20 overflow-x-auto">
              <code className="text-neon-green font-mono text-xs">
{`{
  "event": "seal_unlocked",
  "sealId": "abc123...",
  "unlockedAt": "2024-01-15T12:00:00Z"
}`}
              </code>
            </pre>
          </div>

          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 font-mono text-xs">
              🔒 PRIVACY: Webhook URLs are encrypted with your seal&apos;s Key B. Only decryptable when the seal unlocks.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
