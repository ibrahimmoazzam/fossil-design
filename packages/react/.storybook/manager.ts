import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events';
import { addons } from 'storybook/manager-api';
import { fossilTheme, onSystemModeChange, resolveMode } from './theme.ts';

addons.setConfig({ theme: fossilTheme(resolveMode('system')) });

// Storybook names itself in every tab title, with no option to change it. The site follows
// ibrahimmoazzam.com instead: "Page | Fossil Design", and the front page is just the name.
function siteTitle(title: string): string {
  if (title === 'Storybook') return 'Fossil Design';
  const page = /^(.*?)(?: - Docs)? ⋅ Storybook$/.exec(title)?.[1];
  if (page === undefined) return title;
  return page === 'Introduction' ? 'Fossil Design' : `${page} | Fossil Design`;
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
});
