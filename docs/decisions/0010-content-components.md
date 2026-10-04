# 0010. Content components: icons, element substitution and media

- **Status:** Accepted
- **Date:** 2026-10-04

## Context

The second part of Phase 4 harvests the portfolio's content components: `Button`, `Card`, `Link`, `Icon`, `VisuallyHidden`, `SkipLink` and `Figure`. Three of them raised questions the PRD answers only in outline.

- **Icons.** The portfolio imports 47 Material Symbols through SVGR. The PRD asks Fossil to ship its icons as prebuilt components, so consumers need no SVGR. The rounded set holds 3,927 icons, 7,854 with filled versions. The icons are © Google under Apache-2.0, which asks for the license to travel with them.
- **Element substitution.** The PRD gives `Link` an `asChild`, so `next/link` or another router's link can supply navigation. The portfolio also has a `LinkButton`: a `<button>` styled as a link, for an action such as copying an address.
- **Media.** The PRD makes `Figure` a container: the app passes its own image, such as `next/image`. The portfolio's `Figure` also took a `displayWidth`, but none of its 8 figures or 5 clips sets one.

## Options

1. **Which icons ship.**
   - The whole rounded set. Every icon is available, but the package carries several MB of icon modules and every name reaches the agent docs.
   - The 47 the portfolio uses.
   - **The 6 Fossil's own components use,** named in `icons.json`. Apps pass their own SVG components for anything else.
2. **How icons are built.**
   - Committed `.tsx` files, copied by hand.
   - **Generated at build time** from `@material-symbols/svg-400`, a dev dependency, into `src/generated/icons.ts`.
3. **How `asChild` works.**
   - A slot component from a library, such as Radix's `Slot`. A dependency for one `cloneElement`.
   - **React's `cloneElement`,** merging `className` and wrapping the child's children in the link's own markup. The child keeps its element, its props and its ref.
4. **`Figure`'s width.**
   - Keep `displayWidth`, as an inline custom property.
   - **Drop it.** An app sizes a figure from its own stylesheet, through `className`.

## Decision

**Icons.** `scripts/generate.ts` reads each name in `icons.json` from Material Symbols (rounded, weight 400) and writes a component per icon, named in PascalCase with an `Icon` suffix: `close` becomes `CloseIcon`. Each renders an `<svg>` at `1em`, in `currentColor`. `Icon` takes any `IconComponent`, Fossil's or the app's, and is decorative unless given a `label`. Its `size` takes the `icon.size` tokens. The build copies the Apache-2.0 license into `dist/licenses/material-symbols.txt`.

**`Link`.** `tone` is `inherit` (the portfolio's links) or `accent` (its plain links in prose). `asChild` styles a single child, a router's link or a `<button>`, and replaces `LinkButton`. A link with `target="_blank"` gets the outward arrow and "(opens in a new tab)" for screen readers, whether it renders the `<a>` or styles a child.

**`Button`.** A native `<button>`, `type="button"` by default. `tone` is primary or secondary, `size` is s or m. Its props allow text, an icon with text, or an icon alone; an icon alone needs a `label`, which the types enforce. Size m is at least 44px tall (WCAG 2.5.5) and size s at least 32px. Those minimums, and an icon-only button's fixed square, are the only literal lengths.

**`Card`** is a bordered surface whose title needs a heading level, and whose body is set in the prose style. **`Figure`** frames whatever media it's given in a hairline border, and renders a `<figure>` only when there's a caption. **`SkipLink`** and **`VisuallyHidden`** follow the portfolio, with `clip-path` in place of the old negative-margin pattern.

## Consequences

- An app that needs an icon Fossil doesn't ship supplies it as its own SVG component. If several apps need it, the gap review adds it to `icons.json`.
- Link's `0.1em` gap before its icon is the first Level 2 escape in Fossil's own CSS: a disable comment with its reason, because an `em` gap scales with the link's text and a token wouldn't.
- With `asChild`, a ref goes on the child, not on `Link`.
- The real-input project now exists. It checks that a click doesn't show the focus ring, that Tab does, that Enter and Space activate a button, that hovering fills the link's dots and that the first Tab reveals the skip link.
