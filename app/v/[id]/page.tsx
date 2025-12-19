'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { decryptData } from '@/lib/crypto';

interface SealStatus {
  id: string;
  isLocked: boolean;
  unlockTime: number;
  timeRemaining?: number;
  keyB?: string;
  iv?: string;
}

export default function VaultPage({ params }: { params: { id: string } }) {
  const [status, setStatus] = useState<SealStatus | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    fetchSealStatus();
  }, [params.id]);

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
  }, [status]);

  const fetchSealStatus = async () => {
    try {
      const response = await fetch(`/api/seal/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setStatus(data);
        
        // If unlocked and we have Key A in URL hash, decrypt immediately
        if (!data.isLocked && data.keyB && data.iv) {
          await decryptMessage(data.keyB, data.iv);
        }
      } else {
        setError(data.error || 'Seal not found');
      }
    } catch (err) {
      setError('Failed to fetch seal status');
    }
  };

  const decryptMessage = async (keyB: string, iv: string) => {
    try {
      // Get Key A from URL hash
      const keyA = window.location.hash.substring(1);
      if (!keyA) {
        setError('Key A not found in URL. Invalid vault link.');
        return;
      }

      // Fetch encrypted blob (mock for now)
      // In production: const blob = await fetch(`/api/blob/${params.id}`);
      const mockEncryptedBlob = new ArrayBuffer(0); // Mock data
      
      const decrypted = await decryptData(mockEncryptedBlob, { keyA, keyB, iv });
      const content = new TextDecoder().decode(decrypted);
      setDecryptedContent(content);
    } catch (err) {
      setError('Failed to decrypt message');
    }
  };

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
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-4">VAULT ERROR</h1>
          <p className="text-neon-green/70 mb-8">{error}</p>
          <a href="/" className="cyber-button inline-block">
            CREATE NEW SEAL
          </a>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p>Loading vault...</p>
        </div>
      </div>
    );
  }

  if (decryptedContent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold glow-text mb-4">VAULT UNLOCKED</h1>
            <p className="text-neon-green/70">The seal has been broken. Here is your message:</p>
          </div>
          
          <div className="cyber-border p-6 mb-8">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed">
              {decryptedContent}
            </pre>
          </div>
          
          <div className="text-center">
            <a href="/" className="cyber-button">
              CREATE YOUR OWN TIME-SEAL
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  // Locked state with countdown
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
          className="text-8xl mb-8"
        >
          🔒
        </motion.div>
        
        <h1 className="text-4xl font-bold glow-text mb-4">VAULT SEALED</h1>
        <p className="text-neon-green/70 mb-8">
          This message is cryptographically locked until:
        </p>
        
        <div className="cyber-border p-6 mb-8">
          <div className="text-2xl font-bold mb-4">
            {new Date(status.unlockTime).toLocaleString()}
          </div>
          
          {timeLeft > 0 && (
            <div className="text-4xl font-mono pulse-glow">
              {formatTimeLeft(timeLeft)}
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-neon-green/50">
            This vault uses split-key encryption and WORM storage.<br/>
            It cannot be opened early, even by the creator.
          </p>
          
          <a href="/" className="cyber-button inline-block">
            CREATE YOUR OWN TIME-SEAL
          </a>
        </div>
      </div>
    </div>
  );
}