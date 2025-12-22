'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { encryptData } from '@/lib/crypto';
import { ensureIntegrity } from '@/lib/clientIntegrity';
import { usePWA } from '@/lib/usePWA';
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
import { AnimatedTagline } from './components/AnimatedTagline';
import { EncryptionProgress } from './components/EncryptionProgress';
import { FloatingIcons } from './components/FloatingIcons';

import { Bitcoin, ShieldAlert, Rocket, Gift, Scale, Paperclip, FileText, Trash2, AlertTriangle, Download } from 'lucide-react';

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

const pageVariants = {
  initial: { opacity: 0, x: -20, filter: 'blur(10px)' },
  animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, x: 20, filter: 'blur(10px)' }
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function HomePage() {
  usePWA();

  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [unlockDate, setUnlockDate] = useState('');

  const [sealType, setSealType] = useState<'timed' | 'deadman'>('timed');
  const [pulseDays, setPulseDays] = useState(7);
  const [isCreating, setIsCreating] = useState(false);
  const [encryptionProgress, setEncryptionProgress] = useState(0);
  const [qrCode, setQrCode] = useState<string>('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [result, setResult] = useState<{
    publicUrl: string;
    pulseUrl?: string;
    pulseToken?: string;
    receipt?: any;
  } | null>(null);

  const publicUrlRef = useRef<HTMLInputElement>(null);
  const pulseTokenRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K for copy public URL
      if ((e.ctrlKey || e.metaKey) && e.key === 'k' && result?.publicUrl) {
        e.preventDefault();
        copyToClipboard(result.publicUrl, 'Link');
      }
      // Ctrl/Cmd + Shift + K for copy pulse token
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K' && result?.pulseToken) {
        e.preventDefault();
        copyToClipboard(result.pulseToken, 'Token');
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [result]);

  // Use a ref for file input fallback (kept even if dropzone exists for accessibility/fallback)

  // Dropzone hook
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles?.length > 0) {
      const selectedFile = acceptedFiles[0];
      const maxSize = 750 * 1024;
      if (selectedFile.size > maxSize) {
        toast.error(`File too large: ${formatFileSize(selectedFile.size)} (max 750KB)`);
        return;
      }
      if (selectedFile.size > maxSize * 0.9) {
        toast.warning(`File size: ${formatFileSize(selectedFile.size)} (approaching 750KB limit)`);
      }
      setFile(selectedFile);
      setMessage('');
      toast.success(`Selected: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`);
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
        toast.error('Seal burned successfully. Content permanently destroyed.');
        globalThis.window.history.replaceState({}, '', '/');
      }
    }
  }, []);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_IS_E2E === 'true') {
      setTurnstileToken('e2e-test-token');
    }
  }, []);

  // Integrity Check
  useEffect(() => {
    ensureIntegrity().catch(err => {
      toast.error('Security Alert: Client integrity check failed. Env may be tampered.');
      console.error(err);
    });
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
    // Verify client integrity
    try {
      await ensureIntegrity();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Security check failed');
      return;
    }

    // Validate Turnstile
    if (!turnstileToken) {
      toast.error('Please complete the security check');
      return;
    }

    // Validate content
    if (!message.trim() && !file) {
      toast.error('Please enter a message or upload a file');
      // Add error animation
      const textarea = document.getElementById('message-input');
      if (textarea) {
        textarea.classList.add('input-error');
        setTimeout(() => textarea.classList.remove('input-error'), 500);
      }
      return;
    }

    // Validate message length (D1 limit: 750KB)
    if (message.trim() && message.length > 750000) {
      toast.error('Message too large (max 750KB)');
      const textarea = document.getElementById('message-input');
      if (textarea) {
        textarea.classList.add('input-error');
        setTimeout(() => textarea.classList.remove('input-error'), 500);
      }
      return;
    }

    // Validate file size (D1 limit: 750KB)
    if (file && file.size > 750 * 1024) {
      toast.error('File too large (max 750KB)');
      return;
    }

    // Validate date for timed release
    if (sealType === 'timed') {
      if (!unlockDate) {
        toast.error('Please select an unlock date and time');
        const dateInput = document.querySelector('input[type="datetime-local"]');
        if (dateInput) {
          dateInput.classList.add('input-error');
          setTimeout(() => dateInput.classList.remove('input-error'), 500);
        }
        return;
      }

      const selectedTime = new Date(unlockDate).getTime();
      const now = Date.now();
      const minTime = now + 60000;
      const maxTime = now + (20 * 365 * 24 * 60 * 60 * 1000);

      if (Number.isNaN(selectedTime)) {
        toast.error('Invalid date format');
        return;
      }

      if (selectedTime <= now) {
        toast.error('Unlock time cannot be in the past or now');
        return;
      }

      if (selectedTime < minTime) {
        toast.error('Unlock time must be at least 1 minute in the future');
        return;
      }

      if (selectedTime > maxTime) {
        toast.error('Unlock time cannot be more than 20 years in the future');
        return;
      }
    }

    // Validate pulse interval for dead man's switch
    if (sealType === 'deadman') {
      if (pulseDays < 1 || pulseDays > 90) {
        toast.error('Pulse interval must be between 1 and 90 days');
        const pulseInput = document.getElementById('pulse-days');
        if (pulseInput) {
          pulseInput.classList.add('input-error');
          setTimeout(() => pulseInput.classList.remove('input-error'), 500);
        }
        return;
      }
    }

    setIsCreating(true);
    setEncryptionProgress(0);
    const loadingToast = toast.loading('Encrypting and sealing data...');

    try {
      // Simulate encryption progress
      setEncryptionProgress(20);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Encrypt the message or file
      setEncryptionProgress(40);
      const encrypted = await encryptData(file || message);
      setEncryptionProgress(60);

      // Calculate unlock time
      let unlockTime: number;
      let pulseToken: string | undefined;
      let pulseDuration: number | undefined;

      if (sealType === 'timed') {
        unlockTime = new Date(unlockDate).getTime();
      } else {
        // Dead man's switch - server generates pulse token
        pulseDuration = pulseDays * 24 * 60 * 60 * 1000;
        unlockTime = Date.now() + pulseDuration;
      }

      // Create FormData for API
      const formData = new FormData();
      formData.append('encryptedBlob', new Blob([encrypted.encryptedBlob]));
      formData.append('keyB', encrypted.keyB);
      formData.append('iv', encrypted.iv);
      formData.append('unlockTime', unlockTime.toString());
      formData.append('isDMS', (sealType === 'deadman').toString());

      if (turnstileToken) formData.append('cf-turnstile-response', turnstileToken);
      if (pulseDuration) formData.append('pulseInterval', pulseDuration.toString());

      // Send to API
      setEncryptionProgress(80);
      const response = await fetch('/api/create-seal', {
        method: 'POST',
        body: formData,
      });
      setEncryptionProgress(90);

      const data = await response.json() as { success: boolean; publicUrl: string; pulseToken?: string; receipt?: any; error?: string };

      if (data.success) {
        setEncryptionProgress(95);
        const origin = globalThis.window ? globalThis.window.location.origin : '';
        const publicUrl = `${origin}${data.publicUrl}#${encrypted.keyA}`;
        // Lazy load QRCode
        const QRCodeModule = await import('qrcode');
        const qr = await QRCodeModule.toDataURL(publicUrl, { width: 256, margin: 2 });
        setEncryptionProgress(100);
        await new Promise(resolve => setTimeout(resolve, 300));
        setQrCode(qr);
        setResult({
          publicUrl,
          pulseUrl: data.pulseToken ? `${origin}/pulse` : undefined,
          pulseToken: data.pulseToken,
          receipt: data.receipt,
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
      setEncryptionProgress(0);
    }
  };



  return (
    <div className="min-h-screen flex flex-col items-center py-12 p-4 relative w-full overflow-x-hidden">
      <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
      <FloatingIcons />
      
      <AnimatePresence>
        {isCreating && encryptionProgress > 0 && (
          <EncryptionProgress progress={encryptionProgress} />
        )}
      </AnimatePresence>
      
      {/* GitHub Source Code Link */}
      <motion.a
        href="https://github.com/teycir/timeseal#readme"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-dark-bg/80 backdrop-blur-sm border-2 border-neon-green/30 rounded-xl hover:border-neon-green transition-all group"
        whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)' }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-xs text-neon-green/70 font-mono group-hover:text-neon-green transition-colors">SOURCE CODE</span>
        <svg className="w-5 h-5 text-neon-green animate-subtle-shimmer" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
        </svg>
      </motion.a>

      <div className="max-w-2xl w-full relative z-10 my-auto">
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="result"
              layoutId="main-card"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <motion.div
                layoutId="header"
                className="text-center"
              >
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold glow-text pulse-glow mb-4 px-2">SEAL CREATED</h1>
                <p className="text-neon-green/70 text-sm sm:text-base px-4">Your message is now cryptographically locked</p>
              </motion.div>

              <Card className="space-y-6">
                {qrCode && (
                  <div className="qr-print-container">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrCode} alt="QR Code" className="border-2 border-neon-green/30 rounded" />
                    <p className="qr-print-label print-only hidden">TimeSeal Vault - Scan to Access</p>
                  </div>
                )}

                <div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 tooltip">
                      <Input
                        label="PUBLIC VAULT LINK"
                        value={result.publicUrl}
                        onChange={() => { }}
                        testId="public-url-input"
                      />
                      <span className="tooltip-text">Share this link with anyone. Contains Key A in URL hash (never sent to server). Press Ctrl+K to copy.</span>
                    </div>
                    <Button
                      onClick={() => copyToClipboard(result.publicUrl, 'Link')}
                      className="bg-neon-green/20 mb-[2px]"
                      title="Copy link (Ctrl+K)"
                      variant="secondary"
                    >
                      COPY
                    </Button>
                  </div>
                </div>

                {result.pulseUrl && result.pulseToken && (
                  <div>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 tooltip">
                        <Input
                          label="PULSE TOKEN (KEEP SECRET)"
                          value={result.pulseToken}
                          onChange={() => { }}
                          testId="pulse-token-input"
                        />
                        <span className="tooltip-text">PRIVATE token for Dead Man&apos;s Switch. Visit pulse page every {pulseDays} days. Press Ctrl+Shift+K to copy.</span>
                      </div>
                      <Button
                        onClick={() => copyToClipboard(result.pulseToken!, 'Token')}
                        className="bg-neon-green/20 mb-[2px]"
                        title="Copy token (Ctrl+Shift+K)"
                        variant="secondary"
                      >
                        COPY
                      </Button>
                    </div>
                    <p className="text-xs text-neon-green/50 mt-1">
                      Visit {result.pulseUrl} and enter this token every {pulseDays} days.
                    </p>
                  </div>
                )}

                {result.receipt && (
                  <div className="border-t border-neon-green/20 pt-4">
                    <Button
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(result.receipt, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `timeseal-receipt-${result.receipt.sealId}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success('Receipt downloaded');
                      }}
                      className="w-full bg-neon-green/10 flex items-center justify-center gap-2"
                      variant="secondary"
                    >
                      <Download className="w-4 h-4" />
                      DOWNLOAD CRYPTOGRAPHIC RECEIPT
                    </Button>
                    <p className="text-xs text-neon-green/50 mt-2 text-center">
                      Proof of seal creation with HMAC signature
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
            </motion.div>
          ) : (
            <motion.div
              key="form"
              layoutId="main-card"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <motion.div layoutId="header" className="text-center">
                <h1
                  className="text-4xl sm:text-5xl md:text-6xl font-bold glow-text pulse-glow mb-4 px-2"
                >
                  <DecryptedText
                    text="TIME-SEAL"
                    animateOn="view"
                    speed={75}
                    maxIterations={20}
                    className="text-neon-green"
                    encryptedClassName="text-neon-green/30"
                  />
                </h1>
                <AnimatedTagline text='"If I go silent, this speaks for me."' />
                <p className="text-xs text-neon-green/30 max-w-md mx-auto">Encrypt messages that unlock at a future date or after inactivity</p>
              </motion.div>

              <Card className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-neon-green/80 font-bold tooltip">
                      QUICK START TEMPLATES
                      <span className="tooltip-text">Click a template to auto-fill the form with a common use case</span>
                    </div>
                  </div>
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-2 md:grid-cols-5 gap-2"
                  >
                    {TEMPLATES.map((t) => (
                      <motion.button
                        key={t.name}
                        onClick={() => applyTemplate(t)}
                        variants={itemVariants}
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(0, 255, 65, 0.1)' }}
                        whileTap={{ scale: 0.95 }}
                        className="cyber-border p-3 transition-colors text-center h-full flex flex-col items-center justify-center tooltip"
                        title={t.name}
                      >
                        <span className="tooltip-text">Click to use {t.name} template</span>
                        <motion.div
                          className="mb-1"
                          whileHover={{
                            rotate: [0, -10, 10, -10, 0],
                            scale: 1.2,
                            transition: { duration: 0.5 }
                          }}
                        >
                          {t.icon}
                        </motion.div>
                        <div className="text-xs text-neon-green/70">{t.name}</div>
                      </motion.button>
                    ))}
                  </motion.div>
                </div>

                <div>
                  {/* Text Area */}
                  <label htmlFor="message-input" className="block text-sm mb-2 text-neon-green/80 tooltip">
                    MESSAGE OR FILE
                    <span className="tooltip-text">Enter text message or upload a file (max 750KB). Only one can be used at a time.</span>
                  </label>
                  <textarea
                    id="message-input"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your secret message..."
                    className="cyber-input w-full h-24 resize-none font-mono mb-2 placeholder:text-neon-green/40"
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
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-2">
                            <Paperclip className="w-4 h-4 text-neon-green" />
                            <span className="text-neon-green font-mono">{file.name}</span>
                          </div>
                          <span className="text-xs text-neon-green/50 font-mono ml-6">{formatFileSize(file.size)}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                            toast.info('File removed');
                          }}
                          className="text-red-500 hover:text-red-400 transition-colors p-2"
                          title="Remove file"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {isDragActive ? (
                          <p className="text-neon-green animate-pulse">DROP FILES HERE...</p>
                        ) : (
                          <>
                            <FileText className="w-8 h-8 text-neon-green/50 mx-auto mb-2" />
                            <p className="text-neon-green/70">DRAG & DROP FILE HERE</p>
                            <p className="text-xs text-neon-green/40">OR CLICK TO SELECT</p>
                            <div className="flex items-center justify-center gap-1 mt-2">
                              <AlertTriangle className="w-3 h-3 text-neon-green/30" />
                              <p className="text-xs text-neon-green/30">Max size: 750KB</p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-neon-green/60 tooltip">
                      Choose seal type
                      <span className="tooltip-text">Timed Release: unlocks at specific date. Dead Man&apos;s Switch: unlocks if you don&apos;t check in</span>
                    </div>
                  </div>
                  <div className="flex space-x-4 bg-dark-bg/30 p-1 rounded-xl border border-neon-green/10">
                    <button
                      onClick={() => setSealType('timed')}
                      className={`flex-1 py-2 rounded text-sm font-bold transition-all tooltip ${sealType === 'timed'
                        ? 'bg-neon-green text-dark-bg shadow-[0_0_10px_rgba(0,255,65,0.3)]'
                        : 'text-neon-green/50 hover:text-neon-green hover:bg-neon-green/5'
                        }`}
                    >
                      <span className="tooltip-text">Unlock at a specific future date and time</span>
                      TIMED RELEASE
                    </button>
                    <button
                      onClick={() => setSealType('deadman')}
                      className={`flex-1 py-2 rounded text-sm font-bold transition-all tooltip ${sealType === 'deadman'
                        ? 'bg-neon-green text-dark-bg shadow-[0_0_10px_rgba(0,255,65,0.3)]'
                        : 'text-neon-green/50 hover:text-neon-green hover:bg-neon-green/5'
                        }`}
                    >
                      <span className="tooltip-text">Auto-unlock if you don&apos;t check in periodically</span>
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
                        <div className="block text-sm mb-2 text-neon-green/80 font-bold tooltip">
                          UNLOCK DATE & TIME
                          <span className="tooltip-text">Select when the seal will automatically unlock. Must be at least 1 minute in the future.</span>
                        </div>
                        <input
                          type="datetime-local"
                          value={unlockDate}
                          onChange={(e) => setUnlockDate(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                          className="cyber-input w-full"
                          lang="en-US"
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="deadman"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <label htmlFor="pulse-days" className="block text-sm mb-2 text-neon-green/80 tooltip">
                          PULSE INTERVAL (DAYS)
                          <span className="tooltip-text">How often you must &quot;pulse&quot; to keep the seal locked. If you miss a pulse, the seal unlocks automatically.</span>
                        </label>
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
                              className="w-full h-2 bg-dark-bg rounded-xl appearance-none cursor-pointer accent-neon-green"
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

                <div className="flex justify-center pt-6">
                  <div className="tooltip">
                    <span className="tooltip-text">
                      {isCreating ? 'Encrypting your data with AES-256...' :
                       !message.trim() && !file ? 'Enter a message or upload a file first' :
                       sealType === 'timed' && !unlockDate ? 'Select an unlock date and time' :
                       !turnstileToken ? 'Complete security check below' :
                       'Click to create your encrypted time-locked seal'}
                    </span>
                    <Button
                      onClick={handleCreateSeal}
                      disabled={isCreating || (!message.trim() && !file) || (sealType === 'timed' && !unlockDate) || !turnstileToken}
                      className="text-lg shadow-[0_0_20px_rgba(0,255,65,0.2)]"
                    >
                      {isCreating ? 'ENCRYPTING & SEALING...' : 'CREATE TIME-SEAL'}
                    </Button>
                  </div>
                </div>
              </Card>

              <div className="flex justify-center mt-6">
                <div className="tooltip">
                  <span className="tooltip-text">Complete this security check to prove you&apos;re human</span>
                  <Turnstile
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                    onSuccess={setTurnstileToken}
                    onError={() => toast.error('Security verification failed. Please refresh.')}
                    options={{ theme: 'dark', size: 'flexible', appearance: 'interaction-only' }}
                    className="w-full"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}