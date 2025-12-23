'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTextScramble } from '@/lib/ui/hooks';

interface DecryptedTextProps {
    text: string;
    speed?: number;
    maxIterations?: number;
    sequential?: boolean;
    revealDirection?: 'start' | 'end' | 'center';
    useOriginalCharsOnly?: boolean;
    characters?: string;
    className?: string;
    parentClassName?: string;
    encryptedClassName?: string;
    animateOn?: 'view' | 'hover';
}

export default function DecryptedText({
    text,
    speed = 50,
    maxIterations = 10,
    sequential = false,
    revealDirection = 'start',
    useOriginalCharsOnly = false,
    characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()_+-=[]{}|;:,.<>?',
    className = '',
    parentClassName = '',
    encryptedClassName = '',
    animateOn = 'hover',
}: DecryptedTextProps) {
    const [isHovering, setIsHovering] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);
    const { displayText, scramble } = useTextScramble(text, {
        speed,
        maxIterations,
        useOriginalCharsOnly,
        characters,
        animateOn: hasAnimated ? undefined : animateOn,
    });

    const handleMouseEnter = () => {
        if (animateOn === 'hover') {
            setIsHovering(true);
            scramble();
        }
    };

    const handleMouseLeave = () => {
        if (animateOn === 'hover') {
            setIsHovering(false);
        }
    };

    // Mark as animated after first render
    useState(() => {
        if (animateOn === 'view' && !hasAnimated) {
            setTimeout(() => setHasAnimated(true), (maxIterations + 1) * speed);
        }
    });

    return (
        <motion.span
            className={`inline-block whitespace-nowrap ${parentClassName}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <span className={className}>
                {displayText.split('').map((char, index) => {
                    const isOriginal = char === text[index];
                    return (
                        <span
                            key={index}
                            className={isOriginal ? undefined : encryptedClassName}
                        >
                            {char}
                        </span>
                    );
                })}
            </span>
        </motion.span>
    );
}
