'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Shield, X } from 'lucide-react';
import { detectSuspiciousExtensions, type SecurityWarning } from '@/lib/extensionDetection';

export function SecurityDashboard() {
  const [warnings, setWarnings] = useState<SecurityWarning[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const detected = detectSuspiciousExtensions();
    setWarnings(detected);
  }, []);

  if (dismissed || warnings.length === 0) return null;

  const hasHigh = warnings.some(w => w.severity === 'high');

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-dark-bg border-2 border-yellow-500/50 rounded-lg p-4 shadow-2xl z-50 animate-pulse">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-bold text-yellow-500 mb-2">SECURITY WARNING</h3>
          {warnings.map((w, i) => (
            <div key={i} className="mb-2 text-xs">
              <p className="text-neon-green/90">{w.message}</p>
              <p className="text-neon-green/60 mt-1">→ {w.recommendation}</p>
            </div>
          ))}
          {hasHigh && (
            <p className="text-red-400 text-xs font-bold mt-2">⚠️ DO NOT PROCEED</p>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-neon-green/50 hover:text-neon-green"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
