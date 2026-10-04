import type { Preview } from '@storybook/react-vite';
import '@fossil-design/tokens/tokens.css';

const themes = ['system', 'light', 'dark'] as const;

const preview: Preview = {
  parameters: {
    a11y: { test: 'error' },
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
