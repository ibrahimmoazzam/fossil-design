# 0016. Agent docs bundled in the component package

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

Phase 6 gives an agent in an app everything it needs from what's installed ([`PRD.md`](../PRD.md), Phase 6). This record covers the first half: each component's contract in its JSDoc, Markdown and JSON docs generated into `@fossil-design/react`, a build that fails on an undocumented component, and Storybook MCP for Fossil's own development. The `AGENTS.md` block, its bin script and the Make guidelines render from the same docs, and follow in their own record.

The pattern is Next.js's: version-matched docs inside the package, which an always-on index points at. Vercel's evals scored that 100%, against 53–79% for skills ([`Learnings.md`](../Learnings.md), "The dry run").

Checked in October 2026:

- Storybook 10.6's components manifest is still off by default. It carries each component's JSDoc, its props, and a code snippet per story; Storybook recommends `react-docgen-typescript` over its default `react-docgen`. `@storybook/addon-mcp` 10.6.1 serves it at `/mcp` and peers on `@storybook/addon-vitest`.
- The manifest's snippets print what a story does, not what an app would write: `onClick={fn()}` spies, story-only helpers such as a `Demo` wrapper or a story stylesheet, and wrong JSX for some children (`<Card>(<>…</>)</Card>`, a fragment printed with its parentheses as text). Storybook's `experimentalCodeExamples` flag doesn't change them.
- `react-docgen-typescript` 2.4 skips an undocumented `children` by default, and misreads a component exported through a type assertion (`Box`, `Stack`, `Text`) when another export in its file has a JSDoc comment: it takes that comment as the component's and finds no props.
- Setting `typescript.reactDocgenTypescriptOptions` in Storybook's `main.ts` replaces its defaults rather than merging with them.

## Options

1. **Where the contract lives** (when to use, when not to, states, accessibility).
   - Docs-tab prose in the stories. It doesn't reach the manifest, the type declarations or an editor.
   - A Markdown file beside each component, as Evil Martians' skill keeps. A second description to keep in step ([`Learnings.md`](../Learnings.md), 3.10).
   - **The component's JSDoc.** It reaches the `.d.ts` an app installs, the editor's hover, Storybook's manifest and the bundled docs, from one place.
2. **How the contract is written.**
   - A custom JSDoc tag per field. Structured, but each tool decides whether and how to show a tag it doesn't know.
   - **Markdown sections:** a summary, then `## When to use`, `## When not to use`, `## States` and `## Accessibility`, which splits into `### Built in` and `### Up to you`. Every tool shows them as written, and the generator parses the headings.
3. **Where props come from.**
   - Storybook's default `react-docgen`, which dropped `Button`'s variants and every `Box` layout prop in the dry run.
   - The TypeScript compiler directly. More code, for what `react-docgen-typescript` already does.
   - **`react-docgen-typescript`, with options shared with Storybook,** so the manifest and the bundled docs describe the same props.
4. **Where examples come from.**
   - A hand-written `@example` in the JSDoc. Nothing renders or tests it.
   - Storybook's manifest snippets. They print spies, story helpers and some wrong JSX.
   - **Stories tagged `example`, read from their source.** They render in Storybook and pass axe like every story, and the generator checks they use only what an app has.
5. **When the docs are generated.**
   - From a Storybook build's manifest. It ties the package build to Storybook, and brings the snippets above.
   - **A script after `vite build`,** which runs docgen on the source and reads the variant maps from the built package.
6. **Where the token docs come from.**
   - Rendered by the component package's script. A second renderer of the foundations, which the root `AGENTS.md` block already has.
   - **The token build writes `foundations.md` and `tokens.md`,** beside its other outputs ([0006](./0006-token-build-outputs.md)), and the component package copies them.

## Decision

`pnpm --filter react docs` runs last in the package's build and writes `docs/`, which ships in the tarball and isn't committed:

| File                       | Holds                                                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.md`                 | What's here, each component in a line by Storybook group, and the icons                                                                       |
| `foundations.md`           | The rules for apps, escape hatches, gap logging and implementing a Figma design, from `docs-src/rules.md`; then the token build's foundations |
| `tokens.md`, `tokens.json` | Every token: the token build's reference and its JSON                                                                                         |
| `components/<Name>.md`     | The contract, the props, the variants, and each example with its imports                                                                      |
| `components.json`          | The same per component, as JSON                                                                                                               |

Markdown carries instructions and JSON carries the API, following Indeed's benchmark ([`Learnings.md`](../Learnings.md), 3.8).

The script writes nothing, and lists every problem, if a component lacks part of its contract, a prop lacks a description, or a component has no example. An example is a story tagged `example`, with a JSDoc comment saying why an app would do it. Its code is its own render, which may take no args, or else the component with the story's args, minus spies; a required prop left out fails. Every name it uses must come from `@fossil-design/react` or React, or be a module-level constant with a JSDoc comment, which the docs list as a value the app supplies, such as `image`: "The URL of your image." The generator writes the imports.

`docs-src/rules.md` is the one hand-written source. Its placeholders come from `fossil.config.json` and the package's `bugs` URL, so a fork's docs name its own system and link its own gap form.

For Fossil's own development, Storybook runs `@storybook/addon-mcp` with `componentsManifest` on and `react-docgen-typescript`. `.mcp.json` registers its endpoint, `http://localhost:6006/mcp`, for Claude Code.

## Consequences

- `pnpm build` fails on an undocumented component, so CI does too. A unit test runs the same check, so `pnpm test` catches it without a build.
- Story files hold two kinds of story: tests, written for play functions, and examples, written as an app would write them.
- A component file keeps JSDoc comments off its other exports, such as its variant map; a line comment does. The generator reports docgen reading one as a component.
- The tarball grows by about 170 KB unpacked, most of it the two JSON files.
- The `AGENTS.md` block, its bin script and the Make guidelines can render from `docs/` and `components.json` without reading the source again.
