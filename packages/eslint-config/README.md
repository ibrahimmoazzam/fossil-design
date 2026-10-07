# @fossil-design/eslint-config

The shared ESLint config for [Fossil Design](https://github.com/ibrahimmoazzam/fossil-design), an open-source agentic design system. It keeps JSX on-system: layout goes through `Box`, and every disable comment says why. Its partner, [`@fossil-design/stylelint-config`](https://www.npmjs.com/package/@fossil-design/stylelint-config), does the same for stylesheets.

> **Early release.** Versions `0.x` may tighten rules between minor versions. The release notes list each change.

## Install

```sh
npm install --save-dev @fossil-design/eslint-config eslint
```

The config sets rules, not a parser. A TypeScript app already has one from `typescript-eslint`:

```js
// eslint.config.js
import fossil from '@fossil-design/eslint-config';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(tseslint.configs.recommended, fossil);
```

## What it checks

- **Layout through `Box`.** A raw `<div>`, `<section>`, `<nav>` or any other element `Box` renders is an error: use `<Box as="nav">`, whose props take Fossil's tokens. Text, links, buttons and media have their own components and aren't affected. Member expressions such as `<motion.div>` pass.
- **Disable comments explain themselves.** Each needs a reason after `--`, and one that disables nothing is an error.

```tsx
return (
  // eslint-disable-next-line no-restricted-syntax -- the map library measures this element itself
  <div ref={mapRef} />
);
```

## Options

```js
// eslint.config.js
import { fossil } from '@fossil-design/eslint-config';

export default [...fossil({ layoutElements: 'warn', deprecations: true })];
```

- **`layoutElements`**: `'error'` (the default) or `'warn'`, for an app still moving onto Fossil.
- **`deprecations`**: adds `@typescript-eslint/no-deprecated`, which flags deprecated Fossil components and props. It needs type information, so register typescript-eslint's typed linting first, for example with `tseslint.configs.recommendedTypeChecked`. Its `strictTypeChecked` preset already includes the rule.
- **`files`**: the files the layout rule applies to. Defaults to every `.jsx` and `.tsx` file.

The layout rule is ESLint's `no-restricted-syntax`. If your config sets that rule too, the later setting replaces the earlier one, so add Fossil's entries to yours:

```js
import { layoutElementRestrictions } from '@fossil-design/eslint-config';

const rules = {
  'no-restricted-syntax': ['error', ...layoutElementRestrictions, yourEntry],
};
```

## Escapes

Fossil has three levels of escape, so deviation stays visible rather than impossible:

1. **Sanctioned:** `Box`'s narrow `style` prop, for layout tokens can't express, such as `gridTemplateAreas` or `aspectRatio`. No comment needed.
2. **Logged:** a disable comment with a reason, like the one above. A margin other than `0` always needs one.
3. **Signal:** three disables for the same need suggest something Fossil is missing. Open a [gap](https://github.com/ibrahimmoazzam/fossil-design/issues/new?template=gap.yml) on the Fossil repository.

## License

MIT © 2026 Ibrahim Moazzam. See [LICENSE](./LICENSE).
