'use client';

import { useState } from 'react';
import { Download, QrCode } from 'lucide-react';

interface QRCodeDisplayProps {
  vaultLink: string;
}

export function QRCodeDisplay({ vaultLink }: QRCodeDisplayProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQR = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaultLink }),
      });

      if (!response.ok) throw new Error('Failed to generate QR code');

      const data = await response.json();
      setQrCode(data.qrCode);
    } catch (err) {
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrCode) return;

    const link = document.createElement('a');
    link.href = qrCode;
    link.download = 'timeseal-vault-qr.png';
    link.click();
  };

  return (
    <div className="space-y-4">
      {!qrCode ? (
        <button
          onClick={generateQR}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#00FF00] text-black font-mono hover:bg-[#00DD00] disabled:opacity-50"
        >
          <QrCode size={20} />
          {loading ? 'Generating...' : 'Generate QR Code'}
        </button>
      ) : (
        <div className="space-y-4">
          <img
            src={qrCode}
            alt="Vault QR Code"
            className="border-2 border-[#00FF00] p-2 bg-black"
          />
          <button
            onClick={downloadQR}
            className="flex items-center gap-2 px-4 py-2 bg-[#00FF00] text-black font-mono hover:bg-[#00DD00]"
          >
            <Download size={20} />
            Download QR Code
          </button>
          <p className="text-xs text-[#00FF00]/60 font-mono">
            ⚠️ QR codes can be scanned by cameras. Store securely.
          </p>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm font-mono">{error}</p>
      )}
    </div>
  );
}
