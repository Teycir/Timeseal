// Memory Protection for Sensitive Keys
// Prevents casual memory inspection of Key A

export class SecureMemory {
  private xorKey: Uint8Array;
  
  constructor() {
    this.xorKey = crypto.getRandomValues(new Uint8Array(32));
  }
  
  protect(data: string): Uint8Array {
    const bytes = new TextEncoder().encode(data);
    const protectedData = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      protectedData[i] = bytes[i] ^ this.xorKey[i % this.xorKey.length];
    }
    return protectedData;
  }
  
  retrieve(protectedData: Uint8Array): string {
    const bytes = new Uint8Array(protectedData.length);
    for (let i = 0; i < protectedData.length; i++) {
      bytes[i] = protectedData[i] ^ this.xorKey[i % this.xorKey.length];
    }
    const result = new TextDecoder().decode(bytes);
    bytes.fill(0);
    return result;
  }
  
  destroy() {
    this.xorKey.fill(0);
  }
}
