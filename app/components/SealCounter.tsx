"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function SealCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => setCount(data.totalSeals))
      .catch(() => setCount(null));
  }, []);

  if (count === null || count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center mt-4"
    >
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-neon-green/5 border border-neon-green/20 rounded-lg">
        <span className="text-neon-green/60 text-xs font-mono">
          SEALS CREATED:
        </span>
        <span className="text-neon-green text-lg font-bold font-mono">
          {count.toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
}
