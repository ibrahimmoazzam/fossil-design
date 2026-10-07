import type { Preview } from '@storybook/react-vite';
import '@fossil-design/tokens/tokens.css';
import { fossilTheme, systemMode } from './theme.ts';

const themes = ['system', 'light', 'dark'] as const;

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    a11y: { test: 'error' },
    docs: { theme: fossilTheme(systemMode()), toc: { headingSelector: 'h2' } },
    options: {
      storySort: {
        order: [
          'Introduction',
          'Getting started',
          'Foundations',
          ['Overview', 'Tokens'],
          'Layout',
          'Content',
          'Actions',
          'Navigation',
          'Overlays',
          'Architecture',
          'Research',
          ['Learnings', 'Drift eval'],
        ],
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Colour scheme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: themes.map((value) => ({
          value,
          title: value.charAt(0).toUpperCase() + value.slice(1),
        })),
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'system' },
  decorators: [
    (Story, { globals }) => {
      const theme = themes.find((value) => value === globals.theme) ?? 'system';
      // tokens.css follows the system unless data-theme picks a side.
      if (theme === 'system') delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = theme;
      return <Story />;
    },
  ],
};

export default preview;
