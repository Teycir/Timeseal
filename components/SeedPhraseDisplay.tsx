'use client';

interface SeedPhraseDisplayProps {
  mnemonic: string;
  sealId: string;
  onConfirm: () => void;
}

export function SeedPhraseDisplay({ mnemonic, sealId, onConfirm }: SeedPhraseDisplayProps) {
  const words = mnemonic.split(' ');

  const handleCopy = () => {
    navigator.clipboard.writeText(`Seal ID: ${sealId}\n\nSeed Phrase:\n${mnemonic}`);
  };

  return (
    <div className="border border-yellow-400 bg-yellow-950 p-6 space-y-4">
      <h3 className="text-xl font-mono text-yellow-400">🔑 Recovery Seed Phrase</h3>
      
      <p className="font-mono text-sm text-yellow-300">
        Write these 12 words on paper. You'll need them to recover your vault link if lost.
      </p>

      <div className="bg-black p-4 border border-yellow-400">
        <div className="grid grid-cols-3 gap-3">
          {words.map((word, i) => (
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
        <button
          onClick={handleCopy}
          className="flex-1 bg-yellow-400 text-black p-3 font-mono font-bold hover:bg-yellow-300"
        >
          Copy to Clipboard
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 bg-green-400 text-black p-3 font-mono font-bold hover:bg-green-300"
        >
          ✓ I've Written It Down
        </button>
      </div>
    </div>
  );
}
