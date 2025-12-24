"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, Shield } from "lucide-react";

interface Activity {
  type: "sealed" | "unlocked" | "dms";
  timestamp: number;
  location?: string;
}

export function ActivityTicker() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch("/api/activity");
        const data = await res.json();
        if (data.activities?.length > 0) {
          // Validate activity types
          const validActivities = data.activities.filter((a: Activity) =>
            ["sealed", "unlocked", "dms"].includes(a.type),
          );
          setActivities(validActivities);
        }
      } catch (err) {
        console.error("Failed to fetch activities:", err);
      }
    };

    fetchActivities();
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activities.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [activities.length]);

  if (activities.length === 0) return null;

  const current = activities[currentIndex];
  const formatted = (() => {
    switch (current.type) {
      case "sealed":
        return null;
      case "unlocked":
        return {
          icon: <Unlock className="w-4 h-4" />,
          text: `⏰ Seal unlocked`,
        };
      case "dms":
        return {
          icon: <Shield className="w-4 h-4" />,
          text: `💀 Dead man's switch activated${current.location ? ` in ${current.location}` : ""}`,
        };
    }
  })();

  if (!formatted) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-2 text-neon-green/60 text-sm font-mono"
        >
          {formatted.icon}
          <span>{formatted.text}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
