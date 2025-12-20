// Shared constants across the application

export const TEMPLATES = [
  { name: 'Crypto Inheritance', icon: '💎', type: 'deadman' as const, placeholder: 'Seed phrase: ...\\nWallet addresses: ...', pulseDays: 30 },
  { name: 'Whistleblower', icon: '🕵️', type: 'deadman' as const, placeholder: 'Evidence of...', pulseDays: 7 },
  { name: 'Product Launch', icon: '🚀', type: 'timed' as const, placeholder: 'Product details, access codes...' },
  { name: 'Birthday Gift', icon: '🎁', type: 'timed' as const, placeholder: 'Happy Birthday! Here&apos;s your surprise...' },
  { name: 'Legal Hold', icon: '⚖️', type: 'timed' as const, placeholder: 'Contract terms...' },
];

export const TIME_CONSTANTS = {
  MIN_PULSE_DAYS: 1,
  MAX_PULSE_DAYS: 90,
  DEFAULT_PULSE_DAYS: 7,
  PULSE_CHECK_INTERVAL: 30000, // 30 seconds
  COUNTDOWN_INTERVAL: 1000, // 1 second
  SUCCESS_MESSAGE_DURATION: 3000, // 3 seconds
} as const;

export const VALIDATION = {
  MIN_UNLOCK_DELAY: 60 * 1000, // 1 minute
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_SEAL_DURATION_DAYS: 365,
} as const;
