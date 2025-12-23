// Compression utilities using pako
import pako from 'pako';
import { MAX_DECOMPRESSED_SIZE } from './constants';

export interface CompressionResult {
  compressed: Uint8Array;
  originalSize: number;
  compressedSize: number;
  ratio: number;
}

export function compress(data: ArrayBuffer | Uint8Array): CompressionResult {
  const input = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  const compressed = pako.deflate(input, { level: 9 }); // Max compression
  
  return {
    compressed,
    originalSize: input.byteLength,
    compressedSize: compressed.byteLength,
    ratio: compressed.byteLength / input.byteLength,
  };
}

export function decompress(data: Uint8Array, maxSize: number = MAX_DECOMPRESSED_SIZE): Uint8Array {
  const decompressed = pako.inflate(data);
  
  // Zip bomb protection
  if (decompressed.byteLength > maxSize) {
    throw new Error(`Decompressed size (${decompressed.byteLength}) exceeds maximum (${maxSize})`);
  }
  
  return decompressed;
}

export function shouldCompress(size: number): boolean {
  // Only compress if > 1KB (compression overhead not worth it for tiny files)
  return size > 1024;
}
