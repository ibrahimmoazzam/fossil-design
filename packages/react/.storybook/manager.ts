import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events';
import { addons } from 'storybook/manager-api';
import {
  fossilTheme,
  frameProperties,
  onSystemModeChange,
  resolveMode,
  type Mode,
} from './theme.ts';

function setFrameProperties(mode: Mode) {
  for (const [name, value] of Object.entries(frameProperties(mode)))
    document.documentElement.style.setProperty(name, value);
}

addons.setConfig({ theme: fossilTheme(resolveMode('system')) });
setFrameProperties(resolveMode('system'));

// Storybook names itself in every tab title, with no option to change it. The site follows
// ibrahimmoazzam.com instead: "Page | Fossil Design", and the front page says what Fossil is.
const homeTitle = 'Fossil Design: Open-Source Agentic Design System';

function siteTitle(title: string): string {
  if (title === 'Storybook') return homeTitle;
  const page = /^(.*?)(?: - Docs)? ⋅ Storybook$/.exec(title)?.[1];
  if (page === undefined) return title;
  return page === 'Introduction' ? homeTitle : `${page} | Fossil Design`;
}

function renameTab() {
  const title = siteTitle(document.title);
  if (title !== document.title) document.title = title;
}

addons.register('fossil-design/site', (api) => {
  // The toolbar's theme setting recolours Storybook's frame too, not only the page.
  let setting: unknown = 'system';
  const applyTheme = () => {
    const mode = resolveMode(setting);
    api.setOptions({ theme: fossilTheme(mode) });
    setFrameProperties(mode);
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
