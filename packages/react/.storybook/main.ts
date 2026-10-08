import type { StorybookConfig } from '@storybook/react-vite';
import { docgenOptions } from '../scripts/docgen.ts';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../docs-site/**/*.mdx', '../src/**/*.stories.tsx'],
  // The reference brand's icons: Storybook serves favicon.svg from here as the site's favicon.
  staticDirs: ['../docs-site/public'],
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-vitest',
    '@storybook/addon-mcp',
  ],
  core: { disableTelemetry: true },
  // The manifest is what Storybook MCP's docs tools serve. The default react-docgen drops
  // Button's variants and every Box layout prop; react-docgen-typescript keeps them.
  features: {
    componentsManifest: true,
    // The theme menu recolours the canvas from the tokens; Backgrounds and its grid would bypass them.
    backgrounds: false,
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: docgenOptions,
  },
};

export default config;
