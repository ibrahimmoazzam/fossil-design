# @fossil-design/react

Fossil's React components. This file covers working on them; the root `AGENTS.md` holds the repo rules and the token foundations. ADR 0009 explains the package's design, and ADR 0008 the Stylelint config its stylesheets pass.

## Commands

```sh
pnpm --filter react generate      # Box's CSS, the icons and every .module.css.d.ts
pnpm --filter react build         # generate, vite build, then tsc for the declarations
pnpm --filter react typecheck     # generate, then tsc
pnpm --filter react storybook     # Storybook at localhost:6006
pnpm test --project 'react*'      # unit tests, real-input tests, then every story in Chromium with axe
```

Build `@fossil-design/tokens` first; `pnpm build` from the root does it in order. The browser tests need Chromium once per machine: `pnpm --filter react exec playwright install chromium`.

## Layout

- `src/components/<Name>/`: `<Name>.tsx`, `<Name>.module.css` and `<Name>.stories.tsx`. Export the component, its variant map and its public types from `src/index.ts`.
- `src/components/Box/variants.ts` holds `Box`'s elements, keywords and surfaces. It imports nothing, because `scripts/generate.ts` reads it directly.
- `scripts/generate.ts` writes `src/generated/box.module.css`, one class per prop, value and breakpoint, and `src/generated/icons.ts`, one component per name in `icons.json`.
- `icons.json` lists the Material Symbols (rounded, weight 400) that Fossil's components use. Add a name there to ship another icon; the build copies their Apache-2.0 license into `dist/licenses/`.
- `src/responsive.ts` holds `Responsive<T>` and the helpers that turn responsive props into classes.
- `.storybook/` holds the Storybook config. `token-px.ts` converts a token to the pixels a play function compares against, and `focus-start.ts` puts focus at the start of the page before a real Tab.
- `*.browser.test.tsx` files hold the real-input tests. They render a story with `composeStories(stories).Story.run()`, then drive it with `userEvent` and `page` from `vitest/browser`.

## Rules

- **Tokens only.** Stylesheets use semantic tokens through `var(--fossil-…)`. A text style sets all five of its parts, never the `font` shorthand. No margins except `0`; space with padding and `gap`. `pnpm lint` enforces all of this.
- **Variant maps.** Each component exports its variants as a constant, `buttonVariants = { tone: ['primary', 'secondary'] } as const`, and derives its prop types from it. Every value needs a class in the CSS Module; the generated types make a missing one a type error.
- **Native elements first,** ARIA only for real gaps. Everything interactive is keyboard-operable, has a visible focus indicator and an accessible name, and respects `prefers-reduced-motion`.
- **Props describe behaviour, not the element underneath.** Take `open`, `onOpenChange` and `title`, never an `HTMLDialogElement` ref or a native-only prop, so a fork can swap a headless library into one component without changing its API.
- **React 18.3 and 19.** Use `forwardRef` and set `displayName`. Put `'use client'` at the top of a component that uses state, effects or refs, and only there.
- **Layout through `Box` and `Stack`,** in stories as in components.
- **Element substitution through `asChild`.** A component that styles an element an app may need to swap, such as `Link` for a router's link, takes `asChild` and clones its single child, merging `className`. Use React's `cloneElement`, not a library.
- **Icons as components.** Take an `IconComponent`, not a name, so an app's own SVGs work beside Fossil's.
- **Tests.** Every component has stories whose play functions exercise its states. axe runs on every story and must pass in light and dark; add a story with `globals: { theme: 'dark' }` where colour matters. Anything that relies on native handling, such as Escape on a `<dialog>`, light dismiss or `:focus-visible`, needs a real-input browser test.
- **A changeset** with any change to the public surface.

## Known issues

Traps the dry run and the build found, so nobody has to find them again:

- `moduleResolution: "bundler"` is needed for TypeScript to find `.module.css.d.ts` files; `NodeNext` doesn't look for them.
- Generate the CSS Module types before type-checking. `build` and `typecheck` do it; a bare `tsc` after a clean checkout fails.
- Relative imports carry `.js` extensions, so the emitted declarations resolve under Node16. Node scripts and tests import `.ts` directly.
- `preserveModules` keeps `'use client'` on the file that declares it. A single-file bundle drops it with no warning.
- `prepack` builds, so a tarball never ships a stale `dist/`.
- Play functions send simulated events, which browsers don't treat as user input. Native behaviour needs Vitest's real input, `userEvent` from `vitest/browser`.
- List test dependencies in `optimizeDeps.include`, or a cold cache in CI makes Vite reload mid-run and every test fails.
- TypeScript 6 checks side-effect imports. `style.css` ships `style.css.d.ts` for that reason. Don't add a wildcard `*.css` declaration: it also matches `*.module.css`, and would hide a missing generated type.
- Nested Vitest projects take their parent's name from the root: `react (unit)`, `react (browser)`, `react (storybook)`. Each browser project needs its own instance name.
- `blur()` doesn't reset Chrome's Tab starting point: the next Tab moves past the element that lost focus, and can leave the page. Call `focusStart()` before a real Tab instead.
- A story's play function runs first in `Story.run()`, and its simulated focus can leave `:focus-visible` set. Move focus away before a real click that checks it.
- Testing Library's accessible-name calculation doesn't name a `<figure>` from its `<figcaption>`, though browsers do. Query the figure, then the caption inside it.
- A `vi.fn()` doesn't fit a story's arg types; Storybook's `fn()` from `storybook/test` does, and Vitest's matchers accept it.
