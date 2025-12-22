'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { decryptData } from '@/lib/crypto';
import { ensureIntegrity } from '@/lib/clientIntegrity';
import DecryptedText from '../../components/DecryptedText';
import { BackgroundBeams } from '../../components/ui/background-beams';
import { Card } from '../../components/Card';
import { toast } from 'sonner';
import { Lock, AlertTriangle, Hourglass, Copy, Download } from 'lucide-react';

interface SealStatus {
  id: string;
  isLocked: boolean;
  unlockTime: number;
  timeRemaining?: number;
  keyB?: string;
  iv?: string;
  isDMS?: boolean;
  pulseUrl?: string;
}

export default function VaultPage({ params }: { params: { id: string } }) {
  return <VaultPageClient id={params.id} />;
}

function VaultPageClient({ id }: { id: string }) {
  const [status, setStatus] = useState<SealStatus | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    ensureIntegrity().catch(err => {
      toast.error('Security Alert: Client integrity check failed. Safely refusing to decrypt.');
      console.error(err);
      setError('Client integrity verification failed');
    });
  }, []);

  const copyVaultLink = async () => {
    try {
      const fullUrl = globalThis.window.location.href;
      await navigator.clipboard.writeText(fullUrl);
      toast.success('Vault link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const downloadContent = () => {
    if (!decryptedContent) return;
    const blob = new Blob([decryptedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeseal-${id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Content downloaded');
  };

  const decryptMessage = useCallback(async (keyB: string, iv: string, encryptedBlob?: string) => {
    try {
      // Verify client integrity before decryption
      await ensureIntegrity();

      const keyA = globalThis.window.location.hash.substring(1);
      if (!keyA) {
        setError('Key A not found in URL. Invalid vault link.');
        return;
      }

      // Use cached blob if provided, otherwise fetch
      let blobData = encryptedBlob;
      if (!blobData) {
        const response = await fetch(`/api/seal/${id}`);
        const data = await response.json() as { encryptedBlob?: string; error?: string };
        blobData = data.encryptedBlob;
      }

      if (!blobData) {
        setError('Encrypted content not found');
        return;
      }

      const binary = atob(blobData);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const encryptedBuffer = bytes.buffer;

      const decrypted = await decryptData(encryptedBuffer, { keyA, keyB, iv });

      // Validate decrypted content is valid UTF-8
      try {
        const content = new TextDecoder('utf-8', { fatal: true }).decode(decrypted);
        setDecryptedContent(content);
      } catch {
        setError('Decryption succeeded but content is corrupted');
      }
    } catch (err) {
      console.error('[VAULT] Decryption failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to decrypt message: ${errorMessage}`);
    }
  }, [id]);

  const fetchSealStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/seal/${id}`);
      const data = await response.json() as SealStatus & { encryptedBlob?: string; error?: string | { code: string; message: string } };

      console.log('[VAULT] API Response:', response.status, data);

      if (response.ok) {
        setStatus(data);

        if (!data.isLocked && data.keyB && data.iv) {
          // Pass encryptedBlob to avoid duplicate fetch
          await decryptMessage(data.keyB, data.iv, data.encryptedBlob);
        }
      } else {
        // Handle both string and nested error object formats
        let errorMsg = 'Seal not found';
        if (data.error) {
          if (typeof data.error === 'string') {
            errorMsg = data.error;
          } else if (typeof data.error === 'object' && data.error.message) {
            errorMsg = data.error.message;
          }
        }
        console.error('[VAULT] Error:', errorMsg, data);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('[VAULT] Fetch failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch seal: ${errorMessage}`);
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

  const calculateProgress = () => {
    if (!status?.unlockTime) return 0;
    const total = status.unlockTime - (status.unlockTime - (status.timeRemaining || 0));
    const elapsed = total - (status.timeRemaining || 0);
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative w-full overflow-x-hidden pb-32">
        <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
        <div className="max-w-md w-full text-center relative z-10">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 glow-text text-red-500 px-2">VAULT ERROR</h1>
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
          <Hourglass className="w-12 h-12 text-neon-green mx-auto mb-4 animate-spin" />
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
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold glow-text mb-4 px-2">
              <DecryptedText text="VAULT UNLOCKED" animateOn="view" className="text-neon-green" />
            </h1>
            <p className="text-neon-green/70 text-sm sm:text-base px-4">The seal has been broken. Here is your message:</p>
          </div>

          <Card className="p-4 sm:p-6 md:p-8 mb-8 relative group">
            <div className="absolute top-0 right-0 p-2 opacity-50 group-hover:opacity-100 transition-opacity">
              <span className="text-xs font-mono text-neon-green border border-neon-green/30 px-2 py-1 rounded">DECRYPTED</span>
            </div>
            <div
              className="whitespace-pre-wrap text-sm leading-relaxed break-words font-mono text-neon-green/90 select-text cursor-text"
              style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
            >
              {decryptedContent}
            </div>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <button
              onClick={downloadContent}
              className="cyber-button flex items-center justify-center gap-2 flex-1"
            >
              <Download className="w-4 h-4" />
              DOWNLOAD CONTENT
            </button>
            <button
              onClick={copyVaultLink}
              className="cyber-button flex items-center justify-center gap-2 flex-1 bg-neon-green/10"
            >
              <Copy className="w-4 h-4" />
              COPY LINK
            </button>
          </div>

          <div className="text-center">
            <a href="/" className="cyber-button text-sm sm:text-base md:text-lg px-4 sm:px-6 md:px-8 py-3 sm:py-4">
              CREATE YOUR OWN TIME-SEAL
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  // Locked state with countdown
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative w-full overflow-x-hidden pb-20">
      <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
      <div className="max-w-md w-full text-center relative z-10">
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: "reverse"
          }}
          className="mb-4 flex justify-center"
        >
          <Lock className="w-12 h-12 text-neon-green" />
        </motion.div>

        <h1 className="text-2xl sm:text-3xl font-bold glow-text mb-3 px-2">
          <DecryptedText text={status.isDMS ? "DEAD MAN'S SWITCH ACTIVE" : "VAULT SEALED"} animateOn="view" className="text-neon-green" />
        </h1>
        
        {/* Urgent warning for less than 24h remaining (both DMS and timed) */}
        {timeLeft > 0 && timeLeft < 24 * 60 * 60 * 1000 && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg animate-pulse">
            <p className="text-red-500 text-sm font-bold mb-1">🚨 LESS THAN 24H REMAINING</p>
            <p className="text-red-400/80 text-xs">
              {status.isDMS ? 'Seal will unlock soon! Pulse immediately to prevent auto-unlock.' : 'This seal will unlock in less than 24 hours.'}
            </p>
          </div>
        )}
        
        {status.isDMS && status.pulseUrl && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-500 text-sm font-bold mb-2">⚠️ PULSE REQUIRED</p>
            <p className="text-yellow-400/80 text-xs mb-3">
              This seal will auto-unlock if not pulsed. Click below to keep it locked.
            </p>
            <a
              href={status.pulseUrl}
              className="cyber-button inline-flex items-center justify-center gap-2 bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/50 text-yellow-500 w-full text-sm"
            >
              SEND PULSE NOW →
            </a>
          </div>
        )}
        
        <p className="text-neon-green/70 mb-4 text-sm px-4">
          {status.isDMS ? 'Will auto-unlock if pulse not received by:' : 'This message is cryptographically locked until:'}
        </p>

        <Card className="p-4 mb-4 border-neon-green/40 shadow-[0_0_30px_rgba(0,255,65,0.1)]">
          <div className="text-sm font-bold mb-3 text-neon-green/80 uppercase tracking-widest border-b border-neon-green/20 pb-2">
            Protocol Unlock Time
          </div>
          <div className="text-lg sm:text-xl font-bold mb-4 text-white font-mono break-words">
            {new Date(status.unlockTime).toLocaleString()}
          </div>

          <div className="text-xs text-neon-green/50 mb-2 uppercase tracking-widest">Time Remaining</div>
          {timeLeft > 0 ? (
            <>
              <div className="text-2xl sm:text-3xl font-mono pulse-glow text-neon-green tabular-nums mb-3">
                <DecryptedText
                  text={formatTimeLeft(timeLeft)}
                  speed={0}
                  maxIterations={0}
                  sequential={true}
                  className="text-shadow-[0_0_10px_rgba(0,255,65,0.5)]"
                />
              </div>
              <div className="w-full bg-black/50 rounded-full h-2 overflow-hidden border border-neon-green/20">
                <motion.div
                  className="h-full bg-gradient-to-r from-neon-green/50 to-neon-green rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${calculateProgress()}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-neon-green/40 mt-2">{calculateProgress().toFixed(1)}% complete</p>
            </>
          ) : (
            <div className="text-xl text-neon-green animate-pulse">Decrypting...</div>
          )}
        </Card>

        <div className="space-y-3">
          <button
            onClick={copyVaultLink}
            className="cyber-button inline-flex items-center justify-center gap-2 bg-neon-green/10 hover:bg-neon-green/20 w-full"
          >
            <Copy className="w-4 h-4" />
            COPY VAULT LINK
          </button>

          <p className="text-xs text-neon-green/40 max-w-xs mx-auto leading-relaxed px-2">
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
