"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useRevealAnimation } from "@/lib/ui/hooks";

interface TextScrambleProps {
  children: string;
  className?: string;
  duration?: number;
}

// Inner component that runs the animation
function TextScrambleContent({
  text,
  duration,
}: {
  text: string;
  duration: number;
}) {
  const displayText = useRevealAnimation(text, duration);

  return (
    <>
      {displayText.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.1 }}
        >
          {char}
        </motion.span>
      ))}
    </>
  );
}

export function TextScramble({
  children,
  className = "",
  duration = 1.5,
}: TextScrambleProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <span ref={ref} className={className}>
      {isInView ? (
        <TextScrambleContent text={children} duration={duration} />
      ) : (
        <span className="opacity-0">{children}</span>
      )}
    </span>
  );
}
