'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Lock, Key, Shield } from 'lucide-react';

const icons = [Lock, Key, Shield];

export const FloatingIcons = memo(function FloatingIcons() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: 8 }).map((_, i) => {
        const Icon = icons[i % icons.length];
        const delay = i * 2;
        const duration = 20 + (i % 3) * 5;
        const x = (i % 4) * 25;
        const y = Math.floor(i / 4) * 50;
        
        return (
          <motion.div
            key={i}
            className="absolute opacity-5"
            style={{ left: `${x}%`, top: `${y}%` }}
            animate={{
              y: [0, -30, 0],
              x: [0, 15, 0],
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration,
              repeat: Infinity,
              delay,
              ease: 'easeInOut'
            }}
          >
            <Icon className="w-12 h-12 text-neon-green" />
          </motion.div>
        );
      })}
    </div>
  );
});
