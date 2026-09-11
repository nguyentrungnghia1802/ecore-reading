import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/performance/**/*.benchmark.ts'],
    reporters: ['verbose'],
    testTimeout: 60_000,
  },
});
