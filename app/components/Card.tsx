'use client';

import { motion } from 'framer-motion';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
}

export function Card({ children, className = '', title }: CardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`cyber-card p-6 ${className}`}
        >
            {title && (
                <div className="mb-4 border-b border-neon-green/20 pb-2">
                    <h3 className="text-neon-green font-mono font-bold uppercase tracking-wider">{title}</h3>
                </div>
            )}
            {children}
        </motion.div>
    );
}
