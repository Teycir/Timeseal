'use client';

import { toast } from 'sonner';

interface ShareButtonsProps {
  url: string;
  text?: string;
}

export function ShareButtons({ url, text = 'Check out my TimeSeal vault!' }: ShareButtonsProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'TimeSeal', text, url });
        toast.success('Shared successfully!');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    }
  };

  return (
    <div className="flex gap-2 items-center justify-center flex-wrap">
      <span className="text-xs text-neon-green/50 font-mono">SHARE:</span>

      <a
        href={shareLinks.twitter}
        target="_blank"
        rel="noopener noreferrer"
        className="cyber-border px-3 py-1 text-xs text-neon-green/70 hover:text-neon-green hover:bg-neon-green/10 transition-all font-mono"
        title="Share on 𝕏"
      >
        𝕏
      </a>

      <a
        href={shareLinks.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className="cyber-border px-3 py-1 text-xs text-neon-green/70 hover:text-neon-green hover:bg-neon-green/10 transition-all font-mono"
        title="LinkedIn"
      >
        IN
      </a>

      <span className="text-neon-green/30">|</span>

      <a
        href="https://github.com/teycir/timeseal#readme"
        target="_blank"
        rel="noopener noreferrer"
        className="cyber-border px-3 py-1 text-xs text-neon-green/70 hover:text-neon-green hover:bg-neon-green/10 transition-all font-mono"
        title="Open Source"
      >
        Open Source
      </a>

      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button
          onClick={handleNativeShare}
          className="cyber-border px-3 py-1 text-xs text-neon-green/70 hover:text-neon-green hover:bg-neon-green/10 transition-all font-mono"
          title="Share via..."
        >
          ⋯
        </button>
      )}
    </div>
  );
}
