'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BackgroundBeams } from '../components/ui/background-beams';
import { Card } from '../components/Card';
import { Copy, ExternalLink, Trash2, Clock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface StoredSeal {
  id: string;
  publicUrl: string;
  pulseUrl?: string;
  pulseToken?: string;
  type: 'timed' | 'deadman';
  unlockTime: number;
  createdAt: number;
}

export default function DashboardPage() {
  const [seals, setSeals] = useState<StoredSeal[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('timeseal_links');
    if (stored) {
      try {
        setSeals(JSON.parse(stored));
      } catch {
        toast.error('Failed to load saved seals');
      }
    }
  }, []);

  const deleteSeal = (id: string) => {
    if (confirm('Remove this seal from your dashboard?')) {
      const updated = seals.filter(s => s.id !== id);
      localStorage.setItem('timeseal_links', JSON.stringify(updated));
      setSeals(updated);
      toast.success('Seal removed');
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
  };

  const formatTimeLeft = (unlockTime: number) => {
    const ms = unlockTime - Date.now();
    if (ms <= 0) return 'UNLOCKED';
    
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 p-4 relative w-full overflow-x-hidden">
      <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
      
      <div className="max-w-4xl w-full relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold glow-text mb-4">MY SEALS</h1>
          <p className="text-neon-green/70 text-sm">Manage your time-locked vaults</p>
        </div>

        {seals.length === 0 ? (
          <Card className="text-center py-12">
            <Clock className="w-16 h-16 text-neon-green/30 mx-auto mb-4" />
            <p className="text-neon-green/70 mb-4">No seals saved yet</p>
            <p className="text-xs text-neon-green/50 mb-6">
              Seals are automatically saved when you create them
            </p>
            <Link href="/" className="cyber-button inline-block">
              CREATE YOUR FIRST SEAL
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {seals.map((seal) => (
              <motion.div
                key={seal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {seal.type === 'deadman' ? (
                          <Shield className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-neon-green" />
                        )}
                        <span className="text-xs font-mono text-neon-green/50">
                          {seal.type === 'deadman' ? 'DEAD MAN\'S SWITCH' : 'TIMED RELEASE'}
                        </span>
                      </div>
                      
                      <div className="text-sm font-mono text-neon-green/70 mb-1 truncate">
                        ID: {seal.id}
                      </div>
                      
                      <div className="text-xs text-neon-green/50 mb-3">
                        {formatTimeLeft(seal.unlockTime)} remaining
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => copyLink(seal.publicUrl)}
                          className="cyber-button text-xs py-1 px-3 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          VAULT
                        </button>
                        
                        {seal.pulseUrl && seal.pulseToken && (
                          <button
                            onClick={() => copyLink(`${seal.pulseUrl}/${seal.pulseToken}`)}
                            className="cyber-button text-xs py-1 px-3 flex items-center gap-1 bg-yellow-500/10"
                          >
                            <Shield className="w-3 h-3" />
                            PULSE
                          </button>
                        )}
                        
                        <a
                          href={seal.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cyber-button text-xs py-1 px-3 flex items-center gap-1 bg-neon-green/10"
                        >
                          <ExternalLink className="w-3 h-3" />
                          OPEN
                        </a>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteSeal(seal.id)}
                      className="text-red-500 hover:text-red-400 transition-colors p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <div className="text-center mt-8">
          <Link href="/" className="cyber-button inline-block">CREATE NEW SEAL</Link>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-neon-green/40">
            💡 Stored locally in your browser
          </p>
        </div>
      </div>
    </div>
  );
}
