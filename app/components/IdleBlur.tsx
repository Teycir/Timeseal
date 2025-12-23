"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock } from "lucide-react";

export function IdleBlur() {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 30 seconds idle timeout
  const IDLE_TIMEOUT = 30000;

  useEffect(() => {
    const resetTimer = () => {
      if (isIdle) {
        setIsIdle(false);
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setIsIdle(true);
      }, IDLE_TIMEOUT);
    };

    // Initial start
    resetTimer();

    // Event listeners for activity
    const events = [
      "mousemove",
      "mousedown",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isIdle]);

  return (
    <AnimatePresence>
      {isIdle && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center cursor-none pointer-events-none"
        >
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center"
            >
              <Lock className="w-16 h-16 text-neon-green/50" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-neon-green/50 font-mono tracking-widest text-sm uppercase"
            >
              Secure Mode Active
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
