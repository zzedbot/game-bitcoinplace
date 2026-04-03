import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      threshold: {
        lines: 85,
        branches: 80,
        functions: 85,
        statements: 85
      },
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/types/**']
    },
    setupFiles: ['./tests/setup.ts']
  }
});
