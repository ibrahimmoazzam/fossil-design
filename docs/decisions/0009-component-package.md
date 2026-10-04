# 0009. The component package

- **Status:** Accepted
- **Date:** 2026-10-04

## Context

Phase 4 of the PRD builds `@fossil-design/react`: `Box`, the v1 components, and a precompiled build any React app can use without CSS tooling of its own. The PRD fixes the broad choices, from the dry run ([`Learnings.md`](../Learnings.md), section 5):

- CSS Modules with strict class-name types from `vite-css-modules`;
- a variant map exported by each component;
- `Box` with token-typed responsive props and CSS generated from `tokens.json`;
- Vite library mode with `preserveModules`;
- Storybook stories, a11y checks and real-input browser tests.

This record covers what the PRD left open when the foundation was built: `Box`, `Stack`, `Text`, the build and the test setup.

## Options

1. **How `Box` applies responsive props.**
   - Inline styles. They can't hold media queries.
   - Custom properties per breakpoint, resolved by one rule. Every `Box` pays for every prop.
   - **One generated class per prop, value and breakpoint,** written in cascade order: base classes first, then each breakpoint from narrowest to widest.
2. **`padding` against `paddingBlock` and `paddingInline`.**
   - Classes for both, left to the cascade. A shorthand class at a wider breakpoint would beat a longhand class at a narrower one in ways a reader can't predict from the props.
   - **Resolve to the longhands in JavaScript.** The CSS has only `padding-block` and `padding-inline`. At one breakpoint the longhand wins; across breakpoints the wider one wins, as everywhere else.
3. **Which fills `surface` offers.**
   - Any background with any text colour.
   - **Only pairs the token build checks for contrast.** The generator reads each text token's `contrast.against` in `tokens.json` and fails if a surface pairs it with a fill it isn't checked against.
4. **Refs on React 18.3 and 19.**
   - `ref` as a prop. React 18 doesn't pass it to function components.
   - **`forwardRef`,** which both versions support. Each component sets `displayName`.
5. **Heading styles.**
   - A heading style picks its element. The outline would follow the look.
   - **A heading style requires `as`,** checked by the types: `<Text variant="heading-s">` without an element doesn't compile.
6. **Declarations.**
   - A Vite declaration plugin.
   - **`tsc` with `emitDeclarationOnly`,** from a build config that excludes stories and tests. Relative imports carry `.js`, so the output resolves under Node16.

## Decision

**Source.** Each component has a folder: `Component.tsx`, `Component.module.css` and `Component.stories.tsx`. Its variant map is an exported constant, and its prop types derive from it. `Box`'s map lives in `variants.ts`, which has no imports so the generator can read it.

**`Box`.**

- **Elements:** a closed list of layout elements, from `div` to `figure`. Text, links, buttons and media have components of their own.
- **Layout props:** `padding`, `paddingBlock`, `paddingInline` and `gap` take `space` token keys. `display`, `flexDirection`, `alignItems` and `justifyContent` take keywords.
- **Responsive values:** each layout prop takes one value, or `{ base, tablet, compact, large, max }`, with `base` as mobile.
- **Fill and corners:** `surface` is one of `page`, `surface`, `accent` and `highlight`. `radius` takes `radius` keys.
- **Escape hatch:** `style` accepts only `gridTemplateAreas`, `gridTemplateColumns`, `aspectRatio` and `transform`.
- **Reset:** a base class sets `box-sizing: border-box` and zeroes the element's own margin and padding, so `ul` and `figure` start clean.

`scripts/generate.ts` writes `src/generated/box.module.css` from `tokenKeys`, `mediaQueries` and `tokens.json`, using semantic tokens only. `responsiveClasses` takes the generated class map typed with every key a prop needs, so a value without a class is a type error.

**`Stack`** is `Box` with flex on, `direction` (`row` or `column`, default `column`), `gap`, `align` and `justify`. **`Text`** has one variant per text token, each setting all five parts of the style, plus a `tone`. With no tone it inherits, so a surface's paired colour reaches it.

**Types.** `vite-css-modules` writes `.module.css.d.ts` beside each module, in default-export mode, before every type-check and build. The files are not committed. The package's `tsconfig.json` uses `moduleResolution: "bundler"`, because `NodeNext` doesn't find them.

**Build.**

- `vite build` in library mode, with `preserveModules` rooted at `src`. React and React DOM stay external, as peers at `^18.3 || ^19`.
- `src/index.ts` imports `@fossil-design/tokens/tokens.css` first, so `dist/style.css` opens with the tokens and needs nothing else.
- Class names are `<cssPrefix>-[local]-[hash]`, with the prefix from `fossil.config.json`.
- Output is not minified. Consumers minify anyway, and skipping Lightning CSS keeps it from adding `--lightningcss-*` variables.
- A small plugin emits `style.css.d.ts`. TypeScript 6 checks side-effect imports, so `import '@fossil-design/react/style.css'` needs it.
- `exports` lists `.` and `./style.css`, each with types.

**Checks.**

- `pnpm check:packages` packs every published package with `pnpm pack`, which rewrites `workspace:` ranges as a release does, then runs `publint --strict` and `attw --profile esm-only` on each tarball. CI runs it after the build.
- Storybook 10.6 runs with `addon-a11y` at `test: 'error'` and `addon-vitest`. The Vitest plugin injects the project annotations, so no setup file is needed.
- `packages/react/vitest.config.ts` nests a `unit` project (Node) and a `storybook` project (Chromium through Playwright, instance `react-storybook`). From the root they run as `react (unit)` and `react (storybook)`.
- Play functions on layout components check computed styles against the token values. Every story runs axe, and the colour stories run again with the dark theme.
- The real-input project arrives with the first component that relies on native behaviour.

## Consequences

- `box.module.css` is about 1,000 lines, and `style.css` 42 KB unminified, 7.6 KB gzipped.
- Adding a `space` or `radius` token adds `Box` classes on the next build. A new text token fails a unit test until `Text` gains the variant.
- `Responsive` names mobile `base`. The breakpoint names come from the tokens, so a fork that renames breakpoints renames the keys.
- pnpm 12 blocks dependency build scripts. esbuild's, which only checks its platform binary, is denied in `pnpm-workspace.yaml`; esbuild runs from its optional platform package without it.
