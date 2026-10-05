# @fossil-design/tokens

Design tokens for [Fossil Design](https://github.com/ibrahimmoazzam/fossil-design), an open-source design system for agentic coding: CSS custom properties for light and dark mode, metadata for tools and agents, and typed keys for component props.

> **Early release.** Versions `0.x` may rename tokens between minor versions while the taxonomy settles. Renames keep a deprecated alias first, and the release notes list each one.

## Install

```sh
npm install @fossil-design/tokens
```

## Use the custom properties

Import the stylesheet once, then style with the semantic tokens:

```js
import '@fossil-design/tokens/tokens.css';
```

```css
.card {
  padding: var(--fossil-space-m);
  border-radius: var(--fossil-radius-surface);
  background: var(--fossil-color-background-surface);
  color: var(--fossil-color-text-default);
}
```

- **Semantic tokens only.** Primitive tokens such as `--fossil-base-color-gray-600` hold the raw values that semantic tokens alias. Style with the semantic ones, so a change to a primitive restyles everything built on it.
- **Dark mode is built in.** It follows the system's setting. Set `data-theme="light"` or `data-theme="dark"` on `<html>` to choose one.
- **A text style is five properties.** Set all five; the `font` shorthand drops letter-spacing.

  ```css
  .title {
    font-family: var(--fossil-text-heading-s-font-family);
    font-size: var(--fossil-text-heading-s-font-size);
    font-weight: var(--fossil-text-heading-s-font-weight);
    letter-spacing: var(--fossil-text-heading-s-letter-spacing);
    line-height: var(--fossil-text-heading-s-line-height);
  }
  ```

- **No fonts are included.** The font tokens name Space Grotesk, Space Mono and Figtree, which are on Google Fonts. Load them in your app, or point `--fossil-font-family-heading`, `-body` and `-mono` at your own faces.

## Use the tokens in TypeScript

```ts
import { mediaQueries, tokenKeys, type TokenKey } from '@fossil-design/tokens';

type Gap = TokenKey<'space'>; // '2xs' | 'xs' | 's' | 'm' | 'l' | 'xl' | '2xl' | '3xl'

const isTablet = window.matchMedia(mediaQueries.tablet).matches;
```

Custom properties can't be used in media queries, so the breakpoints are also exported as values and media query strings.

The JSON files come typed: `import tokens from '@fossil-design/tokens/tokens.json' with { type: 'json' }` is a `TokensFile`.

## What's inside

| Import                              | Contents                                                                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `@fossil-design/tokens/tokens.css`  | Every token as a custom property, with dark values                                                                                |
| `@fossil-design/tokens/tokens.json` | Each token's custom property, resolved value, alias, dark value, description and deprecation, keyed by path                       |
| `@fossil-design/tokens/lint.json`   | The primitive and deprecated custom properties, for `@fossil-design/stylelint-config`                                             |
| `@fossil-design/tokens`             | `tokenKeys`, `breakpoints` and `mediaQueries`, and the types `TokenKey`, `TokenGroup`, `Breakpoint`, `TokensFile` and `LintLists` |

The token source is DTCG 2025.10 JSON in the [repository](https://github.com/ibrahimmoazzam/fossil-design/tree/main/packages/tokens/src), built with Style Dictionary.

## License

MIT © 2026 Ibrahim Moazzam. See [LICENSE](./LICENSE).
