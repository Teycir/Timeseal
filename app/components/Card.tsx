import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import React, { MouseEvent } from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function Card({ children, className = "", title }: Readonly<CardProps>) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  /* Cache rect on mouse enter to avoid layout thrashing */
  // Using a ref to store the rect
  const rectRef = React.useRef<DOMRect | null>(null);

  function handleMouseEnter({ currentTarget }: MouseEvent) {
    rectRef.current = currentTarget.getBoundingClientRect();
  }

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const rect = rectRef.current || currentTarget.getBoundingClientRect();
    const { left, top } = rect;
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      className={`cyber-card p-6 group relative ${className}`}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(0, 255, 65, 0.15),
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative h-full">
        {title && (
          <div className="mb-4 border-b border-neon-green/20 pb-2">
            <h3 className="text-neon-green font-mono font-bold uppercase tracking-wider">
              {title}
            </h3>
          </div>
        )}
        {children}
      </div>
    </motion.div>
  );
}
