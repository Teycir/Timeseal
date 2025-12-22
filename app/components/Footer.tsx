'use client';

import { Github, Twitter, Linkedin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 p-4 bg-dark-bg/90 backdrop-blur-sm border-t border-neon-green/10 z-50">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neon-green/50 font-mono">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span className="text-neon-green/70">Built with 💚 and 🔒 by <a href="https://teycirbensoltane.tn" target="_blank" rel="noopener noreferrer" className="hover:text-neon-green transition-colors underline">Teycir Ben Soltane</a></span>
          <span>•</span>
          <a href="/how-it-works" className="hover:text-neon-green transition-colors">How It Works</a>
          <span>•</span>
          <a href="/security" className="hover:text-neon-green transition-colors">Security</a>
          <span>•</span>
          <a href="/faq" className="hover:text-neon-green transition-colors">FAQ</a>
        </div>
        <div className="flex gap-4 items-center">
          <a href="https://github.com/teycir/timeseal#readme" target="_blank" rel="noopener noreferrer" className="hover:text-neon-green transition-colors flex items-center justify-center" aria-label="GitHub">
            <Github className="w-5 h-5" />
          </a>
          <a href="https://twitter.com/intent/tweet?text=Check%20out%20TimeSeal%20-%20Cryptographic%20time-locked%20vault!&url=https://timeseal.dev" target="_blank" rel="noopener noreferrer" className="hover:text-neon-green transition-colors flex items-center justify-center" aria-label="Twitter">
            <Twitter className="w-5 h-5" />
          </a>
          <a href="https://www.linkedin.com/in/teycir-ben-soltane/" target="_blank" rel="noopener noreferrer" className="hover:text-neon-green transition-colors flex items-center justify-center" aria-label="LinkedIn">
            <Linkedin className="w-5 h-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}

