'use client';

import { useState, useEffect } from 'react';
import { usePWA } from '@/lib/usePWA';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ensureIntegrity } from '@/lib/clientIntegrity';
import { addSeal } from '@/lib/encryptedStorage';
import { BackgroundBeams } from './components/ui/background-beams';
import { EncryptionProgress } from './components/EncryptionProgress';
import { FloatingIcons } from './components/FloatingIcons';
import { CreateSealForm } from './components/CreateSealForm';
import { SealSuccess } from './components/SealSuccess';
import { motion } from 'framer-motion';

export default function HomePage() {
  usePWA();

  const [encryptionProgress, setEncryptionProgress] = useState(0);
  const [result, setResult] = useState<{
    publicUrl: string;
    pulseUrl?: string;
    pulseToken?: string;
    receipt?: any;
    keyA: string;
    sealId: string;
  } | null>(null);

  const triggerConfetti = () => {
    const end = Date.now() + 3 * 1000;
    const colors = ['#00ff41', '#ffffff'];

    (function frame() {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  useEffect(() => {
    if (globalThis.window !== undefined) {
      const params = new URLSearchParams(globalThis.window.location.search);
      if (params.get('burned') === 'true') {
        toast.error('Seal burned successfully. Content permanently destroyed.');
        globalThis.window.history.replaceState({}, '', '/');
      }
    }
  }, []);

  useEffect(() => {
    ensureIntegrity().catch(err => {
      toast.error('Security Alert: Client integrity check failed. Env may be tampered.');
      console.error(err);
    });
  }, []);

  const handleSuccess = (data: { publicUrl: string; pulseUrl?: string; pulseToken?: string; receipt?: any; keyA: string; sealId: string }) => {
    setResult(data);
    triggerConfetti();

    // Save to encrypted local storage
    const sealId = data.publicUrl.split('/v/')[1]?.split('#')[0];
    addSeal({
      id: sealId || '',
      publicUrl: data.publicUrl,
      pulseUrl: data.pulseUrl,
      pulseToken: data.pulseToken,
      type: data.pulseToken ? 'deadman' : 'timed',
      unlockTime: Date.now() + 3600000,
      createdAt: Date.now()
    }).catch(err => {
      console.error('Failed to save seal to encrypted storage:', err);
    });
  };

  const handleReset = () => {
    setResult(null);
    setEncryptionProgress(0);
  };

  return (
    <main className="min-h-screen flex flex-col items-center pt-12 pb-32 p-4 relative w-full overflow-x-hidden">
      <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
      <FloatingIcons />

      <AnimatePresence>
        {encryptionProgress > 0 && (
          <EncryptionProgress progress={encryptionProgress} />
        )}
      </AnimatePresence>

      <motion.a
        href="https://github.com/teycir/timeseal#readme"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-dark-bg/80 backdrop-blur-sm border-2 border-neon-green/30 rounded-xl hover:border-neon-green transition-all group"
        whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)' }}
        whileTap={{ scale: 0.95 }}
        aria-label="View TimeSeal source code on GitHub"
      >
        <span className="text-xs text-neon-green/70 font-mono group-hover:text-neon-green transition-colors">SOURCE CODE</span>
        <svg className="w-5 h-5 text-neon-green animate-subtle-shimmer" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
        </svg>
      </motion.a>

      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[220px]">
        <motion.a
          href="/dashboard"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-dark-bg/80 backdrop-blur-sm border-2 border-neon-green/30 rounded-xl hover:border-neon-green transition-all group"
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)' }}
          whileTap={{ scale: 0.95 }}
          aria-label="View your saved TimeSeal vaults"
        >
          <span className="text-xs text-neon-green/70 font-mono group-hover:text-neon-green transition-colors">MY SEALS</span>
        </motion.a>
      </div>

      <section className="max-w-2xl w-full relative z-10 my-auto" aria-label="Create time-locked vault">
        <AnimatePresence mode="wait">
          {result ? (
            <SealSuccess
              publicUrl={result.publicUrl}
              pulseUrl={result.pulseUrl}
              pulseToken={result.pulseToken}
              receipt={result.receipt}
              sealId={result.sealId}
              onReset={handleReset}
            />
          ) : (
            <CreateSealForm
              onSuccess={handleSuccess}
              onProgressChange={setEncryptionProgress}
            />
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
