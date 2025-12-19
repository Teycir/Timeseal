import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock Web Crypto API
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      generateKey: jest.fn(),
      exportKey: jest.fn(),
      importKey: jest.fn(),
    },
    getRandomValues: (arr: any) => require('crypto').randomBytes(arr.length),
  },
});
