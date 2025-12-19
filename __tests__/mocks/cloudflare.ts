export const mockD1Database = {
  prepare: jest.fn().mockReturnThis(),
  bind: jest.fn().mockReturnThis(),
  first: jest.fn(),
  run: jest.fn(),
  all: jest.fn(),
};

export const mockR2Bucket = {
  put: jest.fn().mockResolvedValue({ key: 'test-key' }),
  get: jest.fn(),
  delete: jest.fn(),
  head: jest.fn(),
};

export const mockEnv = {
  DB: mockD1Database,
  BUCKET: mockR2Bucket,
  ENCRYPTION_KEY: 'test-encryption-key',
};

export const createMockRequest = (url: string, options: RequestInit = {}) => {
  return new Request(url, {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body,
  });
};

export const createMockResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};
