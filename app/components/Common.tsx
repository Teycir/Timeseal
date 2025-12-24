"use client";

import { motion } from "framer-motion";
import { Hourglass } from "lucide-react";

export function ErrorMessage({ message }: { message: string }) {
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-red-500 text-sm text-center font-mono"
    >
      {message}
    </motion.p>
  );
}

export function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Hourglass className="w-12 h-12 text-neon-green mx-auto mb-4 animate-spin" />
        <p className="text-neon-green/70">{text}</p>
      </div>
    </div>
  );
}

export function CountdownDisplay({
  timeLeft,
  isUrgent = false,
}: {
  timeLeft: string;
  isUrgent?: boolean;
}) {
  return (
    <div
      className={`text-2xl sm:text-3xl md:text-4xl font-mono ${isUrgent ? "text-red-500 pulse-glow" : "pulse-glow"}`}
    >
      {timeLeft}
    </div>
  );
}

export function PageHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center mb-8">
      <div className="flex justify-center mb-4">{icon}</div>
      <h1 className="text-2xl sm:text-3xl font-bold glow-text mb-4">{title}</h1>
      {subtitle && <p className="text-neon-green/70">{subtitle}</p>}
    </div>
  );
}

export function CenteredContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">{children}</div>
    </div>
  );
}
