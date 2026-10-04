import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    // Found up front, so a cold cache in CI doesn't make Vite reload mid-run and fail every test.
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom/client',
      ],
    },
    test: {
      name: 'react',
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            include: ['src/**/*.test.ts'],
          },
        },
        {
          extends: true,
          test: {
            name: 'browser',
            include: ['src/**/*.browser.test.tsx'],
            // Real keyboard and pointer input goes to whichever frame has focus, so files in
            // parallel frames would take each other's keystrokes.
            fileParallelism: false,
            setupFiles: ['.storybook/vitest.setup.ts'],
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              instances: [{ browser: 'chromium', name: 'react-browser' }],
            },
          },
        },
        {
          extends: true,
          plugins: [
            storybookTest({
              configDir: fileURLToPath(new URL('.storybook', import.meta.url)),
            }),
          ],
          test: {
            name: 'storybook',
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              instances: [{ browser: 'chromium', name: 'react-storybook' }],
            },
          },
        },
      ],
    },
  }),
);
