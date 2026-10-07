# Fossil Design

Fossil Design, or Fossil for short, is an open-source design system for agentic coding: tokens in git flow into CSS, typed React components, Figma variables and a generated Figma component library, with lint configs and agent docs that keep generated UI on-system. Teams adopt it by forking it as a template. The published `@fossil-design/*` packages are the reference brand, harvested from the author's portfolio site.

The repo foundation, the token build, the Figma sync, `@fossil-design/react`, both lint configs, the Figma component library and the agent context layer are in place. The docs, the `AGENTS.md` block and the Figma Make guidelines are bundled in `@fossil-design/react`, and the Figma library is two published files, foundations and components. Phase 8, documentation and dogfooding, is next. Phase 7, drift measurement, is deferred to a later release, and `docs/drift-eval.md` holds its design. `docs/PRD.md` is the spec: phases, tasks and exit criteria. `docs/Learnings.md` holds the research and the reason behind each decision.

## Commands

Run from the repo root, with Node 22.14 or later and pnpm 12.8.1 (pinned in `package.json`).

```sh
pnpm install --frozen-lockfile   # install exactly what pnpm-lock.yaml records
pnpm build                       # build every package, in dependency order
pnpm lint                        # ESLint, Stylelint, then Prettier in check mode
pnpm format                      # rewrite files with Prettier
pnpm typecheck                   # tsc for the root files, then every package
pnpm test                        # every Vitest project, once
pnpm check:packages              # pack each published package, then run publint and attw on it
pnpm smoke                       # install the tarballs into a Next 16 app and a Vite app on React 18
pnpm escapes [base]              # count disable comments for Fossil's rules, and those added since base
pnpm changeset                   # record a release note for a package change
```

- One package: `pnpm --filter <folder> <script>`, for example `pnpm --filter tokens build`.
- One test project: `pnpm test --project workspace`. Nested projects take their parent's name: `pnpm test --project 'react*'` runs `react (unit)`, `react (browser)` and `react (storybook)`. Watch mode: `pnpm exec vitest`.
- The browser tests need Chromium once per machine: `pnpm --filter react exec playwright install chromium`.
- Storybook: `pnpm --filter react storybook`, at `localhost:6006`. Its MCP server is at `localhost:6006/mcp`, and `.mcp.json` registers it for Claude Code.
- `pnpm --filter react docs` writes the docs bundled in `@fossil-design/react` from each component's JSDoc contract and its stories tagged `example`. From the same sources it writes the block the package's `fossil-agents-md` bin puts in an app's `AGENTS.md`, and the Figma Make guidelines in `guidelines/`. The package's build runs it last, and fails on an undocumented component or a block over 8 KB (ADRs 0016 and 0017). `packages/react/AGENTS.md` has the format.
- `pnpm smoke [next|vite]` copies the apps in `smoke/` to a temporary folder, installs the packed tarballs with npm, then type-checks, lints, builds and checks what they render. Then it runs `fossil-agents-md` in each app and checks every installed file the block and the Make guidelines name. Last, it copies the off-system component in `smoke/off-system/` into each app and expects lint to reject every line of it. It needs the network. Set `FOSSIL_KEEP_SMOKE=1` to keep the folder.
- `pnpm --filter react generate` writes `Box`'s CSS and the `.module.css.d.ts` types. The react package's `build` and `typecheck` run it first. Neither output is committed.
- Check the token source without building: `pnpm --filter tokens validate`. Token files live in `packages/tokens/src/primitive/` and `src/semantic/`; ADR 0005 holds their rules.
- The token build writes `tokens.css`, `tokens.json`, `lint.json`, `foundations.md` and `tokens.md` to `packages/tokens/dist/`, the TypeScript in `src/generated/`, and the foundations block in this file. Commit the block with the token change; CI fails if the build changes it. ADR 0006 covers each output, and ADR 0016 the two Markdown files.
- List deprecated tokens and their replacements: `pnpm --filter tokens deprecations`, after a build.
- Sync tokens with Figma: `pnpm figma:apply`, `pnpm figma:read` and `pnpm figma:diff` write scripts and compare their results. Run a sync through the `fossil-figma-sync` skill in `.claude/skills/`, which needs the Figma MCP server. `packages/figma-sync/AGENTS.md` covers working on the sync itself.
- Build the Figma library, in two files (ADR 0018): `pnpm figma:library-spec` writes the spec, a build sheet and the styles script for the foundations file; `pnpm figma:library-check` writes the components file's check, `pnpm figma:library-check foundations` the foundations file's, and `pnpm figma:library-check report` verifies the results. Follow the same skill's library workflow.
- Build before linting and type-checking. A package's types resolve through the built declarations of the packages it depends on, and the Stylelint config reads the built token lists.
- Add a dependency to one package with `pnpm --filter <folder> add <name>`, and to the root with `pnpm add -D -w <name>`. TypeScript comes from the `catalog:` in `pnpm-workspace.yaml`.

## Stack

Phase 0 pinned the tooling below; later phases pin the rest when they add it.

- Node 22.14 or later; pnpm 12 workspaces
- TypeScript `~6.0.3`. **Not 7:** it has no JavaScript API yet, so `typescript-eslint`, `react-docgen-typescript` and declaration tooling break on it
- Vitest 5, Prettier 3, Changesets 3
- React, with peers `^18.3 || ^19`; develop and test on 19
- CSS Modules, with strict class-name types generated by `vite-css-modules`
- Vite 8 in library mode, with `preserveModules`
- Style Dictionary 5.5.5, with DTCG 2025.10 token files
- Storybook 10.6 with `addon-a11y`, `addon-vitest` and `addon-mcp`; Vitest 5 in browser mode, with Playwright
- ESLint 10 with flat config and `typescript-eslint` 8; Stylelint 17

## Layout

```
fossil.config.json     system name, CSS prefix, npm scope
packages/tokens        DTCG source and the Style Dictionary build
packages/react         components (CSS Modules), stories, bundled agent docs, Make guidelines, the AGENTS.md bin
packages/eslint-config, packages/stylelint-config
packages/figma-sync    Figma sync and component library: core, scripts and checks (private)
.claude/skills         the fossil-figma-sync skill
tests/                 workspace-wide tests, such as package names against fossil.config.json
scripts/               workspace-wide scripts: the packed-tarball check and the smoke test
smoke/                 consumer apps outside the workspace, built from the packed tarballs
smoke/off-system       a deliberately off-system component that lint must reject
docs/PRD.md            the spec: phases, tasks, exit criteria
docs/Learnings.md      the research behind each decision
docs/decisions         ADRs
docs/gaps.md           logging gaps, and recording a decision for each
docs/drift-eval.md     the planned drift eval: method, harness, prior art
.changeset/            pending release notes
.github/workflows      CI on every pull request; releases from main
.github/ISSUE_TEMPLATE the gap form
```

## Before deciding anything

- Read the relevant phase of `docs/PRD.md` and its rationale in `docs/Learnings.md`. Decisions there are deliberate. If one looks wrong, say so and ask; don't quietly diverge.
- Verify claims about tools, libraries, APIs and products against current sources (docs, npm, changelogs) before relying on them. Training data is out of date for this stack. Say what you verified and what you inferred.
- Figma work must run on a Professional or Education plan: no Code Connect, no Variables REST API.

## Rules

- **Accessibility is non-negotiable.** Native elements first (`<button>`, `<a>`, `<dialog>`, native form controls); ARIA only for real gaps. Everything interactive is keyboard-operable, has a visible focus indicator and an accessible name. Respect `prefers-reduced-motion` and `prefers-color-scheme`. Meet WCAG 2.2 AA contrast.
- **Small components.** Focused, replaceable, no locked-in abstractions.
- **Tokens only.** Styles live in CSS Modules and use semantic tokens (`var(--fossil-…)`), never raw values or primitive tokens. If a value has no token, that's a gap to raise, not a one-off style.
- **No margins.** Space with padding and `gap`. `margin: 0` resets are fine.
- **Mobile-first.** Base styles for mobile, `min-width` media queries only.
- **Layout through `Box` and `Stack`.** No raw `<div>`, `<section>` or other element `Box` renders; ESLint rejects them.
- **Escapes are visible, not forbidden,** and gaps are logged. Both are spelled out below.
- **Sparse comments.** Only a non-obvious why. Explanations for the user go in chat, not code.

### Escape hatches

1. **Sanctioned:** `Box`'s `style` prop, for what tokens can't express: `gridTemplateAreas`, `gridTemplateColumns`, `aspectRatio` and `transform`. It needs no comment.
2. **Logged:** anything else needs a disable comment with its reason after `--`, as in `/* stylelint-disable-next-line <rule> -- <the reason> */`. A margin other than `0` also needs the person's approval first. `pnpm escapes` counts these comments, and CI lists the ones each pull request adds.
3. **A signal:** the same escape three times is a gap.

### Gaps

A gap is a place where Fossil fell short: something couldn't be built from its components and tokens, something generic was rebuilt, or an escape was logged. Draft it with four fields, show the person, and let them decide whether to file it on the gap form:

- **Where:** the file, and the task.
- **Needed:** what the task needed. The need, not a solution.
- **Offered:** what Fossil offered, and why it fell short.
- **Evidence:** the code written instead, or the escape comment.

`docs/gaps.md` covers reviewing gaps and closing each with a decision: component, pattern or keep local.

### Components

Don't copy component details into this file. Each component's contract is the JSDoc in `packages/react/src/components/<Name>/<Name>.tsx`: when to use it, when not to, its states and its accessibility. After a build, `packages/react/docs/` has each one rendered with its props, variants and examples, as apps receive it. With Storybook running, its MCP server serves the same through its docs tools, and runs a story's tests with `test-run`.

### An on-system component

From `Button`, trimmed. The variant map is a constant, the props derive from it, and every value has a class that uses semantic tokens only. A class the map names but the CSS lacks is a type error.

```tsx
// Button.tsx
export const buttonVariants = {
  tone: ['primary', 'secondary'],
  size: ['s', 'm'],
} as const;

export type ButtonTone = (typeof buttonVariants.tone)[number];

<button
  className={cx(styles.button, styles[`tone-${tone}`], styles[`size-${size}`])}
/>;
```

```css
/* Button.module.css */
.button {
  gap: var(--fossil-space-xs);
  border: var(--fossil-border-default);
  border-radius: var(--fossil-radius-control);
  font-family: var(--fossil-text-control-font-family);
  font-size: var(--fossil-text-control-font-size);
  font-weight: var(--fossil-text-control-font-weight);
  letter-spacing: var(--fossil-text-control-letter-spacing);
  line-height: var(--fossil-text-control-line-height);
}

.tone-secondary {
  background-color: var(--fossil-color-background-surface);
  color: var(--fossil-color-text-muted);
}

.size-m {
  padding-block: var(--fossil-space-s);
  padding-inline: var(--fossil-space-l);
}
```

<!-- fossil:foundations:start -->
<!-- Generated by the token build from packages/tokens/src. Change the tokens, not this block. -->
<!-- prettier-ignore-start -->

## Foundations

Style with these semantic tokens, as `var(--fossil-…)`. Each one switches between light and dark by itself. Sizes are at a 16px root; the tokens are in rem. `packages/tokens/dist/tokens.json` describes every token.

### Spacing

For padding and `gap`. Never margin.

| Token | Custom property | Size |
| --- | --- | --- |
| `space.2xs` | `--fossil-space-2xs` | 4px |
| `space.xs` | `--fossil-space-xs` | 8px |
| `space.s` | `--fossil-space-s` | 12px |
| `space.m` | `--fossil-space-m` | 16px |
| `space.l` | `--fossil-space-l` | 24px |
| `space.xl` | `--fossil-space-xl` | 32px |
| `space.2xl` | `--fossil-space-2xl` | 48px |
| `space.3xl` | `--fossil-space-3xl` | 80px |

### Breakpoints

Mobile first: style for the smallest screen, then add `@media (min-width: …)` rules for wider ones. A custom property can't go in a media condition, so write the width itself. In JavaScript, the tokens package exports each query as `mediaQueries`.

| Breakpoint | From |
| --- | --- |
| `tablet` | 768px |
| `compact` | 1024px |
| `large` | 1440px |
| `max` | 1600px |

### Type

Each text style is five custom properties. Set all five, and never the `font` shorthand, which drops letter-spacing: `--fossil-text-body-font-family`, `--fossil-text-body-font-size`, `--fossil-text-body-font-weight`, `--fossil-text-body-letter-spacing` and `--fossil-text-body-line-height`.

| Style | Font | Size | Weight | Line height | Letter spacing | Use |
| --- | --- | --- | --- | --- | --- | --- |
| `text.body` | body | 16px | 400 | 1.6 | 0 | Default running text. |
| `text.prose` | body | 16px | 400 | 1.75 | 0 | Long-form reading, with more room between lines: case-study prose, card bodies. |
| `text.small` | body | 15px | 400 | 1.6 | 0 | Blurbs, list items and chat bubbles. |
| `text.caption` | body | 14px | 400 | 1.6 | 0 | Figure captions, popovers and suggestions. |
| `text.fine` | body | 13px | 400 | 1.4 | 0 | Tags, tooltips and video captions. |
| `text.label` | mono | 12px | 400 | 1.2 | 0.48px | Eyebrows and metadata. Components add text-transform: uppercase. |
| `text.control` | body | 16px | 500 | 1 | 0 | Buttons and tabs: one line, so the line box equals the text. |
| `text.heading.xs` | heading | 18px | 700 | 1.4 | 0 | Content-card titles. |
| `text.heading.s` | heading | 22px | 700 | 1.4 | 0 | Card and modal titles. |
| `text.heading.m` | heading | 24px | 700 | 1.4 | 0 | Section headings in long-form content. |
| `text.heading.l` | heading | 32px | 700 | 1.4 | 0 | Major section headings and pull quotes. |
| `text.heading.xl` | heading | 40px | 700 | 1.2 | 0 | Page titles at a fixed size. |

### Colour

| Custom property | Use |
| --- | --- |
| `--fossil-color-background-transparent` | No fill: ghost controls and background resets. |
| `--fossil-color-background-page` | The page ground. |
| `--fossil-color-background-surface` | Cards, panels, popovers and other surfaces that sit on the page. |
| `--fossil-color-background-sunken` | A fill set below the page, such as a tab track. |
| `--fossil-color-background-raised` | A fill that comes back up from a sunken one, such as the selected tab. Never the only sign of selection. |
| `--fossil-color-background-hover` | The wash behind a hovered row, pill or link. |
| `--fossil-color-background-wash` | A tint that marks a row without filling it, such as a table header. |
| `--fossil-color-background-scrim` | Behind a modal. |
| `--fossil-color-background-veil` | A fill over images and video, such as a clip's play button. The same in both modes, because the footage is. |
| `--fossil-color-text-default` | Body text. Contrast in light / dark: 17.59:1 / 18.16:1 on `color.background.page`, 19.15:1 / 17.36:1 on `color.background.surface`. Needs 4.5:1. |
| `--fossil-color-text-muted` | Secondary text. Contrast in light / dark: 7.38:1 / 12.69:1 on `color.background.page`, 8.03:1 / 12.14:1 on `color.background.surface`. Needs 4.5:1. |
| `--fossil-color-text-on-accent` | Text and icons on an accent fill. Contrast in light / dark: 5.91:1 / 7.69:1 on `color.accent.default`. Needs 4.5:1. |
| `--fossil-color-text-on-highlight` | Text and icons on a highlight fill. Contrast in light / dark: 5.19:1 / 13.04:1 on `color.highlight.default`. Needs 4.5:1. |
| `--fossil-color-text-on-veil` | Text and icons on the veil, in both modes. Contrast in light / dark: 5.74:1 / 5.74:1 on `color.background.veil`. Needs 4.5:1. |
| `--fossil-color-border-default` | A quiet container edge, meant to sit against a fill. Too faint to stand alone as a line. |
| `--fossil-color-border-strong` | A standalone rule or tick. Contrast in light / dark: 3.57:1 / 4.96:1 on `color.background.page`, 3.89:1 / 4.74:1 on `color.background.surface`. Needs 3:1. |
| `--fossil-color-border-hover` | A control's edge on hover. Contrast in light / dark: 7.38:1 / 12.69:1 on `color.background.page`, 8.03:1 / 12.14:1 on `color.background.surface`. Needs 3:1. |
| `--fossil-color-border-selected` | The edge of the current or selected item. Contrast in light / dark: 4.77:1 / 13.15:1 on `color.background.page`, 5.19:1 / 12.57:1 on `color.background.surface`. Needs 3:1. |
| `--fossil-color-accent-default` | Links and primary actions. Contrast in light / dark: 5.42:1 / 7.76:1 on `color.background.page`, 5.91:1 / 7.42:1 on `color.background.surface`. Needs 4.5:1. |
| `--fossil-color-highlight-default` | Small marks that should stand out: the current page, the caret, the selected tab. Contrast in light / dark: 4.77:1 / 13.15:1 on `color.background.page`, 5.19:1 / 12.57:1 on `color.background.surface`. Needs 4.5:1. |
| `--fossil-color-focus-ring` | The focus indicator. Contrast in light / dark: 4.77:1 / 13.15:1 on `color.background.page`, 5.19:1 / 12.57:1 on `color.background.surface`. Needs 3:1. |
| `--fossil-color-selection-background` | Selected text. The selected text itself takes highlight.default. |
| `--fossil-color-shadow-default` | The colour of every shadow. |

### Other semantic tokens

- `border.width`: `--fossil-border-width-default`, `--fossil-border-width-hairline`
- `border`: `--fossil-border-default`, `--fossil-border-strong`, `--fossil-border-hairline`, `--fossil-border-focus`
- `focus.ring`: `--fossil-focus-ring-width`, `--fossil-focus-ring-offset`
- `shadow`: `--fossil-shadow-raised`, `--fossil-shadow-floating`, `--fossil-shadow-overlay`
- `layer`: `--fossil-layer-overlay`
- `layout`: `--fossil-layout-measure`, `--fossil-layout-max-width`
- `icon.size`: `--fossil-icon-size-s`, `--fossil-icon-size-m`, `--fossil-icon-size-l`
- `motion.duration`: `--fossil-motion-duration-fast`, `--fossil-motion-duration-default`, `--fossil-motion-duration-slow`
- `motion.easing`: `--fossil-motion-easing-standard`
- `radius`: `--fossil-radius-compact`, `--fossil-radius-control`, `--fossil-radius-surface`, `--fossil-radius-pill`
- `font.family`: `--fossil-font-family-heading`, `--fossil-font-family-body`, `--fossil-font-family-mono`
- `font.weight`: `--fossil-font-weight-regular`, `--fossil-font-weight-emphasis`, `--fossil-font-weight-strong`

<!-- prettier-ignore-end -->
<!-- fossil:foundations:end -->

## Boundaries

**Always**

- Use semantic tokens, `Box` and `Stack`, and existing components before building new ones.
- Run every check in the definition of done before calling a change done.
- Write an ADR for an architectural decision and a changeset for a change to a package's public surface.

**Ask first**

- Any margin other than `0`. If approved, it gets a lint-disable comment with the reason.
- Adding a dependency.
- Adding, renaming or deleting a token.
- Running `figma:apply`, or any `use_figma` write, against the real Figma file.
- Changing a decision recorded in `docs/PRD.md` or `docs/Learnings.md`.
- Anything that publishes to npm or changes the release workflow.

**Never**

- Hand-write Figma Plugin API code for variables. Use the generated scripts.
- Edit a generated file: token build outputs (including the foundations block in this file), CSS Module types, `Box`'s CSS, bundled docs and Make guidelines. Change `packages/react/docs-src/` instead.
- Upgrade TypeScript to 7.
- Publish to npm from a local machine, except each package's first version during the Phase 0 bootstrap.
- Commit secrets, tokens or `.env` files.

## Definition of done

A change is done when all of these pass. Run them in this order: `pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm check:packages`.

| Check                                                                                                                                             | Command                                            | Covers today                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The token build, with its validation                                                                                                              | `pnpm --filter tokens build`, part of `pnpm build` | Validation of the DTCG source, then every Style Dictionary output                                                                                                                                                                                                           |
| ESLint and Stylelint, with Fossil's shared configs                                                                                                | `pnpm lint`                                        | ESLint with Fossil's own config on every script and component, then Prettier; Stylelint with Fossil's own config on every stylesheet                                                                                                                                        |
| Type-checking, after generating CSS Module types                                                                                                  | `pnpm typecheck`                                   | All packages, with CSS Module types generated first                                                                                                                                                                                                                         |
| Tests: Storybook interaction tests, axe checks with zero violations, real-input browser tests for native behaviour such as Escape on a `<dialog>` | `pnpm test`                                        | Workspace, token, lint config and React unit tests, including the off-system component; every story with axe; real-input tests for focus, hover and the native behaviour of every interactive component                                                                     |
| Packed tarballs pass publint and attw                                                                                                             | `pnpm check:packages`                              | Every published package                                                                                                                                                                                                                                                     |
| The packed packages install, type-check, build and render in a consumer app                                                                       | `pnpm smoke`                                       | A Next 16 app with a Server Component page and Motion on `Modal`, a Vite app on React 18, and the AGENTS.md bin in both. CI runs it on every pull request; run it locally when a change touches the build, the exports, a client component, a lint config or the agent docs |
| A changeset, if a package's public surface changed                                                                                                | `pnpm changeset`                                   | Yes                                                                                                                                                                                                                                                                         |

## Conventions

- Architectural decisions get an ADR in `docs/decisions/`: context, options, decision, consequences.
- Conventional commits. A changeset accompanies any change to a package's public surface.
- Work on a branch and merge through a pull request. Every push to `main` runs the release workflow.
