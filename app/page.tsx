'use client';

import { useState, useEffect, useCallback } from 'react';
import { encryptData } from '@/lib/crypto';
import { usePWA } from '@/lib/usePWA';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import confetti from 'canvas-confetti';
import dynamic from 'next/dynamic';

const Turnstile = dynamic(() => import('@marsidev/react-turnstile').then(mod => mod.Turnstile), { ssr: false });
import { Card } from './components/Card';
import { Button } from './components/Button';
import { Input } from './components/Input';

import DecryptedText from './components/DecryptedText';
import { TextScramble } from './components/TextScramble';
import { BackgroundBeams } from './components/ui/background-beams';

import { Bitcoin, ShieldAlert, Rocket, Gift, Scale } from 'lucide-react';

interface Template {
  name: string;
  icon: React.ReactNode;
  type: 'timed' | 'deadman';
  placeholder: string;
  pulseDays?: number;
}

const TEMPLATES: Template[] = [
  {
    name: 'Crypto Inheritance',
    icon: <Bitcoin className="w-6 h-6 text-neon-green drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]" />,
    type: 'deadman',
    placeholder: 'Seed phrase: ...\nWallet addresses: ...',
    pulseDays: 30
  },
  {
    name: 'Whistleblower',
    icon: <ShieldAlert className="w-6 h-6 text-neon-green drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]" />,
    type: 'deadman',
    placeholder: 'Evidence of...',
    pulseDays: 7
  },
  {
    name: 'Product Launch',
    icon: <Rocket className="w-6 h-6 text-neon-green drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]" />,
    type: 'timed',
    placeholder: 'Product details, access codes...'
  },
  {
    name: 'Birthday Gift',
    icon: <Gift className="w-6 h-6 text-neon-green drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]" />,
    type: 'timed',
    placeholder: 'Happy Birthday! Here\'s your surprise...'
  },
  {
    name: 'Legal Hold',
    icon: <Scale className="w-6 h-6 text-neon-green drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]" />,
    type: 'timed',
    placeholder: 'Contract terms...'
  },
];

export default function HomePage() {
  usePWA();

  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [unlockDate, setUnlockDate] = useState('');

  const [sealType, setSealType] = useState<'timed' | 'deadman'>('timed');
  const [pulseDays, setPulseDays] = useState(7);
  const [isCreating, setIsCreating] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [result, setResult] = useState<{
    publicUrl: string;
    pulseUrl?: string;
    pulseToken?: string;
  } | null>(null);

  // Use a ref for file input fallback (kept even if dropzone exists for accessibility/fallback)

  // Dropzone hook
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles?.length > 0) {
      setFile(acceptedFiles[0]);
      setMessage('');
      toast.success(`Selected file: ${acceptedFiles[0].name}`);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false
  });

  // Confetti effect
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
        toast.error('🔥 Seal burned successfully. Content permanently destroyed.');
        globalThis.window.history.replaceState({}, '', '/');
      }
    }
  }, []);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_IS_E2E === 'true') {
      setTurnstileToken('e2e-test-token');
    }
  }, []);

  const applyTemplate = (template: Template) => {
    setSealType(template.type);
    setMessage(template.placeholder);
    if (template.pulseDays) setPulseDays(template.pulseDays);
    toast.info(`Applied template: ${template.name}`);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleCreateSeal = async () => {
    if ((!message.trim() && !file) || !turnstileToken) {
      toast.error('Please complete the security check and valid input');
      return;
    }

    setIsCreating(true);
    const loadingToast = toast.loading('Encrypting and sealing data...');

    try {
      // Encrypt the message or file
      const encrypted = await encryptData(file || message);

      // Calculate unlock time
      let unlockTime: number;
      let pulseToken: string | undefined;
      let pulseDuration: number | undefined;

      if (sealType === 'timed') {
        if (!unlockDate) {
          toast.dismiss(loadingToast);
          toast.error('Please select a valid future date');
          return;
        }
        unlockTime = new Date(unlockDate).getTime();

        const minTime = Date.now() + 60000; // 1 minute from now
        if (Number.isNaN(unlockTime) || unlockTime <= minTime) {
          toast.dismiss(loadingToast);
          toast.error('Unlock time must be at least 1 minute in the future');
          return;
        }
      } else {
        // Dead man's switch
        pulseDuration = pulseDays * 24 * 60 * 60 * 1000;

        // Validate pulse interval
        if (pulseDays < 1 || pulseDays > 90) {
          toast.dismiss(loadingToast);
          toast.error('Pulse interval must be between 1 and 90 days');
          return;
        }

        unlockTime = Date.now() + pulseDuration;
        pulseToken = crypto.randomUUID();
      }

      // Create FormData for API
      const formData = new FormData();
      formData.append('encryptedBlob', new Blob([encrypted.encryptedBlob]));
      formData.append('keyB', encrypted.keyB);
      formData.append('iv', encrypted.iv);
      formData.append('unlockTime', unlockTime.toString());
      formData.append('isDMS', (sealType === 'deadman').toString());

      if (turnstileToken) formData.append('cf-turnstile-response', turnstileToken);
      if (pulseToken) formData.append('pulseToken', pulseToken);
      if (pulseDuration) formData.append('pulseInterval', pulseDuration.toString());

      // Send to API
      const response = await fetch('/api/create-seal', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json() as { success: boolean; publicUrl: string; pulseToken?: string; error?: string };

      if (data.success) {
        const origin = globalThis.window ? globalThis.window.location.origin : '';
        const publicUrl = `${origin}${data.publicUrl}#${encrypted.keyA}`;
        const qr = await QRCode.toDataURL(publicUrl, { width: 256, margin: 2 });
        setQrCode(qr);
        setResult({
          publicUrl,
          pulseUrl: data.pulseToken ? `${origin}/pulse` : undefined,
          pulseToken: data.pulseToken,
        });
        toast.dismiss(loadingToast);
        toast.success('Seal created successfully!');
        triggerConfetti();
      } else {
        toast.dismiss(loadingToast);
        toast.error(data.error || 'Failed to create seal');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to create seal: Internal Error');
    } finally {
      setIsCreating(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen flex flex-col items-center py-12 p-4 relative w-full overflow-x-hidden">
        <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
        <div className="max-w-2xl w-full space-y-8 relative z-10 my-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold glow-text mb-4 px-2">SEAL CREATED</h1>
            <p className="text-neon-green/70 text-sm sm:text-base px-4">Your message is now cryptographically locked</p>
          </motion.div>

          <Card className="space-y-6">
            {qrCode && (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="QR Code" className="border-2 border-neon-green/30 rounded" />
              </div>
            )}

            <div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    label="PUBLIC VAULT LINK"
                    value={result.publicUrl}
                    onChange={() => { }}
                    testId="public-url-input"
                  />
                </div>
                <Button
                  onClick={() => copyToClipboard(result.publicUrl, 'Link')}
                  className="bg-neon-green/20 mb-[2px]"
                >
                  COPY
                </Button>
              </div>


            </div>

            {result.pulseUrl && result.pulseToken && (
              <div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      label="PULSE TOKEN (KEEP SECRET)"
                      value={result.pulseToken}
                      onChange={() => { }}
                      testId="pulse-token-input"
                    />
                  </div>
                  <Button
                    onClick={() => copyToClipboard(result.pulseToken!, 'Token')}
                    className="bg-neon-green/20 mb-[2px]"
                  >
                    COPY
                  </Button>
                </div>
                <p className="text-xs text-neon-green/50 mt-1">
                  Visit {result.pulseUrl} and enter this token every {pulseDays} days.
                </p>
              </div>
            )}
          </Card>

          <Button
            onClick={() => {
              setResult(null);
              setMessage('');
              setFile(null);
              setQrCode('');
              setTurnstileToken(null);
              setUnlockDate('');
              setSealType('timed');
              setPulseDays(7);
            }}
            className="w-full"
          >
            CREATE ANOTHER SEAL
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-12 p-4 relative w-full overflow-x-hidden">
      <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
      <div className="max-w-2xl w-full space-y-4 relative z-10 my-auto">

        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold glow-text mb-4 px-2"
          >
            <DecryptedText
              text="TIME-SEAL"
              animateOn="view"
              speed={75}
              maxIterations={20}
              className="text-neon-green"
              encryptedClassName="text-neon-green/30"
            />
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl text-neon-green/70 mb-2 px-4"
          >
            <TextScramble className="text-neon-green/90 tracking-widest font-bold">
              The Unbreakable Protocol
            </TextScramble>
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-neon-green/50 animate-subtle-shimmer"
            style={{
              animationDelay: '0s',
              animationIterationCount: 'infinite',
              animationDuration: '30s'
            }}
          >
            &quot;If I go silent, this speaks for me.&quot;
          </motion.p>
        </div>

        <Card className="space-y-6">
          <div>
            <div className="block text-sm mb-2 text-neon-green/80 font-bold">QUICK START TEMPLATES</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {TEMPLATES.map((t) => (
                <motion.button
                  key={t.name}
                  onClick={() => applyTemplate(t)}
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(0, 255, 65, 0.1)' }}
                  whileTap={{ scale: 0.95 }}
                  className="cyber-border p-3 transition-colors text-center h-full flex flex-col items-center justify-center"
                  title={t.name}
                >
                  <div className="mb-1">{t.icon}</div>
                  <div className="text-xs text-neon-green/70">{t.name}</div>
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            {/* Text Area */}
            <label htmlFor="message-input" className="block text-sm mb-2 text-neon-green/80">MESSAGE OR FILE</label>
            <textarea
              id="message-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your secret message..."
              className="cyber-input w-full h-24 resize-none font-mono mb-2"
              disabled={!!file}
            />

            {/* React Dropzone */}
            <div
              {...getRootProps()}
              className={`cyber-border p-6 text-center cursor-pointer transition-all border-dashed ${isDragActive ? 'bg-neon-green/10 border-neon-green scale-[1.02]' : 'hover:bg-neon-green/5'
                } ${file ? 'border-none bg-neon-green/5' : ''}`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center justify-between">
                  <span className="text-neon-green font-mono">📎 {file.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      toast.info('File removed');
                    }}
                    className="text-red-500 hover:text-red-400 font-bold px-2"
                  >
                    REMOVE
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {isDragActive ? (
                    <p className="text-neon-green animate-pulse">DROP FILES HERE...</p>
                  ) : (
                    <>
                      <p className="text-neon-green/70">DRAG & DROP FILE HERE</p>
                      <p className="text-xs text-neon-green/40">OR CLICK TO SELECT</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex space-x-4 bg-dark-bg/30 p-1 rounded-lg border border-neon-green/10">
              <button
                onClick={() => setSealType('timed')}
                className={`flex-1 py-2 rounded text-sm font-bold transition-all ${sealType === 'timed'
                  ? 'bg-neon-green text-dark-bg shadow-[0_0_10px_rgba(0,255,65,0.3)]'
                  : 'text-neon-green/50 hover:text-neon-green hover:bg-neon-green/5'
                  }`}
              >
                TIMED RELEASE
              </button>
              <button
                onClick={() => setSealType('deadman')}
                className={`flex-1 py-2 rounded text-sm font-bold transition-all ${sealType === 'deadman'
                  ? 'bg-neon-green text-dark-bg shadow-[0_0_10px_rgba(0,255,65,0.3)]'
                  : 'text-neon-green/50 hover:text-neon-green hover:bg-neon-green/5'
                  }`}
              >
                DEAD MAN&apos;S SWITCH
              </button>
            </div>

            <AnimatePresence mode="wait">
              {sealType === 'timed' ? (
                <motion.div
                  key="timed"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative z-50"
                >
                  <div className="block text-sm mb-2 text-neon-green/80 font-bold">UNLOCK DATE & TIME</div>
                  <input
                    type="datetime-local"
                    value={unlockDate}
                    onChange={(e) => setUnlockDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="cyber-input w-full"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="deadman"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label htmlFor="pulse-days" className="block text-sm mb-2 text-neon-green/80">PULSE INTERVAL (DAYS)</label>
                  <div className="flex gap-4 items-center">
                    <input
                      id="pulse-days"
                      type="number"
                      value={pulseDays}
                      onChange={(e) => setPulseDays(Number.parseInt(e.target.value) || 7)}
                      min="1"
                      max="90"
                      className="cyber-input w-24 text-center"
                    />
                    <div className="flex-1">
                      <input
                        type="range"
                        min="1"
                        max="90"
                        value={pulseDays}
                        onChange={(e) => setPulseDays(Number.parseInt(e.target.value))}
                        className="w-full h-2 bg-dark-bg rounded-lg appearance-none cursor-pointer accent-neon-green"
                        aria-label="Pulse Days Slider"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-neon-green/50 mt-2">
                    You must &quot;pulse&quot; every <strong className="text-neon-green">{pulseDays} days</strong> to keep the seal locked.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex justify-center pt-2">
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
              onSuccess={setTurnstileToken}
              onError={() => toast.error('Security verification failed. Please refresh.')}
              options={{ theme: 'dark', size: 'flexible', appearance: 'interaction-only' }}
              className="w-full"
            />
          </div>

          <Button
            onClick={handleCreateSeal}
            disabled={isCreating || (!message.trim() && !file) || (sealType === 'timed' && !unlockDate) || !turnstileToken}
            className="w-full text-lg shadow-[0_0_20px_rgba(0,255,65,0.2)]"
          >
            {isCreating ? 'ENCRYPTING & SEALING...' : 'CREATE TIME-SEAL'}
          </Button>
        </Card>
      </div>
    </div>
  );
}