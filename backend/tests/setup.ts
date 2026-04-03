// Test setup file
import { beforeAll, afterAll } from 'vitest';

beforeAll(() => {
  // Global test setup
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/bitcoinplace_test';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
});

afterAll(() => {
  // Global test cleanup
});
