import { describe, it, expect, beforeEach } from '@jest/globals';
import { MockStorage } from '../../lib/storage';

describe('Storage', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it('should upload and download blob', async () => {
    const sealId = 'test-seal-1';
    const data = new TextEncoder().encode('secret data');
    const unlockTime = Date.now() + 10000;

    await storage.uploadBlob(sealId, data.buffer, unlockTime);
    const retrieved = await storage.downloadBlob(sealId);

    expect(new Uint8Array(retrieved)).toEqual(data);
  });

  it('should throw error for non-existent blob', async () => {
    await expect(
      storage.downloadBlob('non-existent')
    ).rejects.toThrow('Blob not found');
  });

  it('should delete blob', async () => {
    const sealId = 'test-seal-2';
    const data = new TextEncoder().encode('data');

    await storage.uploadBlob(sealId, data.buffer, Date.now());
    await storage.deleteBlob(sealId);

    await expect(
      storage.downloadBlob(sealId)
    ).rejects.toThrow('Blob not found');
  });

  it('should handle multiple blobs', async () => {
    const data1 = new TextEncoder().encode('data1');
    const data2 = new TextEncoder().encode('data2');

    await storage.uploadBlob('seal-1', data1.buffer, Date.now());
    await storage.uploadBlob('seal-2', data2.buffer, Date.now());

    const retrieved1 = await storage.downloadBlob('seal-1');
    const retrieved2 = await storage.downloadBlob('seal-2');

    expect(new TextDecoder().decode(retrieved1)).toBe('data1');
    expect(new TextDecoder().decode(retrieved2)).toBe('data2');
  });
});
