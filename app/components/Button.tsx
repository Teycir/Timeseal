'use client';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

import { motion } from 'framer-motion';

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  className = '',
}: ButtonProps) {
  // Base classes provided by globals.css .cyber-button
  // We can add variant-specific overrides if needed, but the main style is consistent

  const variantStyles = {
    primary: '', // Standard cyber-button
    secondary: 'bg-transparent border-neon-green/30 hover:bg-neon-green/10', // Override for secondary
    danger: 'border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]',
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      className={`cyber-button ${variantStyles[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
}
