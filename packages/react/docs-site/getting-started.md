# Getting Started

Use {{name}}'s components in a React app, keep the app on-system with the lint configs, and give your coding agent the docs for the version you installed. Each package's page on npm has the details.

To make a design system of your own from this one, with your brand and your own Figma files, follow [Adopt Fossil](?path=/docs/adopt-fossil--docs) instead.

## 1. Install the components

```sh
npm install {{scope}}/react
```

[React](https://react.dev/) 18.3 or 19 is a peer dependency. Import the stylesheet once, at your app's root. It already holds the token values, so the app needs no CSS tooling of its own:

```js
import '{{scope}}/react/style.css';
```

{{name}} ships no fonts. Its text styles name {{fonts}}: load them, or point the font tokens at your own faces.

## 2. Build with them

Layout goes through [`Box`](?path=/docs/layout-box--docs) and [`Stack`](?path=/docs/layout-stack--docs), whose props take token keys rather than raw values. [Text](?path=/docs/content-text--docs), [links](?path=/docs/actions-link--docs), [buttons](?path=/docs/actions-button--docs) and media, such as [`Figure`](?path=/docs/content-figure--docs), have their own components.

```tsx
import { Box, Stack, Text } from '{{scope}}/react';

export function Note() {
  return (
    <Box
      as="article"
      surface="surface"
      padding={{ default: 'm', tablet: 'l' }}
      radius="surface"
    >
      <Stack gap="xs">
        <Text as="h2" variant="heading-s">
          Release notes
        </Text>
        <Text tone="muted">Spacing, colour and type all come from tokens.</Text>
      </Stack>
    </Box>
  );
}
```

Your own stylesheets use the semantic tokens as custom properties, such as `var(--{{prefix}}-space-m)`. [Foundations](?path=/docs/foundations-overview--docs) lists them.

## 3. Add the lint configs

The [ESLint config](https://www.npmjs.com/package/{{scope}}/eslint-config) rejects raw layout elements such as `<div>`. The [Stylelint config](https://www.npmjs.com/package/{{scope}}/stylelint-config) allows only semantic tokens. Both ask every disable comment for a reason.

```sh
npm install --save-dev {{scope}}/eslint-config eslint {{scope}}/stylelint-config stylelint
```

```js
// eslint.config.js
import fossil from '{{scope}}/eslint-config';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(tseslint.configs.recommended, fossil);
```

```js
// stylelint.config.js
export { default } from '{{scope}}/stylelint-config';
```

## 4. Point your coding agent at the docs

The package carries its own docs, so an agent reads the version you installed rather than its training data. From your app's root:

```sh
npx {{prefix}}-agents-md
```

It writes {{name}}'s rules, the token scales and the component index into your [`AGENTS.md`](https://agents.md/), and adds `@AGENTS.md` to your [`CLAUDE.md`](https://code.claude.com/docs/en/memory) if you have one. Run it again after upgrading. In CI, `npx {{prefix}}-agents-md --check` fails when the block is out of date.

## Packages

- [`{{scope}}/react`](https://www.npmjs.com/package/{{scope}}/react): the components, their stylesheet and the bundled docs.
- [`{{scope}}/tokens`](https://www.npmjs.com/package/{{scope}}/tokens): the token values as CSS, JSON and TypeScript.
- [`{{scope}}/eslint-config`](https://www.npmjs.com/package/{{scope}}/eslint-config): keeps JSX on-system.
- [`{{scope}}/stylelint-config`](https://www.npmjs.com/package/{{scope}}/stylelint-config): keeps CSS on-system.
