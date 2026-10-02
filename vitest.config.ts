import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/*/vitest.config.ts',
      {
        test: {
          name: 'workspace',
          include: ['tests/**/*.test.ts'],
        },
      },
    ],
  },
});
