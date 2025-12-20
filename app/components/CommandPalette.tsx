'use client';

import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div
                className="w-full max-w-lg cyber-card animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <Command className="w-full bg-transparent text-neon-green font-mono">
                    <div className="flex items-center border-b border-neon-green/20 px-3">
                        <span className="mr-2 opacity-50">ᐳ</span>
                        <Command.Input
                            autoFocus
                            placeholder="Type a command or search..."
                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-neon-green/40 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
                        <Command.Empty className="py-6 text-center text-sm text-neon-green/40">
                            No results found.
                        </Command.Empty>

                        <Command.Group heading="Navigation" className="mb-2 px-2 text-xs text-neon-green/40 uppercase tracking-wider font-bold">
                            <CommandItem onSelect={() => runCommand(() => router.push('/'))}>
                                <span className="mr-2">🏠</span> Home
                            </CommandItem>
                            <CommandItem onSelect={() => runCommand(() => router.push('/?new=true'))}>
                                <span className="mr-2">➕</span> New Seal
                            </CommandItem>
                        </Command.Group>

                        <Command.Group heading="System" className="mb-2 px-2 text-xs text-neon-green/40 uppercase tracking-wider font-bold">
                            <CommandItem onSelect={() => runCommand(() => window.open('https://github.com/teycir/TimeSeal', '_blank'))}>
                                <span className="mr-2">📦</span> View Source
                            </CommandItem>
                            <CommandItem onSelect={() => runCommand(() => window.location.reload())}>
                                <span className="mr-2">🔄</span> Reload App
                            </CommandItem>
                        </Command.Group>
                    </Command.List>

                    <div className="border-t border-neon-green/10 p-2 text-[10px] text-neon-green/40 flex justify-between px-4">
                        <span>TIMESEAL v1.0</span>
                        <span>CMD+K</span>
                    </div>
                </Command>
            </div>

            {/* Backdrop click to close */}
            <div
                className="absolute inset-0 z-[-1]"
                onClick={() => setOpen(false)}
                role="button"
                tabIndex={0}
                aria-label="Close modal"
                onKeyDown={(e) => { if (e.key === 'Enter') setOpen(false); }}
            />
        </div>
    );
}

function CommandItem({ children, onSelect }: { children: React.ReactNode, onSelect: () => void }) {
    return (
        <Command.Item
            onSelect={onSelect}
            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none data-[selected=true]:bg-neon-green/10 data-[selected=true]:text-neon-green transition-colors"
        >
            {children}
        </Command.Item>
    );
}
