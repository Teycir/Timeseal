// Storage Abstraction Layer
const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024;

export interface StorageProvider {
  uploadBlob(sealId: string, data: ArrayBuffer, unlockTime: number): Promise<void>;
  downloadBlob(sealId: string): Promise<ArrayBuffer>;
  deleteBlob(sealId: string): Promise<void>;
}

// Production R2 Storage
export class R2Storage implements StorageProvider {
  constructor(private bucket: R2Bucket) {}

  async uploadBlob(sealId: string, data: ArrayBuffer, unlockTime: number): Promise<void> {
    // Enforce size limit at R2 level
    if (data.byteLength > MAX_UPLOAD_SIZE) {
      throw new Error(`File exceeds maximum size of ${MAX_UPLOAD_SIZE / 1024 / 1024}MB`);
    }
    
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
    // Enforce size limit in mock storage too
    if (data.byteLength > MAX_UPLOAD_SIZE) {
      throw new Error(`File exceeds maximum size of ${MAX_UPLOAD_SIZE / 1024 / 1024}MB`);
    }
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
