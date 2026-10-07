import { createElement } from 'react';
import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events';
import { Button } from 'storybook/internal/components';
import { addons, types } from 'storybook/manager-api';
import { fossilTheme, onSystemModeChange, repo, resolveMode } from './theme.ts';

addons.setConfig({ theme: fossilTheme(resolveMode('system')) });

// Storybook names itself in every tab title, with no option to change it.
function siteTitle(title: string): string {
  return title
    .replace(/ - Docs(?= ⋅ Storybook$)/, '')
    .replace(/⋅ Storybook$/, '⋅ Fossil Design')
    .replace(/^Storybook$/, 'Fossil Design');
}

function renameTab() {
  const title = siteTitle(document.title);
  if (title !== document.title) document.title = title;
}

addons.register('fossil-design/site', (api) => {
  // The toolbar's theme setting recolours Storybook's frame too, not only the page.
  let setting: unknown = 'system';
  const applyTheme = () => {
    api.setOptions({ theme: fossilTheme(resolveMode(setting)) });
  };
  const onGlobals = ({ globals }: { globals: Record<string, unknown> }) => {
    setting = globals.theme;
    applyTheme();
  };
  api.on(SET_GLOBALS, onGlobals);
  api.on(GLOBALS_UPDATED, onGlobals);
  onSystemModeChange(applyTheme);

  renameTab();
  new MutationObserver(renameTab).observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  addons.add('fossil-design/github', {
    type: types.TOOL,
    title: 'GitHub',
    match: () => true,
    // Storybook builds this file without the automatic JSX runtime.
    render: () =>
      createElement(
        Button,
        { asChild: true, variant: 'ghost', padding: 'small', ariaLabel: false },
        createElement('a', { href: repo }, 'GitHub'),
      ),
  });
});
