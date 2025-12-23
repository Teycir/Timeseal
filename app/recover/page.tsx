'use client';

import { useState } from 'react';
import { recoverKeyA, validateSeedPhrase, formatSeedPhrase } from '@/lib/seedPhrase';

export default function RecoverPage() {
  const [sealId, setSealId] = useState('');
  const [words, setWords] = useState<string[]>(Array(12).fill(''));
  const [vaultLink, setVaultLink] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...words];
    newWords[index] = value.toLowerCase().trim();
    setWords(newWords);
    setError('');
  };

  const handleRecover = async () => {
    setError('');
    setLoading(true);

    try {
      if (!sealId.trim()) {
        throw new Error('Seal ID is required');
      }

      const mnemonic = formatSeedPhrase(words.filter(w => w));
      
      if (!validateSeedPhrase(mnemonic)) {
        throw new Error('Invalid seed phrase. Check your words and try again.');
      }

      const keyA = await recoverKeyA(mnemonic);
      const link = `${window.location.origin}/vault/${sealId}#${keyA}`;
      setVaultLink(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recovery failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(vaultLink);
  };

  return (
    <div className="min-h-screen bg-black text-green-400 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-mono mb-8">🔓 Recover Vault Link</h1>

        {!vaultLink ? (
          <div className="space-y-6">
            <div>
              <label className="block mb-2 font-mono">Seal ID:</label>
              <input
                type="text"
                value={sealId}
                onChange={(e) => setSealId(e.target.value)}
                className="w-full bg-black border border-green-400 text-green-400 p-3 font-mono"
                placeholder="a1b2c3d4..."
              />
            </div>

            <div>
              <label className="block mb-2 font-mono">Seed Phrase (12 words):</label>
              <div className="grid grid-cols-4 gap-2">
                {words.map((word, i) => (
                  <input
                    key={i}
                    type="text"
                    value={word}
                    onChange={(e) => handleWordChange(i, e.target.value)}
                    className="bg-black border border-green-400 text-green-400 p-2 font-mono text-sm"
                    placeholder={`${i + 1}.`}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="border border-red-500 bg-red-950 text-red-400 p-4 font-mono">
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleRecover}
              disabled={loading}
              className="w-full bg-green-400 text-black p-4 font-mono font-bold hover:bg-green-300 disabled:opacity-50"
            >
              {loading ? 'Recovering...' : 'Recover Vault Link'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="border border-green-400 bg-green-950 p-6">
              <p className="font-mono mb-4">✅ Success! Your vault link:</p>
              <div className="bg-black p-4 break-all font-mono text-sm">
                {vaultLink}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleCopy}
                className="flex-1 bg-green-400 text-black p-4 font-mono font-bold hover:bg-green-300"
              >
                Copy Link
              </button>
              <a
                href={vaultLink}
                className="flex-1 bg-green-400 text-black p-4 font-mono font-bold hover:bg-green-300 text-center"
              >
                Open Vault
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
