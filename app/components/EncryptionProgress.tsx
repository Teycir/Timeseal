"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";

interface EncryptionProgressProps {
  progress: number;
}

export function EncryptionProgress({ progress }: EncryptionProgressProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-bg/95 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4 space-y-6">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className="flex justify-center"
        >
          <Lock className="w-16 h-16 text-neon-green drop-shadow-[0_0_20px_rgba(0,255,65,0.6)]" />
        </motion.div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-neon-green/70 font-mono">
            <span>ENCRYPTING</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-dark-bg border border-neon-green/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-neon-green/50 to-neon-green relative"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 bg-neon-green/30"
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: "linear",
                  }}
                />
              ))}
            </motion.div>
          </div>
        </div>

        <motion.p
          className="text-center text-neon-green/50 text-xs font-mono"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          AES-256-GCM ENCRYPTION IN PROGRESS...
        </motion.p>
      </div>
    </div>
  );
}
