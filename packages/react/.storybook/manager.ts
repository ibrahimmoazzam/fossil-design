import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events';
import { addons } from 'storybook/manager-api';
import {
  siteTheme,
  frameProperties,
  onSystemModeChange,
  resolveMode,
  type Mode,
} from './theme.ts';
import brand from '../../../brand.config.json' with { type: 'json' };
import { siteTitle } from '../docs-site/meta.ts';

function setFrameProperties(mode: Mode) {
  for (const [name, value] of Object.entries(frameProperties(mode)))
    document.documentElement.style.setProperty(name, value);
}

addons.setConfig({ theme: siteTheme(resolveMode('system')) });
setFrameProperties(resolveMode('system'));

// Storybook names itself in every tab title, with no option to change it. The site follows
// ibrahimmoazzam.com instead: "Page | Fossil Design", and the front page says what Fossil is.
// A fork's pages take its name from brand.config.json; the front page's title is siteTitle,
// which scripts/site-meta.ts also writes into the built page, for the scrapers that read it.
function tabTitle(title: string): string {
  if (title === 'Storybook') return siteTitle;
  const page = /^(.*?)(?: - Docs)? ⋅ Storybook$/.exec(title)?.[1];
  if (page === undefined) return title;
  return page === 'Introduction' ? siteTitle : `${page} | ${brand.name}`;
}

function renameTab() {
  const title = tabTitle(document.title);
  if (title !== document.title) document.title = title;
}

addons.register(`${brand.cssPrefix}/site`, (api) => {
  // The toolbar's theme setting recolours Storybook's frame too, not only the page.
  let setting: unknown = 'system';
  const applyTheme = () => {
    const mode = resolveMode(setting);
    api.setOptions({ theme: siteTheme(mode) });
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
