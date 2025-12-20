// Jest setup file
global.crypto = require('crypto').webcrypto;

// Set test environment variables
process.env.MASTER_ENCRYPTION_KEY = 'test-master-key-for-testing-only-32-bytes';
process.env.NODE_ENV = 'test';
