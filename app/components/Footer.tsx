import { Heart, Lock } from 'lucide-react';

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 p-4 bg-dark-bg/90 backdrop-blur-sm border-t border-neon-green/10 z-50">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neon-green/50 font-mono px-2">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span className="text-neon-green/70 flex items-center gap-1">
            Built with <Heart className="w-3 h-3 inline fill-current" /> and <Lock className="w-3 h-3 inline" /> by <a href="https://teycirbensoltane.tn" target="_blank" rel="noopener noreferrer" className="hover:text-neon-green transition-colors underline">Teycir Ben Soltane</a>
          </span>
          <span>•</span>
          <a href="/how-it-works" className="hover:text-neon-green transition-colors">How It Works</a>
          <span>•</span>
          <a href="/security" className="hover:text-neon-green transition-colors">Security</a>
          <span>•</span>
          <a href="/faq" className="hover:text-neon-green transition-colors">FAQ</a>
        </div>
        <div className="flex gap-3 items-center">
          <span className="text-neon-green/50 leading-none">Share:</span>
          <a href="https://twitter.com/intent/tweet?text=Check%20out%20TimeSeal%20-%20Cryptographic%20time-locked%20vault%20and%20dead%20man%27s%20switch.%20Encrypt%20messages%20that%20unlock%20at%20a%20future%20date%20or%20after%20inactivity.%20Built%20on%20Cloudflare%20Workers%20with%20AES-256%20encryption.%20https://github.com/teycir/timeseal%23readme" target="_blank" rel="noopener noreferrer" className="hover:text-neon-green transition-colors flex items-center justify-center" aria-label="Share on X/Twitter">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z" />
            </svg>
          </a>
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=https://github.com/teycir/timeseal%23readme" target="_blank" rel="noopener noreferrer" className="hover:text-neon-green transition-colors flex items-center justify-center" aria-label="Share on LinkedIn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}

