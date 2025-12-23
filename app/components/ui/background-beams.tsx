"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const BackgroundBeams = ({ className }: { className?: string }) => {
  const [beams, setBeams] = useState<
    { id: number; path: string; duration: number; delay: number }[]
  >([]);

  useEffect(() => {
    // Generate organic paths
    const newBeams = Array.from({ length: 40 }).map((_, i) => {
      const startX = Math.random() * 100;
      const endX = Math.random() * 100;
      const control1X = Math.random() * 100;
      const control2X = Math.random() * 100;

      const path = `M${startX} -20 C ${control1X} 20, ${control2X} 80, ${endX} 120`;

      return {
        id: i,
        path,
        duration: Math.random() * 10 + 10, // 10-20s duration
        delay: Math.random() * 10,
      };
    });
    setBeams(newBeams);
  }, []);

  return (
    <div
      className={cn(
        "absolute inset-0 w-full h-full overflow-hidden pointer-events-none",
        className,
      )}
    >
      <svg
        className="w-full h-full opacity-30"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {beams.map((beam) => (
          <motion.path
            key={beam.id}
            d={beam.path}
            stroke="url(#gradient)"
            strokeWidth="0.2"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: [0, 1, 1],
              opacity: [0, 1, 0],
              pathOffset: [0, 0, 1],
            }}
            transition={{
              duration: beam.duration,
              repeat: Infinity,
              ease: "linear",
              delay: beam.delay,
            }}
          />
        ))}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00ff41" stopOpacity="0" />
            <stop offset="50%" stopColor="#00ff41" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#00ff41" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Radial gradient container for a "glow" effect in the center */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neon-green/5 to-transparent blur-3xl opacity-20 pointer-events-none" />
    </div>
  );
};
