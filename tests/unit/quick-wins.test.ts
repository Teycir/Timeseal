import { describe, test, expect } from '@jest/globals';
import { SealSchema, SealIdSchema, PulseTokenSchema } from '@/lib/schemas';
import { compress, decompress, shouldCompress } from '@/lib/compression';
import { generateVaultQR } from '@/lib/qrcode';

describe('Zod Schemas', () => {
  test('validates correct seal data', () => {
    const validData = {
      encryptedBlob: new ArrayBuffer(1024),
      keyB: 'a'.repeat(44),
      iv: 'b'.repeat(16),
      unlockTime: Date.now() + 3600000,
    };

    const result = SealSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  test('rejects oversized blob', () => {
    const invalidData = {
      encryptedBlob: new ArrayBuffer(800 * 1024), // > 750KB
      keyB: 'a'.repeat(44),
      iv: 'b'.repeat(16),
      unlockTime: Date.now() + 3600000,
    };

    const result = SealSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  test('rejects past unlock time', () => {
    const invalidData = {
      encryptedBlob: new ArrayBuffer(1024),
      keyB: 'a'.repeat(44),
      iv: 'b'.repeat(16),
      unlockTime: Date.now() - 1000, // Past
    };

    const result = SealSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  test('validates seal ID format', () => {
    expect(SealIdSchema.safeParse('a'.repeat(32)).success).toBe(true);
    expect(SealIdSchema.safeParse('invalid').success).toBe(false);
    expect(SealIdSchema.safeParse('A'.repeat(32)).success).toBe(false); // Uppercase
  });
});

describe('Compression', () => {
  test('compresses and decompresses data', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5]);
    const result = compress(original);
    const decompressed = decompress(result.compressed);

    expect(decompressed).toEqual(original);
  });

  test('achieves compression on repetitive data', () => {
    const repetitive = new Uint8Array(10000).fill(65); // 10KB of 'A'
    const result = compress(repetitive);

    expect(result.compressedSize).toBeLessThan(result.originalSize);
    expect(result.ratio).toBeLessThan(0.1); // > 90% compression
  });

  test('shouldCompress returns false for tiny files', () => {
    expect(shouldCompress(512)).toBe(false); // < 1KB
    expect(shouldCompress(2048)).toBe(true); // > 1KB
  });

  test('handles ArrayBuffer input', () => {
    const buffer = new ArrayBuffer(100);
    const result = compress(buffer);
    expect(result.compressed).toBeInstanceOf(Uint8Array);
  });
});

describe('QR Code Generation', () => {
  test('generates QR code data URL', async () => {
    const vaultLink = 'https://timeseal.dev/v/abc123#keyA';
    const qrCode = await generateVaultQR(vaultLink);

    expect(qrCode).toMatch(/^data:image\/png;base64,/);
    expect(qrCode.length).toBeGreaterThan(100);
  });

  test('respects custom options', async () => {
    const vaultLink = 'https://timeseal.dev/v/abc123#keyA';
    const qrCode = await generateVaultQR(vaultLink, {
      width: 500,
      errorCorrectionLevel: 'L',
    });

    expect(qrCode).toMatch(/^data:image\/png;base64,/);
  });
});
