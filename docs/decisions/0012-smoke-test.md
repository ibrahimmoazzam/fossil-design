# 0012. The consumption smoke test

- **Status:** Accepted
- **Date:** 2026-10-04

## Context

A workspace symlink hides a class of bug that only a consumer meets: a wrong `exports` map, declarations that don't resolve, or a lost `'use client'` ([`PRD.md`](../PRD.md), section 2, "Distribution"). Phase 4 asks for two scratch apps outside the monorepo that install the packed tarballs, build and render: a Next 16 app with a Server Component page and Motion on `Modal`, and a Vite app on React 18. They have to run in CI, because Phase 5's exit criterion fails a deliberately off-system commit in the smoke-test app.

## Options

1. **Where the apps live.**
   - Outside the repository, built by hand. Nothing would run them again.
   - Inside the pnpm workspace. pnpm would link the packages, which is the very thing to avoid.
   - **In `smoke/`, outside the workspace,** copied to a temporary folder for each run.
2. **How they install Fossil.**
   - pnpm. The repository's own tool, with its own behaviour around links and peers.
   - **npm, from the tarballs `pnpm pack` writes.** It ships with Node, and installing every tarball in one command means `@fossil-design/react`'s range on `@fossil-design/tokens` is met by the local build.
3. **What "renders" means.**
   - A browser driving each app. Slow, and it adds a server to every run.
   - **The output of a real render.** Next's build prerenders the Server Component page to HTML. The Vite app builds a server entry, and the script renders it with React 18 and fails on anything React logs.

## Decision

`pnpm smoke` packs `@fossil-design/tokens`, `@fossil-design/react` and `@fossil-design/stylelint-config`. For each app it copies `smoke/<app>` to a temporary folder, installs the tarballs with npm, and then:

- type-checks with `skipLibCheck` off, so Fossil's declarations are checked;
- lints the app's CSS with the shared Stylelint config;
- builds;
- checks that the rendered page has Fossil's markup and that its stylesheet has the tokens.

The Next app uses Turbopack, the default in Next 16, and a client component that runs `Modal`'s panel through Motion's `AnimatePresence`. The Vite app runs React 18 with `@vitejs/plugin-react`, as Vite's React template sets it up. CI runs it as its own job on every pull request.

## Consequences

- The first run found two bugs that every other check had passed:
  - `VisuallyHidden`'s declaration copied the props of the `@types/react` it was built with, and failed a consumer's type-check;
  - Tooltip, Tabs and Carousel made React 18 warn during server rendering.
- A run takes a couple of minutes and needs the network. The apps pin exact versions, and Renovate keeps them current like the rest.
- The apps lint with the Stylelint config only, until Phase 5 builds the ESLint config.
- Running Motion in a browser is checked by hand, not by CI. Its first run, on the Next production build, opened and closed the panel with no console errors.
