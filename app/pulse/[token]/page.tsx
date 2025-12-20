'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/app/components/Button';
import { Card } from '@/app/components/Card';
import { ErrorMessage } from '@/app/components/Common';
import { formatTimeShort, fetchJSON } from '@/lib/clientUtils';
import { TIME_CONSTANTS } from '@/lib/constants';
import DecryptedText from '@/app/components/DecryptedText';
import { BackgroundBeams } from '@/app/components/ui/background-beams';

export default function PulsePage() {
  return <PulsePageClient />;
}

function PulsePageClient() {
  const [pulseToken, setPulseToken] = useState('');
  const [isPulsing, setIsPulsing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [pulseDuration, setPulseDuration] = useState<number>(0);
  const [showBurnConfirm, setShowBurnConfirm] = useState(false);
  const [isBurning, setIsBurning] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  const fetchPulseStatus = async () => {
    if (!pulseToken) return;
    try {
      const data = await fetchJSON<{ timeRemaining: number; pulseInterval: number }>(
        '/api/pulse/status',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pulseToken }),
        }
      );
      setTimeRemaining(data.timeRemaining);
      setPulseDuration(data.pulseInterval);
      setHasToken(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pulse status');
    }
  };

  useEffect(() => {
    if (pulseToken && hasToken) {
      fetchPulseStatus();
      const interval = setInterval(fetchPulseStatus, TIME_CONSTANTS.PULSE_CHECK_INTERVAL);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulseToken, hasToken]);

  useEffect(() => {
    if (timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - TIME_CONSTANTS.COUNTDOWN_INTERVAL));
      }, TIME_CONSTANTS.COUNTDOWN_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [timeRemaining]);

  const handlePulse = async () => {
    if (!pulseToken) return;
    setIsPulsing(true);
    setError(null);
    try {
      await fetchJSON('/api/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pulseToken }),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), TIME_CONSTANTS.SUCCESS_MESSAGE_DURATION);
      fetchPulseStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pulse');
    } finally {
      setIsPulsing(false);
    }
  };

  const handleBurn = async () => {
    if (!pulseToken) return;
    setIsBurning(true);
    setError(null);
    try {
      await fetchJSON('/api/burn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pulseToken }),
      });
      globalThis.window.location.href = '/?burned=true';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to burn seal');
    } finally {
      setIsBurning(false);
    }
  };

  const isUrgent = timeRemaining < pulseDuration * 0.2;

  if (!hasToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative w-full overflow-x-hidden">
        <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
        <div className="max-w-md w-full relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-6xl mb-4 animate-pulse">💓</div>
            <h1 className="text-3xl font-bold glow-text mb-2">
              <DecryptedText text="DEAD MAN'S SWITCH" animateOn="view" className="text-neon-green" />
            </h1>
            <p className="text-neon-green/70 mb-8">Enter your pulse token to manage your seal.</p>
          </motion.div>

          <Card className="p-6 border-neon-green/30">
            <label htmlFor="pulse-token-input" className="block text-sm mb-2 text-neon-green/80 font-bold">PULSE TOKEN</label>
            <input
              id="pulse-token-input"
              type="text"
              value={pulseToken}
              onChange={(e) => setPulseToken(e.target.value)}
              placeholder="x-x-x-x"
              className="cyber-input w-full font-mono mb-6 text-center tracking-widest"
            />

            <Button onClick={fetchPulseStatus} disabled={!pulseToken.trim()} className="w-full">
              CONTINUE
            </Button>

            {error && <ErrorMessage message={error} />}
          </Card>
        </div>
      </div>
    );
  }

  if (showBurnConfirm) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative w-full overflow-x-hidden">
        <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
        <div className="max-w-md w-full relative z-10 text-center">
          <div className="text-6xl mb-4">🔥</div>
          <h1 className="text-3xl font-bold glow-text mb-4 text-red-500">BURN SEAL?</h1>

          <Card className="mb-8 border-red-500/30">
            <p className="text-red-400/90 mb-4">
              This will <span className="font-bold underline">permanently destroy</span> the seal.
              The encrypted content will be unrecoverable.
            </p>
            <p className="text-red-500 font-bold uppercase text-sm">This action cannot be undone.</p>
          </Card>

          <div className="space-y-4">
            <Button onClick={handleBurn} disabled={isBurning} variant="danger" className="w-full shadow-[0_0_20px_rgba(255,0,0,0.3)]">
              {isBurning ? 'BURNING...' : '🔥 YES, BURN IT'}
            </Button>
            <Button onClick={() => setShowBurnConfirm(false)} className="w-full border-neon-green/30 hover:bg-neon-green/10">
              CANCEL
            </Button>
          </div>
          {error && <ErrorMessage message={error} />}
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative w-full overflow-x-hidden">
        <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
        <div className="max-w-md w-full relative z-10 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl mb-4"
          >
            ✅
          </motion.div>
          <h1 className="text-3xl font-bold glow-text mb-4">
            <DecryptedText text="PULSE CONFIRMED" animateOn="view" className="text-neon-green" />
          </h1>
          <Card className="border-neon-green/40">
            <p className="text-neon-green/70">
              Your seal remains locked. Next pulse needed in <span className="text-neon-green font-mono font-bold">{formatTimeShort(pulseDuration)}</span>.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative w-full overflow-hidden">
      <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
      <div className="max-w-md w-full relative z-10 text-center">
        <div className={`text-6xl mb-4 ${isUrgent ? 'animate-pulse' : ''}`}>💓</div>
        <h1 className="text-3xl font-bold glow-text mb-6">
          <DecryptedText text="DEAD MAN'S SWITCH" animateOn="view" className="text-neon-green" />
        </h1>

        {timeRemaining > 0 && (
          <Card className={`mb-8 ${isUrgent ? 'border-red-500/50 shadow-[0_0_20px_rgba(255,0,0,0.2)]' : ''}`}>
            <p className="text-xs text-neon-green/50 mb-2 uppercase tracking-widest">TIME UNTIL AUTO-UNLOCK</p>
            <div className={`text-5xl font-mono mb-2 ${isUrgent ? 'text-red-500 pulse-glow' : 'text-neon-green pulse-glow'}`}>
              {formatTimeShort(timeRemaining)}
            </div>
            {isUrgent && (
              <p className="text-red-500 text-sm font-bold animate-pulse">⚠️ URGENT: PULSE REQUIRED</p>
            )}
          </Card>
        )}

        <p className="text-neon-green/70 mb-8 text-sm">
          Click below to confirm you are active and reset the countdown timer.
        </p>

        <Button
          onClick={handlePulse}
          disabled={isPulsing}
          className="w-full text-xl py-6 mb-4 shadow-[0_0_20px_rgba(0,255,65,0.3)] hover:shadow-[0_0_40px_rgba(0,255,65,0.5)]"
        >
          {isPulsing ? 'PULSING...' : '💓 SEND PULSE'}
        </Button>

        <Button
          onClick={() => setShowBurnConfirm(true)}
          variant="danger"
          className="w-full text-sm opacity-80 hover:opacity-100"
        >
          🔥 BURN SEAL (PERMANENT)
        </Button>

        {error && <ErrorMessage message={error} />}
      </div>
    </div>
  );
}
