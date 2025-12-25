"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SECURITY_FEATURES = [
  "Send messages that unlock in the future",
  "Perfect for birthday surprises and time capsules",
  "Protect your crypto wallet for loved ones",
  "Share secrets that self-destruct after reading",
  "Schedule important announcements ahead of time",
  "Create digital inheritance for your family",
  "Whistleblower protection with automatic release",
  "No one can read your message until the time comes",
  "Works like a digital safe with a timer",
  "Your data stays encrypted until unlock time",
  "Set it and forget it - fully automated",
  "Dead Man's Switch for peace of mind",
  "One-time passwords that vanish after use",
  "Release evidence if something happens to you",
  "Drip content for courses and training",
  "Product launches with perfect timing",
  "Legal documents that activate on schedule",
  "Emergency backup plans that auto-trigger",
  "No passwords to remember - just share the link",
  "Built on Cloudflare's global network",
  "Fully open source - inspect the code yourself",
  "Military-grade encryption protects your secrets",
  "Automatic cleanup after 30 days",
  "Works on any device with a web browser",
  "No account needed - completely anonymous",
];

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  char: string;
}

export function SecurityFeaturesBanner() {
  const [index, setIndex] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [canvasSupported, setCanvasSupported] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  // Check canvas support on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = document.createElement("canvas");
    setCanvasSupported(!!(canvas.getContext && canvas.getContext("2d")));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % SECURITY_FEATURES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Particle animation
  useEffect(() => {
    if (!canvasSupported) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const animate = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      setParticles((prev) => {
        const updated = prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.1,
            life: p.life - 0.02,
          }))
          .filter((p) => p.life > 0);

        updated.forEach((p) => {
          ctx.fillStyle = `rgba(0, 255, 65, ${p.life * 0.6})`;
          ctx.font = "10px monospace";
          ctx.fillText(p.char, p.x, p.y);
        });

        return updated;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [canvasSupported]);

  const createParticles = useCallback(() => {
    if (!canvasSupported) return;
    
    const textEl = textRef.current;
    if (!textEl) return;

    const text = SECURITY_FEATURES[index];
    const rect = textEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    
    const newParticles: Particle[] = [];
    const particleCount = Math.min(text.length, 30);

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: rect.width / 2 + (Math.random() - 0.5) * rect.width * 0.8,
        y: rect.height / 2,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2 - 1,
        life: 1,
        char: text[Math.floor(Math.random() * text.length)] || "•",
      });
    }

    setParticles(newParticles);
  }, [canvasSupported, index]);

  return (
    <div className="relative min-h-[2rem] sm:min-h-[2.5rem] flex items-center justify-center overflow-hidden mb-2 sm:mb-4 px-2">
      {canvasSupported && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
          aria-hidden="true"
        />
      )}
      <AnimatePresence mode="wait" onExitComplete={createParticles}>
        <motion.div
          key={index}
          ref={textRef}
          className="text-neon-green/60 text-[10px] xs:text-xs sm:text-sm font-mono text-center leading-tight max-w-full"
        >
          {SECURITY_FEATURES[index].split('').map((char, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.15,
                delay: (SECURITY_FEATURES[index].length - 1 - i) * 0.02,
                exit: { duration: 0.3 }
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
