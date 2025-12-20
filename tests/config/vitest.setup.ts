import { vi, expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

// Polyfill for TextEncoder/TextDecoder in jsdom
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Web Crypto API Polyfill (Node.js 19+ has global crypto, but good to be safe)
import { webcrypto } from 'crypto';
if (!global.crypto) {
    global.crypto = webcrypto as any;
}

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();
