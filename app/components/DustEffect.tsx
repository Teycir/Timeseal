"use client";

import { useEffect, useRef, memo } from 'react';

export const DustEffect = memo(function DustEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Skip animation entirely if the user prefers reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastW = 0;

    const resize = () => {
      // Mobile browsers fire `resize` whenever the URL bar collapses/expands
      // (height-only change). Assigning canvas.width/height reallocates and
      // blanks the bitmap, which shows up as a flash. Ignore those.
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (lastW === w && Math.abs(h - canvas.height) < 200) return;
      lastW = w;
      canvas.width = w;
      canvas.height = h;
    };
    resize();

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
    }> = [];

    // Reduced from 40 to 15 particles for smoother performance on mobile/low-end
    for (let i = 0; i < 15; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.4 + 0.1
      });
    }

    function animate() {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.fillStyle = `rgba(0, 255, 65, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(animate);
    }

    animId = requestAnimationFrame(animate);

    window.addEventListener('resize', resize, { passive: true });
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.3 }}
    />
  );
});
