'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { BackgroundBeams } from '../components/ui/background-beams';
import { FloatingIcons } from '../components/FloatingIcons';
import { Card } from '../components/Card';
import DecryptedText from '../components/DecryptedText';
import { generateSeedPhrase } from '@/lib/seedPhrase';

export default function GenerateSeedPage() {
  const [seedPhrase, setSeedPhrase] = useState<string>('');
  const [keyA, setKeyA] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateSeedPhrase();
      setSeedPhrase(result.mnemonic);
      setKeyA(result.keyA);
      toast.success('Seed phrase generated successfully!');
    } catch (error) {
      toast.error('Failed to generate seed phrase');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 p-4 relative w-full overflow-x-hidden">
      <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
      <FloatingIcons />

      <motion.a
        href="https://github.com/teycir/timeseal#readme"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-dark-bg/80 backdrop-blur-sm border-2 border-neon-green/30 rounded-xl hover:border-neon-green transition-all group"
        whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)' }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-xs text-neon-green/70 font-mono group-hover:text-neon-green transition-colors">SOURCE CODE</span>
        <svg className="w-5 h-5 text-neon-green animate-subtle-shimmer" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
        </svg>
      </motion.a>

      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        <motion.a
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 bg-dark-bg/80 backdrop-blur-sm border-2 border-neon-green/30 rounded-xl hover:border-neon-green transition-all group"
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)' }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-xs text-neon-green/70 font-mono group-hover:text-neon-green transition-colors">MY SEALS</span>
        </motion.a>

        <motion.a
          href="/"
          className="flex items-center gap-2 px-4 py-2 bg-dark-bg/80 backdrop-blur-sm border-2 border-neon-green/30 rounded-xl hover:border-neon-green transition-all group"
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)' }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-xs text-neon-green/70 font-mono group-hover:text-neon-green transition-colors">HOME</span>
        </motion.a>

        <motion.a
          href="/webhook"
          className="flex items-center gap-2 px-4 py-2 bg-dark-bg/80 backdrop-blur-sm border-2 border-neon-green/30 rounded-xl hover:border-neon-green transition-all group"
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)' }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-xs text-neon-green/70 font-mono group-hover:text-neon-green transition-colors">WEBHOOK</span>
        </motion.a>
      </div>

      <div className="max-w-4xl w-full relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold glow-text pulse-glow mb-4">
            <DecryptedText
              text="GENERATE SEED PHRASE"
              animateOn="view"
              speed={75}
              maxIterations={20}
              className="text-neon-green"
              encryptedClassName="text-neon-green/30"
            />
          </h1>
          <p className="text-neon-green/70 text-sm">Generate a BIP39 seed phrase for Key A recovery</p>
        </div>

        <Card className="p-6 space-y-6">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full cyber-button py-3"
          >
            {isGenerating ? 'GENERATING...' : 'GENERATE NEW SEED PHRASE'}
          </button>

          {seedPhrase && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-neon-green/70 font-mono text-sm">12-WORD SEED PHRASE</label>
                  <button
                    onClick={() => handleCopy(seedPhrase, 'Seed phrase')}
                    className="text-xs text-neon-green/70 hover:text-neon-green font-mono"
                  >
                    COPY
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 p-4 bg-black/50 rounded-lg border border-neon-green/20">
                  {seedPhrase.split(' ').map((word, i) => (
                    <div key={i} className="text-neon-green font-mono text-sm">
                      {i + 1}. {word}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-neon-green/70 font-mono text-sm">KEY A (BASE64)</label>
                  <button
                    onClick={() => handleCopy(keyA, 'Key A')}
                    className="text-xs text-neon-green/70 hover:text-neon-green font-mono"
                  >
                    COPY
                  </button>
                </div>
                <div className="p-4 bg-black/50 rounded-lg border border-neon-green/20">
                  <p className="text-neon-green font-mono text-xs break-all">{keyA}</p>
                </div>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 font-mono text-xs">
                  ⚠️ SECURITY WARNING: Write down your seed phrase and store it securely. Anyone with this phrase can recover your Key A.
                </p>
              </div>
            </motion.div>
          )}
        </Card>
      </div>
    </div>
  );
}
