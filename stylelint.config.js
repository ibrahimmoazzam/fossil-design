import { fossil } from '@fossil-design/stylelint-config';

/**
 * Fossil lints its own stylesheets with the config it publishes, so consumers get a tested path.
 * @type {import('stylelint').Config}
 */
const config = {
  ...fossil(),
  ignoreFiles: [
    '**/dist/**',
    '**/storybook-static/**',
    '**/coverage/**',
    // Deliberately off-system: tests/off-system.test.ts and the smoke test lint it and expect errors.
    'smoke/off-system/**',
  ],
};

export default config;
