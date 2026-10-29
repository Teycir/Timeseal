import { Heart, Lock } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative bottom-0 left-0 right-0 p-4 bg-dark-bg/90 backdrop-blur-sm border-t border-neon-green/10 mt-16">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neon-green/50 font-mono px-2">
        <div className="flex items-center gap-2 flex-wrap justify-center text-center">
          <span className="text-neon-green/70 flex items-center gap-1 flex-wrap justify-center">
            Built with <Heart className="w-3 h-3 inline fill-current" /> and <Lock className="w-3 h-3 inline" /> by <a href="https://teycirbensoltane.tn" target="_blank" rel="noopener noreferrer" className="hover:text-neon-green transition-colors underline">Teycir Ben Soltane</a>
          </span>
          <span className="hidden sm:inline">•</span>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <a href="/how-it-works" className="hover:text-neon-green transition-colors">How It Works</a>
            <span>•</span>
            <a href="/security" className="hover:text-neon-green transition-colors">Security</a>
            <span>•</span>
            <a href="/faq" className="hover:text-neon-green transition-colors">FAQ</a>
            <span>•</span>
            <a href="/canary" className="hover:text-neon-green transition-colors">Canary</a>
            <span>•</span>
            <a href="/license" className="hover:text-neon-green transition-colors">License</a>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <span className="text-neon-green/40 leading-none" title="Deployed version">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </span>
          <span className="text-neon-green/50 leading-none">Share:</span>
          <a href="https://twitter.com/intent/tweet?text=Check%20out%20TimeSeal%20-%20cryptographically%20enforced%20time-locked%20vaults!%20Send%20messages%20that%20can%27t%20be%20opened%20until%20a%20specific%20date.&url=https://timeseal.online&hashtags=Encryption,Privacy,TimeLock" target="_blank" rel="noopener noreferrer" className="hover:text-neon-green transition-colors flex items-center justify-center p-2" aria-label="Share on X/Twitter">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z" />
            </svg>
          </a>
          <a href="https://www.reddit.com/submit?url=https://timeseal.online&title=TimeSeal%20-%20Cryptographically%20Enforced%20Time-Locked%20Vaults" target="_blank" rel="noopener noreferrer" className="hover:text-neon-green transition-colors flex items-center justify-center p-2" aria-label="Share on Reddit">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M6.167 8a.831.831 0 0 0-.83.83c0 .459.372.84.83.831a.831.831 0 0 0 0-1.661zm1.843 3.647c.315 0 1.403-.038 1.976-.611a.232.232 0 0 0 0-.306.213.213 0 0 0-.306 0c-.353.363-1.126.487-1.67.487-.545 0-1.308-.124-1.671-.487a.213.213 0 0 0-.306 0 .213.213 0 0 0 0 .306c.564.563 1.652.61 1.977.61zm.992-2.807c0 .458.373.83.831.83.458 0 .83-.381.83-.83a.831.831 0 0 0-1.66 0z"/>
              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.828-1.165c-.315 0-.602.124-.812.325-.801-.573-1.9-.945-3.121-.993l.534-2.501 1.738.372a.83.83 0 1 0 .83-.869.83.83 0 0 0-.744.468l-1.938-.41a.203.203 0 0 0-.153.028.186.186 0 0 0-.086.134l-.592 2.788c-1.24.038-2.358.41-3.17.992-.21-.2-.496-.324-.81-.324a1.163 1.163 0 0 0-.478 2.224c-.02.115-.029.23-.029.353 0 1.795 2.091 3.256 4.669 3.256 2.577 0 4.668-1.451 4.668-3.256 0-.114-.01-.238-.029-.353.401-.181.688-.592.688-1.069 0-.65-.525-1.165-1.165-1.165z"/>
            </svg>
          </a>
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=https://timeseal.online" target="_blank" rel="noopener noreferrer" className="hover:text-neon-green transition-colors flex items-center justify-center p-2" aria-label="Share on LinkedIn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}

