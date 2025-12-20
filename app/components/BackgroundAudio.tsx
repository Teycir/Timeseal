// This is a client-side component providing background audio
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Default stream URL - using a popular Retrowave/Synthwave station
const DEFAULT_STREAM_URL = '/mechanolith.mp3';

export function BackgroundAudio() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.2); // Start at 20% volume
    const [expanded, setExpanded] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const hasAutoStartedRef = useRef(false);

    // Initialize audio and attempt auto-play
    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio(DEFAULT_STREAM_URL);
            audioRef.current.volume = volume;
            audioRef.current.loop = true;
        }

        const attemptAutoPlay = async () => {
            if (hasAutoStartedRef.current || !audioRef.current) return;

            try {
                await audioRef.current.play();
                setIsPlaying(true);
                hasAutoStartedRef.current = true;
            } catch (error) {
                console.log("Auto-play blocked by browser policy. Interaction required.");
                // Fallback: stay paused, waiting for user click
                setIsPlaying(false);
            }
        };

        attemptAutoPlay();

        // Cleanup on unmount
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []); // Dependencies empty to run once on mount

    // Sync volume with ref when state changes
    useEffect(() => {
        if (audioRef.current && Math.abs(audioRef.current.volume - volume) > 0.01) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    // Handle Play/Pause
    const togglePlay = useCallback(() => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch(e => console.error("Audio playback failed:", e));
        }
    }, [isPlaying]);

    // Handle Volume Change
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = Number.parseFloat(e.target.value);
        setVolume(newVolume);
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute bottom-full right-0 mb-4 bg-black/90 border border-neon-green/30 p-4 rounded-lg cyber-card w-64 backdrop-blur-md"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-neon-green text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                                <WaveIcon isPlaying={isPlaying} />
                                Ambient Protocol
                            </span>
                            <div className="flex gap-1 h-3 items-end">
                                {/* Visualizer Bars */}
                                {[1, 2, 3, 4, 5].map(i => (
                                    <motion.div
                                        key={i}
                                        className="w-1 bg-neon-green"
                                        animate={isPlaying ? {
                                            height: ["20%", "100%", "20%"],
                                            opacity: [0.5, 1, 0.5]
                                        } : {
                                            height: "20%",
                                            opacity: 0.3
                                        }}
                                        transition={{
                                            duration: 0.5 + Math.random() * 0.5,
                                            repeat: Infinity,
                                            repeatType: "mirror",
                                            ease: "easeInOut",
                                            delay: i * 0.1
                                        }}
                                        style={{ height: '3px' }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] text-neon-green/50 uppercase">
                                <label htmlFor="volume-slider">Gain</label>
                                <span>{Math.round(volume * 100)}%</span>
                            </div>
                            <input
                                id="volume-slider"
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={handleVolumeChange}
                                className="w-full h-1 bg-dark-bg/50 rounded-lg appearance-none cursor-pointer accent-neon-green"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                onClick={expanded ? togglePlay : () => setExpanded(true)}
                className={`
          flex items-center justify-center w-12 h-12 rounded-full border 
          ${isPlaying ? 'border-neon-green bg-neon-green/10 shadow-[0_0_15px_rgba(0,255,65,0.3)]' : 'border-neon-green/30 bg-black/80 hover:bg-neon-green/5'}
          backdrop-blur-sm transition-all text-neon-green relative group
        `}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {isPlaying ? (
                    <>
                        {/* Animated Waves around button when playing */}
                        <span className="absolute inset-0 rounded-full border border-neon-green/0 group-hover:border-neon-green/30 animate-ping opacity-20"></span>
                        <SpeakerHighIcon className="w-5 h-5" />
                    </>
                ) : (
                    <SpeakerXIcon className="w-5 h-5 ml-0.5" />
                )}

                {/* Mini play/pause overlay on hover if expanded */}
                {expanded && (
                    <div
                        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    >
                        {isPlaying ? (
                            <span className="text-white text-xs">⏸</span>
                        ) : (
                            <span className="text-white text-xs">▶</span>
                        )}
                    </div>
                )}
            </motion.button>

            {expanded && (
                <button
                    onClick={() => setExpanded(false)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-black border border-neon-green/30 rounded-full text-[10px] text-neon-green flex items-center justify-center hover:bg-neon-green/20"
                >
                    ✕
                </button>
            )}
        </div>
    );
}

// Icons
function SpeakerHighIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
    );
}

function SpeakerXIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <line x1="23" x2="17" y1="9" y2="15" />
            <line x1="17" x2="23" y1="9" y2="15" />
        </svg>
    );
}

function WaveIcon({ isPlaying }: { isPlaying: boolean }) {
    return (
        <div className="flex items-end gap-[2px] h-3">
            <motion.div animate={isPlaying ? { height: [4, 12, 4] } : { height: 4 }} transition={{ repeat: Infinity, duration: 1 }} className="w-[2px] bg-neon-green rounded-full" />
            <motion.div animate={isPlaying ? { height: [8, 12, 6] } : { height: 6 }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-[2px] bg-neon-green rounded-full" />
            <motion.div animate={isPlaying ? { height: [6, 10, 4] } : { height: 5 }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-[2px] bg-neon-green rounded-full" />
        </div>
    )
}
