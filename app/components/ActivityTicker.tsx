'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Shield } from 'lucide-react';

interface Activity {
  id: string;
  type: 'sealed' | 'unlocked' | 'dms';
  timestamp: number;
  location?: string;
  daysLocked?: number;
}

const SAMPLE_ACTIVITIES: Activity[] = [
  { id: '1', type: 'sealed', timestamp: Date.now(), location: 'San Francisco' },
  { id: '2', type: 'unlocked', timestamp: Date.now() - 1000, daysLocked: 7 },
  { id: '3', type: 'dms', timestamp: Date.now() - 2000, location: 'Tokyo' },
  { id: '4', type: 'sealed', timestamp: Date.now() - 3000, location: 'London' },
  { id: '5', type: 'unlocked', timestamp: Date.now() - 4000, daysLocked: 14 },
];

export function ActivityTicker() {
  const [currentActivity, setCurrentActivity] = useState<Activity>(SAMPLE_ACTIVITIES[0]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % SAMPLE_ACTIVITIES.length);
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setCurrentActivity(SAMPLE_ACTIVITIES[index]);
  }, [index]);

  const formatActivity = (activity: Activity) => {
    switch (activity.type) {
      case 'sealed':
        return {
          icon: <Lock className="w-4 h-4" />,
          text: `Anonymous sealed a message${activity.location ? ` in ${activity.location}` : ''}`,
        };
      case 'unlocked':
        return {
          icon: <Unlock className="w-4 h-4" />,
          text: `Seal unlocked after ${activity.daysLocked} days`,
        };
      case 'dms':
        return {
          icon: <Shield className="w-4 h-4" />,
          text: `Dead man's switch activated${activity.location ? ` in ${activity.location}` : ''}`,
        };
    }
  };

  const formatted = formatActivity(currentActivity);

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentActivity.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-2 text-neon-green/60 text-sm font-mono"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            {formatted.icon}
          </motion.div>
          <span>{formatted.text}</span>
          <span className="text-neon-green/40">• {new Date(currentActivity.timestamp).toLocaleTimeString()}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
