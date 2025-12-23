"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  HTMLMotionProps,
} from "framer-motion";
import { useRef } from "react";

interface ButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for magnetic effect - weak strength
  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  /* Cache rect on mouse enter to avoid layout thrashing */
  const rectRef = useRef<DOMRect | null>(null);

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    rectRef.current = e.currentTarget.getBoundingClientRect();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (props.disabled) return;
    const { clientX, clientY } = e;

    // Use cached rect if available, fallback to getBoundingClientRect if not
    const rect = rectRef.current || e.currentTarget.getBoundingClientRect();
    const { left, top, width, height } = rect;
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    // Weak magnetic pull
    // Divide distance by 8 to limit movement max to ~10px typically
    const distanceX = clientX - centerX;
    const distanceY = clientY - centerY;

    x.set(distanceX / 8);
    y.set(distanceY / 8);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const variantStyles = {
    primary: "",
    secondary: "bg-transparent border-neon-green/30 hover:bg-neon-green/10",
    danger:
      "border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]",
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      whileHover={
        !props.disabled
          ? {
              scale: 1.02,
              boxShadow:
                "0 0 25px rgba(0, 255, 65, 0.5), 0 0 50px rgba(0, 255, 65, 0.2)",
              textShadow: "0 0 10px rgba(0, 255, 65, 0.8)",
            }
          : {}
      }
      whileTap={
        !props.disabled
          ? {
              scale: 0.98,
              boxShadow:
                "0 0 30px rgba(0, 255, 65, 0.7), 0 0 60px rgba(0, 255, 65, 0.3)",
            }
          : {}
      }
      className={`cyber-button ${variantStyles[variant]} ${className} ${!props.disabled && variant === "primary" ? "relative overflow-hidden" : ""}`}
      {...props}
    >
      {!props.disabled && variant === "primary" && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-neon-green/20 to-transparent"
          initial={{ x: "-100%" }}
          whileHover={{
            x: "100%",
            transition: { duration: 0.6, ease: "easeInOut" },
          }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
