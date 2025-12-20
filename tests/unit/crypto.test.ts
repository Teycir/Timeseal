import { describe, it, expect } from '@jest/globals';
import { generateKeys, encryptData, decryptData } from '../../lib/crypto';

describe('Time-Seal Crypto Engine', () => {

    it('should generate two distinct keys (Split-Key Architecture)', async () => {
        const { keyA, keyB } = await generateKeys();

        expect(keyA).toBeDefined();
        expect(keyB).toBeDefined();
        // Export to compare
        const rawA = await crypto.subtle.exportKey('raw', keyA);
        const rawB = await crypto.subtle.exportKey('raw', keyB);

        const arrA = new Uint8Array(rawA);
        const arrB = new Uint8Array(rawB);

        // Should not be identical
        expect(arrA).not.toEqual(arrB);
    });

    it('should encrypt and decrypt a message correctly', async () => {
        const secretMessage = "The crow flies at midnight.";

        // 1. Encrypt
        const result = await encryptData(secretMessage);

        expect(result.keyA).toBeDefined();
        expect(result.keyB).toBeDefined();
        expect(result.iv).toBeDefined();
        expect(result.encryptedBlob.byteLength).toBeGreaterThan(0);

        // 2. Decrypt
        const decryptedBuffer = await decryptData(result.encryptedBlob, {
            keyA: result.keyA,
            keyB: result.keyB,
            iv: result.iv
        });

        const decryptedMessage = new TextDecoder().decode(decryptedBuffer);
        expect(decryptedMessage).toBe(secretMessage);
    });

    it('should FAIL to decrypt if Key A is wrong', async () => {
        const secret = "Top Secret";
        const result = await encryptData(secret);

        // Generate a random fake Key A
        const { keyA: fakeKeyAObj } = await generateKeys();
        const fakeKeyABuffer = await crypto.subtle.exportKey('raw', fakeKeyAObj);

        // Helper to convert buffer to base64 (same as in lib)
        const fakeKeyA = btoa(String.fromCharCode(...new Uint8Array(fakeKeyABuffer)));

        // Attempt decrypt with wrong key
        await expect(decryptData(result.encryptedBlob, {
            keyA: fakeKeyA,
            keyB: result.keyB,
            iv: result.iv
        })).rejects.toThrow();
        // Note: WebCrypto usually throws an OperationError on tag mismatch (GCM)
    });

    it('should FAIL to decrypt if Key B is wrong', async () => {
        const secret = "Top Secret";
        const result = await encryptData(secret);

        // Generate a random fake Key B
        const { keyB: fakeKeyBObj } = await generateKeys();
        const fakeKeyBBuffer = await crypto.subtle.exportKey('raw', fakeKeyBObj);
        const fakeKeyB = btoa(String.fromCharCode(...new Uint8Array(fakeKeyBBuffer)));

        await expect(decryptData(result.encryptedBlob, {
            keyA: result.keyA,
            keyB: fakeKeyB,
            iv: result.iv
        })).rejects.toThrow();
    });
});
