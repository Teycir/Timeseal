'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/Button';
import { Card } from '@/app/components/Card';
import { ErrorMessage, PageHeader, CenteredContainer } from '@/app/components/Common';
import { formatTimeShort, fetchJSON } from '@/lib/clientUtils';
import { TIME_CONSTANTS } from '@/lib/constants';

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
      window.location.href = '/?burned=true';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to burn seal');
    } finally {
      setIsBurning(false);
    }
  };

  const isUrgent = timeRemaining < pulseDuration * 0.2;

  if (!hasToken) {
    return (
      <CenteredContainer>
        <PageHeader 
          icon="💓" 
          title="DEAD MAN'S SWITCH" 
          subtitle="Enter your pulse token to manage your seal."
        />
        
        <Card>
          <label className="block text-sm mb-2">PULSE TOKEN</label>
          <input
            type="text"
            value={pulseToken}
            onChange={(e) => setPulseToken(e.target.value)}
            placeholder="Enter your pulse token..."
            className="cyber-input w-full font-mono mb-4"
          />
          
          <Button onClick={fetchPulseStatus} disabled={!pulseToken.trim()} className="w-full">
            CONTINUE
          </Button>
          
          {error && <ErrorMessage message={error} />}
        </Card>
      </CenteredContainer>
    );
  }

  if (showBurnConfirm) {
    return (
      <CenteredContainer>
        <div className="text-center">
          <PageHeader 
            icon="🔥" 
            title="BURN SEAL?" 
            subtitle="This will permanently destroy the seal. The encrypted content will be unrecoverable. This action cannot be undone."
          />
          
          <div className="space-y-4">
            <Button onClick={handleBurn} disabled={isBurning} variant="danger" className="w-full">
              {isBurning ? 'BURNING...' : '🔥 YES, BURN IT'}
            </Button>
            <Button onClick={() => setShowBurnConfirm(false)} className="w-full">
              CANCEL
            </Button>
          </div>
          {error && <ErrorMessage message={error} />}
        </div>
      </CenteredContainer>
    );
  }

  if (success) {
    return (
      <CenteredContainer>
        <div className="text-center">
          <PageHeader 
            icon="✅" 
            title="PULSE CONFIRMED" 
            subtitle={`Your seal remains locked. Next pulse needed in ${formatTimeShort(pulseDuration)}.`}
          />
        </div>
      </CenteredContainer>
    );
  }

  return (
    <CenteredContainer>
      <div className="text-center">
        <div className={`text-6xl mb-4 ${isUrgent ? 'animate-pulse' : ''}`}>💓</div>
        <h1 className="text-3xl font-bold glow-text mb-4">DEAD MAN&apos;S SWITCH</h1>
        
        {timeRemaining > 0 && (
          <Card className="mb-6">
            <p className="text-sm text-neon-green/70 mb-2">TIME UNTIL AUTO-UNLOCK</p>
            <div className={`text-4xl font-mono ${isUrgent ? 'text-red-500 pulse-glow' : ''}`}>
              {formatTimeShort(timeRemaining)}
            </div>
            {isUrgent && (
              <p className="text-red-500 text-sm mt-2">⚠️ URGENT: Pulse soon or seal will unlock!</p>
            )}
          </Card>
        )}
        
        <p className="text-neon-green/70 mb-8">
          Click to confirm you&apos;re still active and reset the countdown.
        </p>
        
        <Button onClick={handlePulse} disabled={isPulsing} className="w-full text-xl py-6 mb-4">
          {isPulsing ? 'PULSING...' : '💓 SEND PULSE'}
        </Button>
        
        <Button 
          onClick={() => setShowBurnConfirm(true)} 
          variant="danger"
          className="w-full text-sm"
        >
          🔥 BURN SEAL (PERMANENT)
        </Button>
        
        {error && <ErrorMessage message={error} />}
      </div>
    </CenteredContainer>
  );
}
