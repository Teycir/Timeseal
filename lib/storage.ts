// Storage Abstraction Layer
export interface StorageProvider {
  uploadBlob(sealId: string, data: ArrayBuffer, unlockTime: number): Promise<void>;
  downloadBlob(sealId: string): Promise<ArrayBuffer>;
  deleteBlob(sealId: string): Promise<void>;
}

// Production R2 Storage
export class R2Storage implements StorageProvider {
  constructor(private bucket: R2Bucket) {}

  async uploadBlob(sealId: string, data: ArrayBuffer, unlockTime: number): Promise<void> {
    const retentionUntil = new Date(unlockTime);
    
    await this.bucket.put(sealId, data, {
      httpMetadata: {
        contentType: 'application/octet-stream',
        cacheControl: 'no-cache',
      },
      customMetadata: {
        unlockTime: unlockTime.toString(),
        retentionUntil: retentionUntil.toISOString(),
        sealId: sealId,
      },
      retention: {
        mode: 'COMPLIANCE',
        retainUntilDate: retentionUntil,
      },
    });
  }

  async downloadBlob(sealId: string): Promise<ArrayBuffer> {
    const object = await this.bucket.get(sealId);
    if (!object) throw new Error('Blob not found');
    return await object.arrayBuffer();
  }

  async deleteBlob(sealId: string): Promise<void> {
    await this.bucket.delete(sealId);
  }
}

// Mock Storage for Development
export class MockStorage implements StorageProvider {
  private storage = new Map<string, ArrayBuffer>();

  async uploadBlob(sealId: string, data: ArrayBuffer, unlockTime: number): Promise<void> {
    this.storage.set(sealId, data);
  }

  async downloadBlob(sealId: string): Promise<ArrayBuffer> {
    const data = this.storage.get(sealId);
    if (!data) throw new Error('Blob not found');
    return data;
  }

  async deleteBlob(sealId: string): Promise<void> {
    this.storage.delete(sealId);
  }
}

// Factory function
export function createStorage(env?: { BUCKET?: R2Bucket }): StorageProvider {
  if (process.env.NODE_ENV === 'production' && env?.BUCKET) {
    return new R2Storage(env.BUCKET);
  }
  return new MockStorage();
}
