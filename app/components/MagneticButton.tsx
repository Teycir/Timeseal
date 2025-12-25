"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}

export function MagneticButton({ children, className = "", ...props }: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleMouse = (e: React.MouseEvent) => {
    if (isMobile || !ref.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const x = (clientX - centerX) * 0.25;
    const y = (clientY - centerY) * 0.25;
    setPosition({ x, y });
  };

  const reset = () => setPosition({ x: 0, y: 0 });

  if (isMobile) {
    return <div className={className} {...props}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 200, damping: 20, mass: 0.5 }}
      className={className}
      style={{ display: 'inline-block' }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
