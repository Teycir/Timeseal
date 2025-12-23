// Zod Validation Schemas
import { z } from 'zod';
import { MAX_FILE_SIZE, MAX_DURATION_DAYS, MIN_UNLOCK_DELAY, MIN_PULSE_INTERVAL, MAX_PULSE_INTERVAL } from './constants';

export const SealSchema = z.object({
  encryptedBlob: z.instanceof(ArrayBuffer).refine(
    (buf) => buf.byteLength <= MAX_FILE_SIZE,
    { message: `File size exceeds ${MAX_FILE_SIZE / 1024}KB` }
  ),
  keyB: z.string().regex(/^[A-Za-z0-9+/=]+$/, 'Key B must be base64').min(32).max(100),
  iv: z.string().regex(/^[A-Za-z0-9+/=]+$/, 'IV must be base64').length(16),
  unlockTime: z.number()
    .int()
    .refine((t) => {
      const now = Date.now();
      return t > now + MIN_UNLOCK_DELAY;
    }, 'Unlock time must be at least 1 minute in future')
    .refine((t) => {
      const now = Date.now();
      return t <= now + MAX_DURATION_DAYS * 24 * 60 * 60 * 1000;
    }, `Cannot exceed ${MAX_DURATION_DAYS} days`),
  isDMS: z.boolean().optional(),
  pulseInterval: z.number()
    .int()
    .min(MIN_PULSE_INTERVAL, 'Pulse interval must be at least 5 minutes')
    .max(MAX_PULSE_INTERVAL, 'Pulse interval cannot exceed 30 days')
    .optional(),
});

export const SealIdSchema = z.string().regex(/^[a-f0-9]{32}$/, 'Invalid seal ID format');

export const PulseTokenSchema = z.string().min(32).max(256);

export const TimestampSchema = z.number().int().min(0).refine(
  (t) => t <= Date.now() + 100 * 365 * 24 * 60 * 60 * 1000,
  'Timestamp too far in future'
);

export type SealInput = z.infer<typeof SealSchema>;
