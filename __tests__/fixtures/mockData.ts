export const mockSeals = {
  locked: {
    id: 'seal-locked-123',
    encryptedBlob: 'U2FsdGVkX1+encrypted+data',
    unlockTime: Date.now() + 86400000,
    isDMS: false,
    status: 'locked',
  },
  unlocked: {
    id: 'seal-unlocked-456',
    encryptedBlob: 'U2FsdGVkX1+encrypted+data',
    unlockTime: Date.now() - 3600000,
    isDMS: false,
    status: 'unlocked',
    keyB: 'mock-server-key-b64',
  },
  dms: {
    id: 'seal-dms-789',
    encryptedBlob: 'U2FsdGVkX1+encrypted+data',
    unlockTime: Date.now() + 604800000,
    isDMS: true,
    pulseInterval: 86400,
    lastPulse: Date.now(),
    pulseToken: 'mock-pulse-token',
  },
};

export const mockKeys = {
  keyA: 'dGVzdC1rZXktYQ==',
  keyB: 'dGVzdC1rZXktYg==',
  combined: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
};

export const mockSecrets = {
  short: 'Test secret',
  long: 'This is a longer secret message with multiple sentences. It contains sensitive information.',
  json: JSON.stringify({ seedPhrase: 'word1 word2 word3', wallet: '0x123' }),
};
