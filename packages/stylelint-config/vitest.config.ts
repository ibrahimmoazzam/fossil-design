import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'stylelint-config',
    include: ['test/**/*.test.ts'],
  },
});
