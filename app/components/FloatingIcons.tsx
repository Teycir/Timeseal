'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Lock, Key, Shield } from 'lucide-react';

const icons = [Lock, Key, Shield];
const ICON_COUNT = 4;

export const FloatingIcons = memo(function FloatingIcons() {
  // Direct render-time media-query check — no state means no hydration
  // flash (SSR renders the same branch as the client first paint).
  // The global CSS prefers-reduced-motion rule also disables CSS animations,
  // but Framer Motion uses WAAPI which CSS cannot reach, so we guard
  // at the component level too.
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const iconPos = (i: number) => ({
    left: `${(i % 4) * 25}%`,
    top: `${Math.floor(i / 4) * 50}%`,
  });

  if (reducedMotion) {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {Array.from({ length: ICON_COUNT }).map((_, i) => {
          const Icon = icons[i % icons.length];
          return (
            <div
              key={i}
              className="absolute opacity-5"
              style={iconPos(i)}
            >
              <Icon className="w-12 h-12 text-neon-green" />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: ICON_COUNT }).map((_, i) => {
        const Icon = icons[i % icons.length];
        return (
          <motion.div
            key={i}
            className="absolute opacity-5"
            style={{ ...iconPos(i), willChange: 'transform' }}
            animate={{
              y: [0, -30, 0],
              x: [0, 15, 0],
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 20 + (i % 3) * 5,
              repeat: Infinity,
              delay: i * 2,
              ease: 'easeInOut',
            }}
          >
            <Icon className="w-12 h-12 text-neon-green" />
          </motion.div>
        );
      })}
    </div>
  );
});
