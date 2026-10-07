import type { StorybookConfig } from '@storybook/react-vite';
import { docgenOptions } from '../scripts/docgen.ts';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../docs-site/**/*.mdx', '../src/**/*.stories.tsx'],
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-vitest',
    '@storybook/addon-mcp',
  ],
  core: { disableTelemetry: true },
  // The manifest is what Storybook MCP's docs tools serve. The default react-docgen drops
  // Button's variants and every Box layout prop; react-docgen-typescript keeps them.
  features: { componentsManifest: true },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: docgenOptions,
  },
};

export default config;
