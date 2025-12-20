'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const CYBER_CHARS = 'SAMPLE_TEXT_!@#$%^&*()_+{}|:<>?';

interface TextScrambleProps {
    children: string;
    className?: string;
    duration?: number;
}

export function TextScramble({ children, className = '', duration = 1.5 }: TextScrambleProps) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    const [displayText, setDisplayText] = useState('');

    // Create an array of random characters same length as children
    // but we want to animate/reveal them one by one or randomly

    useEffect(() => {
        if (!isInView) return;

        const chars = CYBER_CHARS.split('');
        const targetText = children;
        const length = targetText.length;
        let frame = 0;

        // We'll perform updates in an interval
        const intervalId = setInterval(() => {
            let output = '';

            // Calculate how many characters should be resolved based on progress
            // We want the resolution to sweep from left to right
            const progress = frame / (duration * 30); // approx 30fps updates

            for (let i = 0; i < length; i++) {
                // If the character index is less than the resolved count, show the real char
                // Otherwise show a random character
                // We add some randomness to the resolution line so it's not a hard straight line
                const resolveThreshold = Math.floor(progress * length);

                if (i < resolveThreshold) {
                    output += targetText[i];
                } else {
                    // 10% chance to be "empty" for a glitch feel, otherwise random char
                    output += Math.random() < 0.1 ? ' ' : chars[Math.floor(Math.random() * chars.length)];
                }
            }

            setDisplayText(output);
            frame++;

            if (frame > (duration * 30) + 12) { // Slight buffer to ensure completion
                setDisplayText(targetText);
                clearInterval(intervalId);
            }

        }, 40);

        return () => clearInterval(intervalId);
    }, [isInView, children, duration]);

    return (
        <span ref={ref} className={className}>
            {displayText.split('').map((char, i) => (
                <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.1 }}
                >
                    {char}
                </motion.span>
            ))}
        </span>
    );
}
