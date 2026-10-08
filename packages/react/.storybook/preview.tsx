import type { Preview } from '@storybook/react-vite';
import '@fossil-design/tokens/tokens.css';
import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events';
import { addons } from 'storybook/preview-api';
import { docsComponents } from '../docs-site/headings.tsx';
import { FossilDocsContainer } from './DocsContainer.tsx';

const themes = ['system', 'light', 'dark'] as const;

// tokens.css follows the system unless data-theme picks a side.
function applyTheme(setting: unknown) {
  const theme = themes.find((value) => value === setting) ?? 'system';
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

// A docs page renders no story, so the decorator below never runs for it.
if (addons.hasChannel()) {
  const onGlobals = ({ globals }: { globals: Record<string, unknown> }) => {
    applyTheme(globals.theme);
  };
  addons.getChannel().on(SET_GLOBALS, onGlobals);
  addons.getChannel().on(GLOBALS_UPDATED, onGlobals);
}

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    a11y: { test: 'error' },
    docs: {
      container: FossilDocsContainer,
      components: docsComponents,
      toc: { headingSelector: 'h2' },
    },
    options: {
      storySort: {
        order: [
          'Introduction',
          'Getting Started',
          'Adopt Fossil for Your Brand',
          'Foundations',
          ['Overview', 'Semantic Tokens', 'Primitive Tokens'],
          'Layout',
          'Content',
          'Actions',
          'Navigation',
          'Overlays',
          'Architecture',
          ['Design-to-Code Lifecycle', 'Key Decisions', 'Decision Records'],
          'Research',
          ['Learnings', 'Drift Eval'],
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
      applyTheme(globals.theme);
      return <Story />;
    },
  ],
};

export default preview;
