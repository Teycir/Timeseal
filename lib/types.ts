// Time-Seal Type Definitions
export interface TimeSeal {
  id: string;
  keyB: string;
  iv: string;
  unlockTime: number;
  createdAt: number;
  pulseToken?: string; // For dead man's switch
  pulseDuration?: number; // Duration in milliseconds
  isActive: boolean;
}

export interface CreateSealRequest {
  encryptedBlob: ArrayBuffer;
  keyB: string;
  iv: string;
  unlockTime: number;
  pulseToken?: string;
  pulseDuration?: number;
}

export interface SealStatus {
  id: string;
  isLocked: boolean;
  unlockTime: number;
  keyB?: string;
  iv?: string;
}

export interface PulseResponse {
  success: boolean;
  newUnlockTime?: number;
}