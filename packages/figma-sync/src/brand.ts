import config from '../../../brand.config.json' with { type: 'json' };

/**
 * The namespace stamped on every variable, style, page and component the sync writes, and the key
 * a script tags its result with. It is the brand's CSS prefix, so a fork's Figma file carries the
 * fork's name rather than Fossil's. It reaches the scripts through each spec's `ns`, because
 * `script()` emits only the functions its entry point reaches.
 * [ADR 0020](../../../docs/decisions/0020-what-a-fork-renames.md).
 */
export const NS: string = config.cssPrefix;
