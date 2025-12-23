'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Download } from 'lucide-react';

interface SealSuccessProps {
  publicUrl: string;
  pulseUrl?: string;
  pulseToken?: string;
  receipt?: any;
  keyA: string;
  seedPhrase?: string;
  sealId: string;
  onReset: () => void;
}

export function SealSuccess({ publicUrl, pulseUrl, pulseToken, receipt, seedPhrase, sealId, onReset }: SealSuccessProps) {
  const [qrCode, setQrCode] = useState<string>('');
  const [showSeedPhrase, setShowSeedPhrase] = useState(!!seedPhrase);

  useEffect(() => {
    const generateQR = async () => {
      const QRCodeModule = await import('qrcode');
      const qr = await QRCodeModule.toDataURL(publicUrl, { width: 256, margin: 2 });
      setQrCode(qr);
    };
    generateQR();
  }, [publicUrl]);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        copyToClipboard(publicUrl, 'Link');
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K' && pulseToken && pulseUrl) {
        e.preventDefault();
        copyToClipboard(`${pulseUrl}/${encodeURIComponent(pulseToken)}`, 'Pulse Link');
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [publicUrl, pulseUrl, pulseToken]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <motion.div
      key="result"
      layoutId="main-card"
      initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <motion.div layoutId="header" className="text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold glow-text pulse-glow mb-4 px-2">SEAL CREATED</h1>
        <p className="text-neon-green/70 text-sm sm:text-base px-4">Your message is now cryptographically locked</p>
      </motion.div>

      <Card className="space-y-6">
        {seedPhrase && showSeedPhrase && (
          <div className="border border-yellow-400 bg-yellow-950/20 p-6 space-y-4">
            <h3 className="text-xl font-mono text-yellow-400">🔑 Recovery Seed Phrase</h3>
            
            <p className="font-mono text-sm text-yellow-300">
              Write these 12 words on paper. You'll need them to recover your vault link if lost.
            </p>

            <div className="bg-black p-4 border border-yellow-400">
              <div className="grid grid-cols-3 gap-3">
                {seedPhrase.split(' ').map((word, i) => (
                  <div key={i} className="font-mono text-green-400">
                    <span className="text-yellow-400">{i + 1}.</span> {word}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black p-3 border border-yellow-400 font-mono text-xs text-yellow-300">
              <p className="mb-1">Seal ID: {sealId}</p>
            </div>

            <div className="space-y-2 text-sm font-mono text-yellow-300">
              <p>⚠️ Anyone with these words can access your seal</p>
              <p>⚠️ Store securely (safe, password manager, paper backup)</p>
              <p>⚠️ Never share or store digitally unencrypted</p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  copyToClipboard(`Seal ID: ${sealId}\n\nSeed Phrase:\n${seedPhrase}`, 'Seed Phrase');
                }}
                className="flex-1 bg-yellow-400/20"
                variant="secondary"
              >
                Copy to Clipboard
              </Button>
              <Button
                onClick={() => setShowSeedPhrase(false)}
                className="flex-1 bg-green-400/20"
                variant="secondary"
              >
                ✓ I've Written It Down
              </Button>
            </div>
          </div>
        )}

        {qrCode && (
          <div className="qr-print-container flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="QR Code" className="border-2 border-neon-green/30 rounded" />
            <p className="qr-print-label print-only hidden">TimeSeal Vault - Scan to Access</p>
          </div>
        )}

        <div>
          <div className="flex gap-2 items-end">
            <div className="flex-1 tooltip">
              <Input label="PUBLIC VAULT LINK" value={publicUrl} onChange={() => {}} testId="public-url-input" />
              <span className="tooltip-text">Share this link with anyone. Contains Key A in URL hash (never sent to server). Press Ctrl+K to copy.</span>
            </div>
            <Button onClick={() => copyToClipboard(publicUrl, 'Link')} className="bg-neon-green/20 mb-[2px]" title="Copy link (Ctrl+K)" variant="secondary">
              COPY
            </Button>
          </div>
        </div>

        {pulseUrl && pulseToken && (
          <div className="mt-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1 tooltip">
                <Input label="PULSE LINK (KEEP SECRET)" value={`${pulseUrl}/${encodeURIComponent(pulseToken)}`} onChange={() => {}} testId="pulse-token-input" />
                <span className="tooltip-text">PRIVATE link for Dead Man&apos;s Switch. Visit this URL to check in. Press Ctrl+Shift+K to copy.</span>
              </div>
              <Button onClick={() => copyToClipboard(`${pulseUrl}/${encodeURIComponent(pulseToken || '')}`, 'Link')} className="bg-neon-green/20 mb-[2px]" title="Copy link (Ctrl+Shift+K)" variant="secondary">
                COPY
              </Button>
            </div>
            <p className="text-xs text-neon-green/50 mt-1">Visit this link to reset the countdown. Works from any device/location.</p>
          </div>
        )}

        {receipt && (
          <div className="border-t border-neon-green/20 pt-4">
            <Button
              onClick={() => {
                const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `timeseal-receipt-${receipt.sealId}.json`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Receipt downloaded');
              }}
              className="w-full bg-neon-green/10 flex items-center justify-center gap-2"
              variant="secondary"
            >
              <Download className="w-4 h-4" />
              DOWNLOAD RECEIPT
            </Button>
            <p className="text-xs text-neon-green/50 mt-2 text-center">Proof of seal creation with HMAC signature</p>
          </div>
        )}
      </Card>

      <Button onClick={onReset} className="w-full">
        CREATE ANOTHER SEAL
      </Button>
    </motion.div>
  );
}
