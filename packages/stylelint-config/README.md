# @fossil-design/stylelint-config

The shared Stylelint config for [Fossil Design](https://github.com/ibrahimmoazzam/fossil-design), an open-source design system for agentic coding. It keeps stylesheets on-system: semantic tokens instead of raw values, and padding and `gap` instead of margins.

> **Early release.** Versions `0.x` may tighten rules between minor versions. The release notes list each change.

## Install

```sh
npm install --save-dev @fossil-design/stylelint-config stylelint
```

```js
// stylelint.config.js
export { default } from '@fossil-design/stylelint-config';
```

## What it checks

- **Tokens, not raw values.** Colour, fill, stroke, padding, gap, radius, font family, size and weight, letter-spacing, line-height and durations take a custom property, including inside shorthands such as `border` and `transition`. Plain keywords such as `inherit`, `transparent`, `currentColor`, `none` and `0` are fine.
- **Custom properties that exist.** Every `var()` names a Fossil token, one of your site tokens, or a property declared in the same stylesheet. A `var()` with a fallback, such as `var(--card-gap, var(--fossil-space-m))`, is a knob and passes.
- **Semantic tokens only.** Primitive tokens such as `--fossil-base-color-gray-600` are rejected, and so is a raw colour anywhere, local custom properties and shadows included. A deprecated token is rejected with its replacement named.
- **No margins** except `0`.
- **Disable comments explain themselves.** Each needs a reason after `--`, must disable something, and must name a real rule.

```css
.hero {
  /* stylelint-disable-next-line declaration-property-value-allowed-list -- centres the page column */
  margin-inline: auto;
}
```

## Site tokens

An app with tokens of its own, such as a brand colour Fossil doesn't have, names their files:

```js
// stylelint.config.js
import { fossil } from '@fossil-design/stylelint-config';

export default fossil({ siteTokens: ['src/styles/site-tokens.css'] });
```

Their custom properties count as known everywhere. Inside those files, and only there, a token may alias a Fossil primitive or hold a raw value:

```css
/* src/styles/site-tokens.css */
:root {
  --site-color-brand: var(--fossil-base-color-azure-600);
  --site-color-coffee: #6f4e37;
}
```

Paths resolve from the working directory; pass `root` to resolve them from elsewhere.

## License

MIT © 2026 Ibrahim Moazzam. See [LICENSE](./LICENSE).
