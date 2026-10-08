import {
  DocsContainer,
  type DocsContainerProps,
} from '@storybook/addon-docs/blocks';
import { useSyncExternalStore, type PropsWithChildren } from 'react';
import { fossilTheme, onSystemModeChange, resolveMode } from './theme.ts';

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  const stopSystem = onSystemModeChange(onChange);
  return () => {
    observer.disconnect();
    stopSystem();
  };
}

const pageMode = () => resolveMode(document.documentElement.dataset.theme);

/** Storybook's docs container, themed to match the page: the toolbar's choice, or the system's. */
export function FossilDocsContainer(
  props: PropsWithChildren<DocsContainerProps>,
) {
  const mode = useSyncExternalStore(subscribe, pageMode);
  return <DocsContainer {...props} theme={fossilTheme(mode)} />;
}
