'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CountdownProps {
  unlockTime: number;
  onUnlock?: () => void;
}

export function Countdown({ unlockTime, onUnlock }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(unlockTime - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = unlockTime - Date.now();
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
        onUnlock?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [unlockTime, onUnlock]);

  if (timeLeft <= 0) {
    return (
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-neon-green font-mono text-xl sm:text-2xl"
      >
        UNLOCKED
      </motion.div>
    );
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const isUrgent = timeLeft < 60000; // Less than 1 minute
  const isWarning = timeLeft < 3600000; // Less than 1 hour

  return (
    <div className="flex gap-2 sm:gap-4 font-mono text-neon-green" data-testid="countdown">
      {days > 0 && (
        <TimeUnit value={days} label="DAYS" isUrgent={false} />
      )}
      <TimeUnit value={hours} label="HOURS" isUrgent={false} />
      <TimeUnit value={minutes} label="MIN" isUrgent={isWarning} />
      <TimeUnit value={seconds} label="SEC" isUrgent={isUrgent} />
    </div>
  );
}

function TimeUnit({ value, label, isUrgent }: { value: number; label: string; isUrgent: boolean }) {
  return (
    <motion.div 
      className="flex flex-col items-center relative"
      animate={isUrgent ? {
        scale: [1, 1.1, 1],
        textShadow: [
          '0 0 10px rgba(0,255,65,0.5)',
          '0 0 20px rgba(255,0,0,0.8)',
          '0 0 10px rgba(0,255,65,0.5)'
        ]
      } : {}}
      transition={{ duration: 1, repeat: isUrgent ? Infinity : 0 }}
    >
      <div className="relative">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`text-3xl sm:text-4xl font-bold tabular-nums ${
              isUrgent ? 'text-red-500' : ''
            }`}
          >
            {value.toString().padStart(2, '0')}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-xs sm:text-sm mt-1">{label}</span>
    </motion.div>
  );
}
