'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { decryptData } from '@/lib/crypto';
import { ensureIntegrity } from '@/lib/clientIntegrity';
import DecryptedText from '../../components/DecryptedText';
import { BackgroundBeams } from '../../components/ui/background-beams';
import { Card } from '../../components/Card';
import { toast } from 'sonner';
import { Lock, AlertTriangle, Hourglass, Copy, Download, Share2 } from 'lucide-react';
import { ErrorLogger } from '@/lib/errorLogger';
import { triggerHaptic, shareContent, copyToClipboard, isMobile } from '@/lib/mobile';
import { BottomSheet } from '../../components/BottomSheet';

interface SealStatus {
  id: string;
  isLocked: boolean;
  unlockTime: number;
  timeRemaining?: number;
  keyB?: string;
  iv?: string;
  isDMS?: boolean;
}

export default function VaultPage({ params }: { params: { id: string } }) {
  return <VaultPageClient id={params.id} />;
}

function VaultPageClient({ id }: { id: string }) {
  const [status, setStatus] = useState<SealStatus | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const mobile = isMobile();

  useEffect(() => {
    ensureIntegrity().catch(err => {
      toast.error('Security Alert: Client integrity check failed. Safely refusing to decrypt.');
      console.error(err);
      setError('Client integrity verification failed');
    });

    // Cleanup sessionStorage on unmount
    return () => {
      const storageKey = `timeseal_keyA_${id}`;
      sessionStorage.removeItem(storageKey);
    };
  }, [id]);

  const copyVaultLink = async () => {
    try {
      const fullUrl = globalThis.window.location.href;
      const result = await copyToClipboard(fullUrl);
      if (result.success) {
        toast.success('Vault link copied to clipboard');
      } else {
        toast.error(result.error || 'Failed to copy link');
      }
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    const fullUrl = globalThis.window.location.href;
    const shared = await shareContent({
      title: 'TimeSeal Vault',
      text: 'Check out this time-locked vault',
      url: fullUrl
    });
    
    if (!shared) {
      setShowShareSheet(true);
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

      // Try to get keyA from URL hash first, then fallback to sessionStorage
      let keyA = globalThis.window.location.hash.substring(1);

      if (!keyA) {
        // Fallback to sessionStorage (in case user refreshed or navigated back)
        const storageKey = `timeseal_keyA_${id}`;
        keyA = sessionStorage.getItem(storageKey) || '';
      } else {
        // Store keyA in sessionStorage for future use
        const storageKey = `timeseal_keyA_${id}`;
        sessionStorage.setItem(storageKey, keyA);
      }
      
      if (!keyA) {
        setError('Key A not found in URL. Invalid vault link.');
        setErrorDetails({ 
          reason: 'missing_key_a', 
          url: globalThis.window.location.href,
          hint: 'The vault link must include #keyA at the end. Check your link or use the original link you received.'
        });
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
        setErrorDetails({ reason: 'missing_blob', sealId: id });
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
      } catch (decodeErr) {
        console.error('[VAULT] UTF-8 decode failed:', decodeErr);
        ErrorLogger.log(decodeErr, { component: 'Vault', action: 'utf8_decode', sealId: id });
        setError('Decryption succeeded but content is corrupted');
        setErrorDetails({ reason: 'utf8_decode_failed', error: decodeErr instanceof Error ? decodeErr.message : String(decodeErr) });
      }
      
      // Trigger confetti on successful unlock
      if (typeof window !== 'undefined') {
        const confetti = (await import('canvas-confetti')).default;
        const duration = 2000;
        const end = Date.now() + duration;
        
        (function frame() {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors: ['#00ff41', '#ffffff', '#00ff41']
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors: ['#00ff41', '#ffffff', '#00ff41']
          });
          
          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        })();
      }
    } catch (err) {
      console.error('[VAULT] Decryption failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorStack = err instanceof Error ? err.stack : undefined;
      ErrorLogger.log(err, { component: 'Vault', action: 'decrypt', sealId: id });
      setError(`Failed to decrypt message: ${errorMessage}`);
      setErrorDetails({ reason: 'decryption_failed', error: errorMessage, stack: errorStack, sealId: id });
    }
  }, [id]);

  const fetchSealStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/seal/${id}`);
      const data = await response.json() as SealStatus & { encryptedBlob?: string; error?: string | { code: string; message: string; details?: string; debugInfo?: any } };

      if (response.ok) {
        setStatus(data);

        if (!data.isLocked && data.keyB && data.iv) {
          // Pass encryptedBlob to avoid duplicate fetch
          await decryptMessage(data.keyB, data.iv, data.encryptedBlob);
        }
      } else {
        // Handle specific error cases
        let errorMsg = 'Seal not found or unavailable';
        if (response.status === 404) {
          errorMsg = 'This seal has been destroyed or never existed';
        }
        console.error('[VAULT] Error:', data.error);
        ErrorLogger.log(data.error, { component: 'Vault', action: 'fetchStatus', sealId: id });
        setError(errorMsg);
      }
    } catch (err) {
      console.error('[VAULT] Fetch failed:', err);
      ErrorLogger.log(err, { component: 'Vault', action: 'fetchStatus', sealId: id });
      setError('Failed to fetch seal');
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
          const newValue = prev - 1000;
          if (newValue <= 0) {
            clearInterval(interval);
            fetchSealStatus();
            return 0;
          }
          return newValue;
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
    if (!status?.unlockTime || !status?.timeRemaining) return 0;
    const now = Date.now();
    
    // If already unlocked
    if (now >= status.unlockTime) return 100;
    
    // Calculate when seal was created: unlockTime - initial timeRemaining
    const creationTime = status.unlockTime - status.timeRemaining;
    const totalDuration = status.unlockTime - creationTime;
    const elapsed = now - creationTime;
    
    if (totalDuration <= 0) return 0;
    const progress = (elapsed / totalDuration) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  if (error) {
    const isDestroyed = error.includes('destroyed');
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative w-full overflow-x-hidden pb-32">
        <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
        <div className="max-w-md w-full text-center relative z-10">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 glow-text text-red-500 px-2">
            {isDestroyed ? 'SEAL DESTROYED' : 'VAULT ERROR'}
          </h1>
          <Card className="mb-8 border-red-500/30">
            <p className="text-red-400/90 font-mono mb-4">{error}</p>
            {isDestroyed && (
              <div className="text-left mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded">
                <p className="text-red-400 text-sm font-bold mb-2">🔥 This seal has been permanently deleted</p>
                <p className="text-red-400/80 text-xs">
                  The seal was either burned by its creator or never existed. The content cannot be recovered.
                </p>
              </div>
            )}
            {error.includes('Key A not found') && (
              <div className="text-left mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                <p className="text-yellow-400 text-sm font-bold mb-2">💡 Common Causes:</p>
                <ul className="text-yellow-400/80 text-xs space-y-1 list-disc list-inside">
                  <li>Vault link is incomplete (missing #keyA at the end)</li>
                  <li>Link was copied from browser history or bookmark</li>
                  <li>Link was shared through a service that strips URL fragments</li>
                </ul>
                <p className="text-yellow-400/80 text-xs mt-3">
                  <strong>Solution:</strong> Use the original vault link you received when the seal was created.
                </p>
              </div>
            )}
            {errorDetails && (
              <details className="text-left">
                <summary className="text-red-400/60 text-xs cursor-pointer hover:text-red-400/80 mb-2">
                  Debug Info (click to expand)
                </summary>
                <pre className="text-red-400/70 text-xs bg-black/30 p-3 rounded overflow-x-auto">
                  {JSON.stringify(errorDetails, null, 2)}
                </pre>
              </details>
            )}
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
        
        {/* Lock Shatter Animation */}
        <motion.div
          initial={{ scale: 1, opacity: 1 }}
          animate={{ 
            scale: [1, 1.2, 0],
            opacity: [1, 1, 0],
            rotate: [0, 0, 45]
          }}
          transition={{ duration: 0.5, times: [0, 0.3, 1] }}
          className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
        >
          <Lock className="w-32 h-32 text-neon-green" />
        </motion.div>
        
        {/* Flash Effect */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.2, delay: 0.5 }}
          className="absolute inset-0 bg-neon-green z-10 pointer-events-none"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="max-w-2xl w-full relative z-10"
        >
          <div className="text-center mb-8">
            <motion.h1 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-3xl sm:text-4xl md:text-5xl font-bold glow-text mb-4 px-2"
            >
              <DecryptedText text="VAULT UNLOCKED" animateOn="view" className="text-neon-green" />
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="text-neon-green/70 text-sm sm:text-base px-4"
            >
              The seal has been broken. Here is your message:
            </motion.p>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.3 }}
          >
            <Card className="p-4 sm:p-6 md:p-8 mb-8 relative group">
              <div className="absolute top-4 right-4 opacity-50 group-hover:opacity-100 transition-opacity z-10">
                <span className="text-xs font-mono text-neon-green border border-neon-green/30 px-2 py-1 rounded bg-dark-bg/90 backdrop-blur-sm">DECRYPTED</span>
              </div>
              <div
                className="whitespace-pre-wrap text-sm leading-relaxed break-words font-mono text-neon-green/90 select-text cursor-text pr-24"
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
              >
                {decryptedContent}
              </div>
            </Card>
          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="flex flex-col sm:flex-row gap-4 mb-8"
          >
            <motion.button
              onClick={downloadContent}
              className="cyber-button flex items-center justify-center gap-2 flex-1"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 2 }}
            >
              <Download className="w-4 h-4" />
              DOWNLOAD CONTENT
            </motion.button>
            {mobile ? (
              <button
                onClick={handleShare}
                className="cyber-button flex items-center justify-center gap-2 flex-1 bg-neon-green/10"
              >
                <Share2 className="w-4 h-4" />
                SHARE
              </button>
            ) : (
              <button
                onClick={copyVaultLink}
                className="cyber-button flex items-center justify-center gap-2 flex-1 bg-neon-green/10"
              >
                <Copy className="w-4 h-4" />
                COPY LINK
              </button>
            )}
          </motion.div>

          <BottomSheet isOpen={showShareSheet} onClose={() => setShowShareSheet(false)} title="Share Vault">
            <div className="space-y-4">
              <button
                onClick={() => {
                  copyVaultLink();
                  setShowShareSheet(false);
                }}
                className="cyber-button w-full flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                COPY LINK
              </button>
            </div>
          </BottomSheet>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.7 }}
            className="text-center"
          >
            <a href="/" className="cyber-button text-sm sm:text-base md:text-lg px-4 sm:px-6 md:px-8 py-3 sm:py-4">
              CREATE YOUR OWN TIME-SEAL
            </a>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Locked state with countdown
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative w-full overflow-x-hidden pb-20">
      <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />

      <motion.a
        href="/dashboard"
        className="absolute top-4 left-4 z-10 px-3 py-2 bg-dark-bg/80 backdrop-blur-sm border-2 border-neon-green/30 rounded-xl hover:border-neon-green transition-all touch-manipulation"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-xs text-neon-green/70 font-mono">MY SEALS</span>
      </motion.a>
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
        
        {status.isDMS && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-500 text-sm font-bold mb-2">⚠️ DEAD MAN&apos;S SWITCH</p>
            <p className="text-yellow-400/80 text-xs">
              This seal will auto-unlock if the creator doesn&apos;t pulse. Only the creator has the pulse link.
            </p>
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

          {timeLeft > 0 ? (
            <>
              <div className="text-xs text-neon-green/50 mb-2 uppercase tracking-widest">Time Remaining</div>
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
            <div className="text-2xl sm:text-3xl font-bold text-neon-green animate-pulse">UNLOCKED</div>
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
