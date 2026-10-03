import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'figma-sync',
    include: ['src/**/*.test.ts'],
  },
});
