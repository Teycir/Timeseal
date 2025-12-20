'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

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
    const [displayText, setDisplayText] = useState(text);
    const [isHovering, setIsHovering] = useState(false);
    const [isScrambling, setIsScrambling] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const availableChars = useOriginalCharsOnly
        ? Array.from(new Set(text.split(''))).join('')
        : characters;

    const scramble = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        setIsScrambling(true);
        let iteration = 0;

        intervalRef.current = setInterval(() => {
            setDisplayText((prevText) =>
                text
                    .split('')
                    .map((char, index) => {
                        if (char === ' ') return ' ';

                        if (iteration >= maxIterations) {
                            return char;
                        }

                        if (Math.random() < 0.1 * iteration) {
                            return char;
                        }

                        return availableChars[Math.floor(Math.random() * availableChars.length)];
                    })
                    .join('')
            );

            if (iteration >= maxIterations) {
                setDisplayText(text);
                setIsScrambling(false);
                if (intervalRef.current) clearInterval(intervalRef.current);
            }

            iteration += 1;
        }, speed);
    }, [text, speed, maxIterations, availableChars]);

    useEffect(() => {
        if (animateOn === 'view') {
            scramble();
        }
    }, [animateOn, scramble]);

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
