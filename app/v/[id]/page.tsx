'use client';

export const runtime = 'edge';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { decryptData } from '@/lib/crypto';
import DecryptedText from '../../components/DecryptedText';
import { BackgroundBeams } from '../../components/ui/background-beams';
import { Card } from '../../components/Card';

interface SealStatus {
  id: string;
  isLocked: boolean;
  unlockTime: number;
  timeRemaining?: number;
  keyB?: string;
  iv?: string;
}

export default function VaultPage({ params }: { params: Promise<{ id: string }> }) {
  return <VaultPageWrapper params={params} />;
}

async function VaultPageWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VaultPageClient id={id} />;
}

function VaultPageClient({ id }: { id: string }) {
  const [status, setStatus] = useState<SealStatus | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const decryptMessage = useCallback(async (keyB: string, iv: string) => {
    try {
      const keyA = globalThis.window.location.hash.substring(1);
      if (!keyA) {
        setError('Key A not found in URL. Invalid vault link.');
        return;
      }

      const response = await fetch(`/api/seal/${id}`);
      const data = await response.json() as { encryptedBlob?: string; error?: string };

      if (!data.encryptedBlob) {
        setError('Encrypted content not found');
        return;
      }

      const binary = atob(data.encryptedBlob);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.codePointAt(i) || 0;
      }
      const encryptedBuffer = bytes.buffer;

      const decrypted = await decryptData(encryptedBuffer, { keyA, keyB, iv });
      const content = new TextDecoder().decode(decrypted);
      setDecryptedContent(content);
    } catch (err) {
      console.error('Decryption failed:', err);
      setError('Failed to decrypt message');
    }
  }, [id]);

  const fetchSealStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/seal/${id}`);
      const data = await response.json() as SealStatus & { error?: string };

      if (response.ok) {
        setStatus(data);

        if (!data.isLocked && data.keyB && data.iv) {
          await decryptMessage(data.keyB, data.iv);
        }
      } else {
        setError(data.error || 'Seal not found');
      }
    } catch (err) {
      console.error('Fetch status failed:', err);
      setError('Failed to fetch seal status');
    }
  }, [id, decryptMessage]);

  useEffect(() => {
    fetchSealStatus();
  }, [fetchSealStatus]);

  useEffect(() => {
    if (status?.isLocked && status.timeRemaining) {
      setTimeLeft(status.timeRemaining);

      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1000) {
            clearInterval(interval);
            fetchSealStatus(); // Refresh status when time is up
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [status, fetchSealStatus]);

  const formatTimeLeft = (ms: number) => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative w-full overflow-x-hidden pb-32">
        <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
        <div className="max-w-md w-full text-center relative z-10">
          <div className="text-6xl mb-6">⚠️</div>
          <h1 className="text-3xl font-bold mb-4 glow-text text-red-500">VAULT ERROR</h1>
          <Card className="mb-8 border-red-500/30">
            <p className="text-red-400/90 font-mono">{error}</p>
          </Card>
          <a href="/" className="cyber-button inline-block hover:shadow-[0_0_30px_rgba(255,0,0,0.4)] hover:border-red-500/50">
            CREATE NEW SEAL
          </a>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen flex items-center justify-center relative w-full overflow-hidden">
        <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
        <div className="text-center relative z-10">
          <div className="animate-spin text-4xl mb-4 text-neon-green">⏳</div>
          <p className="text-neon-green/70 font-mono tracking-widest">
            <DecryptedText text="LOADING VAULT..." speed={30} maxIterations={10} />
          </p>
        </div>
      </div>
    );
  }

  if (decryptedContent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative w-full overflow-x-hidden pb-32">
        <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full relative z-10"
        >
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold glow-text mb-4">
              <DecryptedText text="VAULT UNLOCKED" animateOn="view" className="text-neon-green" />
            </h1>
            <p className="text-neon-green/70">The seal has been broken. Here is your message:</p>
          </div>

          <Card className="p-8 mb-8 relative group">
            <div className="absolute top-0 right-0 p-2 opacity-50 group-hover:opacity-100 transition-opacity">
              <span className="text-xs font-mono text-neon-green border border-neon-green/30 px-2 py-1 rounded">DECRYPTED</span>
            </div>
            <div
              className="whitespace-pre-wrap text-sm leading-relaxed break-words font-mono text-neon-green/90"
              style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
            >
              {decryptedContent}
            </div>
          </Card>

          <div className="text-center">
            <a href="/" className="cyber-button text-lg px-8 py-4">
              CREATE YOUR OWN TIME-SEAL
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  // Locked state with countdown
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative w-full overflow-hidden">
      <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
      <div className="max-w-md w-full text-center relative z-10">
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            textShadow: [
              "0 0 20px rgba(0,255,65,0.2)",
              "0 0 40px rgba(0,255,65,0.4)",
              "0 0 20px rgba(0,255,65,0.2)"
            ]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: "reverse"
          }}
          className="text-8xl mb-8 filter drop-shadow-[0_0_15px_rgba(0,255,65,0.3)]"
        >
          🔒
        </motion.div>

        <h1 className="text-5xl font-bold glow-text mb-4">
          <DecryptedText text="VAULT SEALED" animateOn="view" className="text-neon-green" />
        </h1>
        <p className="text-neon-green/70 mb-8">
          This message is cryptographically locked until:
        </p>

        <Card className="p-8 mb-8 border-neon-green/40 shadow-[0_0_30px_rgba(0,255,65,0.1)]">
          <div className="text-xl font-bold mb-4 text-neon-green/80 uppercase tracking-widest border-b border-neon-green/20 pb-2">
            Protocol Unlock Time
          </div>
          <div className="text-2xl font-bold mb-6 text-white font-mono">
            {new Date(status.unlockTime).toLocaleString()}
          </div>

          <div className="text-xs text-neon-green/50 mb-2 uppercase tracking-abovet">Time Remaining</div>
          {timeLeft > 0 ? (
            <div className="text-4xl font-mono pulse-glow text-neon-green tabular-nums">
              <DecryptedText
                text={formatTimeLeft(timeLeft)}
                speed={0}
                maxIterations={0}
                sequential={true}
                className="text-shadow-[0_0_10px_rgba(0,255,65,0.5)]"
              />
            </div>
          ) : (
            <div className="text-xl text-neon-green animate-pulse">Decrypting...</div>
          )}
        </Card>

        <div className="space-y-6">
          <p className="text-xs text-neon-green/40 max-w-xs mx-auto leading-relaxed">
            <span className="block mb-1">SECURITY LEVEL: MAXIMUM</span>
            This vault uses split-key encryption and WORM storage.
            It cannot be opened early, even by the creator.
          </p>

          <a href="/" className="cyber-button inline-block text-sm opacity-80 hover:opacity-100">
            CREATE YOUR OWN TIME-SEAL
          </a>
        </div>
      </div>
    </div>
  );
}