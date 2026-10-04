import { fossil } from '@fossil-design/stylelint-config';

/**
 * Fossil lints its own stylesheets with the config it publishes, so consumers get a tested path.
 * @type {import('stylelint').Config}
 */
const config = {
  ...fossil(),
  ignoreFiles: ['**/dist/**', '**/storybook-static/**', '**/coverage/**'],
};

export default config;
