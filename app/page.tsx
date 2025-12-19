'use client';

import { useState } from 'react';
import { encryptData } from '@/lib/crypto';

export default function HomePage() {
  const [message, setMessage] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [sealType, setSealType] = useState<'timed' | 'deadman'>('timed');
  const [pulseDays, setPulseDays] = useState(7);
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<{
    publicUrl: string;
    pulseUrl?: string;
  } | null>(null);

  const handleCreateSeal = async () => {
    if (!message.trim()) return;
    
    setIsCreating(true);
    try {
      // Encrypt the message
      const encrypted = await encryptData(message);
      
      // Calculate unlock time
      let unlockTime: number;
      let pulseToken: string | undefined;
      let pulseDuration: number | undefined;
      
      if (sealType === 'timed') {
        unlockTime = new Date(unlockDate).getTime();
      } else {
        // Dead man's switch
        pulseDuration = pulseDays * 24 * 60 * 60 * 1000;
        unlockTime = Date.now() + pulseDuration;
        pulseToken = crypto.randomUUID();
      }

      // Create FormData for API
      const formData = new FormData();
      formData.append('encryptedBlob', new Blob([encrypted.encryptedBlob]));
      formData.append('keyB', encrypted.keyB);
      formData.append('iv', encrypted.iv);
      formData.append('unlockTime', unlockTime.toString());
      if (pulseToken) formData.append('pulseToken', pulseToken);
      if (pulseDuration) formData.append('pulseDuration', pulseDuration.toString());

      // Send to API
      const response = await fetch('/api/create-seal', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        setResult({
          publicUrl: `${window.location.origin}${data.publicUrl}#${encrypted.keyA}`,
          pulseUrl: data.pulseUrl ? `${window.location.origin}${data.pulseUrl}` : undefined,
        });
      }
    } catch (error) {
      console.error('Failed to create seal:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold glow-text mb-4">SEAL CREATED</h1>
            <p className="text-neon-green/70">Your message is now cryptographically locked</p>
          </div>
          
          <div className="cyber-border p-6 space-y-4">
            <div>
              <label className="block text-sm mb-2">PUBLIC VAULT LINK</label>
              <input
                type="text"
                value={result.publicUrl}
                readOnly
                className="cyber-input w-full text-xs"
              />
              <p className="text-xs text-neon-green/50 mt-1">
                Share this link. It contains Key A in the URL hash.
              </p>
            </div>
            
            {result.pulseUrl && (
              <div>
                <label className="block text-sm mb-2">PULSE LINK (KEEP SECRET)</label>
                <input
                  type="text"
                  value={result.pulseUrl}
                  readOnly
                  className="cyber-input w-full text-xs"
                />
                <p className="text-xs text-neon-green/50 mt-1">
                  Click this link every {pulseDays} days to keep the seal locked.
                </p>
              </div>
            )}
          </div>
          
          <button
            onClick={() => {
              setResult(null);
              setMessage('');
            }}
            className="cyber-button w-full"
          >
            CREATE ANOTHER SEAL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-6xl font-bold glow-text mb-4">TIME-SEAL</h1>
          <p className="text-xl text-neon-green/70 mb-2">The Unbreakable Protocol</p>
          <p className="text-sm text-neon-green/50">"If I go silent, this speaks for me."</p>
        </div>

        <div className="cyber-border p-6 space-y-6">
          <div>
            <label className="block text-sm mb-2">MESSAGE TO SEAL</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your secret message..."
              className="cyber-input w-full h-32 resize-none"
            />
          </div>

          <div className="space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={() => setSealType('timed')}
                className={`cyber-button flex-1 ${sealType === 'timed' ? 'bg-neon-green/20' : ''}`}
              >
                TIMED RELEASE
              </button>
              <button
                onClick={() => setSealType('deadman')}
                className={`cyber-button flex-1 ${sealType === 'deadman' ? 'bg-neon-green/20' : ''}`}
              >
                DEAD MAN'S SWITCH
              </button>
            </div>

            {sealType === 'timed' ? (
              <div>
                <label className="block text-sm mb-2">UNLOCK DATE & TIME</label>
                <input
                  type="datetime-local"
                  value={unlockDate}
                  onChange={(e) => setUnlockDate(e.target.value)}
                  className="cyber-input w-full"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm mb-2">PULSE INTERVAL (DAYS)</label>
                <input
                  type="number"
                  value={pulseDays}
                  onChange={(e) => setPulseDays(parseInt(e.target.value) || 7)}
                  min="1"
                  max="365"
                  className="cyber-input w-full"
                />
                <p className="text-xs text-neon-green/50 mt-1">
                  You must "pulse" every {pulseDays} days to keep the seal locked
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleCreateSeal}
            disabled={isCreating || !message.trim() || (sealType === 'timed' && !unlockDate)}
            className="cyber-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'CREATING SEAL...' : 'CREATE TIME-SEAL'}
          </button>
        </div>
      </div>
    </div>
  );
}